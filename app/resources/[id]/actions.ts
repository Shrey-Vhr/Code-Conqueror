"use server";

import { requestBooking } from "@/lib/bookingService";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function submitBookingRequest(formData: FormData) {
  const session = await getSession();
  if (!session) {
    return { success: false, error: "Please log in to submit a reservation request." };
  }

  try {
    const resourceId = formData.get("resourceId") as string;
    const dateStr = formData.get("date") as string;
    const startTimeStr = formData.get("startTime") as string;
    const endTimeStr = formData.get("endTime") as string;
    const purpose = formData.get("purpose") as string;
    const purposeDetails = formData.get("purposeDetails") as string;

    if (!resourceId || !dateStr || !startTimeStr || !endTimeStr || !purpose) {
      return { success: false, error: "Please fill out all required booking fields." };
    }

    const start = new Date(`${dateStr}T${startTimeStr}:00`);
    const end = new Date(`${dateStr}T${endTimeStr}:00`);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return { success: false, error: "Invalid date or time provided." };
    }

    const result = await requestBooking({
      userId: session.id,
      resourceId,
      start,
      end,
      purpose,
      purposeDetails,
    });

    if (result.success && "bookingId" in result) {
      revalidatePath(`/resources/${resourceId}`);
      revalidatePath(`/bookings`);
      return {
        success: true,
        bookingId: result.bookingId,
        status: result.status,
        waitlistPosition: result.waitlistPosition,
      };
    } else {
      return {
        success: false,
        error: "error" in result && typeof result.error === "string" ? result.error : "Failed to book",
      };
    }
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to submit booking request." };
  }
}
