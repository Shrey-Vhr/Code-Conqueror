import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { sweepOverdue } from "@/lib/overdue";
import { BookingsListClient, BookingRow } from "./BookingsListClient";

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

  const rawBookings = await prisma.booking.findMany({
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

  const activeCount = rawBookings.filter(
    (b) => b.status === "APPROVED" || b.status === "CHECKED_IN"
  ).length;
  const waitlistCount = rawBookings.filter((b) => b.status === "WAITLISTED").length;
  const overdueCount = rawBookings.filter((b) => b.status === "OVERDUE").length;

  // Format for client component
  const formattedBookings: BookingRow[] = rawBookings.map((b) => ({
    id: b.id,
    resourceId: b.resourceId,
    resource: b.resource,
    start: b.start.toISOString(),
    end: b.end.toISOString(),
    purpose: b.purpose,
    purposeDetails: b.purposeDetails,
    status: b.status,
    priorityScore: b.priorityScore,
    depositHeld: b.depositHeld,
    waitlistPosition: b.waitlistPosition,
    createdAt: b.createdAt.toISOString(),
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Page Title & Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight">
            My Campus Reservations
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Track active sessions, waitlist queue promotions, condition reports, and return verifications.
          </p>
        </div>

        <Link
          href="/resources"
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full text-xs font-bold shadow-sm transition-all shrink-0 hover:-translate-y-0.5"
        >
          Book Another Resource
        </Link>
      </div>

      {/* Summary KPI Cards with Soft Pastel Gradients */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-5 bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/40 rounded-3xl border border-emerald-100 shadow-xs">
          <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">Active Sessions</span>
          <span className="text-2xl sm:text-3xl font-semibold text-emerald-950 mt-1.5 block">{activeCount}</span>
        </div>
        <div className="p-5 bg-gradient-to-br from-purple-50/70 via-white to-indigo-50/40 rounded-3xl border border-purple-100 shadow-xs">
          <span className="text-xs font-bold text-purple-800 uppercase tracking-wider block">Waitlist Queues</span>
          <span className="text-2xl sm:text-3xl font-semibold text-purple-950 mt-1.5 block">{waitlistCount}</span>
        </div>
        <div className="p-5 bg-gradient-to-br from-rose-50/70 via-white to-pink-50/40 rounded-3xl border border-rose-100 shadow-xs">
          <span className="text-xs font-bold text-rose-800 uppercase tracking-wider block">Overdue Warnings</span>
          <span
            className={`text-2xl sm:text-3xl font-semibold mt-1.5 block ${
              overdueCount > 0 ? "text-rose-600 animate-pulse" : "text-rose-950"
            }`}
          >
            {overdueCount}
          </span>
        </div>
        <div className="p-5 bg-gradient-to-br from-indigo-50/70 via-white to-sky-50/40 rounded-3xl border border-indigo-100 shadow-xs">
          <span className="text-xs font-bold text-indigo-800 uppercase tracking-wider block">Total History</span>
          <span className="text-2xl sm:text-3xl font-semibold text-indigo-950 mt-1.5 block">{rawBookings.length}</span>
        </div>
      </div>

      {/* Client List with Tabs, Search, Date Range, Actions, Pagination */}
      <BookingsListClient initialBookings={formattedBookings} />
    </div>
  );
}
