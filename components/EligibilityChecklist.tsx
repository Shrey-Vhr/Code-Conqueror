import React from "react";
import { EligibilityResult } from "@/lib/eligibility";

interface EligibilityChecklistProps {
  eligibility: EligibilityResult | string;
  className?: string;
  showTitle?: boolean;
}

export function EligibilityChecklist({
  eligibility,
  className = "",
  showTitle = true,
}: EligibilityChecklistProps) {
  let parsed: EligibilityResult;

  if (typeof eligibility === "string") {
    try {
      parsed = JSON.parse(eligibility);
    } catch {
      parsed = {
        eligible: false,
        met: [],
        missing: ["Failed to parse eligibility snapshot"],
        details: {
          accountVerified: false,
          notSuspended: false,
          creditsSufficient: false,
          roleMet: false,
          departmentMet: false,
          trainingsMet: false,
        },
      };
    }
  } else {
    parsed = eligibility;
  }

  return (
    <div
      className={`rounded-3xl border transition-all ${
        parsed.eligible
          ? "border-emerald-200/80 bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/40"
          : "border-amber-200/80 bg-gradient-to-br from-amber-50/70 via-white to-orange-50/40"
      } p-5 sm:p-6 shadow-2xs ${className}`}
    >
      {showTitle && (
        <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-slate-200/50">
          <div className="flex items-center gap-2.5">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                parsed.eligible ? "bg-emerald-500 shadow-xs" : "bg-amber-500 shadow-xs"
              }`}
            />
            <h4 className="font-bold text-slate-900 text-sm tracking-tight">
              Eligibility Verification
            </h4>
          </div>
          <span
            className={`text-xs font-bold px-3 py-1 rounded-full border ${
              parsed.eligible
                ? "bg-emerald-100/80 text-emerald-800 border-emerald-200"
                : "bg-amber-100/80 text-amber-800 border-amber-200"
            }`}
          >
            {parsed.eligible ? "Fully Eligible" : "Requirements Incomplete"}
          </span>
        </div>
      )}

      {/* Met Requirements */}
      {parsed.met.length > 0 && (
        <div className="space-y-2 mb-3">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Verified Prerequisites
          </p>
          <ul className="space-y-1.5">
            {parsed.met.map((item, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2.5 text-xs text-emerald-900 font-medium"
              >
                <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                  <svg
                    className="w-2.5 h-2.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="3"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4.5 12.75l6 6 9-13.5"
                    />
                  </svg>
                </div>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Missing Requirements */}
      {parsed.missing.length > 0 && (
        <div className="space-y-2 pt-3 border-t border-slate-200/50">
          <p className="text-[11px] font-bold text-rose-500 uppercase tracking-wider">
            Action Required
          </p>
          <ul className="space-y-1.5">
            {parsed.missing.map((item, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2.5 text-xs text-rose-800 font-medium"
              >
                <div className="w-4 h-4 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 mt-0.5">
                  <svg
                    className="w-2.5 h-2.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="3"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </div>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
