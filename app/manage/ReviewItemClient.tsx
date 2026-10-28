"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { approveBookingReviewAction, rejectBookingReviewAction } from "./actions";

interface ReviewItemClientProps {
  bookingId: string;
}

export function ReviewItemClient({ bookingId }: ReviewItemClientProps) {
  const router = useRouter();
  const [showInput, setShowInput] = useState<"APPROVE" | "REJECT" | null>(null);
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAction = async (action: "APPROVE" | "REJECT") => {
    if (!reason.trim()) {
      setError("Please provide a reason before submitting decision.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res =
        action === "APPROVE"
          ? await approveBookingReviewAction(bookingId, reason)
          : await rejectBookingReviewAction(bookingId, reason);

      if (res.success) {
        setShowInput(null);
        setReason("");
        router.refresh();
      } else {
        setError(("error" in res && typeof res.error === "string") ? res.error : "Decision failed");
      }
    } catch {
      setError("Failed to execute review action.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!showInput) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            setShowInput("APPROVE");
            setReason("Approved for academic and departmental schedule priority.");
          }}
          className="px-3.5 py-1.5 bg-secondary hover:bg-secondary-hover text-addon rounded-lg text-xs font-bold shadow-2xs transition-colors cursor-pointer border border-secondary"
        >
          Approve Request
        </button>
        <button
          onClick={() => {
            setShowInput("REJECT");
            setReason("Slot reserved for departmental research cohort or maintenance.");
          }}
          className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
        >
          Reject
        </button>
      </div>
    );
  }

  return (
    <div className="w-full mt-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-800">
          Mandatory Review Note ({showInput === "APPROVE" ? "Approval" : "Rejection"}):
        </span>
        <button
          onClick={() => {
            setShowInput(null);
            setError(null);
          }}
          className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
        >
          Cancel
        </button>
      </div>

      {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}

      <input
        type="text"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Reason will be saved to audit ledger and notified to user..."
        className="w-full px-3 py-2 text-xs bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      <div className="flex justify-end gap-2">
        <button
          onClick={() => handleAction(showInput)}
          disabled={isLoading}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold shadow-2xs cursor-pointer disabled:opacity-50 ${
            showInput === "APPROVE" ? "bg-secondary hover:bg-secondary-hover text-addon border border-secondary" : "bg-rose-700 hover:bg-rose-800 text-white"
          }`}
        >
          {isLoading ? "Submitting..." : `Confirm ${showInput === "APPROVE" ? "Approval" : "Rejection"}`}
        </button>
      </div>
    </div>
  );
}
