"use server";

import { requireAuth } from "@/lib/rbac";
import {
  cancelBooking,
  checkInBooking,
  returnBooking,
  extendBooking,
} from "@/lib/bookingService";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { summarizeIncident } from "@/lib/ai";
import { createNotification } from "@/lib/notifications";
import { revalidatePath } from "next/cache";

export async function cancelBookingUserAction(
  bookingId: string,
  reason?: string
): Promise<{ success: boolean; promotedBookingId?: string | null; error?: string }> {
  const session = await requireAuth();

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
  });

  if (!booking) return { success: false, error: "Booking not found" };

  if (
    booking.userId !== session.id &&
    session.role !== "ADMIN" &&
    session.role !== "MANAGER"
  ) {
    return { success: false, error: "Forbidden: You cannot cancel another user's booking." };
  }

  const result = await cancelBooking({
    bookingId,
    actorId: session.id,
    reason: reason || `Cancelled by ${session.name}`,
  });

  if (result.success) {
    revalidatePath("/bookings");
    revalidatePath(`/bookings/${bookingId}`);
    revalidatePath("/manage");
  }

  return result;
}

export async function checkInUserAction(formData: FormData) {
  const session = await requireAuth();

  const bookingId = formData.get("bookingId") as string;
  const rating = parseInt(formData.get("rating") as string, 10) || 5;
  const checklistJson = formData.get("checklist") as string;
  const notes = formData.get("notes") as string;
  const photoUrl = formData.get("photoUrl") as string;

  let checklist: string[] = [];
  try {
    checklist = JSON.parse(checklistJson || "[]");
  } catch {
    checklist = ["Operational check passed"];
  }

  const result = await checkInBooking({
    bookingId,
    actorId: session.id,
    rating,
    checklist,
    notes,
    photoUrl,
  });

  if (result.success) {
    revalidatePath("/bookings");
    revalidatePath(`/bookings/${bookingId}`);
    revalidatePath("/manage");
  }

  return result;
}

export async function returnUserAction(formData: FormData) {
  const session = await requireAuth();

  const bookingId = formData.get("bookingId") as string;
  const rating = parseInt(formData.get("rating") as string, 10) || 5;
  const checklistJson = formData.get("checklist") as string;
  const notes = formData.get("notes") as string;
  const photoUrl = formData.get("photoUrl") as string;

  let checklist: string[] = [];
  try {
    checklist = JSON.parse(checklistJson || "[]");
  } catch {
    checklist = ["Checked out and powered off"];
  }

  const result = await returnBooking({
    bookingId,
    actorId: session.id,
    rating,
    checklist,
    notes,
    photoUrl,
  });

  if (result.success) {
    revalidatePath("/bookings");
    revalidatePath(`/bookings/${bookingId}`);
    revalidatePath("/manage");
  }

  return result;
}

export async function extendBookingAction(
  bookingId: string,
  extension: number | string | Date
) {
  const session = await requireAuth();

  const isHours = typeof extension === "number";
  const result = await extendBooking({
    bookingId,
    actorId: session.id,
    additionalHours: isHours ? extension : undefined,
    newEndDate: !isHours ? extension : undefined,
  });

  if (result.success) {
    revalidatePath("/bookings");
    revalidatePath(`/bookings/${bookingId}`);
    revalidatePath("/manage");
  }

  return result;
}

export async function reportIncidentAction(formData: FormData) {
  const session = await requireAuth();

  const bookingId = (formData.get("bookingId") as string) || null;
  const resourceId = formData.get("resourceId") as string;
  const type = formData.get("type") as string;
  const severity = formData.get("severity") as string;
  const description = formData.get("description") as string;

  if (!resourceId || !type || !severity || !description) {
    return { success: false, error: "Please provide all incident details." };
  }

  const resource = await prisma.resource.findUnique({
    where: { id: resourceId },
  });

  if (!resource) return { success: false, error: "Resource not found." };

  const aiSummary = await summarizeIncident({
    type,
    severity,
    description,
    resourceName: resource.name,
    reporterName: session.name,
  });

  const incident = await prisma.$transaction(async (tx) => {
    const inc = await tx.incident.create({
      data: {
        bookingId,
        resourceId,
        reporterId: session.id,
        type,
        severity,
        description,
        aiSummary,
        status: "OPEN",
      },
    });

    await audit(tx, {
      actorId: session.id,
      action: "INCIDENT_REPORTED",
      entityType: "Incident",
      entityId: inc.id,
      after: { type, severity, description },
      reason: `Incident reported by ${session.name}`,
    });

    // Notify owner & manager
    await createNotification(tx, {
      userId: resource.ownerId,
      type: "INCIDENT_REPORTED",
      message: `New incident reported on "${resource.name}" (${severity}): "${description.slice(0, 50)}..."`,
      link: `/incidents/${inc.id}`,
    });

    return inc;
  });

  revalidatePath("/bookings");
  if (bookingId) revalidatePath(`/bookings/${bookingId}`);
  revalidatePath("/manage");

  return { success: true, incidentId: incident.id };
}
