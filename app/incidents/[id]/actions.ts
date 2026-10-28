"use server";

import { z } from "zod";
import { requireRole, canManageResource } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { addDays } from "date-fns";
import { revalidatePath } from "next/cache";

const ResolveIncidentSchema = z.object({
  incidentId: z.string().min(1, "Incident ID is required"),
  resolution: z.string().min(3, "Resolution must be at least 3 characters").max(1000),
  penaltyType: z.enum(["NONE", "STRIKE", "CREDIT_FINE", "SUSPENSION", "FORFEIT_DEPOSIT"]).default("NONE"),
  penaltyCredits: z.coerce.number().min(0).max(500).default(0),
  suspendDays: z.coerce.number().min(0).max(90).default(0),
  depositAction: z.enum(["REFUND", "FORFEIT", "NONE"]).default("NONE"),
});

export async function resolveIncidentAction(formData: FormData) {
  const session = await requireRole(["MANAGER", "ADMIN"]);

  const rawIncidentId = formData.get("incidentId");
  const rawResolution = formData.get("resolution");
  const rawPenaltyType = formData.get("penaltyType");
  const rawPenaltyCredits = formData.get("penaltyCredits");
  const rawSuspendDays = formData.get("suspendDays");
  const rawDepositAction = formData.get("depositAction");

  const parseResult = ResolveIncidentSchema.safeParse({
    incidentId: rawIncidentId,
    resolution: rawResolution,
    penaltyType: rawPenaltyType || "NONE",
    penaltyCredits: rawPenaltyCredits || 0,
    suspendDays: rawSuspendDays || 0,
    depositAction: rawDepositAction || "NONE",
  });

  if (!parseResult.success) {
    return { success: false, error: parseResult.error.errors[0]?.message || "Invalid resolution parameters" };
  }

  const { incidentId, resolution, penaltyType, penaltyCredits, suspendDays, depositAction } = parseResult.data;

  const incident = await prisma.incident.findUnique({
    where: { id: incidentId },
    include: {
      resource: true,
      booking: { include: { user: true } },
      reporter: true,
    },
  });

  if (!incident) return { success: false, error: "Incident not found" };

  // Authorization check: Manager must belong to resource department (or Campus/Admin)
  if (!canManageResource(session, incident.resource)) {
    return {
      success: false,
      error: `Forbidden: You are not authorized to manage incidents for ${incident.resource.department} department resources.`,
    };
  }

  // Target user for penalty is STRICTLY the booker, NEVER the reporter!
  const targetUserId = incident.booking?.userId || null;

  return await prisma.$transaction(async (tx) => {
    let penaltyDescription = "No penalty applied (Resolved with warning or normal wear)";

    if (targetUserId) {
      const targetUser = await tx.user.findUnique({ where: { id: targetUserId } });

      if (targetUser) {
        if (penaltyType === "STRIKE") {
          penaltyDescription = "1 Conduct Strike applied to campus profile";
          const updatedUser = await tx.user.update({
            where: { id: targetUserId },
            data: { strikes: { increment: 1 } },
          });

          // Auto suspend if strikes >= 3
          if (updatedUser.strikes >= 3) {
            const suspendDate = addDays(new Date(), 14);
            await tx.user.update({
              where: { id: targetUserId },
              data: { suspendedUntil: suspendDate },
            });
            penaltyDescription += " (Account suspended 14 days due to 3+ strikes)";
          }
        } else if (penaltyType === "CREDIT_FINE" && penaltyCredits > 0) {
          // Guard against pushing credits negative
          const availableCredits = Math.max(0, targetUser.credits);
          const actualFine = Math.min(penaltyCredits, availableCredits);
          penaltyDescription = `Deduction of ${actualFine} credits from account balance`;
          await tx.user.update({
            where: { id: targetUserId },
            data: { credits: { decrement: actualFine } },
          });
        } else if (penaltyType === "SUSPENSION" && suspendDays > 0) {
          const suspendDate = addDays(new Date(), suspendDays);
          penaltyDescription = `Account suspended from equipment booking for ${suspendDays} days`;
          await tx.user.update({
            where: { id: targetUserId },
            data: { suspendedUntil: suspendDate },
          });
        }
      }
    } else if (penaltyType !== "NONE") {
      penaltyDescription = `Note: No responsible booker associated with incident; ${penaltyType} recorded without user penalty.`;
    }

    // Deposit settlement and Booking completion
    if (incident.booking) {
      const b = incident.booking;
      let depositSettledText = "";

      if (b.depositHeld > 0) {
        if (depositAction === "FORFEIT" || penaltyType === "FORFEIT_DEPOSIT") {
          // Deposit is retained by department / campus pool
          await tx.booking.update({
            where: { id: b.id },
            data: { depositHeld: 0 },
          });
          depositSettledText = ` Security deposit of ${b.depositHeld} credits forfeited to department repair pool.`;
        } else if (depositAction === "REFUND" || penaltyType === "NONE") {
          // Deposit refunded back to user
          await tx.user.update({
            where: { id: b.userId },
            data: { credits: { increment: b.depositHeld } },
          });
          await tx.booking.update({
            where: { id: b.id },
            data: { depositHeld: 0 },
          });
          depositSettledText = ` Security deposit of ${b.depositHeld} credits refunded to user balance.`;
        }
      }

      // Transition RETURNED booking to COMPLETED
      if (b.status === "RETURNED") {
        await tx.booking.update({
          where: { id: b.id },
          data: { status: "COMPLETED" },
        });

        await audit(tx, {
          actorId: session.id,
          action: "BOOKING_COMPLETED",
          entityType: "Booking",
          entityId: b.id,
          before: { status: "RETURNED" },
          after: { status: "COMPLETED" },
          reason: `Incident ${incidentId} resolved; booking marked completed.`,
        });
      }

      penaltyDescription += depositSettledText;
    }

    const updated = await tx.incident.update({
      where: { id: incidentId },
      data: {
        status: "RESOLVED",
        resolution: resolution.trim(),
        penaltyApplied: penaltyDescription,
        resolvedById: session.id,
      },
    });

    await audit(tx, {
      actorId: session.id,
      action: "INCIDENT_RESOLVED",
      entityType: "Incident",
      entityId: incidentId,
      before: { status: incident.status },
      after: {
        status: "RESOLVED",
        resolution: resolution.trim(),
        penaltyApplied: penaltyDescription,
      },
      reason: `Incident resolved by Manager ${session.name}`,
    });

    // Notify the target user if applicable
    if (targetUserId) {
      await createNotification(tx, {
        userId: targetUserId,
        type: "INCIDENT_RESOLVED",
        message: `Incident regarding "${incident.resource.name}" has been resolved by ${session.name}. Resolution: "${resolution.trim()}". Penalty: ${penaltyDescription}`,
        link: `/incidents/${incidentId}`,
      });
    }

    return { success: true, incident: updated };
  });
}
