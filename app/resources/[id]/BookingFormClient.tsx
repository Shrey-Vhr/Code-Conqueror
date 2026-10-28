"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { submitBookingRequest } from "./actions";
import { PriorityBreakdown } from "@/components/PriorityBreakdown";
import { computePriorityScore } from "@/lib/fairness";

interface BookingFormClientProps {
  resourceId: string;
  depositCredits: number;
  creditCostPerHour: number;
  maxHoursPerBooking: number;
  userCredits: number;
  userStrikes: number;
  userRole: string;
  recentHours: number;
  isEligible: boolean;
}

export function BookingFormClient({
  resourceId,
  depositCredits,
  creditCostPerHour,
  maxHoursPerBooking,
  userCredits,
  userStrikes,
  userRole,
  recentHours,
  isEligible,
}: BookingFormClientProps) {
  const router = useRouter();

  // Tomorrow as default date
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDate = tomorrow.toISOString().split("T")[0];

  const [date, setDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState("14:00");
  const [endTime, setEndTime] = useState("16:00");
  const [purpose, setPurpose] = useState("COURSEWORK");
  const [purposeDetails, setPurposeDetails] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Time & Cost calculation
  const startObj = new Date(`${date}T${startTime}:00`);
  const endObj = new Date(`${date}T${endTime}:00`);
  const durationMillis = endObj.getTime() - startObj.getTime();
  const durationHours = durationMillis > 0 ? durationMillis / (1000 * 60 * 60) : 0;
  const estimatedCost = Math.ceil(durationHours * creditCostPerHour);
  const totalCreditsNeeded = depositCredits + estimatedCost;

  // Real-time Priority Preview
  const previewPriority = computePriorityScore({
    recentHours30d: recentHours,
    purpose,
    strikes: userStrikes,
    role: userRole,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEligible) {
      setError("You do not meet the mandatory prerequisites for this resource.");
      return;
    }

    if (durationHours <= 0) {
      setError("End time must be later than start time.");
      return;
    }

    if (durationHours > maxHoursPerBooking) {
      setError(`Requested duration (${durationHours}h) exceeds the maximum allowed (${maxHoursPerBooking}h).`);
      return;
    }

    if (userCredits < totalCreditsNeeded) {
      setError(`Insufficient credits. You need ${totalCreditsNeeded} credits, but have ${userCredits}.`);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const formData = new FormData();
    formData.append("resourceId", resourceId);
    formData.append("date", date);
    formData.append("startTime", startTime);
    formData.append("endTime", endTime);
    formData.append("purpose", purpose);
    formData.append("purposeDetails", purposeDetails);

    try {
      const res = await submitBookingRequest(formData);
      if (res.success) {
        router.push(`/bookings/${res.bookingId}`);
      } else {
        setError(("error" in res && typeof res.error === "string") ? res.error : "Failed to submit reservation.");
      }
    } catch {
      setError("An unexpected network or booking error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
      <div>
        <h3 className="text-lg font-bold text-slate-900 tracking-tight">
          Reserve Time Slot
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Submit reservation request. Overlapping times automatically enter waitlist priority queue.
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
          <svg
            className="w-4 h-4 shrink-0 text-rose-600 mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Date picker */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Reservation Date
          </label>
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Start and End Times */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Start Time
            </label>
            <input
              type="time"
              required
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              End Time
            </label>
            <input
              type="time"
              required
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Purpose */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Academic / Project Purpose
          </label>
          <select
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-slate-900 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="COURSEWORK">Coursework / Capstone Project (+20 Priority)</option>
            <option value="RESEARCH">Funded Research / Faculty Lab (+25 Priority)</option>
            <option value="CLUB">Student Club / Competition Team (+5 Priority)</option>
            <option value="PERSONAL">Independent Study / Personal Development</option>
          </select>
        </div>

        {/* Purpose Description */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Usage Notes & Deliverables
          </label>
          <textarea
            rows={2}
            value={purposeDetails}
            onChange={(e) => setPurposeDetails(e.target.value)}
            placeholder="Briefly describe what you will fabricate or test..."
            className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Cost & Deposit Summary Breakdown */}
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
          <div className="flex justify-between text-slate-600">
            <span>Duration Requested</span>
            <span className="font-semibold text-slate-800">
              {durationHours > 0 ? `${durationHours.toFixed(1)} hours` : "Invalid time"}
            </span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Hourly Cost ({creditCostPerHour} cr/h)</span>
            <span className="font-semibold text-slate-800">{estimatedCost} credits</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Refundable Deposit Hold</span>
            <span className="font-semibold text-slate-800">{depositCredits} credits</span>
          </div>
          <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-slate-900 text-sm">
            <span>Total Credits Required</span>
            <span className="text-blue-700">{totalCreditsNeeded} credits</span>
          </div>
          <div className="flex justify-between text-[11px] text-slate-500">
            <span>Your Available Balance</span>
            <span className={userCredits >= totalCreditsNeeded ? "text-emerald-700 font-medium" : "text-rose-600 font-bold"}>
              {userCredits} credits {userCredits < totalCreditsNeeded ? "(Insufficient)" : "✓"}
            </span>
          </div>
        </div>

        {/* Priority Engine Live Preview */}
        <PriorityBreakdown breakdown={previewPriority} compact={false} />

        <button
          type="submit"
          disabled={isSubmitting || !isEligible}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-xs transition-colors cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
        >
          {isSubmitting ? "Submitting Request..." : "Request Booking"}
        </button>

        {!isEligible && (
          <p className="text-center text-xs text-rose-600 font-medium">
            ⚠️ You must complete missing prerequisites before booking this resource.
          </p>
        )}
      </form>
    </div>
  );
}
