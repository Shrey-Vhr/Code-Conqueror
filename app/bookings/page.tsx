import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { sweepOverdue } from "@/lib/overdue";
import { StatusBadge } from "@/components/StatusBadge";
import { PriorityBreakdown } from "@/components/PriorityBreakdown";
import { format, formatDistanceToNow } from "date-fns";

export default async function BookingsPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  // Sweep overdue bookings
  try {
    await sweepOverdue();
  } catch (err) {
    console.error("Overdue sweep error on bookings load:", err);
  }

  const bookings = await prisma.booking.findMany({
    where: { userId: session.id },
    include: {
      resource: {
        select: {
          id: true,
          name: true,
          location: true,
          department: true,
          image: true,
          type: true,
        },
      },
      conditionReports: true,
      incidents: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const activeCount = bookings.filter(
    (b) => b.status === "APPROVED" || b.status === "CHECKED_IN"
  ).length;
  const waitlistCount = bookings.filter((b) => b.status === "WAITLISTED").length;
  const overdueCount = bookings.filter((b) => b.status === "OVERDUE").length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Page Title & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            My Campus Reservations
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Track active sessions, waitlist queue promotions, condition reports, and return verifications.
          </p>
        </div>

        <Link
          href="/resources"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-xs transition-colors shrink-0"
        >
          Book Another Resource
        </Link>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 uppercase block">Active Sessions</span>
          <span className="text-2xl font-black text-slate-900 mt-1 block">{activeCount}</span>
        </div>
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-purple-600 uppercase block">Waitlist Queues</span>
          <span className="text-2xl font-black text-purple-700 mt-1 block">{waitlistCount}</span>
        </div>
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-rose-600 uppercase block">Overdue Warnings</span>
          <span className={`text-2xl font-black mt-1 block ${overdueCount > 0 ? "text-rose-600 animate-pulse" : "text-slate-900"}`}>
            {overdueCount}
          </span>
        </div>
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 uppercase block">Total History</span>
          <span className="text-2xl font-black text-slate-900 mt-1 block">{bookings.length}</span>
        </div>
      </div>

      {/* Bookings List */}
      {bookings.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center font-bold text-lg mb-3">
            📅
          </div>
          <h3 className="text-base font-bold text-slate-800">No Reservations Yet</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Browse the campus equipment registry to reserve 3D printers, laser cutters, lab hoods, or studios.
          </p>
          <Link
            href="/resources"
            className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-blue-700 transition-colors"
          >
            Explore Resources →
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => {
            const isApproved = booking.status === "APPROVED";
            const isCheckedIn = booking.status === "CHECKED_IN";
            const isOverdue = booking.status === "OVERDUE";
            const isWaitlisted = booking.status === "WAITLISTED";

            return (
              <div
                key={booking.id}
                className={`bg-white rounded-2xl border transition-all overflow-hidden p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 ${
                  isOverdue
                    ? "border-rose-300 ring-2 ring-rose-100 bg-rose-50/20"
                    : isCheckedIn
                    ? "border-blue-300 bg-blue-50/10"
                    : isWaitlisted
                    ? "border-purple-200"
                    : "border-slate-200 hover:border-slate-300 shadow-2xs"
                }`}
              >
                {/* Left: Thumbnail & Details */}
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

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/bookings/${booking.id}`}
                        className="font-bold text-slate-900 text-base hover:text-blue-600 transition-colors truncate"
                      >
                        {booking.resource.name}
                      </Link>
                      <StatusBadge status={booking.status} />
                      {isWaitlisted && booking.waitlistPosition && (
                        <span className="text-[11px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full border border-purple-200">
                          Waitlist Position #{booking.waitlistPosition}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                      <span>{booking.resource.department}</span>
                      <span>•</span>
                      <span>{booking.resource.location}</span>
                      <span>•</span>
                      <span>Purpose: <strong className="text-slate-700">{booking.purpose}</strong></span>
                    </div>

                    <div className="mt-2 flex items-center gap-4 text-xs font-medium text-slate-700 flex-wrap">
                      <span className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                        <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {format(new Date(booking.start), "EEE, MMM d")} • {format(new Date(booking.start), "HH:mm")} - {format(new Date(booking.end), "HH:mm")}
                      </span>

                      <PriorityBreakdown score={booking.priorityScore} compact={true} />

                      {booking.depositHeld > 0 && (
                        <span className="text-slate-500">
                          Deposit Held: <strong>{booking.depositHeld} cr</strong>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Quick Action Controls */}
                <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto justify-end pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  {isApproved && (
                    <Link
                      href={`/bookings/${booking.id}#condition-actions`}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
                    >
                      <span>Check In</span>
                      <span>→</span>
                    </Link>
                  )}

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

                  <Link
                    href={`/bookings/${booking.id}`}
                    className="px-3.5 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
                  >
                    View Timeline
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
