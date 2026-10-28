"use server";

import { z } from "zod";
import { requireAuth, canManageResource } from "@/lib/rbac";
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

const CancelBookingSchema = z.object({
  bookingId: z.string().min(1, "Booking ID is required"),
  reason: z.string().max(500).optional(),
});

const CheckInSchema = z.object({
  bookingId: z.string().min(1, "Booking ID is required"),
  rating: z.coerce.number().min(1).max(5).default(5),
  checklist: z.array(z.string()).default([]),
  notes: z.string().max(1000).optional().default(""),
  photoUrl: z.string().optional().default(""),
});

const ReturnSchema = z.object({
  bookingId: z.string().min(1, "Booking ID is required"),
  rating: z.coerce.number().min(1).max(5).default(5),
  checklist: z.array(z.string()).default([]),
  notes: z.string().max(1000).optional().default(""),
  photoUrl: z.string().optional().default(""),
});

const ExtendBookingSchema = z.object({
  bookingId: z.string().min(1, "Booking ID is required"),
  extension: z.union([
    z.number().positive().max(24),
    z.string().min(1),
    z.date(),
  ]),
});

const IncidentReportSchema = z.object({
  bookingId: z.string().min(1).nullable().optional(),
  resourceId: z.string().min(1, "Resource ID is required"),
  type: z.enum(["DAMAGE", "DELAY", "MALFUNCTION", "SAFETY_VIOLATION", "OTHER"]),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  description: z.string().min(5, "Description must be at least 5 characters").max(2000),
});

export async function cancelBookingUserAction(
  bookingId: string,
  reason?: string
): Promise<{ success: boolean; promotedBookingId?: string | null; error?: string }> {
  const session = await requireAuth();

  const parseResult = CancelBookingSchema.safeParse({ bookingId, reason });
  if (!parseResult.success) {
    return { success: false, error: parseResult.error.issues[0]?.message || "Invalid input" };
  }

  const booking = await prisma.booking.findUnique({
    where: { id: parseResult.data.bookingId },
    include: { resource: true },
  });

  if (!booking) return { success: false, error: "Booking not found" };

  if (
    booking.userId !== session.id &&
    !canManageResource(session, booking.resource)
  ) {
    return { success: false, error: "Forbidden: You cannot cancel another user's booking." };
  }

  const result = await cancelBooking({
    bookingId: parseResult.data.bookingId,
    actorId: session.id,
    reason: parseResult.data.reason || `Cancelled by ${session.name}`,
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

  const rawBookingId = formData.get("bookingId");
  const rawRating = formData.get("rating");
  const rawChecklist = formData.get("checklist") as string;
  const rawNotes = formData.get("notes");
  const rawPhotoUrl = formData.get("photoUrl");

  let parsedChecklist: string[] = [];
  try {
    parsedChecklist = JSON.parse(rawChecklist || "[]");
  } catch {
    parsedChecklist = ["Operational check passed"];
  }

  const parseResult = CheckInSchema.safeParse({
    bookingId: rawBookingId,
    rating: rawRating,
    checklist: parsedChecklist,
    notes: rawNotes || "",
    photoUrl: rawPhotoUrl || "",
  });

  if (!parseResult.success) {
    return { success: false, error: parseResult.error.issues[0]?.message || "Invalid input" };
  }

  const { bookingId, rating, checklist, notes, photoUrl } = parseResult.data;

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { resource: true },
  });

  if (!booking) return { success: false, error: "Booking not found" };

  if (
    booking.userId !== session.id &&
    !canManageResource(session, booking.resource)
  ) {
    return { success: false, error: "Forbidden: You cannot check in another user's booking." };
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

  const rawBookingId = formData.get("bookingId");
  const rawRating = formData.get("rating");
  const rawChecklist = formData.get("checklist") as string;
  const rawNotes = formData.get("notes");
  const rawPhotoUrl = formData.get("photoUrl");

  let parsedChecklist: string[] = [];
  try {
    parsedChecklist = JSON.parse(rawChecklist || "[]");
  } catch {
    parsedChecklist = ["Checked out and powered off"];
  }

  const parseResult = ReturnSchema.safeParse({
    bookingId: rawBookingId,
    rating: rawRating,
    checklist: parsedChecklist,
    notes: rawNotes || "",
    photoUrl: rawPhotoUrl || "",
  });

  if (!parseResult.success) {
    return { success: false, error: parseResult.error.issues[0]?.message || "Invalid input" };
  }

  const { bookingId, rating, checklist, notes, photoUrl } = parseResult.data;

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { resource: true },
  });

  if (!booking) return { success: false, error: "Booking not found" };

  if (
    booking.userId !== session.id &&
    !canManageResource(session, booking.resource)
  ) {
    return { success: false, error: "Forbidden: You cannot return another user's booking." };
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

  const parseResult = ExtendBookingSchema.safeParse({ bookingId, extension });
  if (!parseResult.success) {
    return { success: false, error: parseResult.error.issues[0]?.message || "Invalid input" };
  }

  const booking = await prisma.booking.findUnique({
    where: { id: parseResult.data.bookingId },
    include: { resource: true },
  });

  if (!booking) return { success: false, error: "Booking not found" };

  if (
    booking.userId !== session.id &&
    !canManageResource(session, booking.resource)
  ) {
    return { success: false, error: "Forbidden: You cannot extend another user's booking." };
  }

  const isHours = typeof parseResult.data.extension === "number";
  const result = await extendBooking({
    bookingId: parseResult.data.bookingId,
    actorId: session.id,
    additionalHours: isHours ? (parseResult.data.extension as number) : undefined,
    newEndDate: !isHours ? (parseResult.data.extension as string | Date) : undefined,
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

  const rawBookingId = formData.get("bookingId") as string;
  const rawResourceId = formData.get("resourceId") as string;
  const rawType = formData.get("type") as string;
  const rawSeverity = formData.get("severity") as string;
  const rawDescription = formData.get("description") as string;

  const parseResult = IncidentReportSchema.safeParse({
    bookingId: rawBookingId || null,
    resourceId: rawResourceId,
    type: rawType,
    severity: rawSeverity,
    description: rawDescription,
  });

  if (!parseResult.success) {
    return { success: false, error: parseResult.error.issues[0]?.message || "Invalid incident details." };
  }

  const { bookingId, resourceId, type, severity, description } = parseResult.data;

  const resource = await prisma.resource.findUnique({
    where: { id: resourceId },
  });

  if (!resource) return { success: false, error: "Resource not found." };

  if (bookingId) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });
    if (!booking) return { success: false, error: "Linked booking not found." };

    if (
      booking.userId !== session.id &&
      !canManageResource(session, resource)
    ) {
      return { success: false, error: "Forbidden: You cannot report incidents on another user's reservation." };
    }
  }

  const aiResult = await summarizeIncident({
    type,
    severity,
    description,
    resourceName: resource.name,
    reporterName: session.name,
  });

  const incident = await prisma.$transaction(async (tx) => {
    const inc = await tx.incident.create({
      data: {
        bookingId: bookingId || null,
        resourceId,
        reporterId: session.id,
        type,
        severity,
        description,
        aiSummary: aiResult.summary,
        aiSeverity: aiResult.suggestedSeverity,
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
