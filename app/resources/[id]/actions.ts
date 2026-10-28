"use server";

import { z } from "zod";
import { requestBooking } from "@/lib/bookingService";
import { requireAuth } from "@/lib/rbac";
import { revalidatePath } from "next/cache";

const BookingRequestSchema = z.object({
  resourceId: z.string().min(1, "Resource ID is required"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid start time format (HH:MM)"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid end time format (HH:MM)"),
  purpose: z.enum(["COURSEWORK", "RESEARCH", "PERSONAL", "CLUB"]),
  purposeDetails: z.string().max(500).optional().default(""),
});

export async function submitBookingRequest(formData: FormData) {
  const session = await requireAuth();

  const parseResult = BookingRequestSchema.safeParse({
    resourceId: formData.get("resourceId"),
    date: formData.get("date"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    purpose: formData.get("purpose"),
    purposeDetails: formData.get("purposeDetails") || "",
  });

  if (!parseResult.success) {
    return { success: false, error: parseResult.error.errors[0]?.message || "Invalid reservation details." };
  }

  const { resourceId, date, startTime, endTime, purpose, purposeDetails } = parseResult.data;

  try {
    const start = new Date(`${date}T${startTime}:00`);
    const end = new Date(`${date}T${endTime}:00`);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return { success: false, error: "Invalid date or time provided." };
    }

    if (start >= end) {
      return { success: false, error: "End time must be after start time." };
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
