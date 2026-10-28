import React from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { getUserRecentHours } from "@/lib/fairness";
import { ProfileClient } from "./ProfileClient";
import { AuditTimeline } from "@/components/AuditTimeline";
import { format } from "date-fns";

export default async function ProfilePage() {
  const session = await requireAuth();

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    include: {
      certifications: {
        include: { training: true },
        orderBy: { createdAt: "desc" },
      },
      bookings: {
        where: {
          status: { in: ["APPROVED", "CHECKED_IN", "RETURNED", "COMPLETED"] },
        },
      },
    },
  });

  if (!user) redirect("/login");

  const recent30dHours = await getUserRecentHours(user.id);

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

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Profile Header */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
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
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {user.email} • Verified Campus Identity: {user.verified ? "✓ Active" : "Pending"}
            </p>
          </div>
        </div>

        {/* Standing indicators */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
            <span className="text-[10px] font-semibold text-slate-500 uppercase block">Credits</span>
            <span className="text-xl font-bold text-blue-700">{user.credits}</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
            <span className="text-[10px] font-semibold text-slate-500 uppercase block">Strikes</span>
            <span className={`text-xl font-bold ${user.strikes > 0 ? "text-rose-600" : "text-slate-800"}`}>
              {user.strikes} / 3
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
            <span className="text-[10px] font-semibold text-slate-500 uppercase block">30d Usage</span>
            <span className="text-xl font-bold text-slate-800">{recent30dHours}h</span>
          </div>
        </div>
      </div>

      {/* Suspension Alert */}
      {isSuspended && (
        <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl flex items-center gap-3 text-xs text-rose-800 font-medium">
          <span className="text-lg">⚠️</span>
          <div>
            <strong className="block text-sm font-bold text-rose-900">
              Account Reservation Privileges Suspended
            </strong>
            <span>
              Your account is temporarily suspended from requesting equipment until{" "}
              {format(new Date(user.suspendedUntil!), "MMMM d, yyyy")} due to conduct policy or accumulated strikes.
            </span>
          </div>
        </div>
      )}

      {/* Certifications & Submission Section */}
      <ProfileClient
        trainings={allTrainings.map((t) => ({
          id: t.id,
          name: t.name,
          code: t.code,
          department: t.department,
        }))}
        userCertifications={formattedCerts}
      />

      {/* Activity Log */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900">
            My Recent Audit & Transaction History
          </h2>
          <span className="text-xs text-slate-400">Append-only ledger</span>
        </div>
        <AuditTimeline logs={userAuditLogs} />
      </div>
    </div>
  );
}
