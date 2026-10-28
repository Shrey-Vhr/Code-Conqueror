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
          onChange={(e) => {
            const val = e.target.value;
            setPenaltyType(val);
            if (val === "FORFEIT_DEPOSIT") {
              setDepositAction("FORFEIT");
            }
          }}
          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs bg-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
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
        <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 space-y-1.5">
          <label className="block text-xs font-semibold text-amber-900 uppercase tracking-wider">
            Deposit Settlement ({depositAmount} credits currently escrowed)
          </label>
          <select
            value={depositAction}
            onChange={(e) => setDepositAction(e.target.value as "REFUND" | "FORFEIT")}
            className="w-full px-3 py-2 rounded-lg border border-amber-300 text-xs bg-white font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="REFUND">Refund Deposit ({depositAmount} credits returned to user balance)</option>
            <option value="FORFEIT">Forfeit Deposit ({depositAmount} credits retained for repair fund)</option>
          </select>
          <p className="text-[11px] text-amber-700 leading-normal">
            Resolving this final incident will formally settle the escrowed deposit and transition the reservation to COMPLETED.
          </p>
        </div>
      )}

      {/* Escrow note when other incidents remain open */}
      {!hasDepositHeld && otherUnresolvedCount > 0 && depositAmount > 0 && (
        <div className="p-3.5 bg-slate-100 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
          <span className="font-semibold text-slate-800 block text-[11px] uppercase tracking-wide">
            Escrowed Security Deposit ({depositAmount} credits)
          </span>
          <p className="text-[11px] text-slate-500 leading-normal">
            Held in escrow pending resolution of {otherUnresolvedCount} other open incident{otherUnresolvedCount > 1 ? "s" : ""} on this reservation. Deposit settlement (refund or forfeit) will take place upon resolving the final remaining incident.
          </p>
        </div>
      )}

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
          {isLoading ? "Recording Decision..." : "Resolve Incident & Finalize Reservation"}
        </button>
      </div>
    </form>
  );
}
