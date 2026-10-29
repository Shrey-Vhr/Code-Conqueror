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
          className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-full text-xs font-bold shadow-md shadow-emerald-500/20 transition-all cursor-pointer hover:-translate-y-0.5"
        >
          Approve Request
        </button>
        <button
          onClick={() => {
            setShowInput("REJECT");
            setReason("Slot reserved for departmental research cohort or maintenance.");
          }}
          className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 rounded-full text-xs font-bold transition-all cursor-pointer hover:-translate-y-0.5"
        >
          Reject
        </button>
      </div>
    );
  }

  return (
    <div className="w-full mt-3 p-4 bg-slate-50/90 rounded-2xl border border-slate-200 space-y-3 shadow-2xs">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-800">
          Mandatory Review Note ({showInput === "APPROVE" ? "Approval" : "Rejection"}):
        </span>
        <button
          onClick={() => {
            setShowInput(null);
            setError(null);
          }}
          className="text-xs text-slate-400 hover:text-slate-600 font-semibold cursor-pointer"
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
        className="w-full px-4 py-2 text-xs bg-white rounded-full border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 font-medium"
      />

      <div className="flex justify-end gap-2">
        <button
          onClick={() => handleAction(showInput)}
          disabled={isLoading}
          className={`px-5 py-2 rounded-full text-xs font-bold shadow-md transition-all cursor-pointer disabled:opacity-50 hover:-translate-y-0.5 ${
            showInput === "APPROVE"
              ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-emerald-500/20"
              : "bg-gradient-to-r from-rose-600 to-rose-700 text-white shadow-rose-500/20"
          }`}
        >
          {isLoading ? "Submitting..." : `Confirm ${showInput === "APPROVE" ? "Approval" : "Rejection"}`}
        </button>
      </div>
    </div>
  );
}
