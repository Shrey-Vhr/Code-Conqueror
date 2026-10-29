import { prisma } from "./prisma";
import { audit } from "./audit";
import { createNotification } from "./notifications";
import { checkEligibility } from "./eligibility";
import { checkBookingConflicts } from "./conflicts";
import {
  computePriorityScore,
  checkFairnessLimits,
  getUserRecentHours,
  grantMonthlyCreditsIfDue,
  getFairnessPolicy,
} from "./fairness";
import { summarizeIncident } from "./ai";

export interface RequestBookingParams {
  userId: string;
  resourceId: string;
  start: Date;
  end: Date;
  purpose: string;
  purposeDetails?: string;
}

export type RequestBookingResult =
  | {
      success: true;
      bookingId: string;
      status: string;
      waitlistPosition: number | null;
      priorityScore: number;
    }
  | {
      success: false;
      error: string;
      missing?: string[];
      reasons?: string[];
    };

export async function requestBooking(
  params: RequestBookingParams
): Promise<RequestBookingResult> {
  const { userId, resourceId, start, end, purpose, purposeDetails } = params;

  // Validate timing
  if (start.getTime() < Date.now() - 5 * 60 * 1000) {
    return { success: false, error: "Cannot create a reservation in the past." };
  }
  if (end.getTime() <= start.getTime()) {
    return { success: false, error: "End time must be after start time." };
  }

  // Grant monthly credits if due
  await grantMonthlyCreditsIfDue(userId);

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
  const [recentHours, policy] = await Promise.all([
    getUserRecentHours(userId),
    getFairnessPolicy(),
  ]);
  const priorityBreakdown = computePriorityScore({
    recentHours30d: recentHours,
    purpose,
    strikes: user.strikes,
    role: user.role,
    policy,
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
    // Re-verify conflicts inside transaction against other approved/active sessions
    const conflict = await tx.booking.findFirst({
      where: {
        resourceId: booking.resourceId,
        id: { not: bookingId },
        status: { in: ["APPROVED", "CHECKED_IN", "OVERDUE"] },
        start: { lt: booking.end },
        end: { gt: booking.start },
      },
    });

    if (conflict) {
      return {
        success: false,
        error:
          "Cannot approve: this time slot conflicts with an already approved or active booking.",
      };
    }

    const updated = await tx.booking.update({
      where: { id: bookingId },
      data: {
        status: "APPROVED",
        reviewerId,
        decisionReason: decisionReason.trim(),
      },
    });

    // Move any competing PENDING bookings for overlapping times to WAITLISTED
    const overlappingPending = await tx.booking.findMany({
      where: {
        resourceId: booking.resourceId,
        id: { not: bookingId },
        status: "PENDING",
        start: { lt: booking.end },
        end: { gt: booking.start },
      },
    });

    for (const pend of overlappingPending) {
      const currentMax = await tx.booking.findFirst({
        where: { resourceId: booking.resourceId, status: "WAITLISTED" },
        orderBy: { waitlistPosition: "desc" },
        select: { waitlistPosition: true },
      });
      const nextPos = (currentMax?.waitlistPosition || 0) + 1;
      await tx.booking.update({
        where: { id: pend.id },
        data: {
          status: "WAITLISTED",
          waitlistPosition: nextPos,
          decisionReason: "Time slot was claimed by another approved reservation; queued on waitlist",
        },
      });

      await audit(tx, {
        actorId: reviewerId,
        action: "BOOKING_AUTO_WAITLISTED",
        entityType: "Booking",
        entityId: pend.id,
        before: { status: "PENDING" },
        after: { status: "WAITLISTED", waitlistPosition: nextPos },
        reason: `Overlapping slot approved for booking ${bookingId}`,
      });

      await createNotification(tx, {
        userId: pend.userId,
        type: "WAITLIST_PLACED",
        message: `Another reservation for "${booking.resource.name}" was approved for your requested time slot. Your request has been queued at waitlist position #${nextPos}.`,
        link: `/bookings/${pend.id}`,
      });
    }

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

export type CancelBookingResult =
  | {
      success: true;
      promotedBookingId: string | null;
    }
  | {
      success: false;
      error: string;
    };

export async function cancelBooking(params: {
  bookingId: string;
  actorId: string;
  reason?: string;
  forfeitDeposit?: boolean;
}): Promise<CancelBookingResult> {
  const { bookingId, actorId, reason, forfeitDeposit = false } = params;

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
    // 1. Settle deposit: refund unless forfeited (e.g. no-show penalty)
    if (booking.depositHeld > 0 && !forfeitDeposit) {
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

    // Notify the affected parties of the cancellation
    if (actorId !== "system") {
      if (actorId !== booking.userId) {
        await createNotification(tx, {
          userId: booking.userId,
          type: "BOOKING_CANCELLED",
          message: `Your reservation for "${booking.resource.name}" was cancelled by staff. Reason: "${reason || "No reason given"}"`,
          link: `/bookings/${bookingId}`,
        });
      } else if (
        booking.status === "APPROVED" &&
        booking.resource.ownerId !== booking.userId
      ) {
        await createNotification(tx, {
          userId: booking.resource.ownerId,
          type: "BOOKING_CANCELLED",
          message: `${booking.user.name} cancelled an approved reservation for "${booking.resource.name}". The slot is free again.`,
          link: `/manage`,
        });
      }
    }

    // 3. AUTO-PROMOTE TOP WAITLISTED BOOKING
    // ONLY triggered if the cancelled booking was actually APPROVED or CHECKED_IN (held the slot)
    let promotedBookingId: string | null = null;

    if (booking.status === "APPROVED" || booking.status === "CHECKED_IN") {
      // Recalculate waitlist priority scores including active waitlist-age bonus
      const allWaitlisted = await tx.booking.findMany({
        where: {
          resourceId: booking.resourceId,
          status: "WAITLISTED",
        },
        include: { user: true },
      });

      const now = new Date();
      for (const w of allWaitlisted) {
        const hoursWaiting = (now.getTime() - w.createdAt.getTime()) / (1000 * 60 * 60);
        const userRecentHours = await getUserRecentHours(w.userId);
        const breakdown = computePriorityScore({
          baseScore: 100,
          recentHours30d: userRecentHours,
          hoursWaiting,
          purpose: w.purpose,
          strikes: w.user.strikes,
          role: w.user.role,
        });

        await tx.booking.update({
          where: { id: w.id },
          data: {
            priorityScore: breakdown.finalScore,
            priorityBreakdown: JSON.stringify(breakdown),
          },
        });
      }

      const candidateWaitlists = await tx.booking.findMany({
        where: {
          resourceId: booking.resourceId,
          status: "WAITLISTED",
          start: { lt: booking.end },
          end: { gt: booking.start },
        },
        include: {
          user: {
            include: {
              certifications: {
                include: { training: true },
              },
            },
          },
          resource: {
            include: {
              requirements: {
                include: { training: true },
              },
            },
          },
        },
        orderBy: [{ priorityScore: "desc" }, { createdAt: "asc" }],
      });

      for (const candidate of candidateWaitlists) {
        // Re-verify conflicts against remaining approved bookings
        const conflict = await tx.booking.findFirst({
          where: {
            resourceId: candidate.resourceId,
            id: { not: candidate.id },
            status: { in: ["APPROVED", "CHECKED_IN"] },
            start: { lt: candidate.end },
            end: { gt: candidate.start },
          },
        });

        if (conflict) continue;

        // Re-verify eligibility
        const elig = checkEligibility(candidate.user, candidate.resource);
        if (!elig.eligible) continue;

        // Promote to PENDING for manager/owner review (as specified in plan)
        await tx.booking.update({
          where: { id: candidate.id },
          data: {
            status: "PENDING",
            waitlistPosition: null,
            decisionReason: `Auto-promoted from waitlist to PENDING review upon cancellation of booking #${booking.id}`,
          },
        });

        await audit(tx, {
          actorId,
          action: "WAITLIST_AUTO_PROMOTED",
          entityType: "Booking",
          entityId: candidate.id,
          before: { status: "WAITLISTED", waitlistPosition: candidate.waitlistPosition },
          after: { status: "PENDING", waitlistPosition: null },
          reason: `Auto-promoted to PENDING review based on top priority score (${candidate.priorityScore}) after cancellation`,
        });

        await createNotification(tx, {
          userId: candidate.userId,
          type: "WAITLIST_PROMOTED",
          message: `Great news! You have been auto-promoted from the waitlist to PENDING review for "${candidate.resource.name}". The owner will review your request.`,
          link: `/bookings/${candidate.id}`,
        });

        await createNotification(tx, {
          userId: candidate.resource.ownerId,
          type: "BOOKING_REVIEW_REQUIRED",
          message: `Waitlist candidate ${candidate.user.name} was promoted to pending review for "${candidate.resource.name}".`,
          link: `/manage`,
        });

        promotedBookingId = candidate.id;
        break; // Only promote top eligible candidate
      }

      // Re-index remaining waitlisted bookings for this resource to guarantee consecutive positions
      const remainingWaitlists = await tx.booking.findMany({
        where: {
          resourceId: booking.resourceId,
          status: "WAITLISTED",
        },
        orderBy: [{ priorityScore: "desc" }, { createdAt: "asc" }],
      });

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

  // 15-minute check-in window constraint. Demo mode lifts it so a reviewer can
  // walk request -> approve -> check-in -> return in one sitting without waiting
  // for a future slot to begin.
  const now = new Date();
  const earliestCheckIn = new Date(booking.start.getTime() - 15 * 60 * 1000);
  if (process.env.DEMO_MODE !== "true" && now.getTime() < earliestCheckIn.getTime()) {
    return {
      success: false,
      error: `Too early to check in. Check-in opens 15 minutes before your scheduled start time (${booking.start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}).`,
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
      incidents: true,
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
  const damageIncidentCreated = Boolean(checkInReport && rating < checkInReport.rating);

  // Compute usage fee
  const durationHours = Math.max(
    1,
    Math.ceil((booking.end.getTime() - booking.start.getTime()) / (1000 * 60 * 60))
  );
  const usageCost = durationHours * booking.resource.creditCostPerHour;

  // Compute AI summary OUTSIDE of the database transaction to prevent SQLite transaction timeouts
  let aiSumm = "";
  let aiSeverityTag = "MEDIUM";
  const deterministicSeverity = rating <= 2 ? "HIGH" : "MEDIUM";
  const incidentDesc = damageIncidentCreated
    ? `Equipment returned with degraded condition: rating fell from ${checkInReport?.rating}/5 at check-in to ${rating}/5 at check-out. Notes: ${notes || "None provided"}`
    : "";

  if (damageIncidentCreated) {
    try {
      const aiAnalysis = await summarizeIncident({
        type: "DAMAGE",
        severity: deterministicSeverity,
        description: incidentDesc,
        resourceName: booking.resource.name,
        reporterName: booking.user.name,
      });
      aiSumm = aiAnalysis.summary;
      aiSeverityTag = aiAnalysis.suggestedSeverity;
    } catch {
      aiSumm = `Damage incident automatically drafted due to rating drop from ${checkInReport?.rating}/5 to ${rating}/5.`;
      aiSeverityTag = deterministicSeverity;
    }
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Charge usage credits
    if (usageCost > 0) {
      await tx.user.update({
        where: { id: booking.userId },
        data: { credits: { decrement: usageCost } },
      });
    }

    // 2. Record checkout condition report
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

    let incidentId: string | null = null;

    // 3. Draft DAMAGE incident if condition deteriorated
    if (damageIncidentCreated) {
      const inc = await tx.incident.create({
        data: {
          bookingId,
          resourceId: booking.resourceId,
          reporterId: actorId,
          type: "DAMAGE",
          severity: deterministicSeverity,
          description: incidentDesc,
          aiSummary: aiSumm,
          aiSeverity: aiSeverityTag,
          status: "OPEN",
        },
      });

      incidentId = inc.id;

      await audit(tx, {
        actorId,
        action: "INCIDENT_AUTO_DRAFTED",
        entityType: "Incident",
        entityId: inc.id,
        after: {
          type: "DAMAGE",
          severity: deterministicSeverity,
          aiSeverity: aiSeverityTag,
          status: "OPEN",
        },
        reason: `Auto-drafted damage incident because condition rating dropped from ${checkInReport?.rating} to ${rating}.`,
      });

      await createNotification(tx, {
        userId: booking.resource.ownerId,
        type: "INCIDENT_ALERT",
        message: `Condition degradation detected on "${booking.resource.name}" (${checkInReport?.rating}/5 -> ${rating}/5). Incident drafted for manager review.`,
        link: `/incidents/${inc.id}`,
      });
    }

    // 4. Deposit handling:
    // If NO damage and NO unresolved incidents -> refund deposit immediately and mark COMPLETED
    // If damage drafted or unresolved incident remains -> hold deposit until manager resolution, mark RETURNED
    const hasUnresolvedIncidents =
      damageIncidentCreated ||
      Boolean(booking.incidents && booking.incidents.some((i) => i.status !== "RESOLVED"));

    if (!hasUnresolvedIncidents && booking.depositHeld > 0) {
      await tx.user.update({
        where: { id: booking.userId },
        data: { credits: { increment: booking.depositHeld } },
      });
    }

    const finalStatus = hasUnresolvedIncidents ? "RETURNED" : "COMPLETED";

    await tx.booking.update({
      where: { id: bookingId },
      data: {
        status: finalStatus,
        depositHeld: hasUnresolvedIncidents ? booking.depositHeld : 0,
      },
    });

    await audit(tx, {
      actorId,
      action: finalStatus === "COMPLETED" ? "BOOKING_COMPLETED" : "BOOKING_RETURNED",
      entityType: "Booking",
      entityId: bookingId,
      before: { status: booking.status },
      after: { status: finalStatus, checkoutRating: rating, usageCostCharged: usageCost },
      reason: `Return condition report recorded (Rating: ${rating}/5). Usage cost: ${usageCost} credits.`,
    });

    await createNotification(tx, {
      userId: booking.userId,
      type: "BOOKING_RETURNED",
      message: `Return processed for "${booking.resource.name}". Billed ${usageCost} credits for ${durationHours}h usage. ${
        damageIncidentCreated
          ? "Deposit held pending damage review."
          : "Deposit refunded in full. Thank you!"
      }`,
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
  additionalHours?: number;
  newEndDate?: Date | string;
}) {
  const { bookingId, actorId, additionalHours, newEndDate } = params;

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { resource: true, user: true },
  });

  if (!booking) return { success: false, error: "Booking not found." };
  if (booking.status !== "APPROVED" && booking.status !== "CHECKED_IN") {
    return {
      success: false,
      error: `Only APPROVED or CHECKED_IN bookings can be extended. Current: "${booking.status}".`,
    };
  }

  let newEnd: Date;
  if (newEndDate) {
    newEnd = new Date(newEndDate);
  } else if (additionalHours && additionalHours > 0) {
    newEnd = new Date(booking.end.getTime() + additionalHours * 60 * 60 * 1000);
  } else {
    return { success: false, error: "Please provide a valid new end time or additional hours." };
  }

  if (newEnd.getTime() <= booking.end.getTime()) {
    return { success: false, error: "New end time must be after the current scheduled end time." };
  }

  const addedHours = Math.ceil((newEnd.getTime() - booking.end.getTime()) / (1000 * 60 * 60));
  const totalDurationHours =
    (newEnd.getTime() - booking.start.getTime()) / (1000 * 60 * 60);

  // 1. Max hours per booking rule
  if (
    booking.resource.maxHoursPerBooking &&
    totalDurationHours > booking.resource.maxHoursPerBooking
  ) {
    return {
      success: false,
      error: `Extended duration (${totalDurationHours.toFixed(
        1
      )}h) exceeds maximum allowed booking duration (${booking.resource.maxHoursPerBooking}h).`,
    };
  }

  // 2. Weekly fairness rules (including campus-wide cap, excluding current booking so it isn't double-counted)
  const fairness = await checkFairnessLimits(
    booking.userId,
    booking.resourceId,
    booking.start,
    newEnd,
    booking.id
  );
  if (!fairness.allowed) {
    return {
      success: false,
      error: `Extension exceeds fairness quota: ${fairness.reasons.join("; ")}`,
    };
  }

  // 3. Check conflicts for the extended window
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

  // 4. Verify user has sufficient credits to cover the full revised reservation duration
  const totalCost = Math.ceil(totalDurationHours) * booking.resource.creditCostPerHour;
  if (booking.user.credits < totalCost) {
    return {
      success: false,
      error: `Insufficient credits for extension. Total required for reservation: ${totalCost}, available: ${booking.user.credits}.`,
    };
  }

  return await prisma.$transaction(async (tx) => {
    // Usage credits are billed cleanly at checkout in returnBooking to prevent double charging
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
      reason: `Extended by ${addedHours} hour(s) until ${newEnd.toISOString()}`,
    });

    // Notify borrower
    await createNotification(tx, {
      userId: booking.userId,
      type: "BOOKING_EXTENDED",
      message: `Your booking for "${booking.resource.name}" has been extended. New end time: ${newEnd.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.`,
      link: `/bookings/${bookingId}`,
    });

    // Notify owner/manager if actor is borrower
    if (booking.resource.ownerId !== actorId) {
      await createNotification(tx, {
        userId: booking.resource.ownerId,
        type: "BOOKING_EXTENDED",
        message: `Booking for "${booking.resource.name}" was extended by ${booking.user.name} until ${newEnd.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.`,
        link: `/bookings/${bookingId}`,
      });
    }

    return { success: true, newEnd };
  });
}

export async function recalculateWaitlistScores(resourceId: string, tx?: any) {
  const client = tx || prisma;
  const waitlists = await client.booking.findMany({
    where: { resourceId, status: "WAITLISTED" },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });

  if (waitlists.length === 0) return;

  const now = new Date();
  const policy = await getFairnessPolicy();
  const scored = [];
  for (const b of waitlists) {
    const hoursWaiting = (now.getTime() - b.createdAt.getTime()) / (1000 * 60 * 60);
    const recentHours = await getUserRecentHours(b.userId);
    const breakdown = computePriorityScore({
      baseScore: policy.basePriorityScore,
      recentHours30d: recentHours,
      hoursWaiting,
      purpose: b.purpose,
      strikes: b.user.strikes,
      role: b.user.role,
      policy,
    });
    scored.push({ id: b.id, breakdown, createdAt: b.createdAt });
  }

  scored.sort(
    (a, b) =>
      b.breakdown.finalScore - a.breakdown.finalScore ||
      a.createdAt.getTime() - b.createdAt.getTime()
  );

  for (let i = 0; i < scored.length; i++) {
    await client.booking.update({
      where: { id: scored[i].id },
      data: {
        waitlistPosition: i + 1,
        priorityScore: scored[i].breakdown.finalScore,
        priorityBreakdown: JSON.stringify(scored[i].breakdown),
      },
    });
  }
}

