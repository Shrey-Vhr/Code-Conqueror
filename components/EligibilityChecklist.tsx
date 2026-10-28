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
      className={`rounded-xl border ${
        parsed.eligible
          ? "border-emerald-200 bg-emerald-50/50"
          : "border-amber-200 bg-amber-50/40"
      } p-4.5 ${className}`}
    >
      {showTitle && (
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200/60">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                parsed.eligible ? "bg-emerald-500" : "bg-amber-500"
              }`}
            />
            <h4 className="font-semibold text-slate-900 text-sm">
              Eligibility Verification
            </h4>
          </div>
          <span
            className={`text-xs font-bold px-2 py-0.5 rounded ${
              parsed.eligible
                ? "bg-emerald-100 text-emerald-800"
                : "bg-amber-100 text-amber-800"
            }`}
          >
            {parsed.eligible ? "Fully Eligible" : "Requirements Incomplete"}
          </span>
        </div>
      )}

      {/* Met Requirements */}
      {parsed.met.length > 0 && (
        <div className="space-y-1.5 mb-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Verified Prerequisites
          </p>
          <ul className="space-y-1">
            {parsed.met.map((item, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2 text-xs text-emerald-800 font-medium"
              >
                <svg
                  className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="2.2"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4.5 12.75l6 6 9-13.5"
                  />
                </svg>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Missing Requirements */}
      {parsed.missing.length > 0 && (
        <div className="space-y-1.5 pt-2 border-t border-slate-200/50">
          <p className="text-xs font-semibold text-rose-600 uppercase tracking-wider">
            Action Required
          </p>
          <ul className="space-y-1">
            {parsed.missing.map((item, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2 text-xs text-rose-700 font-medium"
              >
                <svg
                  className="w-4 h-4 text-rose-600 shrink-0 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="2.2"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                  />
                </svg>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
