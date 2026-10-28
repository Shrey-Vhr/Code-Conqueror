import { prisma } from "./prisma";
import { audit } from "./audit";
import { createNotification } from "./notifications";

export async function sweepOverdue(): Promise<{
  overdueCount: number;
  updatedBookingIds: string[];
}> {
  const now = new Date();

  const overdueBookings = await prisma.booking.findMany({
    where: {
      status: "CHECKED_IN",
      end: { lt: now },
    },
    include: {
      user: true,
      resource: true,
      incidents: true,
    },
  });

  const updatedBookingIds: string[] = [];

  for (const booking of overdueBookings) {
    await prisma.$transaction(async (tx) => {
      // 1. Update booking status
      await tx.booking.update({
        where: { id: booking.id },
        data: { status: "OVERDUE" },
      });

      // 2. Audit log
      await audit(tx, {
        actorId: null,
        action: "BOOKING_MARKED_OVERDUE",
        entityType: "Booking",
        entityId: booking.id,
        before: { status: "CHECKED_IN" },
        after: { status: "OVERDUE" },
        reason: `Scheduled return time (${booking.end.toISOString()}) elapsed without condition checkout.`,
      });

      // 3. Create DELAY incident if not already present
      const existingDelayIncident = booking.incidents.find(
        (inc) => inc.type === "DELAY"
      );

      if (!existingDelayIncident) {
        await tx.incident.create({
          data: {
            bookingId: booking.id,
            resourceId: booking.resourceId,
            reporterId: booking.resource.ownerId,
            type: "DELAY",
            severity: "HIGH",
            description: `Resource "${booking.resource.name}" is overdue. Scheduled end was ${booking.end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}. Active session has not been returned.`,
            aiSummary: `Delayed equipment return on "${booking.resource.name}". User ${booking.user.name} has not checked out. Recommend following up with the borrower.`,
            status: "OPEN",
          },
        });
      }

      // 4. Notify borrower
      await createNotification(tx, {
        userId: booking.userId,
        type: "OVERDUE",
        message: `ALERT: Your reservation for "${booking.resource.name}" is overdue! Please complete the return check-out immediately.`,
        link: `/bookings/${booking.id}`,
      });

      // 5. Notify resource owner
      await createNotification(tx, {
        userId: booking.resource.ownerId,
        type: "OVERDUE",
        message: `Overdue Alert: "${booking.resource.name}" has not been returned by ${booking.user.name}. A delay incident was logged.`,
        link: `/bookings/${booking.id}`,
      });

      updatedBookingIds.push(booking.id);
    });
  }

  return {
    overdueCount: updatedBookingIds.length,
    updatedBookingIds,
  };
}
