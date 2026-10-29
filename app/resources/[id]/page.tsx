import React from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { checkEligibility } from "@/lib/eligibility";
import { getUserRecentHours } from "@/lib/fairness";
import { canManageResource } from "@/lib/rbac";
import { StatusBadge } from "@/components/StatusBadge";
import { ResourceThumb } from "@/components/ResourceThumb";
import { EligibilityChecklist } from "@/components/EligibilityChecklist";
import { BookingFormClient } from "./BookingFormClient";
import { WeeklyAvailabilityGrid } from "./WeeklyAvailabilityGrid";
import { format, startOfWeek } from "date-fns";

export default async function ResourceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();

  const resource = await prisma.resource.findUnique({
    where: { id },
    include: {
      owner: {
        select: { id: true, name: true, department: true, email: true },
      },
      requirements: {
        include: { training: true },
      },
      bookings: {
        where: {
          status: { in: ["APPROVED", "CHECKED_IN", "OVERDUE", "PENDING", "WAITLISTED"] },
          end: { gte: new Date() },
        },
        include: {
          user: {
            select: { name: true, department: true },
          },
        },
        orderBy: { start: "asc" },
        take: 8,
      },
    },
  });

  if (!resource) notFound();

  // Load user data if logged in
  let currentUser: any = null;
  let recentHours = 0;
  if (session?.id) {
    currentUser = await prisma.user.findUnique({
      where: { id: session.id },
      include: {
        certifications: {
          include: { training: true },
        },
      },
    });
    recentHours = await getUserRecentHours(session.id);
  }

  const eligibility = currentUser
    ? checkEligibility(currentUser, resource)
    : {
        eligible: false,
        met: [],
        missing: ["Please sign in to check eligibility and book"],
        details: {
          accountVerified: false,
          notSuspended: false,
          creditsSufficient: false,
          roleMet: false,
          departmentMet: false,
          trainingsMet: false,
        },
      };

  const isManager = session
    ? canManageResource(session, {
        ownerId: resource.ownerId,
        department: resource.department,
      })
    : false;

  // Parse availability windows
  let availabilityWindows: Array<{ dayOfWeek: number; start: string; end: string }> = [];
  try {
    availabilityWindows = JSON.parse(resource.availabilityWindows || "[]");
  } catch {
    availabilityWindows = [];
  }

  // Load bookings for weekly availability grid
  const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const gridBookings = await prisma.booking.findMany({
    where: {
      resourceId: id,
      status: { in: ["APPROVED", "CHECKED_IN", "OVERDUE", "PENDING", "WAITLISTED"] },
      end: { gte: currentWeekStart },
    },
    select: {
      id: true,
      status: true,
      start: true,
      end: true,
    },
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Link href="/resources" className="hover:text-indigo-600 transition-colors font-medium">
            ← All Resources
          </Link>
          <span>/</span>
          <span className="text-slate-700 font-semibold">{resource.department}</span>
          <span>/</span>
          <span className="text-slate-900 font-bold truncate max-w-xs">{resource.name}</span>
        </div>

        {isManager && (
          <Link
            href={`/resources/${resource.id}/edit`}
            className="px-4 py-2 rounded-full border border-indigo-200/80 bg-indigo-50/70 hover:bg-indigo-100 text-xs font-bold text-indigo-700 transition-all flex items-center gap-1.5 shadow-2xs hover:-translate-y-0.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
            </svg>
            Edit Resource Settings
          </Link>
        )}
      </div>

      {/* Main Grid: Left side info, Right side booking form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Resource Details & Rules (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Hero Banner with Soft Rounded Corners */}
          <div className="bg-white/80 backdrop-blur-md rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
            <ResourceThumb type={resource.type} className="h-40 sm:h-48" iconClassName="w-16 h-16">
              <div className="absolute top-4 left-4 flex gap-2 flex-wrap">
                <span className="bg-white/80 backdrop-blur-sm text-slate-600 font-medium text-xs px-3 py-1 rounded-full">
                  {resource.type}
                </span>
                <span className="bg-white/80 backdrop-blur-sm text-indigo-700 font-medium text-xs px-3 py-1 rounded-full">
                  {resource.department}
                </span>
              </div>
              <div className="absolute top-4 right-4">
                <StatusBadge status={resource.status} />
              </div>
            </ResourceThumb>

            <div className="p-7">
              <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                <span>{resource.category}</span>
                <span>•</span>
                <span className="flex items-center gap-1 text-slate-700 font-medium">
                  <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                  </svg>
                  {resource.location}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight leading-tight">
                {resource.name}
              </h1>

              <p className="mt-3 text-slate-600 text-sm leading-relaxed">
                {resource.description}
              </p>

              {/* Resource Metrics Bar in Soft Pastel Pills */}
              <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-3.5 bg-gradient-to-br from-indigo-50/60 to-purple-50/30 border border-indigo-100/70 rounded-2xl">
                  <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">Rate</span>
                  <span className="text-base font-semibold text-slate-900">
                    {resource.creditCostPerHour === 0 ? "Free" : `${resource.creditCostPerHour} cr/h`}
                  </span>
                </div>
                <div className="p-3.5 bg-gradient-to-br from-amber-50/60 to-orange-50/30 border border-amber-100/70 rounded-2xl">
                  <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">Deposit</span>
                  <span className="text-base font-semibold text-slate-900">{resource.depositCredits} cr</span>
                </div>
                <div className="p-3.5 bg-gradient-to-br from-emerald-50/60 to-teal-50/30 border border-emerald-100/70 rounded-2xl">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Max Duration</span>
                  <span className="text-base font-semibold text-slate-900">{resource.maxHoursPerBooking}h/slot</span>
                </div>
                <div className="p-3.5 bg-gradient-to-br from-sky-50/60 to-blue-50/30 border border-sky-100/70 rounded-2xl">
                  <span className="text-[10px] font-bold text-sky-700 uppercase tracking-wider block">Weekly Limit</span>
                  <span className="text-base font-semibold text-slate-900">{resource.maxBookingsPerWeek} slots</span>
                </div>
              </div>
            </div>
          </div>

          {/* Rules & Protocols in Soft Pastel Amber Card */}
          {resource.rules && (
            <div className="bg-gradient-to-br from-amber-50/80 via-white to-orange-50/40 rounded-3xl border border-amber-200/80 p-6 shadow-2xs">
              <div className="flex items-center gap-2 mb-2 text-amber-900 font-bold text-sm">
                <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                <span>Operating Rules & Safety Protocols</span>
              </div>
              <p className="text-xs text-amber-900/90 leading-relaxed">
                {resource.rules}
              </p>
            </div>
          )}

          {/* Weekly availability (also summarises operating hours) */}
          <WeeklyAvailabilityGrid
            availabilityWindows={availabilityWindows}
            bookings={gridBookings}
          />

          {/* Upcoming Schedule / Occupied Slots */}
          <div className="bg-white/80 backdrop-blur-md rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-3">
            <h3 className="font-bold text-slate-900 text-sm">
              Active & Upcoming Bookings
            </h3>
            <p className="text-xs text-slate-500">
              Occupied calendar slots for this resource. Requesting an overlapping window automatically places you in the waitlist.
            </p>

            {resource.bookings.length === 0 ? (
              <div className="p-5 text-center text-xs text-slate-400 bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
                No upcoming reservations scheduled. Resource is completely open!
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {resource.bookings.map((b) => (
                  <div key={b.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-slate-800">
                        {format(new Date(b.start), "MMM d, yyyy")} • {format(new Date(b.start), "HH:mm")} - {format(new Date(b.end), "HH:mm")}
                      </span>
                      <span className="text-slate-400 ml-2 block sm:inline">
                        ({b.user.name})
                      </span>
                    </div>
                    <StatusBadge status={b.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Eligibility Checklist & Booking Form (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Eligibility Checklist in Soft Pastel */}
          <EligibilityChecklist eligibility={eligibility} />

          {/* Interactive Booking Form */}
          {currentUser ? (
            <BookingFormClient
              resourceId={resource.id}
              depositCredits={resource.depositCredits}
              creditCostPerHour={resource.creditCostPerHour}
              maxHoursPerBooking={resource.maxHoursPerBooking}
              userCredits={currentUser.credits}
              userStrikes={currentUser.strikes}
              userRole={currentUser.role}
              recentHours={recentHours}
              isEligible={eligibility.eligible}
            />
          ) : (
            <div className="p-8 text-center bg-white/80 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-900 text-base">
                Sign in to Reserve
              </h3>
              <p className="text-xs text-slate-500">
                Northfield University students and staff can sign in to view fair-use priority and book.
              </p>
              <Link
                href="/login"
                className="inline-block px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-full shadow-sm transition-all hover:-translate-y-0.5"
              >
                Sign In to CampusShare
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
