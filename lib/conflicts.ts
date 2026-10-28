import { prisma } from "./prisma";

export interface AvailabilityWindow {
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  start: string; // "09:00"
  end: string; // "18:00"
}

export interface ConflictCheckResult {
  hasConflict: boolean;
  reasons: string[];
  conflictingBookings: Array<{
    id: string;
    start: Date;
    end: Date;
    status: string;
  }>;
}

export function checkTimeOverlap(
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date
): boolean {
  return startA.getTime() < endB.getTime() && endA.getTime() > startB.getTime();
}

export function isWithinAvailabilityWindows(
  start: Date,
  end: Date,
  windowsJson: string | null | undefined
): { valid: boolean; reason?: string } {
  if (!windowsJson || windowsJson === "[]" || windowsJson === "") {
    return { valid: true };
  }

  let windows: AvailabilityWindow[] = [];
  try {
    windows = JSON.parse(windowsJson);
  } catch {
    return { valid: true };
  }

  if (windows.length === 0) return { valid: true };

  // For multi-day or single-day: check if start day and end day match window
  const startDay = start.getDay();
  const endDay = end.getDay();

  if (startDay !== endDay) {
    return {
      valid: false,
      reason: "Bookings cannot span across multiple calendar days.",
    };
  }

  const dayWindows = windows.filter((w) => w.dayOfWeek === startDay);
  if (dayWindows.length === 0) {
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return {
      valid: false,
      reason: `Resource is not available on ${dayNames[startDay]}s.`,
    };
  }

  const startMinutes = start.getHours() * 60 + start.getMinutes();
  const endMinutes = end.getHours() * 60 + end.getMinutes();

  const fitsWindow = dayWindows.some((w) => {
    const [wStartH, wStartM] = w.start.split(":").map(Number);
    const [wEndH, wEndM] = w.end.split(":").map(Number);
    const wStartMinutes = wStartH * 60 + wStartM;
    const wEndMinutes = wEndH * 60 + wEndM;

    return startMinutes >= wStartMinutes && endMinutes <= wEndMinutes;
  });

  if (!fitsWindow) {
    const allowed = dayWindows.map((w) => `${w.start} - ${w.end}`).join(", ");
    return {
      valid: false,
      reason: `Requested time is outside open operating hours (${allowed}).`,
    };
  }

  return { valid: true };
}

export async function checkBookingConflicts(
  resourceId: string,
  start: Date,
  end: Date,
  excludeBookingId?: string
): Promise<ConflictCheckResult> {
  const reasons: string[] = [];

  if (start >= end) {
    return {
      hasConflict: true,
      reasons: ["Booking end time must be after start time."],
      conflictingBookings: [],
    };
  }

  const resource = await prisma.resource.findUnique({
    where: { id: resourceId },
  });

  if (!resource) {
    return {
      hasConflict: true,
      reasons: ["Resource not found."],
      conflictingBookings: [],
    };
  }

  // 1. Maintenance check
  if (resource.status === "MAINTENANCE") {
    reasons.push("Resource is currently offline for scheduled maintenance.");
  } else if (resource.status === "RETIRED") {
    reasons.push("Resource has been decommissioned / retired.");
  }

  // 2. Max hours check
  const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  if (resource.maxHoursPerBooking && durationHours > resource.maxHoursPerBooking) {
    reasons.push(
      `Booking duration (${durationHours.toFixed(1)}h) exceeds maximum allowed (${resource.maxHoursPerBooking}h).`
    );
  }

  // 3. Operating windows check
  const windowCheck = isWithinAvailabilityWindows(
    start,
    end,
    resource.availabilityWindows
  );
  if (!windowCheck.valid && windowCheck.reason) {
    reasons.push(windowCheck.reason);
  }

  // 4. Overlap with approved or active bookings
  const overlappingBookings = await prisma.booking.findMany({
    where: {
      resourceId,
      id: excludeBookingId ? { not: excludeBookingId } : undefined,
      status: {
        in: ["APPROVED", "CHECKED_IN", "OVERDUE"],
      },
      start: { lt: end },
      end: { gt: start },
    },
    select: {
      id: true,
      start: true,
      end: true,
      status: true,
    },
  });

  if (overlappingBookings.length > 0) {
    const formatted = overlappingBookings
      .map(
        (b) =>
          `Reserved from ${b.start.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })} to ${b.end.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })} (${b.status})`
      )
      .join(", ");
    reasons.push(`Selected time slot is already booked: ${formatted}`);
  }

  return {
    hasConflict: reasons.length > 0,
    reasons,
    conflictingBookings: overlappingBookings,
  };
}
