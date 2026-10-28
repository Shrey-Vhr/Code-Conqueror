import { prisma } from "./prisma";
import { audit } from "./audit";
import { createNotification } from "./notifications";
import { addMinutes } from "date-fns";
import { cancelBooking, recalculateWaitlistScores } from "./bookingService";

export async function sweepOverdue(): Promise<{
  overdueCount: number;
  noShowCount: number;
  remindersSent: number;
  completedCount: number;
  updatedBookingIds: string[];
}> {
  const now = new Date();
  const updatedBookingIds: string[] = [];
  let noShowCount = 0;
  let remindersSent = 0;
  let completedCount = 0;

  // 1. SWEEP ACTIVE CHECKED-IN OVERDUE SESSIONS
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

  for (const booking of overdueBookings) {
    await prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: booking.id },
        data: { status: "OVERDUE" },
      });

      await audit(tx, {
        actorId: null,
        action: "BOOKING_MARKED_OVERDUE",
        entityType: "Booking",
        entityId: booking.id,
        before: { status: "CHECKED_IN" },
        after: { status: "OVERDUE" },
        reason: `Scheduled return time (${booking.end.toISOString()}) elapsed without condition checkout.`,
      });

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

      await createNotification(tx, {
        userId: booking.userId,
        type: "OVERDUE",
        message: `ALERT: Your reservation for "${booking.resource.name}" is overdue! Please complete the return check-out immediately.`,
        link: `/bookings/${booking.id}`,
      });

      await createNotification(tx, {
        userId: booking.resource.ownerId,
        type: "OVERDUE",
        message: `Overdue Alert: "${booking.resource.name}" has not been returned by ${booking.user.name}. A delay incident was logged.`,
        link: `/bookings/${booking.id}`,
      });

      updatedBookingIds.push(booking.id);
    });
  }

  // 2. SWEEP NO-SHOWS (APPROVED bookings with start time elapsed by > 30 minutes without check-in)
  const noShowCutoff = addMinutes(now, -30);
  const noShowBookings = await prisma.booking.findMany({
    where: {
      status: "APPROVED",
      start: { lt: noShowCutoff },
    },
    include: {
      user: true,
      resource: true,
    },
  });

  for (const booking of noShowBookings) {
    // 1. Increment conduct strike
    await prisma.user.update({
      where: { id: booking.userId },
      data: { strikes: { increment: 1 } },
    });

    // 2. Cancel booking, forfeit deposit, and auto-promote top waitlist candidate into freed slot
    await cancelBooking({
      bookingId: booking.id,
      actorId: "system",
      reason: "Automatically cancelled due to user no-show (>30 minutes past start time). Security deposit forfeited.",
      forfeitDeposit: true,
    });

    await prisma.notification.create({
      data: {
        userId: booking.userId,
        type: "NO_SHOW_PENALTY",
        message: `Your reservation for "${booking.resource.name}" was cancelled due to no-show. 1 conduct strike was assigned and your security deposit was forfeited.`,
        link: `/bookings/${booking.id}`,
      },
    });

    noShowCount++;
  }

  // 3. DISPATCH REMINDER NOTIFICATIONS (bookings starting within 1 hour)
  const oneHourFromNow = addMinutes(now, 60);
  const upcomingBookings = await prisma.booking.findMany({
    where: {
      status: "APPROVED",
      start: { gte: now, lte: oneHourFromNow },
    },
    include: { resource: true },
  });

  for (const booking of upcomingBookings) {
    const existingReminder = await prisma.notification.findFirst({
      where: {
        userId: booking.userId,
        type: "REMINDER",
        link: `/bookings/${booking.id}`,
      },
    });

    if (!existingReminder) {
      await prisma.notification.create({
        data: {
          userId: booking.userId,
          type: "REMINDER",
          message: `Reminder: Your reservation for "${booking.resource.name}" starts within 1 hour (${booking.start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}). Please be ready for check-in.`,
          link: `/bookings/${booking.id}`,
        },
      });
      remindersSent++;
    }
  }

  // 4. TRANSITION CLEAN RETURNED BOOKINGS TO COMPLETED
  const returnedBookings = await prisma.booking.findMany({
    where: { status: "RETURNED" },
    include: {
      incidents: {
        where: { status: { not: "RESOLVED" } },
      },
    },
  });

  for (const b of returnedBookings) {
    if (b.incidents.length === 0) {
      await prisma.$transaction(async (tx) => {
        if (b.depositHeld > 0) {
          await tx.user.update({
            where: { id: b.userId },
            data: { credits: { increment: b.depositHeld } },
          });
        }
        await tx.booking.update({
          where: { id: b.id },
          data: { status: "COMPLETED", depositHeld: 0 },
        });
        await audit(tx, {
          actorId: null,
          action: "BOOKING_AUTO_COMPLETED",
          entityType: "Booking",
          entityId: b.id,
          before: { status: "RETURNED" },
          after: { status: "COMPLETED" },
          reason: "Booking auto-completed following return with no outstanding incidents",
        });
        completedCount++;
      });
    }
  }

  // 5. REFRESH WAITLIST SCORES & POSITIONS FOR ALL RESOURCES WITH ACTIVE WAITLISTS
  const waitlistedResources = await prisma.booking.findMany({
    where: { status: "WAITLISTED" },
    select: { resourceId: true },
    distinct: ["resourceId"],
  });

  for (const item of waitlistedResources) {
    await recalculateWaitlistScores(item.resourceId);
  }

  return {
    overdueCount: updatedBookingIds.length,
    noShowCount,
    remindersSent,
    completedCount,
    updatedBookingIds,
  };
}
