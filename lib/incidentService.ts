import { prisma } from "./prisma";
import { audit } from "./audit";
import { createNotification } from "./notifications";
import { addDays } from "date-fns";

export interface ResolveIncidentParams {
  incidentId: string;
  resolution: string;
  penaltyType?: "NONE" | "STRIKE" | "CREDIT_FINE" | "SUSPENSION" | "FORFEIT_DEPOSIT";
  penaltyCredits?: number;
  suspendDays?: number;
  depositAction?: "REFUND" | "FORFEIT" | "NONE";
  actorId: string;
  actorName?: string;
}

export async function resolveIncident(params: ResolveIncidentParams) {
  const {
    incidentId,
    resolution,
    penaltyType = "NONE",
    penaltyCredits = 0,
    suspendDays = 0,
    depositAction = "NONE",
    actorId,
    actorName = "Manager",
  } = params;

  const incident = await prisma.incident.findUnique({
    where: { id: incidentId },
    include: {
      resource: true,
      booking: { include: { user: true } },
      reporter: true,
    },
  });

  if (!incident) return { success: false, error: "Incident not found" };

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

    // Deposit settlement and Booking completion ONLY if booking is RETURNED
    if (incident.booking && incident.booking.status === "RETURNED") {
      const b = incident.booking;

      // Check if there are other unresolved incidents on this booking
      const otherUnresolvedCount = await tx.incident.count({
        where: {
          bookingId: b.id,
          id: { not: incidentId },
          status: { not: "RESOLVED" },
        },
      });

      // Settle deposit and complete booking only if all incidents on booking are now resolved
      if (otherUnresolvedCount === 0) {
        let depositSettledText = "";

        if (b.depositHeld > 0) {
          if (depositAction === "FORFEIT" || penaltyType === "FORFEIT_DEPOSIT") {
            // Deposit is retained by department / campus pool
            await tx.booking.update({
              where: { id: b.id },
              data: { depositHeld: 0 },
            });
            depositSettledText = ` Security deposit of ${b.depositHeld} credits forfeited to department repair pool.`;
          } else {
            // Default: refund deposit back to user
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

        await tx.booking.update({
          where: { id: b.id },
          data: { status: "COMPLETED" },
        });

        await audit(tx, {
          actorId,
          action: "BOOKING_COMPLETED",
          entityType: "Booking",
          entityId: b.id,
          before: { status: "RETURNED" },
          after: { status: "COMPLETED" },
          reason: `Incident ${incidentId} resolved; returned booking marked completed.`,
        });

        penaltyDescription += depositSettledText;
      } else {
        penaltyDescription += ` (Reservation remains in RETURNED with deposit held pending resolution of ${otherUnresolvedCount} other open incident(s)).`;
      }
    }

    const updated = await tx.incident.update({
      where: { id: incidentId },
      data: {
        status: "RESOLVED",
        resolution: resolution.trim(),
        penaltyApplied: penaltyDescription,
        resolvedById: actorId,
      },
    });

    await audit(tx, {
      actorId,
      action: "INCIDENT_RESOLVED",
      entityType: "Incident",
      entityId: incidentId,
      before: { status: incident.status },
      after: {
        status: "RESOLVED",
        resolution: resolution.trim(),
        penaltyApplied: penaltyDescription,
      },
      reason: `Incident resolved by ${actorName}`,
    });

    // Notify the target user if applicable
    if (targetUserId) {
      await createNotification(tx, {
        userId: targetUserId,
        type: "INCIDENT_RESOLVED",
        message: `Incident regarding "${incident.resource.name}" has been resolved by ${actorName}. Resolution: "${resolution.trim()}". Penalty: ${penaltyDescription}`,
        link: `/incidents/${incidentId}`,
      });
    }

    return { success: true, incident: updated };
  });
}
