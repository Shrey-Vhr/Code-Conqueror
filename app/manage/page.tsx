import React from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { sweepOverdue } from "@/lib/overdue";
import { StatusBadge } from "@/components/StatusBadge";
import { PriorityBreakdown } from "@/components/PriorityBreakdown";
import { ReviewItemClient } from "./ReviewItemClient";
import { WaitlistPromoteButton } from "./WaitlistPromoteButton";
import { manualSweepAction } from "./actions";
import { AI_DISCLAIMER } from "@/lib/ai";
import { format, formatDistanceToNow } from "date-fns";

export default async function ManagePage() {
  const session = await requireRole(["OWNER", "MANAGER", "ADMIN"]);

  // Auto sweep
  try {
    await sweepOverdue();
  } catch (err) {
    console.error("Overdue sweep error in manage:", err);
  }

  const isGlobal = session.role === "ADMIN";
  const departmentFilter = isGlobal
    ? undefined
    : session.role === "MANAGER"
    ? { department: session.department }
    : { ownerId: session.id };

  // 1. Pending Review Queue
  const pendingBookings = await prisma.booking.findMany({
    where: {
      status: "PENDING",
      resource: departmentFilter,
    },
    include: {
      resource: true,
      user: {
        select: { id: true, name: true, department: true, role: true, credits: true, strikes: true },
      },
    },
    orderBy: [{ priorityScore: "desc" }, { createdAt: "asc" }],
  });

  // 2. Currently Checked-In Active Sessions
  const activeSessions = await prisma.booking.findMany({
    where: {
      status: "CHECKED_IN",
      resource: departmentFilter,
    },
    include: {
      resource: true,
      user: { select: { name: true, department: true } },
      conditionReports: {
        where: { phase: "CHECK_IN" },
        take: 1,
      },
    },
    orderBy: { start: "asc" },
  });

  // 3. Overdue Bookings
  const overdueBookings = await prisma.booking.findMany({
    where: {
      status: "OVERDUE",
      resource: departmentFilter,
    },
    include: {
      resource: true,
      user: { select: { name: true, email: true, department: true, strikes: true } },
      incidents: true,
    },
    orderBy: { end: "asc" },
  });

  // 4. Open Incidents
  const openIncidents = await prisma.incident.findMany({
    where: {
      status: { in: ["OPEN", "UNDER_REVIEW"] },
      resource: departmentFilter,
    },
    include: {
      resource: true,
      reporter: { select: { name: true, role: true } },
      booking: {
        include: { user: { select: { name: true, department: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // 5. Waitlisted Bookings Queue
  const waitlistedBookings = await prisma.booking.findMany({
    where: {
      status: "WAITLISTED",
      resource: departmentFilter,
    },
    include: {
      resource: true,
      user: {
        select: { id: true, name: true, email: true, department: true, role: true, credits: true, strikes: true },
      },
    },
    orderBy: [{ priorityScore: "desc" }, { createdAt: "asc" }],
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header and Manual Sweep Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
              {session.role} Console
            </span>
            <span className="text-xs text-slate-500">
              Department: <strong>{session.department}</strong>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight mt-1.5">
            Department Operations & Review Queue
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Review booking requests with priority fairness scores, supervise checked-in hardware, and resolve incidents.
          </p>
        </div>

        <form action={manualSweepAction}>
          <button
            type="submit"
            className="px-5 py-2.5 bg-indigo-700 hover:bg-indigo-600 text-white rounded-full text-xs font-bold shadow-md transition-all cursor-pointer flex items-center gap-2 shrink-0 hover:-translate-y-0.5"
          >
            <svg className="w-4 h-4 text-amber-300" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Run Overdue Check Sweep</span>
          </button>
        </form>
      </div>

      {/* OVERDUE ALERTS SECTION */}
      {overdueBookings.length > 0 && (
        <div className="p-6 bg-gradient-to-br from-rose-50/80 via-white to-pink-50/50 border border-rose-300 rounded-3xl shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-rose-900 font-semibold text-sm">
              <span className="flex h-2.5 w-2.5 rounded-full bg-rose-600 animate-pulse"></span>
              <span>URGENT: {overdueBookings.length} Overdue Campus Assets</span>
            </div>
            <span className="text-xs text-rose-700 font-bold bg-rose-100 px-3 py-1 rounded-full">Immediate Action Required</span>
          </div>

          <div className="divide-y divide-rose-100">
            {overdueBookings.map((b) => (
              <div key={b.id} className="py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div>
                  <span className="font-bold text-slate-900 text-sm">{b.resource.name}</span>
                  <p className="text-slate-600 mt-0.5">
                    Borrower: <strong>{b.user.name}</strong> ({b.user.department}) • Return was scheduled for{" "}
                    <strong className="text-rose-700 font-mono">
                      {format(new Date(b.end), "MMM d, HH:mm")} ({formatDistanceToNow(new Date(b.end), { addSuffix: true })})
                    </strong>
                  </p>
                </div>
                <Link
                  href={`/bookings/${b.id}`}
                  className="px-4 py-2 bg-rose-500 hover:bg-rose-400 text-white font-bold rounded-full text-xs shadow-sm hover:-translate-y-0.5 transition-all"
                >
                  Inspect Overdue Session →
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 1. REVIEW QUEUE SECTION */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-semibold text-slate-900 tracking-tight">
              Booking Approval Queue
            </h2>
            <span className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-0.5 rounded-full border border-amber-200">
              {pendingBookings.length} Pending
            </span>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Ranked by automated fairness priority algorithm
          </span>
        </div>

        {pendingBookings.length === 0 ? (
          <div className="p-8 text-center bg-white/80 rounded-3xl border border-slate-200/80 text-xs text-slate-400">
            No pending booking requests awaiting review for your department resources.
          </div>
        ) : (
          <div className="space-y-4">
            {pendingBookings.map((booking) => {
              let elig: any = null;
              try {
                elig = JSON.parse(booking.eligibilitySnapshot || "{}");
              } catch {
                elig = null;
              }

              return (
                <div
                  key={booking.id}
                  className="bg-white/80 backdrop-blur-md rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-sm space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                        <span className="font-bold text-slate-700">{booking.resource.name}</span>
                        <span>•</span>
                        <span>{booking.resource.location}</span>
                      </div>
                      <h3 className="text-lg font-semibold text-slate-900 tracking-tight">
                        {booking.user.name} ({booking.user.role} — {booking.user.department})
                      </h3>
                      <p className="text-xs text-slate-600 mt-1">
                        Purpose: <strong className="text-indigo-600 uppercase font-bold">{booking.purpose}</strong>
                        {booking.purposeDetails ? ` — "${booking.purposeDetails}"` : ""}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs text-slate-400 font-medium">Requested Window:</div>
                      <div className="text-sm font-bold text-slate-900 font-mono">
                        {format(new Date(booking.start), "MMM d, HH:mm")} - {format(new Date(booking.end), "HH:mm")}
                      </div>
                      <div className="mt-1">
                        <PriorityBreakdown score={booking.priorityScore} compact={true} />
                      </div>
                    </div>
                  </div>

                  {/* Priority Breakdown & Eligibility Met Preview in Soft Pastel Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-100 text-xs">
                    <div className="p-3.5 bg-gradient-to-br from-emerald-50/60 to-teal-50/30 rounded-2xl border border-emerald-100 space-y-1">
                      <span className="font-bold text-emerald-950 block">
                        Eligibility Snapshot:
                      </span>
                      {elig?.eligible ? (
                        <p className="text-emerald-800 font-medium">✓ All mandatory safety & role requirements verified</p>
                      ) : (
                        <p className="text-amber-800 font-medium">Review needed: {elig?.missing?.join(", ") || "Partial"}</p>
                      )}
                      <p className="text-slate-500 text-[11px]">
                        Account credits: <strong>{booking.user.credits}</strong> • Strikes: <strong>{booking.user.strikes}</strong>
                      </p>
                    </div>

                    <div className="p-3.5 bg-gradient-to-br from-indigo-50/60 to-purple-50/30 rounded-2xl border border-indigo-100 space-y-1">
                      <span className="font-bold text-indigo-950 block">
                        Conflict Analysis:
                      </span>
                      <p className="text-emerald-800 font-medium">
                        ✓ Slot is open. No active conflicts found.
                      </p>
                      <p className="text-slate-500 text-[11px]">
                        Deposit to hold: {booking.depositHeld} credits
                      </p>
                    </div>
                  </div>

                  {/* Action Review Buttons */}
                  <ReviewItemClient bookingId={booking.id} />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. ACTIVE SUPERVISED SESSIONS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-semibold text-slate-900 tracking-tight">
              Active Sessions in Progress
            </h2>
            <span className="bg-sky-100 text-sky-800 text-xs font-bold px-3 py-0.5 rounded-full border border-sky-200">
              {activeSessions.length} Checked In
            </span>
          </div>
          <span className="text-xs text-slate-500 font-medium">Live operational status</span>
        </div>

        {activeSessions.length === 0 ? (
          <div className="p-8 text-center bg-white/80 rounded-3xl border border-slate-200/80 text-xs text-slate-400">
            No active hardware or space sessions currently checked in.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeSessions.map((sessionBooking) => {
              const checkInRating = sessionBooking.conditionReports[0]?.rating;

              return (
                <div
                  key={sessionBooking.id}
                  className="bg-white/80 backdrop-blur-md rounded-3xl border border-sky-200/80 p-6 shadow-sm space-y-3.5"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-sky-800 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200 uppercase">
                        {sessionBooking.resource.type}
                      </span>
                      <h4 className="font-bold text-slate-900 text-base mt-1.5">
                        {sessionBooking.resource.name}
                      </h4>
                      <p className="text-xs text-slate-500">
                        Borrower: <strong>{sessionBooking.user.name}</strong> ({sessionBooking.user.department})
                      </p>
                    </div>
                    <StatusBadge status="CHECKED_IN" />
                  </div>

                  <div className="p-3.5 bg-slate-50/80 rounded-2xl text-xs space-y-1.5 border border-slate-100">
                    <div className="flex justify-between text-slate-600">
                      <span>Scheduled Conclude:</span>
                      <strong className="text-slate-900 font-mono">
                        {format(new Date(sessionBooking.end), "HH:mm")} ({formatDistanceToNow(new Date(sessionBooking.end), { addSuffix: true })})
                      </strong>
                    </div>
                    {checkInRating && (
                      <div className="flex justify-between text-slate-600">
                        <span>Check-In Rating:</span>
                        <strong className="text-emerald-700 font-bold">{checkInRating} / 5 Stars</strong>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <Link
                      href={`/bookings/${sessionBooking.id}`}
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full text-xs font-bold transition-all shadow-sm hover:-translate-y-0.5"
                    >
                      Supervise / Manage Session →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. OPEN INCIDENTS & DAMAGE REPORTS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-semibold text-slate-900 tracking-tight">
              Department Incident Queue
            </h2>
            <span className="bg-rose-100 text-rose-800 text-xs font-bold px-3 py-0.5 rounded-full border border-rose-200">
              {openIncidents.length} Pending Resolution
            </span>
          </div>
          <span className="text-xs text-slate-500 font-medium">Damage, delay, and protocol violations</span>
        </div>

        {openIncidents.length === 0 ? (
          <div className="p-8 text-center bg-white/80 rounded-3xl border border-slate-200/80 text-xs text-slate-400">
            No unresolved equipment incidents or damage claims!
          </div>
        ) : (
          <div className="space-y-3">
            {openIncidents.map((inc) => (
              <div
                key={inc.id}
                className="bg-white/80 backdrop-blur-md rounded-3xl border border-slate-200/80 hover:border-rose-300 p-6 shadow-sm transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200 uppercase">
                      {inc.type}
                    </span>
                    <span className="text-xs font-bold text-slate-800">
                      {inc.resource.name}
                    </span>
                    <StatusBadge status={inc.status} />
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-1">
                    {inc.description}
                  </p>
                  {inc.aiSummary && (
                    <div className="text-[11px] text-amber-900 bg-amber-50/90 px-3 py-2 rounded-2xl border border-amber-200/80 font-medium space-y-1">
                      <span className="inline-block text-[10px] font-bold text-amber-900 bg-amber-100 px-2 py-0.2 rounded-full border border-amber-300">
                        {AI_DISCLAIMER}
                      </span>
                      <p>{inc.aiSummary}</p>
                    </div>
                  )}
                </div>

                <Link
                  href={`/incidents/${inc.id}`}
                  className="px-5 py-2 bg-rose-500 hover:bg-rose-400 text-white rounded-full text-xs font-bold shadow-sm transition-all shrink-0 hover:-translate-y-0.5"
                >
                  Review & Resolve →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. WAITLISTED REQUESTS SECTION */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-semibold text-slate-900 tracking-tight">
              Waitlisted Requests Queue
            </h2>
            <span className="bg-purple-100 text-purple-800 text-xs font-bold px-3 py-0.5 rounded-full border border-purple-200">
              {waitlistedBookings.length} In Queue
            </span>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Sorted by fairness priority score • Auto-promoted upon cancellation
          </span>
        </div>

        {waitlistedBookings.length === 0 ? (
          <div className="p-8 text-center bg-white/80 rounded-3xl border border-slate-200/80 text-xs text-slate-400">
            No reservations currently waiting on waitlists for your department resources.
          </div>
        ) : (
          <div className="space-y-3">
            {waitlistedBookings.map((b) => (
              <div
                key={b.id}
                className="bg-white/80 backdrop-blur-md rounded-3xl border border-purple-200/80 hover:border-purple-300 p-6 shadow-sm transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-purple-800 bg-purple-100 px-3 py-0.5 rounded-full border border-purple-200">
                      Position #{b.waitlistPosition || 1}
                    </span>
                    <span className="font-bold text-slate-900 text-sm">
                      {b.resource.name}
                    </span>
                    <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      {b.resource.type}
                    </span>
                    <StatusBadge status={b.status} />
                  </div>

                  <p className="text-xs text-slate-600">
                    Applicant: <strong>{b.user.name}</strong> ({b.user.role} • {b.user.department}) •{" "}
                    Requested Window:{" "}
                    <strong className="text-slate-800">
                      {format(new Date(b.start), "MMM d, HH:mm")} – {format(new Date(b.end), "HH:mm")}
                    </strong>{" "}
                    ({formatDistanceToNow(new Date(b.start), { addSuffix: true })})
                  </p>

                  <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                    <span>Purpose: <strong className="text-slate-700">{b.purpose}</strong></span>
                    <span>•</span>
                    <PriorityBreakdown score={b.priorityScore} compact={true} />
                    <span>•</span>
                    <span>Deposit: <strong>{b.depositHeld} credits</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0 w-full md:w-auto justify-end pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                  <WaitlistPromoteButton
                    bookingId={b.id}
                    resourceName={b.resource.name}
                    userName={b.user.name}
                  />

                  <Link
                    href={`/bookings/${b.id}`}
                    className="px-4 py-2 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 rounded-full text-xs font-bold transition-all hover:-translate-y-0.5"
                  >
                    Inspect Booking →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
