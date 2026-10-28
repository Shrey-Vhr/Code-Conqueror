import React from "react";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAuth, canManageResource } from "@/lib/rbac";
import { StatusBadge } from "@/components/StatusBadge";
import { PriorityBreakdown } from "@/components/PriorityBreakdown";
import { AuditTimeline } from "@/components/AuditTimeline";
import { BookingActionPanels } from "./BookingActionPanels";
import { format, formatDistanceToNow } from "date-fns";

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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Link href="/bookings" className="hover:text-blue-600">
            ← My Bookings
          </Link>
          <span>/</span>
          <span className="text-slate-800 font-medium">{booking.resource.name}</span>
          <span>/</span>
          <span className="font-mono text-slate-400">#{booking.id.slice(-8)}</span>
        </div>

        <div className="flex items-center gap-2">
          <StatusBadge status={booking.status} />
          {booking.status === "WAITLISTED" && booking.waitlistPosition && (
            <span className="text-xs font-bold text-purple-700 bg-purple-100 px-2.5 py-1 rounded-lg border border-purple-200">
              Waitlist Position #{booking.waitlistPosition}
            </span>
          )}
        </div>
      </div>

      {/* Main Reservation Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-6 sm:p-8 flex flex-col md:flex-row items-start justify-between gap-6">
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="bg-slate-100 px-2 py-0.5 rounded font-semibold text-slate-700">
                {booking.resource.department}
              </span>
              <span>•</span>
              <span>{booking.resource.location}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {booking.resource.name}
            </h1>

            <div className="flex items-center gap-3 text-sm text-slate-600 flex-wrap">
              <span>Booker: <strong className="text-slate-900">{booking.user.name}</strong> ({booking.user.department})</span>
              <span>•</span>
              <span>Purpose: <strong className="text-blue-700 uppercase">{booking.purpose}</strong></span>
              {booking.purposeDetails && (
                <span className="text-xs text-slate-500 italic block sm:inline">
                  — &quot;{booking.purposeDetails}&quot;
                </span>
              )}
            </div>

            {/* Decision Reason Banner if approved or rejected */}
            {booking.decisionReason && (
              <div className="mt-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <span className="font-semibold text-slate-700 block mb-0.5">
                  Reviewer Decision Note ({booking.reviewer?.name || "Staff"}):
                </span>
                <p className="text-slate-600 italic">&quot;{booking.decisionReason}&quot;</p>
              </div>
            )}
          </div>

          {/* Quick Metrics Bar */}
          <div className="shrink-0 w-full md:w-64 p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Reservation Start</span>
              <span className="font-bold text-slate-800">
                {format(new Date(booking.start), "MMM d, HH:mm")}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Scheduled End</span>
              <span className="font-bold text-slate-800">
                {format(new Date(booking.end), "MMM d, HH:mm")}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Deposit Held</span>
              <span className="font-bold text-slate-800">{booking.depositHeld} credits</span>
            </div>
            <div className="pt-2 border-t border-slate-200 flex justify-between">
              <span className="text-slate-500">Priority Score</span>
              <span className="font-bold text-blue-700 font-mono">{booking.priorityScore} pts</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Controls for Check-in / Return / Cancel / Incident */}
      <BookingActionPanels
        bookingId={booking.id}
        resourceId={booking.resourceId}
        resourceName={booking.resource.name}
        status={booking.status}
        isBooker={isBooker}
        isOwnerOrManager={isOwnerOrManager}
      />

      {/* Side-by-Side Condition Reports (Check-In vs Check-Out) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">
            Physical Inspection & Condition Reports
          </h2>
          <span className="text-xs text-slate-500">
            Automated condition delta monitoring
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Check-In Report Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <h3 className="font-bold text-slate-900 text-sm">Check-In Inspection</h3>
              </div>
              {checkInReport ? (
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                  {checkInReport.rating} / 5 Stars
                </span>
              ) : (
                <span className="text-xs text-slate-400 italic">Pending Check-in</span>
              )}
            </div>

            {checkInReport ? (
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 uppercase text-[10px] font-semibold block mb-1">
                    Verified Checklist
                  </span>
                  <ul className="space-y-1 text-slate-700">
                    {JSON.parse(checkInReport.checklist || "[]").map((item: string, idx: number) => (
                      <li key={idx} className="flex items-center gap-2">
                        <span className="text-emerald-600 font-bold">✓</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {checkInReport.notes && (
                  <div className="p-3 bg-slate-50 rounded-lg text-slate-600 italic">
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
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <h3 className="font-bold text-slate-900 text-sm">Check-Out / Return Inspection</h3>
              </div>
              {checkOutReport ? (
                <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200">
                  {checkOutReport.rating} / 5 Stars
                </span>
              ) : (
                <span className="text-xs text-slate-400 italic">Pending Return</span>
              )}
            </div>

            {checkOutReport ? (
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 uppercase text-[10px] font-semibold block mb-1">
                    Return Checklist
                  </span>
                  <ul className="space-y-1 text-slate-700">
                    {JSON.parse(checkOutReport.checklist || "[]").map((item: string, idx: number) => (
                      <li key={idx} className="flex items-center gap-2">
                        <span className="text-blue-600 font-bold">✓</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {checkOutReport.notes && (
                  <div className="p-3 bg-slate-50 rounded-lg text-slate-600 italic">
                    &quot;{checkOutReport.notes}&quot;
                  </div>
                )}

                {/* Rating delta warning */}
                {checkInReport && checkOutReport.rating < checkInReport.rating && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-[11px] font-medium flex items-center gap-1.5">
                    <span>⚠️ Condition degraded from check-in ({checkInReport.rating}★ → {checkOutReport.rating}★). Damage incident automatically drafted.</span>
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
          <h2 className="text-lg font-bold text-slate-900">
            Associated Incident Reports
          </h2>
          <div className="grid grid-cols-1 gap-3">
            {booking.incidents.map((inc) => (
              <div
                key={inc.id}
                className="p-4 bg-white rounded-xl border border-rose-200 shadow-2xs flex items-start justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-rose-800 text-xs px-2 py-0.5 rounded bg-rose-100">
                      {inc.type}
                    </span>
                    <span className="text-xs font-semibold text-slate-700">
                      Severity: {inc.severity}
                    </span>
                    <StatusBadge status={inc.status} />
                  </div>
                  <p className="text-xs text-slate-700 mt-2 font-medium">
                    {inc.description}
                  </p>
                  {inc.aiSummary && (
                    <div className="mt-2 text-xs text-amber-900 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                      <span className="text-[10px] font-bold uppercase text-amber-700 block mb-0.5">
                        ⚠️ AI suggestion — requires human review
                      </span>
                      {inc.aiSummary}
                    </div>
                  )}
                </div>

                <Link
                  href={`/incidents/${inc.id}`}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-blue-600 text-white rounded-lg text-xs font-semibold shrink-0 transition-colors"
                >
                  View Incident & Resolution →
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Priority Score Breakdown */}
      <PriorityBreakdown breakdown={booking.priorityBreakdown} score={booking.priorityScore} />

      {/* Immutable Audit Log Timeline */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Immutable Audit Ledger & Lifecycle History
            </h2>
            <p className="text-xs text-slate-500">
              Append-only state log recorded inside transactional database commits.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {auditLogs.length} events logged
          </span>
        </div>

        <AuditTimeline logs={auditLogs} />
      </div>
    </div>
  );
}
