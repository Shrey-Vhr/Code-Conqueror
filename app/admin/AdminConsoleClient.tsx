"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  verifyCertificationAction,
  createTrainingAction,
  verifyUserAccountAction,
  updateFairnessSettingAction,
} from "./actions";
import { AuditTimeline } from "@/components/AuditTimeline";
import { format } from "date-fns";

interface AdminConsoleClientProps {
  pendingCerts: Array<{
    id: string;
    userId: string;
    userName: string;
    userDepartment: string;
    trainingName: string;
    trainingCode: string;
    documentNote: string | null;
    createdAt: string;
    aiVerdict: {
      verdict: string;
      confidence: number;
      notes: string;
    };
  }>;
  suspiciousUsers: Array<{
    id: string;
    name: string;
    department: string;
    role: string;
    credits: number;
    strikes: number;
    totalBookings: number;
    cancellations: number;
    aiExplanation: string;
  }>;
  allUsers: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    department: string;
    verified: boolean;
    credits: number;
    strikes: number;
    createdAt: string;
  }>;
  fairnessSettings: Array<{
    id: string;
    key: string;
    value: string;
    description: string;
    updatedAt: string;
  }>;
  trainings: Array<{
    id: string;
    name: string;
    code: string;
    department: string;
    validDurationDays: number;
    certCount: number;
  }>;
  auditLogs: any[];
  stats: {
    totalUsers: number;
    totalResources: number;
    totalBookings: number;
    utilizationRate: number;
    totalHours: number;
    statusStats: Record<string, number>;
    purposeStats: Record<string, number>;
    deptBreakdown: Array<{ department: string; hours: number }>;
    topResources: Array<{ name: string; count: number }>;
  };
}

