"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  checkInUserAction,
  returnUserAction,
  cancelBookingUserAction,
  extendBookingAction,
  reportIncidentAction,
} from "../bookingActions";
import { AI_DISCLAIMER } from "@/lib/ai";

interface BookingActionPanelsProps {
  bookingId: string;
  resourceId: string;
  resourceName: string;
  status: string;
  isOwnerOrManager: boolean;
  isBooker: boolean;
}

export function BookingActionPanels({
  bookingId,
  resourceId,
  resourceName,
  status,
  isOwnerOrManager,
  isBooker,
}: BookingActionPanelsProps) {
  const router = useRouter();

  // Mode: "IDLE" | "CHECK_IN" | "RETURN" | "EXTEND" | "CANCEL" | "REPORT_INCIDENT"
  const [activeAction, setActiveAction] = useState<string>("IDLE");
  const [rating, setRating] = useState<number>(5);
  const [notes, setNotes] = useState<string>("");
  const [photoUrl, setPhotoUrl] = useState<string>("");
  const [cancelReason, setCancelReason] = useState<string>("");

  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === "string") {
        setPhotoUrl(event.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Extension duration in hours
  const [extensionHours, setExtensionHours] = useState<number>(1);

  // Checklist items
  const [checklist, setChecklist] = useState<Record<string, boolean>>({
    "Power system & indicators verified": true,
    "No physical damage or casing fissures": true,
    "Operating surface clean and sanitized": true,
    "Standard accessories accounted for": true,
  });

  // Incident state
  const [incidentType, setIncidentType] = useState<string>("DAMAGE");
  const [severity, setSeverity] = useState<string>("MEDIUM");
  const [incidentDescription, setIncidentDescription] = useState<string>("");

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const toggleChecklistItem = (item: string) => {
    setChecklist((prev) => ({ ...prev, [item]: !prev[item] }));
  };

  const handleCheckInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    const checkedItems = Object.keys(checklist).filter((k) => checklist[k]);
    const formData = new FormData();
    formData.append("bookingId", bookingId);
    formData.append("rating", rating.toString());
    formData.append("checklist", JSON.stringify(checkedItems));
    formData.append("notes", notes);
    formData.append("photoUrl", photoUrl);

    try {
      const res = await checkInUserAction(formData);
      if (res.success) {
        setActiveAction("IDLE");
        router.refresh();
      } else {
        setError(
          "error" in res && typeof res.error === "string"
            ? res.error
            : "Check-in failed"
        );
      }
    } catch {
      setError("An unexpected error occurred during check-in.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    const checkedItems = Object.keys(checklist).filter((k) => checklist[k]);
    const formData = new FormData();
    formData.append("bookingId", bookingId);
    formData.append("rating", rating.toString());
    formData.append("checklist", JSON.stringify(checkedItems));
    formData.append("notes", notes);
    formData.append("photoUrl", photoUrl);

    try {
      const res = await returnUserAction(formData);
      if (res.success) {
        setActiveAction("IDLE");
        router.refresh();
      } else {
        setError(
          "error" in res && typeof res.error === "string"
            ? res.error
            : "Return failed"
        );
      }
    } catch {
      setError("An unexpected error occurred during return.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExtendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await extendBookingAction(bookingId, extensionHours);
      if (res.success) {
        setActiveAction("IDLE");
        setSuccessMessage(`Session successfully extended by ${extensionHours} hour(s)!`);
        router.refresh();
      } else {
        setError(
          "error" in res && typeof res.error === "string"
            ? res.error
            : "Failed to extend session. A schedule conflict or quota limit prevented this extension."
        );
      }
    } catch {
      setError("Network error while attempting extension.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async () => {
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await cancelBookingUserAction(bookingId, cancelReason);
      if (res.success) {
        setActiveAction("IDLE");
        router.refresh();
      } else {
        setError(
          "error" in res && typeof res.error === "string"
            ? res.error
            : "Cancellation failed"
        );
      }
    } catch {
      setError("Failed to cancel reservation.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleIncidentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    const formData = new FormData();
    formData.append("bookingId", bookingId);
    formData.append("resourceId", resourceId);
    formData.append("type", incidentType);
    formData.append("severity", severity);
    formData.append("description", incidentDescription);

    try {
      const res = await reportIncidentAction(formData);
      if (res.success) {
        setActiveAction("IDLE");
        setIncidentDescription("");
        setSuccessMessage("Incident report successfully logged and routed to department manager.");
        router.refresh();
      } else {
        setError(
          "error" in res && typeof res.error === "string"
            ? res.error
            : "Failed to submit incident"
        );
      }
    } catch {
      setError("Failed to report incident.");
    } finally {
      setIsLoading(false);
    }
  };

  const canCheckIn = status === "APPROVED" && (isBooker || isOwnerOrManager);
  const canReturn =
    (status === "CHECKED_IN" || status === "OVERDUE") &&
    (isBooker || isOwnerOrManager);
  const canExtend =
    (status === "APPROVED" || status === "CHECKED_IN") &&
    (isBooker || isOwnerOrManager);
  const canCancel =
    (status === "PENDING" || status === "APPROVED" || status === "WAITLISTED") &&
    (isBooker || isOwnerOrManager);
  const canReportIncident =
    status === "APPROVED" ||
    status === "CHECKED_IN" ||
    status === "RETURNED" ||
    status === "OVERDUE" ||
    isOwnerOrManager;

  return (
    <div
      id="condition-actions"
      className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 space-y-5"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-base font-bold text-slate-900">
            Session Controls & Lifecycle Operations
          </h3>
          <p className="text-xs text-slate-500">
            Record physical condition reports, manage session duration, or report operational incidents.
          </p>
        </div>

        {/* Action Trigger Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {canCheckIn && (
            <button
              onClick={() =>
                setActiveAction(activeAction === "CHECK_IN" ? "IDLE" : "CHECK_IN")
              }
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              Check-In Inspection →
            </button>
          )}

          {canReturn && (
            <button
              onClick={() =>
                setActiveAction(activeAction === "RETURN" ? "IDLE" : "RETURN")
              }
              className={`px-4 py-2 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer ${
                status === "OVERDUE"
                  ? "bg-rose-600 hover:bg-rose-700 animate-pulse"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              Return Condition Check-out →
            </button>
          )}

          {canExtend && (
            <button
              onClick={() =>
                setActiveAction(activeAction === "EXTEND" ? "IDLE" : "EXTEND")
              }
              disabled={isLoading}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer border ${
                activeAction === "EXTEND"
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200"
              }`}
            >
              Extend Session +
            </button>
          )}

          {canReportIncident && (
            <button
              onClick={() =>
                setActiveAction(
                  activeAction === "REPORT_INCIDENT" ? "IDLE" : "REPORT_INCIDENT"
                )
              }
              className={`px-3.5 py-2 border rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                activeAction === "REPORT_INCIDENT"
                  ? "bg-rose-600 text-white border-rose-600"
                  : "border-rose-200 hover:bg-rose-50 text-rose-700"
              }`}
            >
              Report Incident 🚨
            </button>
          )}

          {canCancel && (
            <button
              onClick={() =>
                setActiveAction(activeAction === "CANCEL" ? "IDLE" : "CANCEL")
              }
              className="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel Reservation
            </button>
          )}
        </div>
      </div>

      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <svg
            className="w-4 h-4 shrink-0 text-emerald-600"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <svg
            className="w-4 h-4 shrink-0 text-rose-600"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
            />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* EXTEND FORM PANEL */}
      {activeAction === "EXTEND" && (
        <form
          onSubmit={handleExtendSubmit}
          className="p-5 bg-indigo-50/50 rounded-xl border border-indigo-200 space-y-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-indigo-900 text-sm">
                Request Session Extension
              </h4>
              <p className="text-xs text-indigo-700">
                Extend your active reservation without forfeiting setup time.
              </p>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
              ACID Safe
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Extension Duration
            </label>
            <div className="flex items-center gap-3">
              {[1, 2, 3].map((hrs) => (
                <button
                  key={hrs}
                  type="button"
                  onClick={() => setExtensionHours(hrs)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    extensionHours === hrs
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                      : "bg-white text-slate-700 border-slate-200 hover:border-indigo-300"
                  }`}
                >
                  +{hrs} Hour{hrs > 1 ? "s" : ""}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Extensions verify in real time that no succeeding reservation or waitlist conflict exists, and your weekly 20-hour quota is not exceeded.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setActiveAction("IDLE")}
              className="px-3.5 py-1.5 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isLoading ? "Verifying & Extending..." : `Confirm +${extensionHours}h Extension`}
            </button>
          </div>
        </form>
      )}

      {/* CHECK-IN FORM PANEL */}
      {activeAction === "CHECK_IN" && (
        <form
          onSubmit={handleCheckInSubmit}
          className="p-5 bg-emerald-50/50 rounded-xl border border-emerald-200 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-emerald-900 text-sm">
              Check-In Condition Report: &quot;{resourceName}&quot;
            </h4>
            <span className="text-xs text-emerald-700 font-medium">Phase: CHECK_IN</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Equipment / Space Condition Rating (1 to 5)
            </label>
            <div className="flex items-center gap-3">
              {[1, 2, 3, 4, 5].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setRating(val)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all cursor-pointer ${
                    rating === val
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                      : "bg-white text-slate-700 border-slate-200 hover:border-emerald-300"
                  }`}
                >
                  {val} ★
                </button>
              ))}
              <span className="text-xs text-slate-500 font-medium ml-2">
                {rating === 5
                  ? "Pristine / Excellent"
                  : rating === 4
                  ? "Good / Minor wear"
                  : rating === 3
                  ? "Fair / Functional"
                  : rating === 2
                  ? "Degraded"
                  : "Damaged / Unsafe"}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Safety & Functional Checklist
            </label>
            <div className="space-y-1.5">
              {Object.keys(checklist).map((item) => (
                <label
                  key={item}
                  className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={checklist[item]}
                    onChange={() => toggleChecklistItem(item)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4 border-slate-300"
                  />
                  <span>{item}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Check-In Notes & Observations
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Note any preexisting cosmetic scratches or setup specifics..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Physical Condition Evidence Photo
            </label>
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoFileChange}
                className="text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-100 file:text-emerald-800 hover:file:bg-emerald-200 cursor-pointer"
              />
              <span className="text-xs text-slate-400">or URL:</span>
              <input
                type="text"
                placeholder="https://..."
                value={photoUrl.startsWith("data:") ? "(Attached file)" : photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white flex-1"
              />
              {photoUrl && (
                <button
                  type="button"
                  onClick={() => setPhotoUrl("")}
                  className="text-xs text-rose-600 font-bold hover:underline"
                >
                  Clear Photo
                </button>
              )}
            </div>
            {photoUrl && (
              <div className="mt-2">
                <img
                  src={photoUrl}
                  alt="Condition evidence preview"
                  className="h-24 w-36 object-cover rounded-lg border border-emerald-300 shadow-2xs"
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setActiveAction("IDLE")}
              className="px-3.5 py-1.5 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isLoading ? "Saving..." : "Confirm & Check In"}
            </button>
          </div>
        </form>
      )}

      {/* RETURN FORM PANEL */}
      {activeAction === "RETURN" && (
        <form
          onSubmit={handleReturnSubmit}
          className="p-5 bg-blue-50/50 rounded-xl border border-blue-200 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-blue-900 text-sm">
              Return Inspection Report: &quot;{resourceName}&quot;
            </h4>
            <span className="text-xs text-blue-700 font-medium">Phase: CHECK_OUT</span>
          </div>

          <div className="p-3 bg-white rounded-lg border border-blue-100 text-xs text-slate-600">
            ℹ️ If the return condition rating drops below the check-in rating, a damage incident will be automatically drafted for manager review.
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Equipment Return Condition Rating (1 to 5)
            </label>
            <div className="flex items-center gap-3">
              {[1, 2, 3, 4, 5].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setRating(val)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all cursor-pointer ${
                    rating === val
                      ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                      : "bg-white text-slate-700 border-slate-200 hover:border-blue-300"
                  }`}
                >
                  {val} ★
                </button>
              ))}
              <span className="text-xs text-slate-500 font-medium ml-2">
                {rating === 5
                  ? "Pristine / Excellent"
                  : rating === 4
                  ? "Good / Minor wear"
                  : rating === 3
                  ? "Fair / Scratched"
                  : rating === 2
                  ? "Degraded / Part damaged"
                  : "Major damage"}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Return Checklist
            </label>
            <div className="space-y-1.5">
              {Object.keys(checklist).map((item) => (
                <label
                  key={item}
                  className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={checklist[item]}
                    onChange={() => toggleChecklistItem(item)}
                    className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4 border-slate-300"
                  />
                  <span>{item}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Return Checkout Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="State any incidents, clean-up actions taken, or observations..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Return Condition Evidence Photo
            </label>
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoFileChange}
                className="text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-100 file:text-blue-800 hover:file:bg-blue-200 cursor-pointer"
              />
              <span className="text-xs text-slate-400">or URL:</span>
              <input
                type="text"
                placeholder="https://..."
                value={photoUrl.startsWith("data:") ? "(Attached file)" : photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white flex-1"
              />
              {photoUrl && (
                <button
                  type="button"
                  onClick={() => setPhotoUrl("")}
                  className="text-xs text-rose-600 font-bold hover:underline"
                >
                  Clear Photo
                </button>
              )}
            </div>
            {photoUrl && (
              <div className="mt-2">
                <img
                  src={photoUrl}
                  alt="Return evidence preview"
                  className="h-24 w-36 object-cover rounded-lg border border-blue-300 shadow-2xs"
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setActiveAction("IDLE")}
              className="px-3.5 py-1.5 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isLoading ? "Processing..." : "Complete Return & Release Deposit"}
            </button>
          </div>
        </form>
      )}

      {/* CANCEL FORM PANEL */}
      {activeAction === "CANCEL" && (
        <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
          <h4 className="font-bold text-slate-900 text-sm">Confirm Booking Cancellation</h4>
          <p className="text-xs text-slate-500">
            Cancelling will refund any held deposit credits. If a waitlist exists for this slot, the highest priority waitlisted reservation will be automatically promoted!
          </p>
          <input
            type="text"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Reason for cancellation (optional)..."
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-slate-500"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setActiveAction("IDLE")}
              className="px-3 py-1.5 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-100"
            >
              Nevermind
            </button>
            <button
              onClick={handleCancel}
              disabled={isLoading}
              className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isLoading ? "Cancelling..." : "Confirm Cancellation & Promote Waitlist"}
            </button>
          </div>
        </div>
      )}

      {/* REPORT INCIDENT PANEL */}
      {activeAction === "REPORT_INCIDENT" && (
        <form
          onSubmit={handleIncidentSubmit}
          className="p-5 bg-rose-50/50 rounded-xl border border-rose-200 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-rose-900 text-sm">
              Log Incident or Equipment Malfunction
            </h4>
            <span className="text-xs text-rose-700 font-medium">Logged to Department Review</span>
          </div>

          {/* AI Human Review Contract Disclaimer */}
          <div className="p-3 bg-amber-50/90 rounded-lg border border-amber-200/80 text-xs text-amber-900 flex items-start gap-2.5">
            <span className="text-sm shrink-0">⚠️</span>
            <div className="space-y-1">
              <span className="font-bold block text-amber-800">
                {AI_DISCLAIMER}
              </span>
              <p className="text-[11px] text-amber-700 leading-normal">
                CampusShare AI automatically drafts incident triage summaries and repair quotes. All final sanctions, account holds, or repair approvals require human department manager sign-off.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Incident Classification
              </label>
              <select
                value={incidentType}
                onChange={(e) => setIncidentType(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                <option value="DAMAGE">DAMAGE (Physical damage / broken part)</option>
                <option value="DELAY">DELAY (Borrower return tardiness)</option>
                <option value="MISUSE">MISUSE (Protocol violation / safety)</option>
                <option value="CONFLICT">CONFLICT (Double-booking / access dispute)</option>
                <option value="OTHER">OTHER</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Severity
              </label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                <option value="LOW">LOW (Cosmetic / routine)</option>
                <option value="MEDIUM">MEDIUM (Requires inspection)</option>
                <option value="HIGH">HIGH (Impairs function / safety)</option>
                <option value="CRITICAL">CRITICAL (Emergency shutdown)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Detailed Description *
            </label>
            <textarea
              rows={3}
              required
              value={incidentDescription}
              onChange={(e) => setIncidentDescription(e.target.value)}
              placeholder="Detail what occurred, visible damages, or parts needing replacement..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setActiveAction("IDLE")}
              className="px-3.5 py-1.5 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !incidentDescription.trim()}
              className="px-5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isLoading ? "Submitting..." : "Submit Incident Report"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
