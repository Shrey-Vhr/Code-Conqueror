import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { getUserRecentHours } from "@/lib/fairness";
import { ProfileClient } from "./ProfileClient";
import { AuditTimeline } from "@/components/AuditTimeline";
import { StatusBadge } from "@/components/StatusBadge";
import { format, formatDistanceToNow, subDays } from "date-fns";

export default async function ProfilePage() {
  const session = await requireAuth();

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    include: {
      certifications: {
        include: { training: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!user) redirect("/login");

  const recent30dHours = await getUserRecentHours(user.id);

  // Compute this week's hours used vs 20h cap
  const oneWeekAgo = subDays(new Date(), 7);
  const weeklyBookings = await prisma.booking.findMany({
    where: {
      userId: user.id,
      status: { in: ["APPROVED", "CHECKED_IN", "RETURNED", "COMPLETED", "OVERDUE"] },
      start: { gte: oneWeekAgo },
    },
  });

  const weeklyHours = weeklyBookings.reduce((acc, b) => {
    const durationMs = new Date(b.end).getTime() - new Date(b.start).getTime();
    return acc + Math.max(0, durationMs / (1000 * 60 * 60));
  }, 0);

  const weeklyCap = 20; // 20 hours cap
  const weeklyUsagePercent = Math.min(100, Math.round((weeklyHours / weeklyCap) * 100));

  // Recent 5 bookings
  const recentBookings = await prisma.booking.findMany({
    where: { userId: user.id },
    include: { resource: true },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  // Available trainings for dropdown
  const allTrainings = await prisma.training.findMany({
    orderBy: { name: "asc" },
  });

  // User audit logs
  const userAuditLogs = await prisma.auditLog.findMany({
    where: { actorId: user.id },
    orderBy: { createdAt: "desc" },
    take: 15,
  });

  const formattedCerts = user.certifications.map((c) => ({
    id: c.id,
    trainingId: c.trainingId,
    trainingName: c.training.name,
    trainingCode: c.training.code,
    department: c.training.department,
    status: c.status,
    expiresAt: c.expiresAt ? c.expiresAt.toISOString() : null,
    documentNote: c.documentNote,
  }));

  const isSuspended = user.suspendedUntil && new Date(user.suspendedUntil) > new Date();

  const creditMax = 500;
  const creditPercent = Math.min(100, Math.round((user.credits / creditMax) * 100));

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* 1. User Info Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-500 text-white font-extrabold text-2xl flex items-center justify-center shadow-xs">
            {user.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {user.name}
              </h1>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full border bg-blue-50 text-blue-800 border-blue-200">
                {user.role}
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                {user.department}
              </span>
              <span
                className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                  user.verified
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-amber-50 text-amber-700 border-amber-200"
                }`}
              >
                {user.verified ? "✓ Verified Identity" : "Pending Verification"}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {user.email} • Member ID: <span className="font-mono">{user.id.slice(0, 12)}</span>
            </p>
          </div>
        </div>

        {/* Quick Indicators: Credits, Strikes, 30d usage */}
        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center min-w-[90px]">
            <span className="text-[10px] font-semibold text-slate-500 uppercase block">Credits</span>
            <span className="text-xl font-bold text-blue-700">{user.credits}</span>
            <span className="text-[10px] text-slate-400 block">/ {creditMax}</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center min-w-[90px]">
            <span className="text-[10px] font-semibold text-slate-500 uppercase block">Strikes</span>
            <div className="flex items-center justify-center gap-1.5 my-1">
              {[1, 2, 3].map((dot) => (
                <span
                  key={dot}
                  className={`w-3 h-3 rounded-full ${
                    dot <= user.strikes
                      ? "bg-rose-500 shadow-xs"
                      : "bg-slate-200"
                  }`}
                  title={dot <= user.strikes ? "Accumulated Strike" : "Clear"}
                />
              ))}
            </div>
            <span className={`text-[10px] font-bold ${user.strikes > 0 ? "text-rose-600" : "text-slate-400"}`}>
              {user.strikes} / 3 Strikes
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center min-w-[90px]">
            <span className="text-[10px] font-semibold text-slate-500 uppercase block">30d Usage</span>
            <span className="text-xl font-bold text-slate-800">{recent30dHours}h</span>
            <span className="text-[10px] text-slate-400 block">Fairness metric</span>
          </div>
        </div>
      </div>

      {/* Suspension Alert */}
      {isSuspended && (
        <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl flex items-center gap-3 text-xs text-rose-800 font-medium">
          <span className="text-2xl">🚨</span>
          <div>
            <strong className="block text-sm font-bold text-rose-900">
              Account Reservation Privileges Suspended
            </strong>
            <span>
              Your account is temporarily suspended from requesting campus equipment until{" "}
              {format(new Date(user.suspendedUntil!), "MMMM d, yyyy")} due to policy violations or accumulated strikes.
            </span>
          </div>
        </div>
      )}

      {/* 2. Visual Progress Bars: Credits & Weekly Usage vs Cap */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Credits Balance Progress Bar */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Credit Balance & Deposit Escrow</h3>
              <p className="text-xs text-slate-500">Credits replenish weekly; held as deposit during checkouts</p>
            </div>
            <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
              {user.credits} / {creditMax} pts
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden p-0.5 border border-slate-200">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                creditPercent > 50
                  ? "bg-gradient-to-r from-blue-500 to-indigo-600"
                  : creditPercent > 20
                  ? "bg-gradient-to-r from-amber-400 to-amber-500"
                  : "bg-gradient-to-r from-rose-500 to-rose-600"
              }`}
              style={{ width: `${creditPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-slate-400">
            <span>0 credits</span>
            <span>{creditPercent}% available</span>
            <span>500 max cap</span>
          </div>
        </div>

        {/* Weekly Usage vs 20h Cap */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Weekly Equipment Allocation</h3>
              <p className="text-xs text-slate-500">Fair-share cap: maximum 20 scheduled hours per 7-day period</p>
            </div>
            <span className="text-xs font-mono font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200">
              {weeklyHours.toFixed(1)} / {weeklyCap}h
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden p-0.5 border border-slate-200">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                weeklyUsagePercent < 75
                  ? "bg-gradient-to-r from-emerald-500 to-teal-600"
                  : weeklyUsagePercent < 90
                  ? "bg-gradient-to-r from-amber-400 to-amber-500"
                  : "bg-gradient-to-r from-rose-500 to-rose-600"
              }`}
              style={{ width: `${weeklyUsagePercent}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-slate-400">
            <span>0 hours</span>
            <span>{weeklyCap - weeklyHours > 0 ? `${(weeklyCap - weeklyHours).toFixed(1)}h remaining` : "Cap reached"}</span>
            <span>20h weekly max</span>
          </div>
        </div>
      </div>

      {/* 3. Certifications & Submission Form (Client Component) */}
      <ProfileClient
        trainings={allTrainings.map((t) => ({
          id: t.id,
          name: t.name,
          code: t.code,
          department: t.department,
        }))}
        userCertifications={formattedCerts}
      />

      {/* 4. Recent Bookings Summary (Last 5) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">Recent Equipment Reservations</h2>
            <p className="text-xs text-slate-500">Your latest 5 booking requests and active sessions</p>
          </div>
          <Link
            href="/bookings"
            className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
          >
            View All Bookings →
          </Link>
        </div>

        {recentBookings.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No bookings recorded yet. Explore shared campus equipment to request a reservation.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentBookings.map((b) => (
              <div
                key={b.id}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 rounded-xl px-2 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                      {b.resource.type}
                    </span>
                    <Link
                      href={`/bookings/${b.id}`}
                      className="font-bold text-slate-900 text-sm hover:text-blue-600 transition-colors"
                    >
                      {b.resource.name}
                    </Link>
                    <StatusBadge status={b.status} />
                  </div>
                  <p className="text-xs text-slate-500">
                    {format(new Date(b.start), "MMM d, HH:mm")} – {format(new Date(b.end), "MMM d, HH:mm")} •{" "}
                    <span className="font-mono text-slate-400">
                      {formatDistanceToNow(new Date(b.start), { addSuffix: true })}
                    </span>
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-medium text-slate-600">
                    Deposit: {b.depositHeld} credits
                  </span>
                  <Link
                    href={`/bookings/${b.id}`}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 rounded-lg text-xs font-semibold transition-colors shrink-0"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. Activity Audit Trail */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              My Audit & Security Timeline
            </h2>
            <p className="text-xs text-slate-500">Cryptographically verifiable actions associated with your profile</p>
          </div>
          <span className="text-xs text-slate-400 font-mono">Immutable</span>
        </div>
        <AuditTimeline logs={userAuditLogs} />
      </div>
    </div>
  );
}
