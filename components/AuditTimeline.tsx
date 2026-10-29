import React from "react";
import { formatDistanceToNow } from "date-fns";

export interface AuditLogEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  before?: string | null;
  after?: string | null;
  reason?: string | null;
  createdAt: Date | string;
  actor?: {
    id: string;
    name: string;
    role: string;
    email?: string;
  } | null;
}

interface AuditTimelineProps {
  logs: AuditLogEntry[];
  className?: string;
}

export function AuditTimeline({ logs, className = "" }: AuditTimelineProps) {
  if (logs.length === 0) {
    return (
      <div className={`p-8 text-center text-xs text-slate-400 bg-slate-50/70 rounded-3xl border border-dashed border-slate-200 ${className}`}>
        No audit log events recorded for this entity yet.
      </div>
    );
  }

  const getActionColor = (action: string) => {
    if (action.includes("APPROVED") || action.includes("VERIFIED"))
      return "bg-emerald-500 text-white shadow-emerald-200 shadow-sm";
    if (
      action.includes("REJECTED") ||
      action.includes("CANCELLED") ||
      action.includes("OVERDUE") ||
      action.includes("INCIDENT")
    )
      return "bg-rose-500 text-white shadow-rose-200 shadow-sm";
    if (action.includes("CHECKED_IN") || action.includes("PROMOTED"))
      return "bg-indigo-600 text-white shadow-indigo-200 shadow-sm";
    return "bg-slate-600 text-white shadow-slate-200 shadow-sm";
  };

  return (
    <div className={`flow-root ${className}`}>
      <ul className="-mb-8">
        {logs.map((log, logIdx) => {
          const isLast = logIdx === logs.length - 1;

          return (
            <li key={log.id}>
              <div className="relative pb-8">
                {!isLast && (
                  <span
                    className="absolute top-5 left-4 -ml-px h-full w-0.5 bg-slate-200/80"
                    aria-hidden="true"
                  />
                )}
                <div className="relative flex space-x-3.5">
                  <div>
                    <span
                      className={`h-8 w-8 rounded-full flex items-center justify-center ring-4 ring-white text-xs font-bold ${getActionColor(
                        log.action
                      )}`}
                    >
                      {log.action.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex justify-between items-start text-xs sm:text-sm">
                      <p className="font-bold text-slate-800">
                        {log.action.replace(/_/g, " ")}
                      </p>
                      <time className="text-xs text-slate-400 whitespace-nowrap ml-2">
                        {formatDistanceToNow(new Date(log.createdAt), {
                          addSuffix: true,
                        })}
                      </time>
                    </div>

                    <div className="mt-1 text-xs text-slate-600 flex items-center gap-2">
                      <span className="font-medium text-slate-700">
                        Actor: {log.actor?.name || "System Automation"}
                      </span>
                      {log.actor?.role && (
                        <span className="bg-indigo-50 text-indigo-700 border border-indigo-200/60 px-2 py-0.5 rounded-full text-[10px] font-bold">
                          {log.actor.role}
                        </span>
                      )}
                    </div>

                    {log.reason && (
                      <p className="mt-2 text-xs text-slate-600 bg-white/90 p-3 rounded-2xl border border-slate-200/80 italic shadow-2xs">
                        &quot;{log.reason}&quot;
                      </p>
                    )}

                    {(log.before || log.after) && (
                      <details className="mt-2 text-xs text-slate-500">
                        <summary className="cursor-pointer hover:text-indigo-600 font-semibold transition-colors">
                          View state snapshot
                        </summary>
                        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 bg-white/90 rounded-2xl border border-slate-200 font-mono text-[11px] shadow-2xs">
                          {log.before && (
                            <div>
                              <span className="text-slate-400 font-sans font-bold uppercase text-[10px] block mb-1">
                                Before:
                              </span>
                              <pre className="whitespace-pre-wrap overflow-x-auto text-slate-600 bg-slate-50 p-2 rounded-xl">
                                {log.before}
                              </pre>
                            </div>
                          )}
                          {log.after && (
                            <div>
                              <span className="text-slate-400 font-sans font-bold uppercase text-[10px] block mb-1">
                                After:
                              </span>
                              <pre className="whitespace-pre-wrap overflow-x-auto text-emerald-700 bg-emerald-50/70 p-2 rounded-xl">
                                {log.after}
                              </pre>
                            </div>
                          )}
                        </div>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
