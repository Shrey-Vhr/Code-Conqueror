import React from "react";
import { PriorityBreakdown as PriorityType } from "@/lib/fairness";

interface PriorityBreakdownProps {
  breakdown?: PriorityType | string | null;
  score?: number | null;
  className?: string;
  compact?: boolean;
}

export function PriorityBreakdown({
  breakdown,
  score,
  className = "",
  compact = false,
}: PriorityBreakdownProps) {
  let parsed: PriorityType | null = null;

  if (typeof breakdown === "string") {
    try {
      parsed = JSON.parse(breakdown);
    } catch {
      parsed = null;
    }
  } else if (breakdown && typeof breakdown === "object") {
    parsed = breakdown as PriorityType;
  }

  const displayScore = score ?? parsed?.finalScore ?? 100;

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-1.5 ${className}`}>
        <span className="text-xs text-slate-500 font-medium">Priority:</span>
        <span
          className={`font-mono font-bold text-xs px-2.5 py-0.5 rounded-full border ${
            displayScore >= 120
              ? "bg-purple-100 text-purple-800 border-purple-200"
              : displayScore >= 100
              ? "bg-indigo-100 text-indigo-800 border-indigo-200"
              : "bg-amber-100 text-amber-800 border-amber-200"
          }`}
        >
          {displayScore.toFixed(1)} pts
        </span>
      </div>
    );
  }

  if (!parsed) {
    return (
      <div className={`p-5 bg-gradient-to-br from-indigo-50/60 to-purple-50/40 rounded-3xl border border-indigo-100 text-sm shadow-2xs ${className}`}>
        <div className="flex justify-between items-center">
          <span className="font-bold text-slate-800">Fairness Priority Score</span>
          <span className="font-bold text-indigo-600 font-mono text-base px-3 py-1 bg-white rounded-full border border-indigo-200/80 shadow-2xs">
            {displayScore.toFixed(1)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`p-6 bg-gradient-to-br from-indigo-50/60 via-white to-purple-50/40 rounded-3xl border border-indigo-100 shadow-2xs divide-y divide-slate-100 text-xs sm:text-sm ${className}`}
    >
      <div className="flex items-center justify-between pb-4">
        <div>
          <h4 className="font-bold text-slate-900 text-base">Fairness Priority Score</h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Higher priority queues advance waitlists and equitable access
          </p>
        </div>
        <div className="text-right">
          <span className="text-2xl font-black text-indigo-600 font-mono block">
            {parsed.finalScore.toFixed(1)}
          </span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">points</span>
        </div>
      </div>

      <div className="pt-4 space-y-2.5">
        <div className="flex justify-between text-slate-600">
          <span>Base Allocation</span>
          <span className="font-mono font-bold text-slate-800">+{parsed.baseScore}</span>
        </div>

        <div className="flex justify-between text-slate-600">
          <span>Recent Usage (30 Days: {parsed.recentHours30d}h)</span>
          <span className="font-mono font-bold text-rose-600">
            -{parsed.recentUsagePenalty}
          </span>
        </div>

        {parsed.purposeBonus > 0 && (
          <div className="flex justify-between text-slate-600">
            <span>Purpose Bonus ({parsed.purpose})</span>
            <span className="font-mono font-bold text-emerald-600">
              +{parsed.purposeBonus}
            </span>
          </div>
        )}

        {parsed.roleBonus > 0 && (
          <div className="flex justify-between text-slate-600">
            <span>Role Weighting ({parsed.role})</span>
            <span className="font-mono font-bold text-emerald-600">
              +{parsed.roleBonus}
            </span>
          </div>
        )}

        {parsed.waitlistAgeBonus > 0 && (
          <div className="flex justify-between text-slate-600">
            <span>Waitlist Age Bonus</span>
            <span className="font-mono font-bold text-emerald-600">
              +{parsed.waitlistAgeBonus}
            </span>
          </div>
        )}

        {parsed.strikesPenalty > 0 && (
          <div className="flex justify-between text-slate-600">
            <span>Strikes Penalty ({parsed.strikes} strike{parsed.strikes > 1 ? "s" : ""})</span>
            <span className="font-mono font-bold text-rose-600">
              -{parsed.strikesPenalty}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
