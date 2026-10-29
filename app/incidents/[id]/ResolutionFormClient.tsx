"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { resolveIncidentAction } from "./actions";

interface ResolutionFormClientProps {
  incidentId: string;
  targetUserName?: string;
  hasDepositHeld?: boolean;
  depositAmount?: number;
  otherUnresolvedCount?: number;
}

export function ResolutionFormClient({
  incidentId,
  targetUserName,
  hasDepositHeld = false,
  depositAmount = 0,
  otherUnresolvedCount = 0,
}: ResolutionFormClientProps) {
  const router = useRouter();
  const [resolution, setResolution] = useState("");
  const [penaltyType, setPenaltyType] = useState<string>("NONE");
  const [penaltyCredits, setPenaltyCredits] = useState<number>(20);
  const [suspendDays, setSuspendDays] = useState<number>(7);
  const [depositAction, setDepositAction] = useState<"REFUND" | "FORFEIT">("REFUND");
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
    formData.append("depositAction", depositAction);

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
    <form onSubmit={handleSubmit} className="p-6 sm:p-8 card-pastel-lavender rounded-3xl border border-indigo-100 shadow-sm space-y-5">
      <div>
        <h3 className="font-bold text-slate-900 text-base sm:text-lg">
          Manager Adjudication & Resolution
        </h3>
        <p className="text-xs text-slate-500 mt-1 font-medium">
          Provide official department determination and optionally assess fair conduct penalties.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl font-semibold">
          {error}
        </div>
      )}

      <div>
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
          Resolution Details & Findings *
        </label>
        <textarea
          rows={3}
          required
          value={resolution}
          onChange={(e) => setResolution(e.target.value)}
          placeholder="State repair outcome, user interview findings, or equipment inspection verdict..."
          className="w-full px-4 py-3 rounded-2xl border border-slate-200/90 text-xs bg-white/80 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs font-medium"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
          Penalty Action (Subject to Campus Conduct Policy)
        </label>
        <select
          value={penaltyType}
          onChange={(e) => {
            const val = e.target.value;
            setPenaltyType(val);
            if (val === "FORFEIT_DEPOSIT") {
              setDepositAction("FORFEIT");
            }
          }}
          className="w-full px-4 py-2.5 rounded-full border border-slate-200/90 text-xs bg-white/80 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
        >
          <option value="NONE">No Conduct Penalty (Accidental wear / Warning issued)</option>
          <option value="FORFEIT_DEPOSIT">Forfeit Security Deposit (Direct repair offset)</option>
          <option value="STRIKE">Issue Conduct Strike (+1 Strike)</option>
          <option value="CREDIT_FINE">Fine / Deduct Account Credits</option>
          <option value="SUSPENSION">Temporary Reservation Suspension</option>
        </select>
      </div>

      {/* Security deposit settlement choice (available on final incident resolution) */}
      {hasDepositHeld && (
        <div className="p-4 sm:p-5 card-pastel-peach rounded-2xl border border-amber-200/90 space-y-2 shadow-2xs">
          <label className="block text-xs font-bold text-amber-950 uppercase tracking-wider">
            Deposit Settlement ({depositAmount} credits currently escrowed)
          </label>
          <select
            value={depositAction}
            onChange={(e) => setDepositAction(e.target.value as "REFUND" | "FORFEIT")}
            className="w-full px-4 py-2.5 rounded-full border border-amber-300/80 text-xs bg-white/80 font-semibold text-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs"
          >
            <option value="REFUND">Refund Deposit ({depositAmount} credits returned to user balance)</option>
            <option value="FORFEIT">Forfeit Deposit ({depositAmount} credits retained for repair fund)</option>
          </select>
          <p className="text-[11px] text-amber-800 leading-normal font-medium">
            Resolving this final incident will formally settle the escrowed deposit and transition the reservation to COMPLETED.
          </p>
        </div>
      )}

      {/* Escrow note when other incidents remain open */}
      {!hasDepositHeld && otherUnresolvedCount > 0 && depositAmount > 0 && (
        <div className="p-4 bg-white/85 rounded-2xl border border-slate-200/80 text-xs text-slate-600 space-y-1 shadow-2xs">
          <span className="font-bold text-slate-800 block text-[11px] uppercase tracking-wider">
            Escrowed Security Deposit ({depositAmount} credits)
          </span>
          <p className="text-[11px] text-slate-500 leading-normal font-medium">
            Held in escrow pending resolution of {otherUnresolvedCount} other open incident{otherUnresolvedCount > 1 ? "s" : ""} on this reservation. Deposit settlement (refund or forfeit) will take place upon resolving the final remaining incident.
          </p>
        </div>
      )}

      {penaltyType === "CREDIT_FINE" && (
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Credit Fine Amount
          </label>
          <input
            type="number"
            min={5}
            max={200}
            value={penaltyCredits}
            onChange={(e) => setPenaltyCredits(parseInt(e.target.value, 10) || 0)}
            className="w-full px-4 py-2.5 rounded-full border border-slate-200/90 text-xs bg-white/80 font-semibold text-slate-800 shadow-2xs"
          />
        </div>
      )}

      {penaltyType === "SUSPENSION" && (
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Suspension Duration (Days)
          </label>
          <input
            type="number"
            min={1}
            max={60}
            value={suspendDays}
            onChange={(e) => setSuspendDays(parseInt(e.target.value, 10) || 7)}
            className="w-full px-4 py-2.5 rounded-full border border-slate-200/90 text-xs bg-white/80 font-semibold text-slate-800 shadow-2xs"
          />
        </div>
      )}

      <div className="pt-2 flex justify-end">
        <button
          type="submit"
          disabled={isLoading}
          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full text-xs font-bold shadow-md shadow-indigo-100 hover:-translate-y-0.5 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
        >
          {isLoading ? "Recording Decision..." : "Resolve Incident & Finalize Reservation"}
        </button>
      </div>
    </form>
  );
}