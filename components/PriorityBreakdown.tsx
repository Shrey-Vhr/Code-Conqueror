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
          className={`font-mono font-bold text-xs px-2 py-0.5 rounded ${
            displayScore >= 120
              ? "bg-purple-100 text-purple-800"
              : displayScore >= 100
              ? "bg-blue-100 text-blue-800"
              : "bg-amber-100 text-amber-800"
          }`}
        >
          {displayScore.toFixed(1)} pts
        </span>
      </div>
    );
  }

  if (!parsed) {
    return (
      <div className={`p-4 bg-slate-50 rounded-xl border border-slate-200 text-sm ${className}`}>
        <div className="flex justify-between items-center">
          <span className="font-semibold text-slate-700">Fairness Priority Score</span>
          <span className="font-bold text-blue-700 font-mono text-base">{displayScore.toFixed(1)}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`p-4 bg-white rounded-xl border border-slate-200 shadow-2xs divide-y divide-slate-100 text-xs sm:text-sm ${className}`}
    >
      <div className="flex items-center justify-between pb-3">
        <div>
          <h4 className="font-semibold text-slate-900">Fairness Priority Score</h4>
          <p className="text-xs text-slate-500">
            Higher priority queues advance waitlists and fair access
          </p>
        </div>
        <div className="text-right">
          <span className="text-xl font-extrabold text-blue-700 font-mono">
            {parsed.finalScore.toFixed(1)}
          </span>
          <span className="text-xs text-slate-400 block">points</span>
        </div>
      </div>

      <div className="pt-3 space-y-2">
        <div className="flex justify-between text-slate-600">
          <span>Base Allocation</span>
          <span className="font-mono text-slate-800">+{parsed.baseScore}</span>
        </div>

        <div className="flex justify-between text-slate-600">
          <span>Recent Usage (30 Days: {parsed.recentHours30d}h)</span>
          <span className="font-mono text-rose-600">
            -{parsed.recentUsagePenalty}
          </span>
        </div>

        {parsed.purposeBonus > 0 && (
          <div className="flex justify-between text-slate-600">
            <span>Purpose Bonus ({parsed.purpose})</span>
            <span className="font-mono text-emerald-600">
              +{parsed.purposeBonus}
            </span>
          </div>
        )}

        {parsed.roleBonus > 0 && (
          <div className="flex justify-between text-slate-600">
            <span>Role Weighting ({parsed.role})</span>
            <span className="font-mono text-emerald-600">
              +{parsed.roleBonus}
            </span>
          </div>
        )}

        {parsed.waitlistAgeBonus > 0 && (
          <div className="flex justify-between text-slate-600">
            <span>Waitlist Age Bonus</span>
            <span className="font-mono text-emerald-600">
              +{parsed.waitlistAgeBonus}
            </span>
          </div>
        )}

        {parsed.strikesPenalty > 0 && (
          <div className="flex justify-between text-slate-600">
            <span>Strikes Penalty ({parsed.strikes} strike{parsed.strikes > 1 ? "s" : ""})</span>
            <span className="font-mono text-rose-600">
              -{parsed.strikesPenalty}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
