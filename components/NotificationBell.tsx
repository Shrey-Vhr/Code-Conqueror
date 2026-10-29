"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

export interface NotificationItem {
  id: string;
  type: string;
  message: string;
  read: boolean;
  link?: string | null;
  createdAt: string | Date;
}

interface NotificationBellProps {
  initialNotifications?: NotificationItem[];
  initialUnreadCount?: number;
}

export function NotificationBell({
  initialNotifications = [],
  initialUnreadCount = 0,
}: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);
  const [unreadCount, setUnreadCount] = useState<number>(initialUnreadCount);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchLatest = async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {
      // Ignore background fetch error
    }
  };

  const handleToggle = () => {
    if (!isOpen) {
      fetchLatest();
    }
    setIsOpen(!isOpen);
  };

  const handleMarkAllRead = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        setUnreadCount(0);
      }
    } catch {
      // Ignore error
    } finally {
      setLoading(false);
    }
  };

  const handleItemClick = async (notif: NotificationItem) => {
    if (!notif.read) {
      try {
        await fetch("/api/notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: notif.id }),
        });
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch {
        // Ignore
      }
    }
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        onClick={handleToggle}
        className="relative p-2 text-slate-500 hover:text-indigo-600 rounded-full hover:bg-indigo-50/80 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer"
        aria-label="Notifications"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.75"
          stroke="currentColor"
          className="w-5 h-5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
          />
        </svg>

        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white ring-2 ring-white shadow-xs">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-3xl bg-white/95 backdrop-blur-md shadow-xl ring-1 ring-slate-200/80 z-50 overflow-hidden divide-y divide-slate-100 border border-slate-100">
          <div className="p-4 bg-gradient-to-r from-indigo-50/70 to-purple-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-slate-900">Notifications</span>
              {unreadCount > 0 && (
                <span className="bg-rose-100 text-rose-700 text-xs px-2.5 py-0.5 rounded-full font-bold">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={loading}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-400">
                No notifications right now.
              </div>
            ) : (
              notifications.map((notif) => {
                const isOverdue = notif.type.includes("OVERDUE");
                const isApproved = notif.type.includes("APPROVED");
                const isWaitlist = notif.type.includes("WAITLIST");

                return (
                  <div
                    key={notif.id}
                    onClick={() => handleItemClick(notif)}
                    className={`p-4 hover:bg-slate-50 transition-colors cursor-pointer text-sm ${
                      !notif.read ? "bg-indigo-50/40" : ""
                    }`}
                  >
                    {notif.link ? (
                      <Link href={notif.link} className="block">
                        <div className="flex items-start gap-2.5">
                          <span
                            className={`mt-1 w-2 h-2 rounded-full shrink-0 ${
                              !notif.read ? "bg-indigo-600" : "bg-transparent"
                            }`}
                          />
                          <div className="flex-1">
                            <p className="text-slate-800 font-medium leading-snug">
                              {notif.message}
                            </p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span
                                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                  isOverdue
                                    ? "bg-rose-100 text-rose-700"
                                    : isApproved
                                    ? "bg-emerald-100 text-emerald-700"
                                    : isWaitlist
                                    ? "bg-purple-100 text-purple-700"
                                    : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                {notif.type.replace(/_/g, " ")}
                              </span>
                              <span className="text-xs text-slate-400">
                                {formatDistanceToNow(new Date(notif.createdAt), {
                                  addSuffix: true,
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ) : (
                      <div className="flex items-start gap-2.5">
                        <span
                          className={`mt-1 w-2 h-2 rounded-full shrink-0 ${
                            !notif.read ? "bg-indigo-600" : "bg-transparent"
                          }`}
                        />
                        <div className="flex-1">
                          <p className="text-slate-800 font-medium leading-snug">
                            {notif.message}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span
                              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                isOverdue
                                  ? "bg-rose-100 text-rose-700"
                                  : isApproved
                                  ? "bg-emerald-100 text-emerald-700"
                                  : isWaitlist
                                  ? "bg-purple-100 text-purple-700"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {notif.type.replace(/_/g, " ")}
                            </span>
                            <span className="text-xs text-slate-400">
                              {formatDistanceToNow(new Date(notif.createdAt), {
                                addSuffix: true,
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="p-3 bg-slate-50/80 text-center">
            <Link
              href="/notifications"
              onClick={() => setIsOpen(false)}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
            >
              See all notifications →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
