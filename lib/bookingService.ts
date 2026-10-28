import { prisma } from "./prisma";
import { audit } from "./audit";
import { createNotification } from "./notifications";
import { checkEligibility } from "./eligibility";
import { checkBookingConflicts } from "./conflicts";
import { computePriorityScore, checkFairnessLimits, getUserRecentHours } from "./fairness";
import { summarizeIncident } from "./ai";

export interface RequestBookingParams {
  userId: string;
  resourceId: string;
  start: Date;
  end: Date;
  purpose: string;
  purposeDetails?: string;
}

export async function requestBooking(params: RequestBookingParams) {
  const { userId, resourceId, start, end, purpose, purposeDetails } = params;

  // 1. Fetch user and resource with relations
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      certifications: {
        include: { training: true },
      },
    },
  });

  const resource = await prisma.resource.findUnique({
    where: { id: resourceId },
    include: {
      requirements: {
        include: { training: true },
      },
      owner: true,
    },
  });

  if (!user) throw new Error("User not found.");
  if (!resource) throw new Error("Resource not found.");

  // 2. Check eligibility
  const eligibility = checkEligibility(user, resource);
  if (!eligibility.eligible) {
    return {
      success: false,
      error: `Eligibility requirements not met: ${eligibility.missing.join("; ")}`,
      missing: eligibility.missing,
    };
  }

  // 3. Check fairness limits
  const fairness = await checkFairnessLimits(userId, resourceId, start, end);
  if (!fairness.allowed) {
    return {
      success: false,
      error: `Fairness policy exceeded: ${fairness.reasons.join("; ")}`,
      reasons: fairness.reasons,
    };
  }

  // 4. Compute priority score
  const recentHours = await getUserRecentHours(userId);
  const priorityBreakdown = computePriorityScore({
    recentHours30d: recentHours,
    purpose,
    strikes: user.strikes,
    role: user.role,
  });

  // 5. Deposit and credit cost calculation
  const durationHours = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60));
  const estimatedCost = durationHours * resource.creditCostPerHour;
  const depositNeeded = resource.depositCredits;

  if (user.credits < depositNeeded + estimatedCost) {
    return {
      success: false,
      error: `Insufficient credits. You need ${depositNeeded + estimatedCost} credits (Deposit: ${depositNeeded}, Booking: ${estimatedCost}), but have ${user.credits}.`,
    };
  }

  // 6. Check conflicts
  const conflictCheck = await checkBookingConflicts(resourceId, start, end);

  return await prisma.$transaction(async (tx) => {
    let status = "PENDING";
    let waitlistPosition: number | null = null;

    if (conflictCheck.hasConflict) {
      status = "WAITLISTED";
      const existingWaitlist = await tx.booking.count({
        where: {
          resourceId,
          status: "WAITLISTED",
          start: { lt: end },
          end: { gt: start },
        },
      });
      waitlistPosition = existingWaitlist + 1;
    }

    // Deduct deposit credits from user balance
    if (depositNeeded > 0) {
      await tx.user.update({
        where: { id: userId },
        data: { credits: { decrement: depositNeeded } },
      });
    }

    const booking = await tx.booking.create({
      data: {
        userId,
        resourceId,
        start,
        end,
        purpose,
        purposeDetails: purposeDetails || null,
        status,
        waitlistPosition,
        priorityScore: priorityBreakdown.finalScore,
        priorityBreakdown: JSON.stringify(priorityBreakdown),
        eligibilitySnapshot: JSON.stringify(eligibility),
        depositHeld: depositNeeded,
      },
    });

    await audit(tx, {
      actorId: userId,
      action: status === "WAITLISTED" ? "BOOKING_WAITLISTED" : "BOOKING_REQUESTED",
      entityType: "Booking",
      entityId: booking.id,
      after: {
        status,
        waitlistPosition,
        priorityScore: priorityBreakdown.finalScore,
        depositHeld: depositNeeded,
      },
      reason:
        status === "WAITLISTED"
          ? `Placed on waitlist (pos #${waitlistPosition}) due to slot conflict: ${conflictCheck.reasons.join(", ")}`
          : "Initial reservation submission",
    });

    if (status === "WAITLISTED") {
      await createNotification(tx, {
        userId,
        type: "WAITLIST_PLACED",
        message: `Your booking for "${resource.name}" has been placed on the waitlist at position #${waitlistPosition}.`,
        link: `/bookings/${booking.id}`,
      });
    } else {
      await createNotification(tx, {
        userId,
        type: "BOOKING_REQUESTED",
        message: `Your booking request for "${resource.name}" was received and is pending owner approval.`,
        link: `/bookings/${booking.id}`,
      });

      await createNotification(tx, {
        userId: resource.ownerId,
        type: "BOOKING_REVIEW_REQUIRED",
        message: `New booking request for "${resource.name}" submitted by ${user.name}.`,
        link: `/manage`,
      });
    }

    return {
      success: true,
      bookingId: booking.id,
      status,
      waitlistPosition,
      priorityScore: priorityBreakdown.finalScore,
    };
  });
}

