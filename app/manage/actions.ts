"use server";

import { requireRole } from "@/lib/rbac";
import { approveBooking, rejectBooking } from "@/lib/bookingService";
import { sweepOverdue } from "@/lib/overdue";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { revalidatePath } from "next/cache";

export async function approveBookingReviewAction(
  bookingId: string,
  decisionReason: string
) {
  const session = await requireRole(["OWNER", "MANAGER", "ADMIN"]);

  if (!decisionReason || decisionReason.trim().length === 0) {
    return { success: false, error: "A decision note/reason is required." };
  }

  const result = await approveBooking({
    bookingId,
    reviewerId: session.id,
    decisionReason,
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

  if (!decisionReason || decisionReason.trim().length === 0) {
    return { success: false, error: "A rejection reason is mandatory." };
  }

  const result = await rejectBooking({
    bookingId,
    reviewerId: session.id,
    decisionReason,
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

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { resource: true, user: true },
  });

  if (!booking) return { success: false, error: "Booking not found." };
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
