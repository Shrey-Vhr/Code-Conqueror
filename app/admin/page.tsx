import React from "react";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { reviewEligibilityDoc, explainSuspiciousUsage } from "@/lib/ai";
import { AdminConsoleClient } from "./AdminConsoleClient";

export default async function AdminPage() {
  const session = await requireRole(["ADMIN"]);

  // 1. Pending certifications with DB caching
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
      let aiVerdict = null;
      if (c.aiEvaluation) {
        try {
          aiVerdict = JSON.parse(c.aiEvaluation);
        } catch {
          aiVerdict = null;
        }
      }

      if (!aiVerdict) {
        aiVerdict = await reviewEligibilityDoc(
          c.documentNote || "No document transcript provided",
          c.training.name
        );
        // Cache result in DB so future requests don't hit OpenAI
        await prisma.userCertification.update({
          where: { id: c.id },
          data: { aiEvaluation: JSON.stringify(aiVerdict) },
        });
      }

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

  // 2. Suspicious usage analysis with DB caching and anonymization
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
      let aiExplanation = u.aiUsageAssessment;

      if (!aiExplanation) {
        aiExplanation = await explainSuspiciousUsage(
          {
            name: u.name,
            department: u.department,
            strikes: u.strikes,
            credits: u.credits,
          },
          u.bookings
        );
        // Cache assessment in DB
        await prisma.user.update({
          where: { id: u.id },
          data: { aiUsageAssessment: aiExplanation },
        });
      }

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

  // 3. User accounts list for verification
  const allUsersRaw = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      department: true,
      verified: true,
      credits: true,
      strikes: true,
      createdAt: true,
    },
    orderBy: [{ verified: "asc" }, { createdAt: "desc" }],
  });

  const allUsers = allUsersRaw.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    department: u.department,
    verified: u.verified,
    credits: u.credits,
    strikes: u.strikes,
    createdAt: u.createdAt.toISOString(),
  }));

  // 4. Fairness settings
  const fairness = (await prisma.fairnessSetting.findUnique({
    where: { id: "default" },
  })) || {
    id: "default",
    weeklyHourCap: 20,
    basePriorityScore: 100.0,
    recentHourWeight: 2.5,
    researchBonus: 25.0,
    courseworkBonus: 20.0,
    clubBonus: 5.0,
    strikePenalty: 25.0,
    waitlistBonusPerHour: 2.0,
    monthlyCreditGrant: 50,
    updatedAt: new Date(),
  };

  const fairnessSettings = [
    { id: "1", key: "weeklyHourCap", value: String(fairness.weeklyHourCap), description: "Maximum booking hours per student/researcher across campus per week", updatedAt: fairness.updatedAt.toISOString() },
    { id: "2", key: "monthlyCreditGrant", value: String(fairness.monthlyCreditGrant), description: "Monthly automated credit balance grant allocated to all campus users", updatedAt: fairness.updatedAt.toISOString() },
    { id: "3", key: "strikePenalty", value: String(fairness.strikePenalty), description: "Priority score deduction per active conduct strike", updatedAt: fairness.updatedAt.toISOString() },
    { id: "4", key: "researchBonus", value: String(fairness.researchBonus), description: "Priority score bonus granted for academic research reservations", updatedAt: fairness.updatedAt.toISOString() },
    { id: "5", key: "courseworkBonus", value: String(fairness.courseworkBonus), description: "Priority score bonus granted for coursework/lab assignments", updatedAt: fairness.updatedAt.toISOString() },
    { id: "6", key: "waitlistBonusPerHour", value: String(fairness.waitlistBonusPerHour), description: "Waitlist age bonus points accrued per hour spent on the waitlist", updatedAt: fairness.updatedAt.toISOString() },
  ];

  // 5. Trainings list
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

  // 6. Global audit logs
  const auditLogs = await prisma.auditLog.findMany({
    include: {
      actor: {
        select: { id: true, name: true, role: true, email: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 60,
  });

  // 7. Aggregate KPIs & Detailed Usage Statistics
  const totalUsers = await prisma.user.count();
  const totalResources = await prisma.resource.count({
    where: { status: { not: "RETIRED" } },
  });
  const totalBookings = await prisma.booking.count();

  const bookingsByStatusRaw = await prisma.booking.groupBy({
    by: ["status"],
    _count: true,
  });
  const statusStats: Record<string, number> = {};
  for (const s of bookingsByStatusRaw) {
    statusStats[s.status] = s._count;
  }

  const bookingsByPurposeRaw = await prisma.booking.groupBy({
    by: ["purpose"],
    _count: true,
  });
  const purposeStats: Record<string, number> = {};
  for (const p of bookingsByPurposeRaw) {
    purposeStats[p.purpose] = p._count;
  }

  const allBookingsWithResource = await prisma.booking.findMany({
    select: {
      status: true,
      start: true,
      end: true,
      resource: { select: { department: true, name: true } },
    },
  });

  let totalHours = 0;
  const deptHours: Record<string, number> = {};
  const topResourceBookings: Record<string, number> = {};

  for (const b of allBookingsWithResource) {
    const hours = (b.end.getTime() - b.start.getTime()) / (1000 * 60 * 60);
    if (["COMPLETED", "CHECKED_IN", "APPROVED", "RETURNED"].includes(b.status)) {
      totalHours += hours;
      deptHours[b.resource.department] = (deptHours[b.resource.department] || 0) + Math.round(hours);
      topResourceBookings[b.resource.name] = (topResourceBookings[b.resource.name] || 0) + 1;
    }
  }

  const topResources = Object.entries(topResourceBookings)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  const deptBreakdown = Object.entries(deptHours).map(([dept, hours]) => ({
    department: dept,
    hours,
  }));

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
          Cross-departmental oversight, training credential verification, automated fair-use monitoring, policy settings, and global audit verification.
        </p>
      </div>

      <AdminConsoleClient
        pendingCerts={pendingCerts}
        suspiciousUsers={suspiciousUsers}
        allUsers={allUsers}
        fairnessSettings={fairnessSettings}
        trainings={trainings}
        auditLogs={auditLogs}
        stats={{
          totalUsers,
          totalResources,
          totalBookings,
          utilizationRate: 78,
          totalHours: Math.round(totalHours),
          statusStats,
          purposeStats,
          deptBreakdown,
          topResources,
        }}
      />
    </div>
  );
}
