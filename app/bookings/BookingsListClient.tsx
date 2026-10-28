"use client";

import React, { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/StatusBadge";
import { PriorityBreakdown } from "@/components/PriorityBreakdown";
import { cancelBookingUserAction } from "./bookingActions";
import { format, formatDistanceToNow, isAfter, isBefore, subDays, addDays } from "date-fns";

export interface BookingRow {
  id: string;
  resourceId: string;
  resource: {
    id: string;
    name: string;
    location: string;
    department: string;
    image: string | null;
    type: string;
  };
  start: string;
  end: string;
  purpose: string;
  purposeDetails?: string | null;
  status: string;
  priorityScore: number;
  depositHeld: number;
  waitlistPosition?: number | null;
  createdAt: string;
}

interface BookingsListClientProps {
  initialBookings: BookingRow[];
}

type TabType = "ALL" | "PENDING" | "ACTIVE" | "COMPLETED" | "WAITLISTED" | "CANCELLED";

export function BookingsListClient({ initialBookings }: BookingsListClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<"ALL" | "UPCOMING" | "PAST_WEEK" | "PAST_MONTH">("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [cancelModalBooking, setCancelModalBooking] = useState<BookingRow | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  const now = new Date();

  // Tab counts
  const counts = useMemo(() => {
    return {
      ALL: initialBookings.length,
      PENDING: initialBookings.filter((b) => b.status === "PENDING").length,
      ACTIVE: initialBookings.filter((b) => b.status === "APPROVED" || b.status === "CHECKED_IN" || b.status === "OVERDUE").length,
      COMPLETED: initialBookings.filter((b) => b.status === "RETURNED" || b.status === "COMPLETED").length,
      WAITLISTED: initialBookings.filter((b) => b.status === "WAITLISTED").length,
      CANCELLED: initialBookings.filter((b) => b.status === "CANCELLED" || b.status === "REJECTED").length,
    };
  }, [initialBookings]);

  // Filtered bookings
  const filteredBookings = useMemo(() => {
    return initialBookings.filter((b) => {
      // 1. Tab filter
      if (activeTab === "PENDING" && b.status !== "PENDING") return false;
      if (activeTab === "ACTIVE" && !["APPROVED", "CHECKED_IN", "OVERDUE"].includes(b.status)) return false;
      if (activeTab === "COMPLETED" && !["RETURNED", "COMPLETED"].includes(b.status)) return false;
      if (activeTab === "WAITLISTED" && b.status !== "WAITLISTED") return false;
      if (activeTab === "CANCELLED" && !["CANCELLED", "REJECTED"].includes(b.status)) return false;

      // 2. Search query (resource name or department or location)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = b.resource.name.toLowerCase().includes(q);
        const matchesDept = b.resource.department.toLowerCase().includes(q);
        const matchesLoc = b.resource.location.toLowerCase().includes(q);
        const matchesPurpose = b.purpose.toLowerCase().includes(q);
        if (!matchesName && !matchesDept && !matchesLoc && !matchesPurpose) return false;
      }

      // 3. Date range filter
      const startDate = new Date(b.start);
      if (dateFilter === "UPCOMING") {
        if (isBefore(startDate, now)) return false;
      } else if (dateFilter === "PAST_WEEK") {
        const oneWeekAgo = subDays(now, 7);
        if (isBefore(startDate, oneWeekAgo) || isAfter(startDate, now)) return false;
      } else if (dateFilter === "PAST_MONTH") {
        const oneMonthAgo = subDays(now, 30);
        if (isBefore(startDate, oneMonthAgo) || isAfter(startDate, now)) return false;
      }

      return true;
    });
  }, [initialBookings, activeTab, searchQuery, dateFilter]);

  // Paginated bookings
  const totalPages = Math.ceil(filteredBookings.length / pageSize) || 1;
  const paginatedBookings = filteredBookings.slice(0, currentPage * pageSize);

  const handleCancelBooking = (booking: BookingRow) => {
    setCancelModalBooking(booking);
    setCancelReason("");
  };

  const confirmCancel = () => {
    if (!cancelModalBooking) return;
    const bId = cancelModalBooking.id;
    setCancellingId(bId);

    startTransition(async () => {
      const res = await cancelBookingUserAction(bId, cancelReason || "Cancelled by user");
      setCancellingId(null);
      setCancelModalBooking(null);
      if (res.success) {
        router.refresh();
      } else {
        const errorMsg = ("error" in res && (res as any).error) ? (res as any).error : "Failed to cancel reservation";
        alert(errorMsg);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Tabs navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto scrollbar-none">
        {[
          { key: "ALL", label: "All Reservations", count: counts.ALL },
          { key: "ACTIVE", label: "Active & In-Use", count: counts.ACTIVE },
          { key: "PENDING", label: "Pending Review", count: counts.PENDING },
          { key: "WAITLISTED", label: "Waitlisted", count: counts.WAITLISTED },
          { key: "COMPLETED", label: "Completed", count: counts.COMPLETED },
          { key: "CANCELLED", label: "Cancelled", count: counts.CANCELLED },
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key as TabType);
                setCurrentPage(1);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-2 ${
                isActive
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-2 py-0.2 rounded-full text-[10px] ${
                  isActive ? "bg-white text-blue-700 font-bold" : "bg-slate-100 text-slate-600"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <svg
            className="w-4 h-4 text-slate-400 absolute left-3.5 top-3"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search bookings by resource name, department, or purpose..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        {/* Date Filter */}
        <div className="flex items-center gap-2 shrink-0">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Date:
          </label>
          <select
            value={dateFilter}
            onChange={(e) => {
              setDateFilter(e.target.value as any);
              setCurrentPage(1);
            }}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="ALL">All Time</option>
            <option value="UPCOMING">Upcoming Only</option>
            <option value="PAST_WEEK">Past 7 Days</option>
            <option value="PAST_MONTH">Past 30 Days</option>
          </select>
        </div>
      </div>

      {/* Bookings List */}
      {filteredBookings.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center font-bold text-2xl shadow-2xs">
            📅
          </div>
          <h3 className="text-base font-bold text-slate-800">No Reservations Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery || dateFilter !== "ALL" || activeTab !== "ALL"
              ? "No reservations match your active filter criteria. Try clearing search or choosing another tab."
              : "You have not reserved any shared equipment or campus lab spaces yet."}
          </p>
          <div className="pt-2">
            <Link
              href="/resources"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
            >
              Browse Shared Resources →
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {paginatedBookings.map((booking) => {
            const isApproved = booking.status === "APPROVED";
            const isCheckedIn = booking.status === "CHECKED_IN";
            const isOverdue = booking.status === "OVERDUE";
            const isWaitlisted = booking.status === "WAITLISTED";
            const isPendingStatus = booking.status === "PENDING";
            const canCancel = isPendingStatus || isApproved || isWaitlisted;

            return (
              <div
                key={booking.id}
                className={`bg-white rounded-2xl border transition-all overflow-hidden p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 ${
                  isOverdue
                    ? "border-rose-400 bg-rose-50/30 ring-2 ring-rose-200 shadow-sm"
                    : isCheckedIn
                    ? "border-blue-300 bg-blue-50/10 shadow-2xs"
                    : isWaitlisted
                    ? "border-purple-200 shadow-2xs"
                    : "border-slate-200 hover:border-slate-300 shadow-2xs"
                }`}
              >
                {/* Left: Resource Image & Metadata */}
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className="w-16 h-16 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                    <img
                      src={
                        booking.resource.image ||
                        "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=400&q=80"
                      }
                      alt={booking.resource.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                        {booking.resource.type}
                      </span>
                      <Link
                        href={`/bookings/${booking.id}`}
                        className="font-bold text-slate-900 text-base hover:text-blue-600 transition-colors truncate"
                      >
                        {booking.resource.name}
                      </Link>
                      <StatusBadge status={booking.status} />
                      {isWaitlisted && booking.waitlistPosition && (
                        <span className="text-[11px] font-bold text-purple-700 bg-purple-100 px-2.5 py-0.5 rounded-full border border-purple-200">
                          Waitlist Position #{booking.waitlistPosition}
                        </span>
                      )}
                    </div>

                    {/* Overdue Alert banner if overdue */}
                    {isOverdue && (
                      <div className="flex items-center gap-1.5 text-xs font-bold text-rose-700 bg-rose-100/80 px-2.5 py-1 rounded-lg border border-rose-200">
                        <span>🚨 OVERDUE: Return window elapsed! Return immediately to avoid penalty strikes.</span>
                      </div>
                    )}

                    <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                      <span>{booking.resource.department}</span>
                      <span>•</span>
                      <span>{booking.resource.location}</span>
                      <span>•</span>
                      <span>Purpose: <strong className="text-slate-700">{booking.purpose}</strong></span>
                    </div>

                    <div className="mt-1 flex items-center gap-4 text-xs font-medium text-slate-700 flex-wrap">
                      <span className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                        <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {format(new Date(booking.start), "EEE, MMM d")} • {format(new Date(booking.start), "HH:mm")} - {format(new Date(booking.end), "HH:mm")}
                      </span>

                      <PriorityBreakdown score={booking.priorityScore} compact={true} />

                      {booking.depositHeld > 0 && (
                        <span className="text-slate-500">
                          Deposit: <strong>{booking.depositHeld} credits</strong>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Quick Action Controls */}
                <div className="flex items-center gap-2.5 shrink-0 w-full md:w-auto justify-end pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                  {/* Check In button */}
                  {isApproved && (
                    <Link
                      href={`/bookings/${booking.id}#condition-actions`}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
                    >
                      <span>Check In</span>
                      <span>→</span>
                    </Link>
                  )}

                  {/* Return button */}
                  {(isCheckedIn || isOverdue) && (
                    <Link
                      href={`/bookings/${booking.id}#condition-actions`}
                      className={`px-3.5 py-2 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 ${
                        isOverdue
                          ? "bg-rose-600 hover:bg-rose-700 animate-pulse"
                          : "bg-blue-600 hover:bg-blue-700"
                      }`}
                    >
                      <span>Complete Return</span>
                      <span>→</span>
                    </Link>
                  )}

                  {/* Cancel button */}
                  {canCancel && (
                    <button
                      onClick={() => handleCancelBooking(booking)}
                      disabled={isPending || cancellingId === booking.id}
                      className="px-3.5 py-2 border border-rose-200 text-rose-700 hover:bg-rose-50 rounded-xl text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  )}

                  {/* View Details */}
                  <Link
                    href={`/bookings/${booking.id}`}
                    className="px-3.5 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition-colors shrink-0"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            );
          })}

          {/* Show More / Pagination */}
          {filteredBookings.length > paginatedBookings.length && (
            <div className="pt-4 text-center">
              <button
                onClick={() => setCurrentPage((p) => p + 1)}
                className="px-6 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer"
              >
                Show More Reservations ({filteredBookings.length - paginatedBookings.length} remaining)
              </button>
            </div>
          )}
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {cancelModalBooking && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Cancel Reservation</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to cancel your reservation for &quot;{cancelModalBooking.resource.name}&quot;?
                Any deposit held ({cancelModalBooking.depositHeld} credits) will be immediately refunded to your balance.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Reason for Cancellation (Optional)
              </label>
              <textarea
                rows={2}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Schedule changed, project completed early..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCancelModalBooking(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-100"
              >
                Keep Booking
              </button>
              <button
                type="button"
                onClick={confirmCancel}
                disabled={isPending}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isPending ? "Cancelling..." : "Confirm Cancellation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