export async function approveBooking(params: {
  bookingId: string;
  reviewerId: string;
  decisionReason: string;
}) {
  const { bookingId, reviewerId, decisionReason } = params;

  if (!decisionReason || decisionReason.trim().length === 0) {
    return { success: false, error: "A decision reason is mandatory for approvals." };
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { resource: true, user: true },
  });

  if (!booking) return { success: false, error: "Booking not found." };
  if (booking.status !== "PENDING") {
    return { success: false, error: `Cannot approve booking in status "${booking.status}".` };
  }

  return await prisma.$transaction(async (tx) => {
    const updated = await tx.booking.update({
      where: { id: bookingId },
      data: {
        status: "APPROVED",
        reviewerId,
        decisionReason: decisionReason.trim(),
      },
    });

    await audit(tx, {
      actorId: reviewerId,
      action: "BOOKING_APPROVED",
      entityType: "Booking",
      entityId: bookingId,
      before: { status: booking.status },
      after: { status: "APPROVED", decisionReason },
      reason: decisionReason,
    });

    await createNotification(tx, {
      userId: booking.userId,
      type: "BOOKING_APPROVED",
      message: `Your reservation for "${booking.resource.name}" has been APPROVED. Note: "${decisionReason}"`,
      link: `/bookings/${bookingId}`,
    });

    return { success: true, booking: updated };
  });
}

export async function rejectBooking(params: {
  bookingId: string;
  reviewerId: string;
  decisionReason: string;
}) {
  const { bookingId, reviewerId, decisionReason } = params;

  if (!decisionReason || decisionReason.trim().length === 0) {
    return { success: false, error: "A rejection reason is mandatory." };
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { resource: true, user: true },
  });

  if (!booking) return { success: false, error: "Booking not found." };
  if (booking.status !== "PENDING" && booking.status !== "WAITLISTED") {
    return { success: false, error: `Cannot reject booking with status "${booking.status}".` };
  }

  return await prisma.$transaction(async (tx) => {
    // Refund deposit if held
    if (booking.depositHeld > 0) {
      await tx.user.update({
        where: { id: booking.userId },
        data: { credits: { increment: booking.depositHeld } },
      });
    }

    const updated = await tx.booking.update({
      where: { id: bookingId },
      data: {
        status: "REJECTED",
        reviewerId,
        decisionReason: decisionReason.trim(),
        depositHeld: 0,
      },
    });

    await audit(tx, {
      actorId: reviewerId,
      action: "BOOKING_REJECTED",
      entityType: "Booking",
      entityId: bookingId,
      before: { status: booking.status },
      after: { status: "REJECTED", decisionReason },
      reason: decisionReason,
    });

    await createNotification(tx, {
      userId: booking.userId,
      type: "BOOKING_REJECTED",
      message: `Your reservation for "${booking.resource.name}" was rejected. Reason: "${decisionReason}"`,
      link: `/bookings/${bookingId}`,
    });

    return { success: true, booking: updated };
  });
}

