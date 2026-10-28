"use server";

import { requireRole } from "@/lib/rbac";
import { approveBooking, rejectBooking } from "@/lib/bookingService";
import { sweepOverdue } from "@/lib/overdue";
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

export async function manualSweepAction(): Promise<void> {
  await requireRole(["OWNER", "MANAGER", "ADMIN"]);
  await sweepOverdue();
  revalidatePath("/manage");
}
