"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { resolveIncidentAction } from "./actions";

interface ResolutionFormClientProps {
  incidentId: string;
  targetUserName?: string;
}

export function ResolutionFormClient({
  incidentId,
  targetUserName,
}: ResolutionFormClientProps) {
  const router = useRouter();
  const [resolution, setResolution] = useState("");
  const [penaltyType, setPenaltyType] = useState<string>("NONE");
  const [penaltyCredits, setPenaltyCredits] = useState<number>(20);
  const [suspendDays, setSuspendDays] = useState<number>(7);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolution.trim()) {
      setError("Please describe the resolution details.");
      return;
    }

    setIsLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("incidentId", incidentId);
    formData.append("resolution", resolution);
    formData.append("penaltyType", penaltyType);
    formData.append("penaltyCredits", penaltyCredits.toString());
    formData.append("suspendDays", suspendDays.toString());

    try {
      const res = await resolveIncidentAction(formData);
      if (res.success) {
        router.refresh();
      } else {
        setError(("error" in res && typeof res.error === "string") ? res.error : "Failed to resolve incident");
      }
    } catch {
      setError("An unexpected error occurred while resolving incident.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
      <div>
        <h3 className="font-bold text-slate-900 text-base">
          Manager Adjudication & Resolution
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Provide official department determination and optionally assess fair conduct penalties.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
          {error}
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
          Resolution Details & Findings *
        </label>
        <textarea
          rows={3}
          required
          value={resolution}
          onChange={(e) => setResolution(e.target.value)}
          placeholder="State repair outcome, user interview findings, or equipment inspection verdict..."
          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
          Penalty Action (Subject to Campus Conduct Policy)
        </label>
        <select
          value={penaltyType}
          onChange={(e) => setPenaltyType(e.target.value)}
          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs bg-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="NONE">No Penalty (Accidental wear / Warning issued)</option>
          <option value="STRIKE">Issue Conduct Strike (+1 Strike)</option>
          <option value="CREDIT_FINE">Fine / Deduct Account Credits</option>
          <option value="SUSPENSION">Temporary Reservation Suspension</option>
        </select>
      </div>

      {penaltyType === "CREDIT_FINE" && (
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Credit Fine Amount
          </label>
          <input
            type="number"
            min={5}
            max={200}
            value={penaltyCredits}
            onChange={(e) => setPenaltyCredits(parseInt(e.target.value, 10) || 0)}
            className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs bg-white"
          />
        </div>
      )}

      {penaltyType === "SUSPENSION" && (
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Suspension Duration (Days)
          </label>
          <input
            type="number"
            min={1}
            max={60}
            value={suspendDays}
            onChange={(e) => setSuspendDays(parseInt(e.target.value, 10) || 7)}
            className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs bg-white"
          />
        </div>
      )}

      <div className="pt-2 flex justify-end">
        <button
          type="submit"
          disabled={isLoading}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50 transition-colors"
        >
          {isLoading ? "Recording Decision..." : "Resolve Incident & Record Penalty"}
        </button>
      </div>
    </form>
  );
}
