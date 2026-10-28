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

export interface FairnessPolicyValues {
  weeklyHourCap: number;
  basePriorityScore: number;
  recentHourWeight: number;
  researchBonus: number;
  courseworkBonus: number;
  clubBonus: number;
  strikePenalty: number;
  waitlistBonusPerHour: number;
  monthlyCreditGrant: number;
}

export const DEFAULT_FAIRNESS_POLICY: FairnessPolicyValues = {
  weeklyHourCap: 20,
  basePriorityScore: 100,
  recentHourWeight: 2.5,
  researchBonus: 25,
  courseworkBonus: 20,
  clubBonus: 5,
  strikePenalty: 25,
  waitlistBonusPerHour: 2.0,
  monthlyCreditGrant: 50,
};

export async function getFairnessPolicy(): Promise<FairnessPolicyValues> {
  try {
    const policy = await prisma.fairnessSetting.findUnique({
      where: { id: "default" },
    });
    if (policy) {
      return {
        weeklyHourCap: policy.weeklyHourCap,
        basePriorityScore: policy.basePriorityScore,
        recentHourWeight: policy.recentHourWeight,
        researchBonus: policy.researchBonus,
        courseworkBonus: policy.courseworkBonus,
        clubBonus: policy.clubBonus,
        strikePenalty: policy.strikePenalty,
        waitlistBonusPerHour: policy.waitlistBonusPerHour,
        monthlyCreditGrant: policy.monthlyCreditGrant,
      };
    }
  } catch {
    // fallback if table not accessible
  }
  return DEFAULT_FAIRNESS_POLICY;
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
  policy?: Partial<FairnessPolicyValues>;
}): PriorityBreakdown {
  const policy = { ...DEFAULT_FAIRNESS_POLICY, ...params.policy };
  const baseScore = params.baseScore ?? policy.basePriorityScore;
  
  // Usage penalty: dynamic weight per hour used in past 30 days
  const recentUsagePenalty = Math.round(params.recentHours30d * policy.recentHourWeight);

  // Waitlist age bonus: dynamic weight per hour waiting, capped at 30
  const hoursWaiting = params.hoursWaiting ?? 0;
  const waitlistAgeBonus = Math.min(30, Math.floor(hoursWaiting * policy.waitlistBonusPerHour));

  // Purpose bonus from dynamic policy
  let purposeBonus = 0;
  const normalizedPurpose = params.purpose.toUpperCase();
  if (normalizedPurpose === "RESEARCH") {
    purposeBonus = policy.researchBonus;
  } else if (normalizedPurpose === "COURSEWORK") {
    purposeBonus = policy.courseworkBonus;
  } else if (normalizedPurpose === "CLUB") {
    purposeBonus = policy.clubBonus;
  } else {
    purposeBonus = 0;
  }

  // Strikes penalty from dynamic policy
  const strikesPenalty = params.strikes * policy.strikePenalty;

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
  requestedEnd: Date,
  excludeBookingId?: string
): Promise<FairnessCheckResult> {
  const [resource, policy] = await Promise.all([
    prisma.resource.findUnique({
      where: { id: resourceId },
    }),
    getFairnessPolicy(),
  ]);

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

  // 1. Weekly active / completed bookings for this resource (excluding current booking if extending)
  const weeklyBookings = await prisma.booking.findMany({
    where: {
      userId,
      resourceId,
      id: excludeBookingId ? { not: excludeBookingId } : undefined,
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

  // Cross-resource campus weekly cap (from dynamic policy, excluding current booking if extending)
  const allWeeklyBookings = await prisma.booking.findMany({
    where: {
      userId,
      id: excludeBookingId ? { not: excludeBookingId } : undefined,
      status: {
        in: ["PENDING", "APPROVED", "CHECKED_IN", "RETURNED", "COMPLETED"],
      },
      start: {
        gte: weekStart,
        lte: weekEnd,
      },
    },
  });

  const totalCampusWeeklyHours = allWeeklyBookings.reduce((sum, b) => {
    return sum + (b.end.getTime() - b.start.getTime()) / (1000 * 60 * 60);
  }, 0);

  const maxWeeklyHours = resource.maxHoursPerBooking * resource.maxBookingsPerWeek;
  const reasons: string[] = [];

  if (currentActiveBookings >= resource.maxBookingsPerWeek) {
    reasons.push(
      `Weekly booking limit reached (${currentActiveBookings}/${resource.maxBookingsPerWeek} active bookings for this resource this week).`
    );
  }

  if (currentWeeklyHours + requestedHours > maxWeeklyHours) {
    reasons.push(
      `Resource weekly hours cap exceeded (${(currentWeeklyHours + requestedHours).toFixed(
        1
      )}h requested vs ${maxWeeklyHours}h weekly limit).`
    );
  }

  if (totalCampusWeeklyHours + requestedHours > policy.weeklyHourCap) {
    reasons.push(
      `Campus-wide ${policy.weeklyHourCap}-hour weekly fair-usage cap exceeded (${(
        totalCampusWeeklyHours + requestedHours
      ).toFixed(1)}h / ${policy.weeklyHourCap}.0h).`
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

export async function grantMonthlyCreditsIfDue(userId: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, credits: true, monthlyCreditsGrantedAt: true },
    });
    if (!user) return false;

    const now = new Date();
    const lastGranted = user.monthlyCreditsGrantedAt;
    const isDue =
      !lastGranted ||
      now.getFullYear() > lastGranted.getFullYear() ||
      now.getMonth() > lastGranted.getMonth();

    if (isDue) {
      const policy = await getFairnessPolicy();
      const grantAmount = policy.monthlyCreditGrant;

      await prisma.user.update({
        where: { id: userId },
        data: {
          credits: { increment: grantAmount },
          monthlyCreditsGrantedAt: now,
        },
      });
      return true;
    }
  } catch {
    // Graceful fallback if setting table not ready
  }
  return false;
}
