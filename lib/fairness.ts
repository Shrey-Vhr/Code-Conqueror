import { prisma } from "./prisma";
import { startOfWeek, endOfWeek, subDays } from "date-fns";

export interface PriorityBreakdown {
  baseScore: number;
  recentHours30d: number;
  recentUsagePenalty: number;
  waitlistAgeBonus: number;
  purpose: string;
  purposeBonus: number;
  strikes: number;
  strikesPenalty: number;
  role: string;
  roleBonus: number;
  finalScore: number;
}

export interface FairnessCheckResult {
  allowed: boolean;
  reasons: string[];
  currentWeeklyHours: number;
  maxWeeklyHoursAllowed: number;
  currentActiveBookings: number;
  maxWeeklyBookingsAllowed: number;
}

export function computePriorityScore(params: {
  baseScore?: number;
  recentHours30d: number;
  hoursWaiting?: number;
  purpose: string;
  strikes: number;
  role: string;
}): PriorityBreakdown {
  const baseScore = params.baseScore ?? 100;
  
  // Usage penalty: 2 points per hour used in past 30 days
  const recentUsagePenalty = Math.round(params.recentHours30d * 2.5);

  // Waitlist age bonus: 2 points per hour waiting, up to 30
  const hoursWaiting = params.hoursWaiting ?? 0;
  const waitlistAgeBonus = Math.min(30, Math.floor(hoursWaiting * 2));

  // Purpose bonus
  let purposeBonus = 0;
  const normalizedPurpose = params.purpose.toUpperCase();
  if (normalizedPurpose === "RESEARCH") {
    purposeBonus = 25;
  } else if (normalizedPurpose === "COURSEWORK") {
    purposeBonus = 20;
  } else if (normalizedPurpose === "CLUB") {
    purposeBonus = 5;
  } else {
    purposeBonus = 0;
  }

  // Strikes penalty: 25 points per strike
  const strikesPenalty = params.strikes * 25;

  // Role bonus
  let roleBonus = 0;
  if (params.role === "RESEARCHER") {
    roleBonus = 15;
  } else if (params.role === "STUDENT") {
    roleBonus = 10;
  }

  const rawScore =
    baseScore -
    recentUsagePenalty +
    waitlistAgeBonus +
    purposeBonus -
    strikesPenalty +
    roleBonus;

  const finalScore = Math.max(0, Math.round(rawScore * 10) / 10);

  return {
    baseScore,
    recentHours30d: params.recentHours30d,
    recentUsagePenalty,
    waitlistAgeBonus,
    purpose: params.purpose,
    purposeBonus,
    strikes: params.strikes,
    strikesPenalty,
    role: params.role,
    roleBonus,
    finalScore,
  };
}

export async function getUserRecentHours(userId: string): Promise<number> {
  const thirtyDaysAgo = subDays(new Date(), 30);
  const completedBookings = await prisma.booking.findMany({
    where: {
      userId,
      status: {
        in: ["APPROVED", "CHECKED_IN", "RETURNED", "COMPLETED"],
      },
      start: { gte: thirtyDaysAgo },
    },
    select: { start: true, end: true },
  });

  const totalMillis = completedBookings.reduce((acc, b) => {
    return acc + (b.end.getTime() - b.start.getTime());
  }, 0);

  return Math.round((totalMillis / (1000 * 60 * 60)) * 10) / 10;
}

export async function checkFairnessLimits(
  userId: string,
  resourceId: string,
  requestedStart: Date,
  requestedEnd: Date
): Promise<FairnessCheckResult> {
  const resource = await prisma.resource.findUnique({
    where: { id: resourceId },
  });

  if (!resource) {
    return {
      allowed: false,
      reasons: ["Resource not found"],
      currentWeeklyHours: 0,
      maxWeeklyHoursAllowed: 0,
      currentActiveBookings: 0,
      maxWeeklyBookingsAllowed: 0,
    };
  }

  const weekStart = startOfWeek(requestedStart, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(requestedStart, { weekStartsOn: 1 });

  // 1. Weekly active / completed bookings for this resource
  const weeklyBookings = await prisma.booking.findMany({
    where: {
      userId,
      resourceId,
      status: {
        in: ["PENDING", "APPROVED", "CHECKED_IN", "RETURNED", "COMPLETED"],
      },
      start: {
        gte: weekStart,
        lte: weekEnd,
      },
    },
  });

  const currentActiveBookings = weeklyBookings.filter(
    (b) => b.status === "PENDING" || b.status === "APPROVED" || b.status === "CHECKED_IN"
  ).length;

  const currentWeeklyHours = weeklyBookings.reduce((sum, b) => {
    return sum + (b.end.getTime() - b.start.getTime()) / (1000 * 60 * 60);
  }, 0);

  const requestedHours =
    (requestedEnd.getTime() - requestedStart.getTime()) / (1000 * 60 * 60);

  const maxWeeklyHours = resource.maxHoursPerBooking * resource.maxBookingsPerWeek;
  const reasons: string[] = [];

  if (currentActiveBookings >= resource.maxBookingsPerWeek) {
    reasons.push(
      `Weekly booking limit reached (${currentActiveBookings}/${resource.maxBookingsPerWeek} active bookings for this resource this week).`
    );
  }

  if (currentWeeklyHours + requestedHours > maxWeeklyHours) {
    reasons.push(
      `Weekly hours cap exceeded (${(currentWeeklyHours + requestedHours).toFixed(
        1
      )}h requested vs ${maxWeeklyHours}h weekly limit).`
    );
  }

  return {
    allowed: reasons.length === 0,
    reasons,
    currentWeeklyHours,
    maxWeeklyHoursAllowed: maxWeeklyHours,
    currentActiveBookings,
    maxWeeklyBookingsAllowed: resource.maxBookingsPerWeek,
  };
}
