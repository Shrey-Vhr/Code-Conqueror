"use server";

import { z } from "zod";
import { requireRole, canReviewBooking } from "@/lib/rbac";
import { approveBooking, rejectBooking } from "@/lib/bookingService";
import { sweepOverdue } from "@/lib/overdue";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { revalidatePath } from "next/cache";

const ReviewDecisionSchema = z.object({
  bookingId: z.string().min(1, "Booking ID is required"),
  decisionReason: z.string().min(2, "Decision note must be at least 2 characters").max(500),
});

const BookingIdSchema = z.object({
  bookingId: z.string().min(1, "Booking ID is required"),
});

export async function approveBookingReviewAction(
  bookingId: string,
  decisionReason: string
) {
  const session = await requireRole(["OWNER", "MANAGER", "ADMIN"]);

  const parseResult = ReviewDecisionSchema.safeParse({ bookingId, decisionReason });
  if (!parseResult.success) {
    return { success: false, error: parseResult.error.issues[0]?.message || "Invalid review decision" };
  }

  const booking = await prisma.booking.findUnique({
    where: { id: parseResult.data.bookingId },
    include: { resource: true },
  });

  if (!booking) return { success: false, error: "Booking not found." };

  if (!canReviewBooking(session, { ownerId: booking.resource.ownerId, department: booking.resource.department })) {
    return { success: false, error: "Forbidden: You are not authorized to review reservations for this resource." };
  }

  const result = await approveBooking({
    bookingId: parseResult.data.bookingId,
    reviewerId: session.id,
    decisionReason: parseResult.data.decisionReason,
  });

  if (result.success) {
    revalidatePath("/manage");
    revalidatePath(`/bookings/${bookingId}`);
    revalidatePath("/bookings");
  }

  return result;
}

export async function rejectBookingReviewAction(
  bookingId: string,
  decisionReason: string
) {
  const session = await requireRole(["OWNER", "MANAGER", "ADMIN"]);

  const parseResult = ReviewDecisionSchema.safeParse({ bookingId, decisionReason });
  if (!parseResult.success) {
    return { success: false, error: parseResult.error.issues[0]?.message || "Invalid review decision" };
  }

  const booking = await prisma.booking.findUnique({
    where: { id: parseResult.data.bookingId },
    include: { resource: true },
  });

  if (!booking) return { success: false, error: "Booking not found." };

  if (!canReviewBooking(session, { ownerId: booking.resource.ownerId, department: booking.resource.department })) {
    return { success: false, error: "Forbidden: You are not authorized to review reservations for this resource." };
  }

  const result = await rejectBooking({
    bookingId: parseResult.data.bookingId,
    reviewerId: session.id,
    decisionReason: parseResult.data.decisionReason,
  });

  if (result.success) {
    revalidatePath("/manage");
    revalidatePath(`/bookings/${bookingId}`);
    revalidatePath("/bookings");
  }

  return result;
}

export async function promoteWaitlistToPendingAction(bookingId: string) {
  const session = await requireRole(["OWNER", "MANAGER", "ADMIN"]);

  const parseResult = BookingIdSchema.safeParse({ bookingId });
  if (!parseResult.success) {
    return { success: false, error: parseResult.error.issues[0]?.message || "Invalid booking ID" };
  }

  const booking = await prisma.booking.findUnique({
    where: { id: parseResult.data.bookingId },
    include: { resource: true, user: true },
  });

  if (!booking) return { success: false, error: "Booking not found." };

  if (!canReviewBooking(session, { ownerId: booking.resource.ownerId, department: booking.resource.department })) {
    return { success: false, error: "Forbidden: You are not authorized to manage waitlists for this resource." };
  }

  if (booking.status !== "WAITLISTED") {
    return { success: false, error: `Cannot promote booking with status "${booking.status}". Must be WAITLISTED.` };
  }

  await prisma.$transaction(async (tx) => {
    await tx.booking.update({
      where: { id: bookingId },
      data: {
        status: "PENDING",
        waitlistPosition: null,
      },
    });

    await audit(tx, {
      actorId: session.id,
      action: "WAITLIST_MANUALLY_PROMOTED",
      entityType: "Booking",
      entityId: bookingId,
      before: { status: "WAITLISTED", waitlistPosition: booking.waitlistPosition },
      after: { status: "PENDING", waitlistPosition: null },
      reason: `Manually promoted from waitlist to pending review by ${session.name}`,
    });

    await createNotification(tx, {
      userId: booking.userId,
      type: "WAITLIST_PROMOTED",
      message: `Your waitlisted reservation for "${booking.resource.name}" has been promoted to the pending approval queue!`,
      link: `/bookings/${bookingId}`,
    });
  });

  revalidatePath("/manage");
  revalidatePath(`/bookings/${bookingId}`);
  revalidatePath("/bookings");

  return { success: true };
}

export async function manualSweepAction(): Promise<void> {
  await requireRole(["OWNER", "MANAGER", "ADMIN"]);
  await sweepOverdue();
  revalidatePath("/manage");
}
