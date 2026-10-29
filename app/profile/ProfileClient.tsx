"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitCertificationAction } from "./actions";
import { StatusBadge } from "@/components/StatusBadge";
import { format } from "date-fns";

interface ProfileClientProps {
  trainings: Array<{ id: string; name: string; code: string; department: string }>;
  userCertifications: Array<{
    id: string;
    trainingId: string;
    trainingName: string;
    trainingCode: string;
    department: string;
    status: string;
    expiresAt: string | null;
    documentNote: string | null;
  }>;
}

export function ProfileClient({
  trainings,
  userCertifications,
}: ProfileClientProps) {
  const router = useRouter();
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [selectedTrainingId, setSelectedTrainingId] = useState("");
  const [documentNote, setDocumentNote] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData();
    formData.append("trainingId", selectedTrainingId);
    formData.append("documentNote", documentNote);

    startTransition(async () => {
      const res = await submitCertificationAction(formData);
      if (res.success) {
        setShowSubmitModal(false);
        setSelectedTrainingId("");
        setDocumentNote("");
        router.refresh();
      } else {
        setError(("error" in res && typeof res.error === "string") ? res.error : "Submission failed");
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Safety & Operational Certifications
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Mandatory credentials unlocking laser cutters, 3D printers, bio-hoods, and GPU clusters.
          </p>
        </div>

        <button
          onClick={() => setShowSubmitModal(!showSubmitModal)}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full text-xs font-bold shadow-md shadow-indigo-100 hover:shadow-lg hover:-translate-y-0.5 active:scale-95 transition-all cursor-pointer inline-flex items-center gap-1.5 self-start sm:self-auto"
        >
          <span>+</span>
          <span>Submit Safety Credential</span>
        </button>
      </div>

      {/* Submit Credential Form */}
      {showSubmitModal && (
        <form onSubmit={handleSubmit} className="p-6 sm:p-7 card-pastel-lavender rounded-3xl space-y-4 shadow-lg backdrop-blur-md">
          <div>
            <h3 className="font-bold text-slate-900 text-base">
              Submit Credential for Campus Verification
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Paste workshop completion transcript, lab technician badge ID, or online safety test confirmation.
            </p>
          </div>

          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl font-semibold">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Select Required Training Module *
            </label>
            <select
              required
              value={selectedTrainingId}
              onChange={(e) => setSelectedTrainingId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-full border border-slate-200/90 text-xs bg-white/80 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
            >
              <option value="">-- Choose Training --</option>
              {trainings.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.code}: {t.name} ({t.department})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Document Note / Credential Transcript *
            </label>
            <textarea
              required
              rows={3}
              value={documentNote}
              onChange={(e) => setDocumentNote(e.target.value)}
              placeholder="e.g. Attended safety workshop with Lab Tech Jenkins on Oct 14. Certificate ID: #NF-SAF-8821. Passed fire safety exam."
              className="w-full px-4 py-3 rounded-2xl border border-slate-200/90 text-xs bg-white/80 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setShowSubmitModal(false)}
              className="px-4 py-2 border border-slate-200 bg-white/80 text-slate-700 rounded-full text-xs font-semibold hover:bg-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full text-xs font-bold shadow-md shadow-indigo-100 hover:-translate-y-0.5 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              {isPending ? "Submitting..." : "Submit for Verification"}
            </button>
          </div>
        </form>
      )}

      {/* Certifications Table */}
      {userCertifications.length === 0 ? (
        <div className="p-10 text-center bg-white/85 rounded-3xl border border-slate-200/80 text-xs text-slate-400 shadow-sm">
          No training certifications on record yet. Click &quot;Submit Safety Credential&quot; to request verification.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {userCertifications.map((cert) => {
            const isApproved = cert.status === "APPROVED" || cert.status === "ACTIVE";
            const cardThemeClass = isApproved
              ? "card-pastel-mint"
              : cert.status === "PENDING"
              ? "card-pastel-peach"
              : "card-pastel-lavender";

            return (
              <div
                key={cert.id}
                className={`${cardThemeClass} rounded-3xl p-5 shadow-xs space-y-3`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold font-mono px-2.5 py-0.5 rounded-full bg-white/80 text-slate-700 border border-slate-200/60 shadow-2xs">
                      {cert.trainingCode}
                    </span>
                    <h4 className="font-bold text-slate-900 text-sm mt-1.5 leading-snug">
                      {cert.trainingName}
                    </h4>
                    <span className="text-xs text-slate-500 font-medium">{cert.department}</span>
                  </div>
                  <StatusBadge status={cert.status} />
                </div>

                {cert.documentNote && (
                  <p className="text-xs text-slate-600 bg-white/70 p-3 rounded-2xl border border-slate-100/80 italic font-medium">
                    &quot;{cert.documentNote}&quot;
                  </p>
                )}

                <div className="pt-2 text-[11px] text-slate-500 border-t border-slate-200/50 flex justify-between font-medium">
                  <span>Status: <strong className="text-slate-700">{cert.status}</strong></span>
                  {cert.expiresAt && (
                    <span>Expires: {format(new Date(cert.expiresAt), "MMM d, yyyy")}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}