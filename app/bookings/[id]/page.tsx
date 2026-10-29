import React from "react";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAuth, canManageResource } from "@/lib/rbac";
import { StatusBadge } from "@/components/StatusBadge";
import { PriorityBreakdown } from "@/components/PriorityBreakdown";
import { AuditTimeline } from "@/components/AuditTimeline";
import { BookingActionPanels } from "./BookingActionPanels";
import { format } from "date-fns";

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireAuth();

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      resource: {
        include: { owner: true },
      },
      user: {
        select: { id: true, name: true, email: true, department: true, role: true },
      },
      reviewer: {
        select: { id: true, name: true, role: true },
      },
      conditionReports: {
        include: {
          recordedBy: { select: { id: true, name: true, role: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      incidents: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!booking) notFound();

  const isBooker = booking.userId === session.id;
  const isOwnerOrManager = canManageResource(session, {
    ownerId: booking.resource.ownerId,
    department: booking.resource.department,
  });

  if (!isBooker && !isOwnerOrManager && session.role !== "ADMIN") {
    redirect("/bookings");
  }

  // Load audit logs for this booking
  const auditLogs = await prisma.auditLog.findMany({
    where: {
      entityType: "Booking",
      entityId: id,
    },
    include: {
      actor: {
        select: { id: true, name: true, role: true, email: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const checkInReport = booking.conditionReports.find((r) => r.phase === "CHECK_IN");
  const checkOutReport = booking.conditionReports.find((r) => r.phase === "CHECK_OUT");

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Link href="/bookings" className="hover:text-indigo-600 transition-colors font-medium">
            ← My Bookings
          </Link>
          <span>/</span>
          <span className="text-slate-800 font-bold">{booking.resource.name}</span>
          <span>/</span>
          <span className="font-mono text-slate-400">#{booking.id.slice(-8)}</span>
        </div>

        <div className="flex items-center gap-2">
          <StatusBadge status={booking.status} />
          {booking.status === "WAITLISTED" && booking.waitlistPosition && (
            <span className="text-xs font-bold text-purple-700 bg-purple-100 px-3 py-1 rounded-full border border-purple-200">
              Waitlist Position #{booking.waitlistPosition}
            </span>
          )}
        </div>
      </div>

      {/* Main Reservation Card in Soft Pastel Style */}
      <div className="bg-white/80 backdrop-blur-md rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-7 sm:p-8 flex flex-col md:flex-row items-start justify-between gap-6">
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="bg-slate-100 px-2.5 py-0.5 rounded-full font-bold text-slate-700 border border-slate-200/70">
                {booking.resource.department}
              </span>
              <span>•</span>
              <span>{booking.resource.location}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight leading-tight">
              {booking.resource.name}
            </h1>

            <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-600 flex-wrap">
              <span>Booker: <strong className="text-slate-900">{booking.user.name}</strong> ({booking.user.department})</span>
              <span>•</span>
              <span>Purpose: <strong className="text-indigo-600 font-bold uppercase">{booking.purpose}</strong></span>
              {booking.purposeDetails && (
                <span className="text-xs text-slate-500 italic block sm:inline">
                  — &quot;{booking.purposeDetails}&quot;
                </span>
              )}
            </div>

            {/* Decision Reason Banner if approved or rejected */}
            {booking.decisionReason && (
              <div className="mt-3 p-4 bg-gradient-to-r from-indigo-50/70 to-purple-50/40 rounded-2xl border border-indigo-100/80 text-xs">
                <span className="font-bold text-indigo-900 block mb-0.5">
                  Reviewer Decision Note ({booking.reviewer?.name || "Staff"}):
                </span>
                <p className="text-slate-600 italic">&quot;{booking.decisionReason}&quot;</p>
              </div>
            )}
          </div>

          {/* Quick Metrics Bar in Soft Pastel Pill */}
          <div className="shrink-0 w-full md:w-64 p-5 bg-gradient-to-br from-indigo-50/60 via-white to-purple-50/30 rounded-2xl border border-indigo-100 space-y-2.5 text-xs shadow-2xs">
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Reservation Start</span>
              <span className="font-bold text-slate-800">
                {format(new Date(booking.start), "MMM d, HH:mm")}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Scheduled End</span>
              <span className="font-bold text-slate-800">
                {format(new Date(booking.end), "MMM d, HH:mm")}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Deposit Held</span>
              <span className="font-bold text-slate-800">{booking.depositHeld} credits</span>
            </div>
            <div className="pt-2 border-t border-indigo-100/70 flex justify-between">
              <span className="text-slate-500 font-medium">Priority Score</span>
              <span className="font-semibold text-indigo-600 font-mono">{booking.priorityScore} pts</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Controls for Check-in / Return / Cancel / Incident */}
      <div id="condition-actions">
        <BookingActionPanels
          bookingId={booking.id}
          resourceId={booking.resourceId}
          resourceName={booking.resource.name}
          status={booking.status}
          isBooker={isBooker}
          isOwnerOrManager={isOwnerOrManager}
        />
      </div>

      {/* Side-by-Side Condition Reports (Check-In vs Check-Out) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 tracking-tight">
            Physical Inspection & Condition Reports
          </h2>
          <span className="text-xs text-slate-500 font-medium">
            Automated condition delta monitoring
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Check-In Report Card */}
          <div className="bg-white/80 backdrop-blur-md rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs" />
                <h3 className="font-bold text-slate-900 text-sm">Check-In Inspection</h3>
              </div>
              {checkInReport ? (
                <span className="text-xs font-bold text-emerald-800 bg-emerald-50/80 px-3 py-1 rounded-full border border-emerald-200">
                  {checkInReport.rating} / 5 Stars
                </span>
              ) : (
                <span className="text-xs text-slate-400 italic">Pending Check-in</span>
              )}
            </div>

            {checkInReport ? (
              <div className="space-y-3.5 text-xs">
                <div>
                  <span className="text-slate-400 uppercase text-[10px] font-bold tracking-wider block mb-1.5">
                    Verified Checklist
                  </span>
                  <ul className="space-y-1.5 text-slate-700">
                    {JSON.parse(checkInReport.checklist || "[]").map((item: string, idx: number) => (
                      <li key={idx} className="flex items-center gap-2">
                        <span className="text-emerald-600 font-semibold">✓</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {checkInReport.notes && (
                  <div className="p-3.5 bg-slate-50 rounded-2xl text-slate-600 italic border border-slate-100">
                    &quot;{checkInReport.notes}&quot;
                  </div>
                )}

                <div className="pt-2 text-[11px] text-slate-400 flex justify-between">
                  <span>Inspector: {checkInReport.recordedBy.name}</span>
                  <span>{format(new Date(checkInReport.createdAt), "MMM d, HH:mm")}</span>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                Equipment has not been checked in yet. Check-in becomes available when approved.
              </div>
            )}
          </div>

          {/* Check-Out Report Card */}
          <div className="bg-white/80 backdrop-blur-md rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-500 shadow-xs" />
                <h3 className="font-bold text-slate-900 text-sm">Check-Out / Return Inspection</h3>
              </div>
              {checkOutReport ? (
                <span className="text-xs font-bold text-sky-800 bg-sky-50/80 px-3 py-1 rounded-full border border-sky-200">
                  {checkOutReport.rating} / 5 Stars
                </span>
              ) : (
                <span className="text-xs text-slate-400 italic">Pending Return</span>
              )}
            </div>

            {checkOutReport ? (
              <div className="space-y-3.5 text-xs">
                <div>
                  <span className="text-slate-400 uppercase text-[10px] font-bold tracking-wider block mb-1.5">
                    Return Checklist
                  </span>
                  <ul className="space-y-1.5 text-slate-700">
                    {JSON.parse(checkOutReport.checklist || "[]").map((item: string, idx: number) => (
                      <li key={idx} className="flex items-center gap-2">
                        <span className="text-sky-600 font-semibold">✓</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {checkOutReport.notes && (
                  <div className="p-3.5 bg-slate-50 rounded-2xl text-slate-600 italic border border-slate-100">
                    &quot;{checkOutReport.notes}&quot;
                  </div>
                )}

                {/* Rating delta warning */}
                {checkInReport && checkOutReport.rating < checkInReport.rating && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-[11px] font-medium flex items-center gap-1.5">
                    <span>Condition degraded from check-in ({checkInReport.rating}★ → {checkOutReport.rating}★). Damage incident automatically drafted.</span>
                  </div>
                )}

                <div className="pt-2 text-[11px] text-slate-400 flex justify-between">
                  <span>Inspector: {checkOutReport.recordedBy.name}</span>
                  <span>{format(new Date(checkOutReport.createdAt), "MMM d, HH:mm")}</span>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                Equipment return inspection will be recorded when the session concludes.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Linked Incidents */}
      {booking.incidents.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900 tracking-tight">
            Associated Incident Reports
          </h2>
          <div className="grid grid-cols-1 gap-3">
            {booking.incidents.map((inc) => (
              <div
                key={inc.id}
                className="p-5 bg-gradient-to-br from-rose-50/70 via-white to-pink-50/30 rounded-3xl border border-rose-200/80 shadow-xs flex items-start justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-rose-800 text-xs px-2.5 py-0.5 rounded-full bg-rose-100 border border-rose-200">
                      {inc.type}
                    </span>
                    <span className="text-xs font-semibold text-slate-700">
                      Severity: {inc.severity}
                    </span>
                    <StatusBadge status={inc.status} />
                  </div>
                  <p className="text-xs text-slate-700 mt-2 font-medium leading-relaxed">
                    {inc.description}
                  </p>
                  {inc.aiSummary && (
                    <div className="mt-2.5 text-xs text-amber-900 bg-amber-50/90 p-3 rounded-2xl border border-amber-200/80">
                      <span className="text-[10px] font-bold uppercase text-amber-800 block mb-0.5">
                        AI suggestion — requires human review
                      </span>
                      {inc.aiSummary}
                    </div>
                  )}
                </div>

                <Link
                  href={`/incidents/${inc.id}`}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full text-xs font-bold shrink-0 transition-all shadow-xs hover:-translate-y-0.5"
                >
                  View Incident →
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Priority Score Breakdown in Soft Pastel */}
      <PriorityBreakdown breakdown={booking.priorityBreakdown} score={booking.priorityScore} />

      {/* Immutable Audit Log Timeline */}
      <div className="bg-white/80 backdrop-blur-md rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 tracking-tight">
              Immutable Audit Ledger & Lifecycle History
            </h2>
            <p className="text-xs text-slate-500">
              Append-only state log recorded inside transactional database commits.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400 font-semibold">
            {auditLogs.length} events logged
          </span>
        </div>

        <AuditTimeline logs={auditLogs} />
      </div>
    </div>
  );
}
