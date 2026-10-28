"use client";

import React, { useState } from "react";
import Link from "next/link";
import { formatDistanceToNow, format } from "date-fns";

export interface SerializedNotification {
  id: string;
  type: string;
  message: string;
  read: boolean;
  link: string | null;
  createdAt: string;
}

interface NotificationsClientProps {
  initialNotifications: SerializedNotification[];
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export function NotificationsClient({
  initialNotifications,
  user,
}: NotificationsClientProps) {
  const [notifications, setNotifications] = useState<SerializedNotification[]>(
    initialNotifications
  );
  const [filter, setFilter] = useState<"all" | "unread" | "bookings" | "alerts" | "waitlist">("all");
  const [actionLoading, setActionLoading] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAllRead = async () => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      }
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: id }),
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, read: true } : n))
        );
      }
    } catch (err) {
      console.error(`Failed to mark notification ${id} as read:`, err);
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filter === "unread") return !n.read;
    if (filter === "bookings") {
      return (
        n.type.includes("BOOKING") ||
        n.type.includes("APPROVED") ||
        n.type.includes("REJECTED") ||
        n.type.includes("CANCEL")
      );
    }
    if (filter === "alerts") {
      return (
        n.type.includes("OVERDUE") ||
        n.type.includes("INCIDENT") ||
        n.type.includes("REMINDER") ||
        n.type.includes("WARNING")
      );
    }
    if (filter === "waitlist") {
      return n.type.includes("WAITLIST");
    }
    return true;
  });

  const getNotificationVisuals = (type: string) => {
    const t = type.toUpperCase();
    if (t.includes("APPROVED")) {
      return {
        icon: (
          <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ),
        bgClass: "bg-emerald-50 border-emerald-200 text-emerald-800",
        badge: "Approved",
      };
    }
    if (t.includes("REJECTED") || t.includes("CANCELLED")) {
      return {
        icon: (
          <svg className="w-5 h-5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ),
        bgClass: "bg-rose-50 border-rose-200 text-rose-800",
        badge: "Rejected / Cancelled",
      };
    }
    if (t.includes("OVERDUE") || t.includes("INCIDENT")) {
      return {
        icon: (
          <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        ),
        bgClass: "bg-amber-50 border-amber-200 text-amber-800",
        badge: t.includes("INCIDENT") ? "Incident Alert" : "Overdue Notice",
      };
    }
    if (t.includes("WAITLIST")) {
      return {
        icon: (
          <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        ),
        bgClass: "bg-indigo-50 border-indigo-200 text-indigo-800",
        badge: t.includes("PROMOTED") ? "Promoted to Reservation" : "Waitlist Position",
      };
    }
    return {
      icon: (
        <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      ),
      bgClass: "bg-blue-50 border-blue-200 text-blue-800",
      badge: "Update",
    };
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Notification Center
            </h1>
            {unreadCount > 0 ? (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
                {unreadCount} unread
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                All caught up
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Real-time automated alerts for bookings, waitlist advancements, and incident notices.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            disabled={actionLoading}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
          >
            <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Mark all as read
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 py-6">
        {[
          { key: "all", label: "All", count: notifications.length },
          { key: "unread", label: "Unread", count: unreadCount },
          {
            key: "bookings",
            label: "Bookings",
            count: notifications.filter(
              (n) =>
                n.type.includes("BOOKING") ||
                n.type.includes("APPROVED") ||
                n.type.includes("REJECTED")
            ).length,
          },
          {
            key: "alerts",
            label: "Alerts & Incidents",
            count: notifications.filter(
              (n) => n.type.includes("OVERDUE") || n.type.includes("INCIDENT")
            ).length,
          },
          {
            key: "waitlist",
            label: "Waitlist",
            count: notifications.filter((n) => n.type.includes("WAITLIST")).length,
          },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as any)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              filter === tab.key
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {tab.label}
            <span
              className={`ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] ${
                filter === tab.key ? "bg-blue-700 text-white" : "bg-slate-200 text-slate-700"
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-16 bg-white border border-dashed border-slate-200 rounded-xl">
            <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-slate-800">No notifications found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {filter === "unread"
                ? "You've read all your notifications! Check back later for updates on your resource requests."
                : `There are no notifications matching the "${filter}" filter right now.`}
            </p>
          </div>
        ) : (
          filteredNotifications.map((n) => {
            const visual = getNotificationVisuals(n.type);
            const dateObj = new Date(n.createdAt);

            return (
              <div
                key={n.id}
                className={`relative group p-4 rounded-xl border transition-all ${
                  !n.read
                    ? "bg-blue-50/40 border-blue-200 shadow-xs"
                    : "bg-white border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div className="shrink-0 mt-0.5 p-2 rounded-lg bg-white border border-slate-200 shadow-2xs">
                    {visual.icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wide border ${visual.bgClass}`}>
                        {visual.badge}
                      </span>
                      <span className="text-xs text-slate-400" title={format(dateObj, "PPpp")}>
                        {formatDistanceToNow(dateObj, { addSuffix: true })}
                      </span>
                      {!n.read && (
                        <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-medium bg-blue-100 text-blue-700">
                          New
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-slate-800 font-medium leading-relaxed">
                      {n.message}
                    </p>

                    <div className="flex items-center gap-4 mt-3">
                      {n.link && (
                        <Link
                          href={n.link}
                          onClick={() => {
                            if (!n.read) handleMarkAsRead(n.id);
                          }}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors inline-flex items-center gap-1"
                        >
                          <span>View resource or booking</span>
                          <span aria-hidden="true">&rarr;</span>
                        </Link>
                      )}

                      {!n.read && (
                        <button
                          onClick={(e) => handleMarkAsRead(n.id, e)}
                          className="text-xs text-slate-500 hover:text-slate-700 underline font-medium cursor-pointer"
                        >
                          Mark as read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
