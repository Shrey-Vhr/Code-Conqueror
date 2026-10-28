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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Safety & Operational Certifications
          </h2>
          <p className="text-xs text-slate-500">
            Mandatory credentials unlocking laser cutters, 3D printers, bio-hoods, and GPU clusters.
          </p>
        </div>

        <button
          onClick={() => setShowSubmitModal(!showSubmitModal)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
        >
          + Submit Safety Credential
        </button>
      </div>

      {/* Submit Credential Form */}
      {showSubmitModal && (
        <form onSubmit={handleSubmit} className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">
              Submit Credential for Campus Verification
            </h3>
            <p className="text-xs text-slate-500">
              Paste workshop completion transcript, lab technician badge ID, or online safety test confirmation.
            </p>
          </div>

          {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Select Required Training Module *
            </label>
            <select
              required
              value={selectedTrainingId}
              onChange={(e) => setSelectedTrainingId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Document Note / Credential Transcript *
            </label>
            <textarea
              required
              rows={3}
              value={documentNote}
              onChange={(e) => setDocumentNote(e.target.value)}
              placeholder="e.g. Attended safety workshop with Lab Tech Jenkins on Oct 14. Certificate ID: #NF-SAF-8821. Passed fire safety exam."
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowSubmitModal(false)}
              className="px-3.5 py-1.5 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isPending ? "Submitting..." : "Submit to Admin for Verification"}
            </button>
          </div>
        </form>
      )}

      {/* Certifications Table */}
      {userCertifications.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-400">
          No training certifications on record yet. Click &quot;Submit Safety Credential&quot; to request verification.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {userCertifications.map((cert) => (
            <div
              key={cert.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                    {cert.trainingCode}
                  </span>
                  <h4 className="font-bold text-slate-900 text-sm mt-1 leading-snug">
                    {cert.trainingName}
                  </h4>
                  <span className="text-xs text-slate-400">{cert.department}</span>
                </div>
                <StatusBadge status={cert.status} />
              </div>

              {cert.documentNote && (
                <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 italic">
                  &quot;{cert.documentNote}&quot;
                </p>
              )}

              <div className="pt-2 text-[11px] text-slate-500 border-t border-slate-100 flex justify-between">
                <span>Status: <strong>{cert.status}</strong></span>
                {cert.expiresAt && (
                  <span>Expires: {format(new Date(cert.expiresAt), "MMM d, yyyy")}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
