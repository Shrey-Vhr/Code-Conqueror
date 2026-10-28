import React from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { checkEligibility } from "@/lib/eligibility";
import { getUserRecentHours } from "@/lib/fairness";
import { canManageResource } from "@/lib/rbac";
import { StatusBadge } from "@/components/StatusBadge";
import { EligibilityChecklist } from "@/components/EligibilityChecklist";
import { BookingFormClient } from "./BookingFormClient";
import { format } from "date-fns";

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

  const daysOfWeek = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Link href="/resources" className="hover:text-blue-600 transition-colors">
            ← All Resources
          </Link>
          <span>/</span>
          <span className="text-slate-800 font-medium">{resource.department}</span>
          <span>/</span>
          <span className="text-slate-900 font-semibold truncate max-w-xs">{resource.name}</span>
        </div>

        {isManager && (
          <Link
            href={`/resources/${resource.id}/edit`}
            className="px-3.5 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors flex items-center gap-1.5"
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
          {/* Hero Banner */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="h-64 sm:h-80 relative bg-slate-100">
              <img
                src={resource.image || "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80"}
                alt={resource.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-4 left-4 flex gap-2 flex-wrap">
                <span className="bg-white/95 backdrop-blur-xs text-slate-900 font-bold text-xs px-2.5 py-1 rounded-md shadow-xs">
                  {resource.type}
                </span>
                <span className="bg-blue-600/90 backdrop-blur-xs text-white font-semibold text-xs px-2.5 py-1 rounded-md shadow-xs">
                  {resource.department}
                </span>
              </div>
              <div className="absolute top-4 right-4">
                <StatusBadge status={resource.status} />
              </div>
            </div>

            <div className="p-6">
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
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

              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
                {resource.name}
              </h1>

              <p className="mt-3 text-slate-600 text-sm leading-relaxed">
                {resource.description}
              </p>

              {/* Resource Metrics Bar */}
              <div className="mt-6 pt-5 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase block">Rate</span>
                  <span className="text-base font-bold text-slate-900">
                    {resource.creditCostPerHour === 0 ? "Free" : `${resource.creditCostPerHour} cr/h`}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase block">Deposit</span>
                  <span className="text-base font-bold text-slate-900">{resource.depositCredits} cr</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase block">Max Duration</span>
                  <span className="text-base font-bold text-slate-900">{resource.maxHoursPerBooking}h/slot</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase block">Weekly Limit</span>
                  <span className="text-base font-bold text-slate-900">{resource.maxBookingsPerWeek} slots</span>
                </div>
              </div>
            </div>
          </div>

          {/* Rules & Protocols */}
          {resource.rules && (
            <div className="bg-amber-50/60 rounded-2xl border border-amber-200 p-5">
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

          {/* Operating Availability Windows */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
            <h3 className="font-bold text-slate-900 text-sm mb-3">
              Standard Operating Hours
            </h3>
            {availabilityWindows.length === 0 ? (
              <p className="text-xs text-slate-500">24/7 Access for authorized department keyholders.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {availabilityWindows.map((win, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                    <span className="font-semibold text-slate-700 block">
                      {daysOfWeek[win.dayOfWeek]}
                    </span>
                    <span className="text-slate-500 font-mono mt-0.5 block">
                      {win.start} - {win.end}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Schedule / Occupied Slots */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
            <h3 className="font-bold text-slate-900 text-sm mb-1">
              Active & Upcoming Bookings
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Occupied calendar slots for this resource. Requesting an overlapping window automatically places you in the waitlist.
            </p>

            {resource.bookings.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
                No upcoming reservations scheduled. Resource is completely open!
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {resource.bookings.map((b) => (
                  <div key={b.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-medium text-slate-800">
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
          {/* Eligibility Checklist */}
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
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-900 text-base mb-2">
                Sign in to Reserve
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Northfield University students and staff can sign in to view fair-use priority and book.
              </p>
              <Link
                href="/login"
                className="inline-block px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs"
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
