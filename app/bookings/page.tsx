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
          <span
            className={`text-2xl font-black mt-1 block ${
              overdueCount > 0 ? "text-rose-600 animate-pulse" : "text-slate-900"
            }`}
          >
            {overdueCount}
          </span>
        </div>
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 uppercase block">Total History</span>
          <span className="text-2xl font-black text-slate-900 mt-1 block">{rawBookings.length}</span>
        </div>
      </div>

      {/* Client List with Tabs, Search, Date Range, Actions, Pagination */}
      <BookingsListClient initialBookings={formattedBookings} />
    </div>
  );
}