export async function cancelBooking(params: {
  bookingId: string;
  actorId: string;
  reason?: string;
}) {
  const { bookingId, actorId, reason } = params;

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { resource: true, user: true },
  });

  if (!booking) return { success: false, error: "Booking not found." };
  if (
    booking.status !== "PENDING" &&
    booking.status !== "APPROVED" &&
    booking.status !== "WAITLISTED"
  ) {
    return {
      success: false,
      error: `Cannot cancel booking with active/finished status "${booking.status}".`,
    };
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Refund deposit
    if (booking.depositHeld > 0) {
      await tx.user.update({
        where: { id: booking.userId },
        data: { credits: { increment: booking.depositHeld } },
      });
    }

    // 2. Mark cancelled
    await tx.booking.update({
      where: { id: bookingId },
      data: {
        status: "CANCELLED",
        depositHeld: 0,
        decisionReason: reason || "Cancelled by user or administrator",
      },
    });

    await audit(tx, {
      actorId,
      action: "BOOKING_CANCELLED",
      entityType: "Booking",
      entityId: bookingId,
      before: { status: booking.status },
      after: { status: "CANCELLED" },
      reason: reason || "Booking cancelled",
    });

    // 3. AUTO-PROMOTE TOP WAITLISTED BOOKING
    // Find waitlisted bookings for this resource that overlap
    const candidateWaitlists = await tx.booking.findMany({
      where: {
        resourceId: booking.resourceId,
        status: "WAITLISTED",
        start: { lt: booking.end },
        end: { gt: booking.start },
      },
      include: { user: true, resource: true },
      orderBy: [{ priorityScore: "desc" }, { createdAt: "asc" }],
    });

    let promotedBookingId: string | null = null;

    if (candidateWaitlists.length > 0) {
      const topCandidate = candidateWaitlists[0];

      await tx.booking.update({
        where: { id: topCandidate.id },
        data: {
          status: "APPROVED",
          waitlistPosition: null,
          decisionReason: `Auto-promoted from waitlist upon cancellation of booking #${booking.id}`,
        },
      });

      await audit(tx, {
        actorId,
        action: "WAITLIST_AUTO_PROMOTED",
        entityType: "Booking",
        entityId: topCandidate.id,
        before: { status: "WAITLISTED", waitlistPosition: topCandidate.waitlistPosition },
        after: { status: "APPROVED", waitlistPosition: null },
        reason: `Auto-promoted based on top priority score (${topCandidate.priorityScore}) after cancellation`,
      });

      await createNotification(tx, {
        userId: topCandidate.userId,
        type: "WAITLIST_PROMOTED",
        message: `Great news! You have been auto-promoted from the waitlist to APPROVED for "${topCandidate.resource.name}".`,
        link: `/bookings/${topCandidate.id}`,
      });

      promotedBookingId = topCandidate.id;

      // Update remaining waitlist positions
      const remainingWaitlists = candidateWaitlists.slice(1);
      for (let i = 0; i < remainingWaitlists.length; i++) {
        await tx.booking.update({
          where: { id: remainingWaitlists[i].id },
          data: { waitlistPosition: i + 1 },
        });
      }
    }

    return {
      success: true,
      promotedBookingId,
    };
  });
}

export async function checkInBooking(params: {
  bookingId: string;
  actorId: string;
  rating: number;
  checklist: string[];
  notes?: string;
  photoUrl?: string;
}) {
  const { bookingId, actorId, rating, checklist, notes, photoUrl } = params;

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { resource: true, user: true },
  });

  if (!booking) return { success: false, error: "Booking not found." };
  if (booking.status !== "APPROVED") {
    return {
      success: false,
      error: `Cannot check in. Booking must be APPROVED (current: "${booking.status}").`,
    };
  }

  return await prisma.$transaction(async (tx) => {
    await tx.booking.update({
      where: { id: bookingId },
      data: { status: "CHECKED_IN" },
    });

    const report = await tx.conditionReport.create({
      data: {
        bookingId,
        phase: "CHECK_IN",
        rating,
        checklist: JSON.stringify(checklist),
        notes: notes || null,
        photoUrl: photoUrl || null,
        recordedById: actorId,
      },
    });

    await audit(tx, {
      actorId,
      action: "BOOKING_CHECKED_IN",
      entityType: "Booking",
      entityId: bookingId,
      before: { status: "APPROVED" },
      after: { status: "CHECKED_IN", checkInRating: rating },
      reason: `User completed check-in condition report (Rating: ${rating}/5)`,
    });

    await createNotification(tx, {
      userId: booking.userId,
      type: "CHECK_IN_CONFIRMED",
      message: `Checked in successfully for "${booking.resource.name}". Have a productive session!`,
      link: `/bookings/${bookingId}`,
    });

    return { success: true, reportId: report.id };
  });
}