export function AdminConsoleClient({
  pendingCerts,
  suspiciousUsers,
  allUsers,
  fairnessSettings,
  trainings,
  auditLogs,
  stats,
}: AdminConsoleClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<
    "CERTS" | "USERS" | "FAIRNESS" | "ANALYTICS" | "SUSPICIOUS" | "TRAININGS" | "AUDIT"
  >("CERTS");
  const [isPending, startTransition] = useTransition();

  // Training creation form state
  const [showNewTraining, setShowNewTraining] = useState(false);

  // Fairness settings edit state
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");

  const handleVerifyCert = (certId: string, approved: boolean) => {
    startTransition(async () => {
      await verifyCertificationAction(certId, approved);
      router.refresh();
    });
  };

  const handleVerifyUser = (userId: string, verified: boolean) => {
    startTransition(async () => {
      await verifyUserAccountAction(userId, verified);
      router.refresh();
    });
  };

  const handleSaveFairnessSetting = (key: string) => {
    startTransition(async () => {
      await updateFairnessSettingAction(key, editValue);
      setEditingKey(null);
      router.refresh();
    });
  };

  return (
    <div className="space-y-8">
      {/* KPI Stats Grid in Soft Pastel Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-6 bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/40 rounded-3xl border border-emerald-100 shadow-[0_4px_20px_rgb(0,0,0,0.02)]">
          <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">Total Campus Users</span>
          <span className="text-2xl sm:text-3xl font-black text-emerald-950 mt-1 block">{stats.totalUsers}</span>
          <span className="text-[11px] text-emerald-700 font-semibold mt-1 block">
            {allUsers.filter((u) => u.verified).length} verified profiles
          </span>
        </div>

        <div className="p-6 bg-gradient-to-br from-sky-50/70 via-white to-blue-50/40 rounded-3xl border border-sky-100 shadow-[0_4px_20px_rgb(0,0,0,0.02)]">
          <span className="text-xs font-bold text-sky-800 uppercase tracking-wider block">Shared Resources</span>
          <span className="text-2xl sm:text-3xl font-black text-sky-950 mt-1 block">{stats.totalResources}</span>
          <span className="text-[11px] text-sky-700 font-semibold mt-1 block">Active across colleges</span>
        </div>

        <div className="p-6 bg-gradient-to-br from-purple-50/70 via-white to-indigo-50/40 rounded-3xl border border-purple-100 shadow-[0_4px_20px_rgb(0,0,0,0.02)]">
          <span className="text-xs font-bold text-purple-800 uppercase tracking-wider block">Total Usage Recorded</span>
          <span className="text-2xl sm:text-3xl font-black text-purple-950 mt-1 block">{stats.totalHours} hrs</span>
          <span className="text-[11px] text-purple-700 font-semibold mt-1 block">{stats.totalBookings} total bookings</span>
        </div>

        <div className="p-6 bg-gradient-to-br from-amber-50/70 via-white to-orange-50/40 rounded-3xl border border-amber-100 shadow-[0_4px_20px_rgb(0,0,0,0.02)]">
          <span className="text-xs font-bold text-amber-800 uppercase tracking-wider block">Equipment Utilization</span>
          <span className="text-2xl sm:text-3xl font-black text-amber-950 mt-1 block">{stats.utilizationRate}%</span>
          <span className="text-[11px] text-amber-700 font-semibold mt-1 block">+34% vs baseline</span>
        </div>
      </div>

      {/* Admin Pill Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-3 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab("CERTS")}
          className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === "CERTS"
              ? "bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-500/20"
              : "text-slate-600 hover:bg-indigo-50/70 hover:text-indigo-600"
          }`}
        >
          <span>Credentials Review</span>
          {pendingCerts.length > 0 && (
            <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.2 rounded-full shadow-2xs">
              {pendingCerts.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("USERS")}
          className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === "USERS"
              ? "bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-500/20"
              : "text-slate-600 hover:bg-indigo-50/70 hover:text-indigo-600"
          }`}
        >
          <span>Account Verification</span>
          <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.2 rounded-full">
            {allUsers.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("FAIRNESS")}
          className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "FAIRNESS"
              ? "bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-500/20"
              : "text-slate-600 hover:bg-indigo-50/70 hover:text-indigo-600"
          }`}
        >
          Fairness Policy
        </button>

        <button
          onClick={() => setActiveTab("ANALYTICS")}
          className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "ANALYTICS"
              ? "bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-500/20"
              : "text-slate-600 hover:bg-indigo-50/70 hover:text-indigo-600"
          }`}
        >
          Usage Statistics
        </button>

        <button
          onClick={() => setActiveTab("SUSPICIOUS")}
          className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === "SUSPICIOUS"
              ? "bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-500/20"
              : "text-slate-600 hover:bg-indigo-50/70 hover:text-indigo-600"
          }`}
        >
          <span>Fair-Use Flags</span>
          {suspiciousUsers.length > 0 && (
            <span className="bg-amber-400 text-slate-900 text-[10px] font-black px-2 py-0.2 rounded-full">
              {suspiciousUsers.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("TRAININGS")}
          className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "TRAININGS"
              ? "bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-500/20"
              : "text-slate-600 hover:bg-indigo-50/70 hover:text-indigo-600"
          }`}
        >
          Safety Modules ({trainings.length})
        </button>

        <button
          onClick={() => setActiveTab("AUDIT")}
          className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "AUDIT"
              ? "bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-500/20"
              : "text-slate-600 hover:bg-indigo-50/70 hover:text-indigo-600"
          }`}
        >
          Audit Ledger
        </button>
      </div>

      {/* TAB 1: PENDING CERTIFICATIONS REVIEW */}
      {activeTab === "CERTS" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-slate-900 tracking-tight">
              Pending Safety Credential Submissions
            </h3>
            <span className="text-xs text-slate-500 font-medium">
              AI pre-screens uploaded certificates & badges. Administrator confirmation required.
            </span>
          </div>

          {pendingCerts.length === 0 ? (
            <div className="p-12 text-center bg-white/95 rounded-3xl border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.03)]">
              <span className="text-3xl block mb-2">🎉</span>
              <p className="font-bold text-slate-900 text-sm">All certifications cleared</p>
              <p className="text-xs text-slate-500 mt-1">
                There are no pending safety certificates awaiting administrative verification.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {pendingCerts.map((c) => (
                <div
                  key={c.id}
                  className="bg-white/95 backdrop-blur-md rounded-3xl border border-slate-200/80 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.03)] space-y-4"
                >
                  <div className="flex flex-col sm:flex-row justify-between gap-3 items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-base">{c.userName}</span>
                        <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200/60">
                          {c.userDepartment}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Module: <strong>{c.trainingName}</strong> ({c.trainingCode}) • Submitted on{" "}
                        {format(new Date(c.createdAt), "MMM d, yyyy")}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleVerifyCert(c.id, false)}
                        disabled={isPending}
                        className="px-4 py-2 border border-rose-200 text-rose-700 bg-rose-50/80 hover:bg-rose-100 rounded-full text-xs font-bold cursor-pointer transition-all hover:-translate-y-0.5"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleVerifyCert(c.id, true)}
                        disabled={isPending}
                        className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-full text-xs font-bold shadow-md shadow-emerald-500/20 cursor-pointer transition-all hover:-translate-y-0.5"
                      >
                        Verify & Grant
                      </button>
                    </div>
                  </div>

                  {c.documentNote && (
                    <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-100 text-xs">
                      <span className="font-bold text-slate-700 block mb-0.5">Applicant Note / Transcript:</span>
                      <p className="text-slate-600 italic">&quot;{c.documentNote}&quot;</p>
                    </div>
                  )}

                  {/* AI Copilot Badge */}
                  <div className="p-4 rounded-2xl border bg-gradient-to-br from-indigo-50/70 to-purple-50/40 border-indigo-200/80 text-xs flex gap-3 shadow-2xs">
                    <span className="text-base">🤖</span>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-indigo-950 text-xs">
                          AI suggestion — requires human review
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                            c.aiVerdict.verdict === "VERIFIED"
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : "bg-amber-100 text-amber-800 border border-amber-200"
                          }`}
                        >
                          Recommendation: {c.aiVerdict.verdict} ({Math.round(c.aiVerdict.confidence * 100)}% match)
                        </span>
                      </div>
                      <p className="text-indigo-900 text-[11px] leading-relaxed">
                        {c.aiVerdict.notes}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: USER & OWNER ACCOUNT VERIFICATION */}
      {activeTab === "USERS" && (
        <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-[0_8px_30px_rgb(0,0,0,0.03)] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-black text-slate-900 text-base">Campus Account Verification</h3>
              <p className="text-xs text-slate-500">
                Grant or revoke official campus verification status. Verified users have access to department equipment.
              </p>
            </div>
            <span className="text-xs text-slate-500 font-semibold">
              {allUsers.filter((u) => u.verified).length} of {allUsers.length} verified
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200/80 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-3 px-3">Name</th>
                  <th className="py-3 px-3">Email</th>
                  <th className="py-3 px-3">Role</th>
                  <th className="py-3 px-3">Department</th>
                  <th className="py-3 px-3">Credits</th>
                  <th className="py-3 px-3">Strikes</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-3 font-bold text-slate-900">{u.name}</td>
                    <td className="py-3.5 px-3 text-slate-600">{u.email}</td>
                    <td className="py-3.5 px-3">
                      <span className="px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-slate-100 text-slate-700 border border-slate-200/70">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-slate-600">{u.department}</td>
                    <td className="py-3.5 px-3 font-bold text-slate-700">{u.credits}</td>
                    <td className="py-3.5 px-3">
                      {u.strikes > 0 ? (
                        <span className="text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 text-[10px]">{u.strikes} strikes</span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                    <td className="py-3.5 px-3">
                      {u.verified ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          VERIFIED
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          UNVERIFIED
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      {u.verified ? (
                        <button
                          onClick={() => handleVerifyUser(u.id, false)}
                          disabled={isPending}
                          className="px-3.5 py-1 text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-full cursor-pointer transition-all hover:-translate-y-0.5"
                        >
                          Revoke
                        </button>
                      ) : (
                        <button
                          onClick={() => handleVerifyUser(u.id, true)}
                          disabled={isPending}
                          className="px-3.5 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-full cursor-pointer transition-all hover:-translate-y-0.5"
                        >
                          Verify Account
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: FAIRNESS POLICY SETTINGS */}
      {activeTab === "FAIRNESS" && (
        <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-[0_8px_30px_rgb(0,0,0,0.03)] space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-black text-slate-900 text-base">Campus Fairness Policy Settings</h3>
              <p className="text-xs text-slate-500">
                Configure global quotas, monthly credit grants, strikes penalties, and reservation limits.
              </p>
            </div>
            <span className="text-xs font-mono text-slate-400">Config: system_default</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fairnessSettings.map((s) => (
              <div
                key={s.id}
                className="p-5 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-2 shadow-2xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-indigo-700">{s.key}</span>
                  <span className="text-[10px] text-slate-400">
                    Updated {format(new Date(s.updatedAt), "MMM d, yyyy")}
                  </span>
                </div>

                <p className="text-xs text-slate-600">{s.description || "Policy configuration parameter"}</p>

                {editingKey === s.key ? (
                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="px-4 py-1.5 text-xs rounded-full border border-indigo-400 bg-white flex-1 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                    <button
                      onClick={() => handleSaveFairnessSetting(s.key)}
                      disabled={isPending}
                      className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-full cursor-pointer shadow-xs"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingKey(null)}
                      className="px-4 py-1.5 border border-slate-200 text-slate-600 text-xs font-semibold rounded-full hover:bg-slate-100 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-sm font-black text-slate-900 bg-white px-3 py-1 rounded-full border border-slate-200 font-mono shadow-2xs">
                      {s.value}
                    </span>
                    <button
                      onClick={() => {
                        setEditingKey(s.key);
                        setEditValue(s.value);
                      }}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                    >
                      Edit Value
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: USAGE STATISTICS */}
      {activeTab === "ANALYTICS" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/95 backdrop-blur-md p-6 rounded-3xl border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.03)] space-y-3">
              <h4 className="font-black text-slate-900 text-sm">Bookings by Status</h4>
              <div className="space-y-2 text-xs">
                {Object.entries(stats.statusStats).map(([status, count]) => (
                  <div key={status} className="flex justify-between items-center py-1.5 border-b border-slate-100">
                    <span className="text-slate-600 font-medium">{status}</span>
                    <span className="font-bold text-slate-900">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white/95 backdrop-blur-md p-6 rounded-3xl border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.03)] space-y-3">
              <h4 className="font-black text-slate-900 text-sm">Reservations by Purpose</h4>
              <div className="space-y-2 text-xs">
                {Object.entries(stats.purposeStats).map(([purpose, count]) => (
                  <div key={purpose} className="flex justify-between items-center py-1.5 border-b border-slate-100">
                    <span className="text-slate-600 font-medium">{purpose}</span>
                    <span className="font-bold text-slate-900">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white/95 backdrop-blur-md p-6 rounded-3xl border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.03)] space-y-3">
              <h4 className="font-black text-slate-900 text-sm">Hours by Department</h4>
              <div className="space-y-2 text-xs">
                {stats.deptBreakdown.map((d) => (
                  <div key={d.department} className="flex justify-between items-center py-1.5 border-b border-slate-100">
                    <span className="text-slate-600 font-medium">{d.department}</span>
                    <span className="font-bold text-slate-900">{d.hours} hrs</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white/95 backdrop-blur-md p-7 rounded-3xl border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.03)] space-y-4">
            <h4 className="font-black text-slate-900 text-base">Most Utilized Equipment & Spaces</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
              {stats.topResources.map((r, i) => (
                <div key={r.name} className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/50 to-purple-50/30 border border-indigo-100">
                  <span className="text-[10px] font-bold text-indigo-700 block uppercase">Rank #{i + 1}</span>
                  <span className="font-bold text-slate-900 text-xs block truncate mt-1">{r.name}</span>
                  <span className="text-xs text-indigo-600 font-semibold block mt-1">{r.count} reservations</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: SUSPICIOUS FAIR-USE FLAGS */}
      {activeTab === "SUSPICIOUS" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-slate-900 tracking-tight">
              Suspicious Activity & Fair-Use Monitor
            </h3>
            <span className="text-xs text-slate-500">
              Flagged accounts with frequent cancellations, excessive hours, or active penalties.
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {suspiciousUsers.map((u) => (
              <div
                key={u.id}
                className="bg-white/95 backdrop-blur-md rounded-3xl border border-slate-200/80 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.03)] space-y-3.5"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-base">{u.name}</span>
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200/60">
                        {u.role} • {u.department}
                      </span>
                    </div>
                    <div className="flex gap-4 text-xs text-slate-500 mt-1.5 flex-wrap">
                      <span>Total Bookings: <strong>{u.totalBookings}</strong></span>
                      <span>Cancellations: <strong>{u.cancellations}</strong></span>
                      <span>Credits: <strong>{u.credits}</strong></span>
                      <span>Strikes: <strong className={u.strikes > 0 ? "text-rose-600 font-bold" : ""}>{u.strikes}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl border bg-gradient-to-br from-amber-50/80 to-orange-50/40 border-amber-200/80 text-xs flex gap-3 shadow-2xs">
                  <span className="text-base">⚠️</span>
                  <div className="space-y-0.5">
                    <span className="font-bold text-amber-900 text-xs block">
                      AI suggestion — requires human review
                    </span>
                    <p className="text-amber-800 text-[11px] leading-relaxed">
                      {u.aiExplanation}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: TRAINING MODULES */}
      {activeTab === "TRAININGS" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-black text-slate-900 text-base">Campus Safety & Lab Modules</h3>
              <p className="text-xs text-slate-500">
                Prerequisite certifications required by high-powered machinery, cleanrooms, and bio-hoods.
              </p>
            </div>
            <button
              onClick={() => setShowNewTraining(!showNewTraining)}
              className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 text-white rounded-full text-xs font-bold shadow-md shadow-indigo-500/20 cursor-pointer transition-all hover:-translate-y-0.5"
            >
              + Create Safety Module
            </button>
          </div>

          {showNewTraining && (
            <form
              action={async (formData: FormData) => {
                await createTrainingAction(formData);
                setShowNewTraining(false);
                router.refresh();
              }}
              className="bg-white/95 rounded-3xl border border-indigo-200 p-6 sm:p-7 shadow-[0_8px_30px_rgb(0,0,0,0.03)] space-y-4"
            >
              <h4 className="font-black text-sm text-slate-900">Define New Training Certification</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Course / Badge Title
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    placeholder="e.g. Cleanroom Class 100 Safety"
                    className="w-full px-4 py-2.5 rounded-full border border-slate-200 text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Credential Code
                  </label>
                  <input
                    type="text"
                    name="code"
                    required
                    placeholder="e.g. SAF-CLR-100"
                    className="w-full px-4 py-2.5 rounded-full border border-slate-200 text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Department Sponsor
                  </label>
                  <select
                    name="department"
                    className="w-full px-4 py-2.5 rounded-full border border-slate-200 text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer"
                  >
                    <option value="Engineering">Engineering</option>
                    <option value="Computer Science">Computer Science</option>
                    <option value="Media">Media Arts</option>
                    <option value="Biology">Biology</option>
                    <option value="Library">Library</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Validity Duration (Days)
                  </label>
                  <input
                    type="number"
                    name="validDurationDays"
                    defaultValue={365}
                    className="w-full px-4 py-2.5 rounded-full border border-slate-200 text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Description & Syllabus
                </label>
                <textarea
                  name="description"
                  rows={2}
                  placeholder="Outline topics, exams, or hands-on machine checks..."
                  className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewTraining(false)}
                  className="px-5 py-2 border border-slate-200 text-slate-600 rounded-full text-xs font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 text-white rounded-full text-xs font-bold shadow-md shadow-indigo-500/20 cursor-pointer"
                >
                  Save Training Module
                </button>
              </div>
            </form>
          )}

          {/* Training cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {trainings.map((t) => (
              <div
                key={t.id}
                className="bg-white/95 rounded-3xl border border-slate-200/80 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.03)] space-y-2.5 hover:-translate-y-0.5 transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold font-mono px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/70">
                    {t.code}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">{t.department}</span>
                </div>
                <h4 className="font-bold text-slate-900 text-sm leading-snug">{t.name}</h4>
                <div className="pt-2 text-xs text-slate-500 flex justify-between border-t border-slate-100">
                  <span>Validity: {t.validDurationDays} days</span>
                  <span className="font-bold text-indigo-600">{t.certCount} Certified</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 7: GLOBAL AUDIT LEDGER */}
      {activeTab === "AUDIT" && (
        <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.03)] space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-black text-slate-900 text-base">
                Campus-Wide Append-Only Audit Stream
              </h3>
              <p className="text-xs text-slate-500">
                Cryptographically verifiable transactional log of all reservations, conditions, penalties, and auto-sweeps.
              </p>
            </div>
            <span className="text-xs font-mono text-slate-400 font-bold">
              {auditLogs.length} Records
            </span>
          </div>

          <AuditTimeline logs={auditLogs} />
        </div>
      )}
    </div>
  );
}
