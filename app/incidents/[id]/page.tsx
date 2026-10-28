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

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Link href="/manage" className="hover:text-blue-600">
            ← Management Console
          </Link>
          <span>/</span>
          <span className="text-slate-800 font-medium">Incidents</span>
          <span>/</span>
          <span className="font-mono text-slate-400">#{incident.id.slice(-8)}</span>
        </div>

        <div className="flex items-center gap-2">
          <StatusBadge status={incident.status} />
        </div>
      </div>

      {/* Incident Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 sm:p-8 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-800 bg-rose-100 px-3 py-1 rounded-lg border border-rose-200">
              {incident.type}
            </span>
            <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
              Severity: {incident.severity}
            </span>
          </div>

          <span className="text-xs text-slate-400 font-mono">
            Reported {format(new Date(incident.createdAt), "MMM d, yyyy HH:mm")}
          </span>
        </div>

        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Incident on &quot;{incident.resource.name}&quot;
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Reported by <strong>{incident.reporter.name}</strong> ({incident.reporter.role} — {incident.reporter.department})
            {incident.booking?.user && (
              <span> • Borrower: <strong>{incident.booking.user.name}</strong> ({incident.booking.user.department})</span>
            )}
          </p>
        </div>

        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-sm text-slate-800 leading-relaxed">
          <strong className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Incident Description
          </strong>
          {incident.description}
        </div>

        {/* AI Summary Banner */}
        {incident.aiSummary && (
          <div className="p-4 bg-amber-50/70 rounded-xl border border-amber-200 space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                ⚠️ AI suggestion — requires human review
              </span>
            </div>
            <p className="text-xs text-amber-950 font-medium leading-relaxed">
              {incident.aiSummary}
            </p>
          </div>
        )}

        {/* Linked Booking Link */}
        {incident.bookingId && (
          <div className="pt-2 flex items-center justify-between text-xs text-slate-500">
            <span>Linked Reservation: #{incident.bookingId.slice(-8)}</span>
            <Link
              href={`/bookings/${incident.bookingId}`}
              className="text-blue-600 font-semibold hover:underline"
            >
              View Full Booking & Inspection History →
            </Link>
          </div>
        )}
      </div>

      {/* Resolution Section */}
      {incident.status === "RESOLVED" ? (
        <div className="bg-emerald-50/60 rounded-2xl border border-emerald-200 p-6 sm:p-8 space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
            <h3 className="font-bold text-emerald-950 text-base">
              Incident Resolved by {incident.resolvedBy?.name || "Manager"}
            </h3>
          </div>

          <div className="p-4 bg-white rounded-xl border border-emerald-100 text-xs text-slate-800 space-y-2">
            <div>
              <span className="font-semibold text-slate-500 uppercase text-[10px] block">
                Official Determination:
              </span>
              <p className="mt-0.5 text-slate-800 font-medium">{incident.resolution}</p>
            </div>

            {incident.penaltyApplied && (
              <div className="pt-2 border-t border-slate-100">
                <span className="font-semibold text-rose-600 uppercase text-[10px] block">
                  Fairness Penalty Applied:
                </span>
                <p className="mt-0.5 text-slate-800 font-bold">{incident.penaltyApplied}</p>
              </div>
            )}
          </div>
        </div>
      ) : isManager ? (
        <ResolutionFormClient
          incidentId={incident.id}
          targetUserName={incident.booking?.user?.name}
          hasDepositHeld={Boolean(
            incident.booking &&
              incident.booking.status === "RETURNED" &&
              incident.booking.depositHeld > 0
          )}
          depositAmount={incident.booking?.depositHeld || 0}
        />
      ) : (
        <div className="p-6 bg-white rounded-2xl border border-slate-200 text-center text-xs text-slate-500">
          This incident is currently under review by the department manager. Determination will be published here.
        </div>
      )}

      {/* Audit Log Timeline */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
        <h3 className="font-bold text-slate-900 text-base">
          Incident Audit History
        </h3>
        <AuditTimeline logs={auditLogs} />
      </div>
    </div>
  );
}