export async function returnBooking(params: {
  bookingId: string;
  actorId: string;
  rating: number;
  checklist: string[];
  notes?: string;
  photoUrl?: string;
}) {
  const { bookingId, actorId, rating, checklist, notes, photoUrl } = params;

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      resource: true,
      user: true,
      conditionReports: true,
    },
  });

  if (!booking) return { success: false, error: "Booking not found." };
  if (booking.status !== "CHECKED_IN" && booking.status !== "OVERDUE") {
    return {
      success: false,
      error: `Cannot return booking with status "${booking.status}". Must be CHECKED_IN or OVERDUE.`,
    };
  }

  const checkInReport = booking.conditionReports.find((r) => r.phase === "CHECK_IN");

  return await prisma.$transaction(async (tx) => {
    // 1. Record checkout condition report
    const checkOutReport = await tx.conditionReport.create({
      data: {
        bookingId,
        phase: "CHECK_OUT",
        rating,
        checklist: JSON.stringify(checklist),
        notes: notes || null,
        photoUrl: photoUrl || null,
        recordedById: actorId,
      },
    });

    let damageIncidentCreated = false;
    let incidentId: string | null = null;

    // 2. Check for rating drop => Auto-draft DAMAGE incident
    if (checkInReport && rating < checkInReport.rating) {
      damageIncidentCreated = true;
      const severity = rating <= 2 ? "HIGH" : "MEDIUM";
      const desc = `Equipment returned with degraded condition: rating fell from ${checkInReport.rating}/5 at check-in to ${rating}/5 at check-out. Notes: ${notes || "None provided"}`;

      const aiSumm = await summarizeIncident({
        type: "DAMAGE",
        severity,
        description: desc,
        resourceName: booking.resource.name,
        reporterName: booking.user.name,
      });

      const inc = await tx.incident.create({
        data: {
          bookingId,
          resourceId: booking.resourceId,
          reporterId: actorId,
          type: "DAMAGE",
          severity,
          description: desc,
          aiSummary: aiSumm,
          status: "OPEN",
        },
      });

      incidentId = inc.id;

      await audit(tx, {
        actorId,
        action: "INCIDENT_AUTO_DRAFTED",
        entityType: "Incident",
        entityId: inc.id,
        after: { type: "DAMAGE", severity, status: "OPEN" },
        reason: `Auto-drafted damage incident because condition rating dropped from ${checkInReport.rating} to ${rating}.`,
      });

      // Notify owner & manager
      await createNotification(tx, {
        userId: booking.resource.ownerId,
        type: "INCIDENT_ALERT",
        message: `Condition degradation detected on "${booking.resource.name}" (${checkInReport.rating}/5 -> ${rating}/5). Incident drafted for manager review.`,
        link: `/incidents/${inc.id}`,
      });
    }

    // 3. Refund deposit if no damage; hold if damage pending review
    if (!damageIncidentCreated && booking.depositHeld > 0) {
      await tx.user.update({
        where: { id: booking.userId },
        data: { credits: { increment: booking.depositHeld } },
      });
    }

    // 4. Update booking status
    await tx.booking.update({
      where: { id: bookingId },
      data: {
        status: "RETURNED",
        depositHeld: damageIncidentCreated ? booking.depositHeld : 0,
      },
    });

    await audit(tx, {
      actorId,
      action: "BOOKING_RETURNED",
      entityType: "Booking",
      entityId: bookingId,
      before: { status: booking.status },
      after: { status: "RETURNED", checkoutRating: rating },
      reason: `Return condition report recorded (Rating: ${rating}/5).`,
    });

    await createNotification(tx, {
      userId: booking.userId,
      type: "BOOKING_RETURNED",
      message: `Return complete for "${booking.resource.name}". Thank you for using CampusShare!`,
      link: `/bookings/${bookingId}`,
    });

    return {
      success: true,
      reportId: checkOutReport.id,
      damageIncidentCreated,
      incidentId,
    };
  });
}

export async function extendBooking(params: {
  bookingId: string;
  actorId: string;
  additionalHours: number;
}) {
  const { bookingId, actorId, additionalHours } = params;

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { resource: true, user: true },
  });

  if (!booking) return { success: false, error: "Booking not found." };
  if (booking.status !== "CHECKED_IN") {
    return {
      success: false,
      error: `Only active CHECKED_IN bookings can be extended. Current: "${booking.status}".`,
    };
  }

  const newEnd = new Date(booking.end.getTime() + additionalHours * 60 * 60 * 1000);

  // Check conflicts for the extended window
  const conflict = await checkBookingConflicts(
    booking.resourceId,
    booking.end,
    newEnd,
    booking.id
  );

  if (conflict.hasConflict) {
    return {
      success: false,
      error: `Cannot extend: ${conflict.reasons.join(", ")}`,
    };
  }

  // Check credit cost
  const extensionCost = additionalHours * booking.resource.creditCostPerHour;
  if (booking.user.credits < extensionCost) {
    return {
      success: false,
      error: `Insufficient credits for extension. Required: ${extensionCost}, available: ${booking.user.credits}.`,
    };
  }

  return await prisma.$transaction(async (tx) => {
    if (extensionCost > 0) {
      await tx.user.update({
        where: { id: booking.userId },
        data: { credits: { decrement: extensionCost } },
      });
    }

    await tx.booking.update({
      where: { id: bookingId },
      data: { end: newEnd },
    });

    await audit(tx, {
      actorId,
      action: "BOOKING_EXTENDED",
      entityType: "Booking",
      entityId: bookingId,
      before: { end: booking.end.toISOString() },
      after: { end: newEnd.toISOString() },
      reason: `Extended by ${additionalHours} hour(s)`,
    });

    await createNotification(tx, {
      userId: booking.userId,
      type: "BOOKING_EXTENDED",
      message: `Your booking for "${booking.resource.name}" has been extended by ${additionalHours} hour(s). New end time: ${newEnd.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.`,
      link: `/bookings/${bookingId}`,
    });

    return { success: true, newEnd };
  });
}
