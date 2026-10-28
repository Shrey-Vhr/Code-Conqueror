"use server";

import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { addDays } from "date-fns";
import { revalidatePath } from "next/cache";

export async function resolveIncidentAction(formData: FormData) {
  const session = await requireRole(["MANAGER", "ADMIN"]);

  const incidentId = formData.get("incidentId") as string;
  const resolution = formData.get("resolution") as string;
  const penaltyType = formData.get("penaltyType") as string;
  const penaltyCredits = parseInt(formData.get("penaltyCredits") as string, 10) || 0;
  const suspendDays = parseInt(formData.get("suspendDays") as string, 10) || 0;

  if (!incidentId || !resolution || resolution.trim().length === 0) {
    return { success: false, error: "Resolution details are required." };
  }

  const incident = await prisma.incident.findUnique({
    where: { id: incidentId },
    include: {
      resource: true,
      booking: { include: { user: true } },
      reporter: true,
    },
  });

  if (!incident) return { success: false, error: "Incident not found" };

  const targetUserId = incident.booking?.userId || incident.reporterId;

  return await prisma.$transaction(async (tx) => {
    let penaltyDescription = "No penalty applied (Resolved with warning or normal wear)";

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
      penaltyDescription = `Deduction of ${penaltyCredits} credits from account balance`;
      await tx.user.update({
        where: { id: targetUserId },
        data: { credits: { decrement: penaltyCredits } },
      });
    } else if (penaltyType === "SUSPENSION" && suspendDays > 0) {
      const suspendDate = addDays(new Date(), suspendDays);
      penaltyDescription = `Account suspended from equipment booking for ${suspendDays} days`;
      await tx.user.update({
        where: { id: targetUserId },
        data: { suspendedUntil: suspendDate },
      });
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

    // Notify the target user
    await createNotification(tx, {
      userId: targetUserId,
      type: "INCIDENT_RESOLVED",
      message: `Incident regarding "${incident.resource.name}" has been resolved by ${session.name}. Resolution: "${resolution.trim()}". Penalty: ${penaltyDescription}`,
      link: `/incidents/${incidentId}`,
    });

    return { success: true, incident: updated };
  });
}
