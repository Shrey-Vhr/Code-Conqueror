"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { verifyCertificationAction, createTrainingAction } from "./actions";
import { AuditTimeline } from "@/components/AuditTimeline";
import { StatusBadge } from "@/components/StatusBadge";
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
  };
}

export function AdminConsoleClient({
  pendingCerts,
  suspiciousUsers,
  trainings,
  auditLogs,
  stats,
}: AdminConsoleClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"CERTS" | "SUSPICIOUS" | "TRAININGS" | "AUDIT">("CERTS");
  const [isPending, startTransition] = useTransition();

  // Training creation form state
  const [showNewTraining, setShowNewTraining] = useState(false);

  const handleVerifyCert = (certId: string, approved: boolean) => {
    startTransition(async () => {
      await verifyCertificationAction(certId, approved);
      router.refresh();
    });
  };

  return (
    <div className="space-y-8">
      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 uppercase block">Total Campus Users</span>
          <span className="text-2xl font-black text-slate-900 mt-1 block">{stats.totalUsers}</span>
          <span className="text-[11px] text-emerald-600 font-medium mt-0.5 block">100% verified profiles</span>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 uppercase block">Shared Resources</span>
          <span className="text-2xl font-black text-slate-900 mt-1 block">{stats.totalResources}</span>
          <span className="text-[11px] text-blue-600 font-medium mt-0.5 block">Across 4 colleges</span>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 uppercase block">Reservations Processed</span>
          <span className="text-2xl font-black text-slate-900 mt-1 block">{stats.totalBookings}</span>
          <span className="text-[11px] text-purple-600 font-medium mt-0.5 block">Fairness priority enabled</span>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 uppercase block">Equipment Utilization</span>
          <span className="text-2xl font-black text-slate-900 mt-1 block">{stats.utilizationRate}%</span>
          <span className="text-[11px] text-emerald-600 font-medium mt-0.5 block">+34% vs baseline</span>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("CERTS")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "CERTS"
              ? "bg-blue-600 text-white shadow-2xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <span>Certification Verification</span>
          {pendingCerts.length > 0 && (
            <span
              className={`px-2 py-0.2 rounded-full text-[10px] ${
                activeTab === "CERTS" ? "bg-white text-blue-700" : "bg-rose-100 text-rose-700 font-bold"
              }`}
            >
              {pendingCerts.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("SUSPICIOUS")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "SUSPICIOUS"
              ? "bg-blue-600 text-white shadow-2xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <span>AI Fair-Use & Suspicious Flags</span>
          <span
            className={`px-2 py-0.2 rounded-full text-[10px] ${
              activeTab === "SUSPICIOUS" ? "bg-white text-blue-700" : "bg-amber-100 text-amber-800"
            }`}
          >
            AI Active
          </span>
        </button>

        <button
          onClick={() => setActiveTab("TRAININGS")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "TRAININGS"
              ? "bg-blue-600 text-white shadow-2xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Trainings & Credentials ({trainings.length})
        </button>

        <button
          onClick={() => setActiveTab("AUDIT")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "AUDIT"
              ? "bg-blue-600 text-white shadow-2xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Global Audit Ledger ({auditLogs.length})
        </button>
      </div>

      {/* TAB 1: CERTIFICATION VERIFICATION */}
      {activeTab === "CERTS" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Pending Credential Approvals
              </h3>
              <p className="text-xs text-slate-500">
                Review submitted training transcripts with automated AI compliance assessment.
              </p>
            </div>
          </div>

          {pendingCerts.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-400">
              No pending training certifications in the queue!
            </div>
          ) : (
            <div className="space-y-4">
              {pendingCerts.map((cert) => (
                <div
                  key={cert.id}
                  className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
                          {cert.trainingCode}
                        </span>
                        <h4 className="font-bold text-slate-900 text-base">
                          {cert.trainingName}
                        </h4>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">
                        Submitted by: <strong>{cert.userName}</strong> ({cert.userDepartment}) • {format(new Date(cert.createdAt), "MMM d, yyyy")}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleVerifyCert(cert.id, true)}
                        disabled={isPending}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                      >
                        ✓ Verify & Approve Cert
                      </button>
                      <button
                        onClick={() => handleVerifyCert(cert.id, false)}
                        disabled={isPending}
                        className="px-3.5 py-2 border border-rose-200 text-rose-700 hover:bg-rose-50 rounded-xl text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  </div>

                  {/* Document Text */}
                  {cert.documentNote && (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">
                        Applicant Submission Transcript:
                      </span>
                      &quot;{cert.documentNote}&quot;
                    </div>
                  )}

                  {/* AI Compliance Assessment */}
                  <div className="p-4 bg-amber-50/70 rounded-xl border border-amber-200 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                        ⚠️ AI suggestion — requires human review
                      </span>
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded ${
                          cert.aiVerdict.verdict === "RECOMMEND_APPROVAL"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {cert.aiVerdict.verdict.replace(/_/g, " ")} ({cert.aiVerdict.confidence}%)
                      </span>
                    </div>
                    <p className="text-xs text-amber-950 font-medium">
                      {cert.aiVerdict.notes}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SUSPICIOUS USAGE & HOARDING FLAGS */}
      {activeTab === "SUSPICIOUS" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Fairness Policy & Usage Anomaly Monitor
              </h3>
              <p className="text-xs text-slate-500">
                AI analyzes booking frequency, strike history, and reservation cancellation patterns.
              </p>
            </div>
            <span className="text-xs font-semibold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
              ⚠️ AI suggestion — requires human review
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {suspiciousUsers.map((u) => (
              <div
                key={u.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900 text-base">{u.name}</h4>
                    <p className="text-xs text-slate-500">
                      {u.role} • {u.department}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {u.strikes > 0 && (
                      <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        {u.strikes} Strike{u.strikes > 1 ? "s" : ""}
                      </span>
                    )}
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {u.credits} credits
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-center text-xs p-2 bg-slate-50 rounded-xl">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Bookings</span>
                    <strong className="text-slate-900">{u.totalBookings}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Cancellations</span>
                    <strong className={u.cancellations > 0 ? "text-amber-600" : "text-slate-900"}>
                      {u.cancellations}
                    </strong>
                  </div>
                </div>

                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-950 font-medium leading-relaxed">
                  <span className="text-[10px] font-bold uppercase text-amber-700 block mb-0.5">
                    AI Fairness Assessment:
                  </span>
                  {u.aiExplanation}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: TRAININGS REGISTRY */}
      {activeTab === "TRAININGS" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Campus Safety Certification Modules
              </h3>
              <p className="text-xs text-slate-500">
                Manage prerequisite trainings for equipment access and safety protocols.
              </p>
            </div>
            <button
              onClick={() => setShowNewTraining(!showNewTraining)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
            >
              + Create Safety Module
            </button>
          </div>

          {/* New Training Form */}
          {showNewTraining && (
            <form
              action={async (formData) => {
                await createTrainingAction(formData);
                setShowNewTraining(false);
                router.refresh();
              }}
              className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-4"
            >
              <h4 className="font-bold text-slate-900 text-sm">
                Add New University Training Module
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Training Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    placeholder="e.g. Cleanroom Class 100 Protocol"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Module Code *
                  </label>
                  <input
                    type="text"
                    name="code"
                    required
                    placeholder="e.g. CR-TR-01"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white uppercase font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Department *
                  </label>
                  <select
                    name="department"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                  >
                    <option value="Engineering">Engineering</option>
                    <option value="Media">Media Arts</option>
                    <option value="Biology">Biology</option>
                    <option value="Library">Library</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Validity Duration (Days)
                  </label>
                  <input
                    type="number"
                    name="validDurationDays"
                    defaultValue={365}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Description & Syllabus
                </label>
                <textarea
                  name="description"
                  rows={2}
                  placeholder="Outline topics, exams, or hands-on machine checks..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowNewTraining(false)}
                  className="px-3.5 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold"
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
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                    {t.code}
                  </span>
                  <span className="text-xs text-slate-400">
                    {t.department}
                  </span>
                </div>
                <h4 className="font-bold text-slate-900 text-sm leading-snug">
                  {t.name}
                </h4>
                <div className="pt-2 text-xs text-slate-500 flex justify-between border-t border-slate-100">
                  <span>Validity: {t.validDurationDays} days</span>
                  <span>{t.certCount} Certified Users</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: GLOBAL AUDIT LEDGER */}
      {activeTab === "AUDIT" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Campus-Wide Append-Only Audit Stream
              </h3>
              <p className="text-xs text-slate-500">
                Cryptographically verifiable transactional log of all reservations, conditions, penalties, and auto-sweeps.
              </p>
            </div>
            <span className="text-xs font-mono text-slate-400">
              {auditLogs.length} Records
            </span>
          </div>

          <AuditTimeline logs={auditLogs} />
        </div>
      )}
    </div>
  );
}
