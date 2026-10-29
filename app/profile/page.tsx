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
      <div className="card-pastel-lavender rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-[0_8px_30px_rgb(0,0,0,0.03)]">
        <div className="flex items-center gap-5">
          <div className="w-18 h-18 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 text-white font-black text-2xl flex items-center justify-center shadow-md ring-4 ring-white/70 shrink-0">
            {user.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                {user.name}
              </h1>
              <span className="text-xs font-bold px-3 py-1 rounded-full border bg-indigo-50/80 text-indigo-700 border-indigo-200/80 shadow-2xs">
                {user.role}
              </span>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-white/80 border border-slate-200/70 text-slate-700 shadow-2xs">
                {user.department}
              </span>
              <span
                className={`text-xs font-semibold px-3 py-1 rounded-full border shadow-2xs flex items-center gap-1.5 ${
                  user.verified
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-amber-50 text-amber-700 border-amber-200"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${user.verified ? "bg-emerald-500" : "bg-amber-500"}`} />
                {user.verified ? "Verified Member" : "Pending Verification"}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-2 font-medium">
              {user.email} • ID: <span className="font-mono text-slate-600 bg-white/60 px-2 py-0.5 rounded-md border border-slate-200/50">{user.id.slice(0, 12)}</span>
            </p>
          </div>
        </div>

        {/* Quick Indicators: Credits, Strikes, 30d usage */}
        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          <div className="p-3.5 bg-white/85 rounded-2xl border border-indigo-100/80 text-center min-w-[96px] shadow-2xs backdrop-blur-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Credits</span>
            <span className="text-xl font-black text-indigo-600">{user.credits}</span>
            <span className="text-[10px] text-slate-400 block font-medium">/ {creditMax}</span>
          </div>

          <div className="p-3.5 bg-white/85 rounded-2xl border border-rose-100/80 text-center min-w-[96px] shadow-2xs backdrop-blur-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Strikes</span>
            <div className="flex items-center justify-center gap-1.5 my-1.5">
              {[1, 2, 3].map((dot) => (
                <span
                  key={dot}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${
                    dot <= user.strikes
                      ? "bg-rose-500 shadow-sm shadow-rose-200 ring-2 ring-rose-200"
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

          <div className="p-3.5 bg-white/85 rounded-2xl border border-emerald-100/80 text-center min-w-[96px] shadow-2xs backdrop-blur-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">30d Usage</span>
            <span className="text-xl font-black text-emerald-600">{recent30dHours}h</span>
            <span className="text-[10px] text-slate-400 block font-medium">Fairness metric</span>
          </div>
        </div>
      </div>

      {/* Suspension Alert */}
      {isSuspended && (
        <div className="p-5 card-pastel-rose rounded-3xl flex items-center gap-4 text-xs text-rose-900 font-medium shadow-sm">
          <span className="text-3xl">🚨</span>
          <div>
            <strong className="block text-sm font-bold text-rose-950">
              Account Reservation Privileges Suspended
            </strong>
            <span className="text-rose-800">
              Your account is temporarily suspended from requesting campus equipment until{" "}
              {format(new Date(user.suspendedUntil!), "MMMM d, yyyy")} due to policy violations or accumulated strikes.
            </span>
          </div>
        </div>
      )}

      {/* 2. Visual Progress Bars: Credits & Weekly Usage vs Cap */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Credits Balance Progress Bar */}
        <div className="card-pastel-sky rounded-3xl p-6 sm:p-7 space-y-4 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Credit Balance & Deposit Escrow</h3>
              <p className="text-xs text-slate-500 mt-0.5">Credits replenish weekly; held as deposit during active checkouts</p>
            </div>
            <span className="text-xs font-mono font-bold text-sky-700 bg-white/90 px-3 py-1 rounded-full border border-sky-200/80 shadow-2xs">
              {user.credits} / {creditMax} pts
            </span>
          </div>
          <div className="w-full bg-white/80 rounded-full h-3.5 overflow-hidden p-0.5 border border-sky-200/70 shadow-inner">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                creditPercent > 50
                  ? "bg-gradient-to-r from-sky-400 to-indigo-500"
                  : creditPercent > 20
                  ? "bg-gradient-to-r from-amber-400 to-amber-500"
                  : "bg-gradient-to-r from-rose-500 to-rose-600"
              }`}
              style={{ width: `${creditPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] font-semibold text-slate-500">
            <span>0 credits</span>
            <span className="text-sky-700 font-bold">{creditPercent}% available</span>
            <span>500 max cap</span>
          </div>
        </div>

        {/* Weekly Usage vs 20h Cap */}
        <div className="card-pastel-purple rounded-3xl p-6 sm:p-7 space-y-4 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Weekly Equipment Allocation</h3>
              <p className="text-xs text-slate-500 mt-0.5">Fair-share cap: maximum 20 scheduled hours per 7-day period</p>
            </div>
            <span className="text-xs font-mono font-bold text-purple-700 bg-white/90 px-3 py-1 rounded-full border border-purple-200/80 shadow-2xs">
              {weeklyHours.toFixed(1)} / {weeklyCap}h
            </span>
          </div>
          <div className="w-full bg-white/80 rounded-full h-3.5 overflow-hidden p-0.5 border border-purple-200/70 shadow-inner">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                weeklyUsagePercent < 75
                  ? "bg-gradient-to-r from-teal-400 to-indigo-500"
                  : weeklyUsagePercent < 90
                  ? "bg-gradient-to-r from-amber-400 to-amber-500"
                  : "bg-gradient-to-r from-rose-500 to-rose-600"
              }`}
              style={{ width: `${weeklyUsagePercent}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] font-semibold text-slate-500">
            <span>0 hours</span>
            <span className="text-purple-700 font-bold">{weeklyCap - weeklyHours > 0 ? `${(weeklyCap - weeklyHours).toFixed(1)}h remaining` : "Cap reached"}</span>
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
      <div className="bg-white/85 rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.03)] backdrop-blur-md space-y-5">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">Recent Equipment Reservations</h2>
            <p className="text-xs text-slate-500 mt-0.5">Your latest 5 booking requests and active sessions</p>
          </div>
          <Link
            href="/bookings"
            className="text-xs font-bold text-indigo-600 bg-indigo-50/70 hover:bg-indigo-100/80 px-3.5 py-1.5 rounded-full border border-indigo-100 transition-colors"
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
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 rounded-2xl px-3 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200/60">
                      {b.resource.type}
                    </span>
                    <Link
                      href={`/bookings/${b.id}`}
                      className="font-bold text-slate-900 text-sm hover:text-indigo-600 transition-colors"
                    >
                      {b.resource.name}
                    </Link>
                    <StatusBadge status={b.status} />
                  </div>
                  <p className="text-xs text-slate-500 font-medium">
                    {format(new Date(b.start), "MMM d, HH:mm")} – {format(new Date(b.end), "MMM d, HH:mm")} •{" "}
                    <span className="font-mono text-slate-400">
                      {formatDistanceToNow(new Date(b.start), { addSuffix: true })}
                    </span>
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-semibold text-slate-600 bg-slate-100/70 px-2.5 py-1 rounded-full border border-slate-200/50">
                    Deposit: {b.depositHeld} credits
                  </span>
                  <Link
                    href={`/bookings/${b.id}`}
                    className="px-4 py-1.5 bg-slate-100 hover:bg-indigo-600 hover:text-white text-slate-700 rounded-full text-xs font-bold transition-all shadow-2xs hover:shadow-xs hover:-translate-y-0.5 active:scale-95 shrink-0"
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
      <div className="bg-white/85 rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.03)] backdrop-blur-md space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              My Audit & Security Timeline
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Cryptographically verifiable actions associated with your profile</p>
          </div>
          <span className="text-xs text-slate-500 font-mono bg-slate-100/80 px-3 py-1 rounded-full border border-slate-200/60 font-semibold">
            Immutable
          </span>
        </div>
        <AuditTimeline logs={userAuditLogs} />
      </div>
    </div>
  );
}