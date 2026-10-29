import React from "react";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAuth, isManagerOrAdmin } from "@/lib/rbac";
import { StatusBadge } from "@/components/StatusBadge";
import { AuditTimeline } from "@/components/AuditTimeline";
import { ResolutionFormClient } from "./ResolutionFormClient";
import { format } from "date-fns";

export default async function IncidentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireAuth();

  const incident = await prisma.incident.findUnique({
    where: { id },
    include: {
      resource: true,
      reporter: { select: { id: true, name: true, role: true, department: true } },
      resolvedBy: { select: { id: true, name: true, role: true } },
      booking: {
        include: {
          user: { select: { id: true, name: true, email: true, department: true, strikes: true, credits: true } },
          conditionReports: true,
        },
      },
    },
  });

  if (!incident) notFound();

  const isManager = isManagerOrAdmin(session.role);
  const isReporter = incident.reporterId === session.id;
  const isBorrower = incident.booking?.userId === session.id;

  if (!isManager && !isReporter && !isBorrower) {
    redirect("/bookings");
  }

  // Load audit logs
  const auditLogs = await prisma.auditLog.findMany({
    where: {
      entityType: "Incident",
      entityId: id,
    },
    include: {
      actor: { select: { id: true, name: true, role: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const otherUnresolvedCount = incident.booking
    ? await prisma.incident.count({
        where: {
          bookingId: incident.booking.id,
          id: { not: incident.id },
          status: { not: "RESOLVED" },
        },
      })
    : 0;

  const isFinalIncidentForSettlement = Boolean(
    incident.booking &&
      incident.booking.status === "RETURNED" &&
      otherUnresolvedCount === 0
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <Link
            href="/manage"
            className="hover:text-indigo-600 bg-white/80 px-3 py-1 rounded-full border border-slate-200/60 shadow-2xs transition-colors"
          >
            ← Management Console
          </Link>
          <span>/</span>
          <span className="text-slate-800 font-semibold">Incidents</span>
          <span>/</span>
          <span className="font-mono text-slate-400 bg-white/60 px-2 py-0.5 rounded-full border border-slate-200/50">
            #{incident.id.slice(-8)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <StatusBadge status={incident.status} />
        </div>
      </div>

      {/* Incident Header Card */}
      <div className="card-pastel-rose rounded-3xl p-6 sm:p-8 space-y-5 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-800 bg-white/80 px-3 py-1 rounded-full border border-rose-200/80 shadow-2xs">
              {incident.type}
            </span>
            <span className="text-xs font-bold text-slate-700 bg-white/80 px-3 py-1 rounded-full border border-slate-200/70 shadow-2xs">
              Severity: {incident.severity}
            </span>
          </div>

          <span className="text-xs text-slate-500 font-mono bg-white/70 px-3 py-1 rounded-full border border-slate-200/60 font-medium">
            Reported {format(new Date(incident.createdAt), "MMM d, yyyy HH:mm")}
          </span>
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight">
            Incident on &quot;{incident.resource.name}&quot;
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1.5 font-medium">
            Reported by <strong className="text-slate-900">{incident.reporter.name}</strong> ({incident.reporter.role} — {incident.reporter.department})
            {incident.booking?.user && (
              <span> • Borrower: <strong className="text-slate-900">{incident.booking.user.name}</strong> ({incident.booking.user.department})</span>
            )}
          </p>
        </div>

        <div className="p-5 bg-white/85 rounded-2xl border border-rose-100/80 text-sm text-slate-800 leading-relaxed shadow-2xs backdrop-blur-xs">
          <strong className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
            Incident Description
          </strong>
          {incident.description}
        </div>

        {/* AI Summary Banner */}
        {incident.aiSummary && (
          <div className="p-4 sm:p-5 card-pastel-peach rounded-2xl border border-amber-200/80 space-y-2 shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-amber-900 bg-white/80 px-3 py-0.5 rounded-full border border-amber-300 shadow-2xs">
                AI suggestion — requires human review
              </span>
            </div>
            <p className="text-xs sm:text-sm text-amber-950 font-medium leading-relaxed">
              {incident.aiSummary}
            </p>
          </div>
        )}

        {/* Linked Booking Link */}
        {incident.bookingId && (
          <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-slate-600">
            <span className="font-medium">Linked Reservation: #{incident.bookingId.slice(-8)}</span>
            <Link
              href={`/bookings/${incident.bookingId}`}
              className="text-indigo-700 bg-white/80 hover:bg-white border border-indigo-200/70 px-3.5 py-1.5 rounded-full font-bold shadow-2xs hover:shadow-xs transition-all inline-flex items-center gap-1 hover:-translate-y-0.5"
            >
              <span>View Full Booking & Inspection History</span>
              <span>→</span>
            </Link>
          </div>
        )}
      </div>

      {/* Resolution Section */}
      {incident.status === "RESOLVED" ? (
        <div className="card-pastel-mint rounded-3xl border border-emerald-200/80 p-6 sm:p-8 space-y-4 shadow-sm">
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-emerald-600 shadow-sm shadow-emerald-200 ring-2 ring-emerald-200" />
            <h3 className="font-bold text-emerald-950 text-base sm:text-lg">
              Incident Resolved by {incident.resolvedBy?.name || "Manager"}
            </h3>
          </div>

          <div className="p-5 bg-white/80 rounded-2xl border border-emerald-100 text-xs sm:text-sm text-slate-800 space-y-3 shadow-2xs">
            <div>
              <span className="font-bold text-slate-400 uppercase text-[10px] tracking-wider block">
                Official Determination
              </span>
              <p className="mt-1 text-slate-800 font-medium leading-relaxed">{incident.resolution}</p>
            </div>

            {incident.penaltyApplied && (
              <div className="pt-3 border-t border-slate-100">
                <span className="font-bold text-rose-600 uppercase text-[10px] tracking-wider block">
                  Fairness Penalty Applied
                </span>
                <p className="mt-1 text-slate-900 font-bold">{incident.penaltyApplied}</p>
              </div>
            )}
          </div>
        </div>
      ) : isManager ? (
        <ResolutionFormClient
          incidentId={incident.id}
          targetUserName={incident.booking?.user?.name}
          hasDepositHeld={Boolean(
            isFinalIncidentForSettlement &&
              incident.booking &&
              incident.booking.depositHeld > 0
          )}
          depositAmount={incident.booking?.depositHeld || 0}
          otherUnresolvedCount={otherUnresolvedCount}
        />
      ) : (
        <div className="p-8 bg-white/85 rounded-3xl border border-slate-200/80 text-center text-xs text-slate-500 shadow-2xs">
          This incident is currently under review by the department manager. Determination will be published here.
        </div>
      )}

      {/* Audit Log Timeline */}
      <div className="bg-white/85 rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm backdrop-blur-md space-y-4">
        <h3 className="font-bold text-slate-900 text-base">
          Incident Audit History
        </h3>
        <AuditTimeline logs={auditLogs} />
      </div>
    </div>
  );
}