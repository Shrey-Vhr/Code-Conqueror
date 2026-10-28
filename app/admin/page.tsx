import React from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { reviewEligibilityDoc, explainSuspiciousUsage } from "@/lib/ai";
import { AdminConsoleClient } from "./AdminConsoleClient";

export default async function AdminPage() {
  const session = await requireRole(["ADMIN"]);

  // 1. Pending certifications
  const pendingCertsRaw = await prisma.userCertification.findMany({
    where: { status: "PENDING" },
    include: {
      user: true,
      training: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const pendingCerts = await Promise.all(
    pendingCertsRaw.map(async (c) => {
      const aiVerdict = await reviewEligibilityDoc(
        c.documentNote || "No document transcript provided",
        c.training.name
      );

      return {
        id: c.id,
        userId: c.userId,
        userName: c.user.name,
        userDepartment: c.user.department,
        trainingName: c.training.name,
        trainingCode: c.training.code,
        documentNote: c.documentNote,
        createdAt: c.createdAt.toISOString(),
        aiVerdict,
      };
    })
  );

  // 2. Suspicious usage analysis
  const usersWithBookings = await prisma.user.findMany({
    where: { role: { in: ["STUDENT", "RESEARCHER"] } },
    include: {
      bookings: {
        select: {
          status: true,
          start: true,
          end: true,
        },
      },
    },
  });

  const suspiciousUsers = await Promise.all(
    usersWithBookings.map(async (u) => {
      const cancellations = u.bookings.filter((b) => b.status === "CANCELLED").length;
      const aiExplanation = await explainSuspiciousUsage(
        {
          name: u.name,
          department: u.department,
          strikes: u.strikes,
          credits: u.credits,
        },
        u.bookings
      );

      return {
        id: u.id,
        name: u.name,
        department: u.department,
        role: u.role,
        credits: u.credits,
        strikes: u.strikes,
        totalBookings: u.bookings.length,
        cancellations,
        aiExplanation,
      };
    })
  );

  // 3. Trainings list
  const trainingsRaw = await prisma.training.findMany({
    include: {
      _count: {
        select: { certifications: true },
      },
    },
    orderBy: { name: "asc" },
  });

  const trainings = trainingsRaw.map((t) => ({
    id: t.id,
    name: t.name,
    code: t.code,
    department: t.department,
    validDurationDays: t.validDurationDays,
    certCount: t._count.certifications,
  }));

  // 4. Global audit logs
  const auditLogs = await prisma.auditLog.findMany({
    include: {
      actor: {
        select: { id: true, name: true, role: true, email: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 60,
  });

  // 5. Aggregate KPIs
  const totalUsers = await prisma.user.count();
  const totalResources = await prisma.resource.count({
    where: { status: { not: "RETIRED" } },
  });
  const totalBookings = await prisma.booking.count();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-rose-800 bg-rose-100 px-2.5 py-0.5 rounded border border-rose-200">
            Dean of Facilities & Campus Administration
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
          Campus Governance & Resource Intelligence
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Cross-departmental oversight, training credential verification, automated fair-use monitoring, and global audit verification.
        </p>
      </div>

      <AdminConsoleClient
        pendingCerts={pendingCerts}
        suspiciousUsers={suspiciousUsers}
        trainings={trainings}
        auditLogs={auditLogs}
        stats={{
          totalUsers,
          totalResources,
          totalBookings,
          utilizationRate: 78,
        }}
      />
    </div>
  );
}
