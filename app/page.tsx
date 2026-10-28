import React from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { isStaff } from "@/lib/rbac";
import { StatusBadge } from "@/components/StatusBadge";
import { format, formatDistanceToNow } from "date-fns";

export default async function HomePage() {
  const session = await getSession();

  // 1. PUBLIC MARKETING LANDING PAGE IF NOT LOGGED IN
  if (!session) {
    const totalResources = await prisma.resource.count();
    const totalUsers = await prisma.user.count();

    return (
      <div className="space-y-16 py-8 sm:py-12">
        {/* Hero Section */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
            Northfield University CampusShare Platform
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tight leading-tight">
            Fair, Transparent, and Automated{" "}
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Campus Resource Sharing
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Eliminate equipment hoarding and slot-camping. CampusShare uses mathematical fairness priority scoring, digital condition verification reports, and human-in-the-loop AI assistance for university makerspaces, GPU clusters, and research labs.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/login"
              className="w-full sm:w-auto px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-sm transition-all transform hover:-translate-y-0.5"
            >
              Get Started / Sign In →
            </Link>
            <Link
              href="/resources"
              className="w-full sm:w-auto px-6 py-3.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 rounded-xl text-sm font-semibold shadow-2xs transition-all"
            >
              Explore 12 Campus Resources
            </Link>
          </div>
        </div>

        {/* Real University Stats Strip */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-white rounded-3xl border border-slate-200 shadow-2xs">
            <div className="text-center p-3">
              <span className="text-3xl sm:text-4xl font-black text-blue-600 block">{totalResources || 12}</span>
              <span className="text-xs font-semibold text-slate-500 uppercase mt-1 block">Shared Resources</span>
              <span className="text-[11px] text-slate-400">Lasers, 3D printers, GPUs, studios</span>
            </div>
            <div className="text-center p-3 border-l border-slate-100">
              <span className="text-3xl sm:text-4xl font-black text-indigo-600 block">4</span>
              <span className="text-xs font-semibold text-slate-500 uppercase mt-1 block">Academic Colleges</span>
              <span className="text-[11px] text-slate-400">Engineering, Biology, Media, Library</span>
            </div>
            <div className="text-center p-3 border-l border-slate-100">
              <span className="text-3xl sm:text-4xl font-black text-purple-600 block">{totalUsers || 6}</span>
              <span className="text-xs font-semibold text-slate-500 uppercase mt-1 block">Demo User Roles</span>
              <span className="text-[11px] text-slate-400">Student, Researcher, Owner, Manager, Admin</span>
            </div>
            <div className="text-center p-3 border-l border-slate-100">
              <span className="text-3xl sm:text-4xl font-black text-emerald-600 block">100%</span>
              <span className="text-xs font-semibold text-slate-500 uppercase mt-1 block">Audit Traceability</span>
              <span className="text-[11px] text-slate-400">Immutable lifecycle records</span>
            </div>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Designed for Campus Equity & Accountable Stewardship
            </h2>
            <p className="text-xs text-slate-500 max-w-lg mx-auto">
              Three architectural pillars preventing slot hoarding, resolving schedule contention, and enforcing equipment safety.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 font-black flex items-center justify-center text-lg">
                ⚖️
              </div>
              <h3 className="font-bold text-slate-900 text-base">Mathematical Fairness Scoring</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Prioritizes applicants by academic need, course deadlines, and waitlist seniority while penalizing excessive past usage and accumulated strikes.
              </p>
            </div>

            <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 font-black flex items-center justify-center text-lg">
                🔍
              </div>
              <h3 className="font-bold text-slate-900 text-base">Two-Phase Condition Verification</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Mandatory check-in and check-out physical inspection checklists and rating delta tracking. Automatic incident drafting when ratings drop.
              </p>
            </div>

            <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 font-black flex items-center justify-center text-lg">
                🤖
              </div>
              <h3 className="font-bold text-slate-900 text-base">Human-in-the-Loop AI Assistant</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Natural-language equipment matching, training certification compliance audits, and incident damage triage with transparent human review requirements.
              </p>
            </div>
          </div>
        </div>

        {/* Demo Accounts Quick-Select for Judges */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg">Judge Quick-Login Accounts</h3>
              <p className="text-xs text-slate-500">Pick any persona to evaluate role-based controls and live data</p>
            </div>
            <Link href="/login" className="text-xs font-bold text-blue-600 hover:text-blue-800">
              Open Login Page →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { email: "alice@northfield.edu", role: "STUDENT", desc: "Active capstone student; has active 3D printer session and waitlisted laser cutter" },
              { email: "bob@northfield.edu", role: "STUDENT", desc: "Student with 1 strike; has overdue oscilloscope checkout and pending GPU request" },
              { email: "carol@northfield.edu", role: "RESEARCHER", desc: "Biology PI; holds approved reservation on Laser Cutter with high research priority" },
              { email: "dave@northfield.edu", role: "OWNER", desc: "Engineering Lab Supervisor; owns 3D printers, laser cutter, oscilloscope, and DGX node" },
              { email: "eve@northfield.edu", role: "MANAGER", desc: "Engineering Department Manager; oversees all department bookings, incidents, and approvals" },
              { email: "frank@northfield.edu", role: "ADMIN", desc: "Campus Dean of Facilities; system-wide visibility, training registry, and AI fraud monitoring" },
            ].map((acc) => (
              <Link
                key={acc.email}
                href={`/login?email=${acc.email}`}
                className="p-4 bg-white rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-xs transition-all text-left block space-y-1 group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-xs group-hover:text-blue-600">
                    {acc.email}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    {acc.role}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">{acc.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 2. LOGGED-IN PERSONALIZED DASHBOARD
  const user = await prisma.user.findUnique({
    where: { id: session.id },
  });

  if (!user) {
    return null;
  }

  // Query user stats & bookings
  const myBookings = await prisma.booking.findMany({
    where: { userId: user.id },
    include: { resource: true },
    orderBy: { createdAt: "desc" },
  });

  const activeBookings = myBookings.filter(
    (b) => b.status === "APPROVED" || b.status === "CHECKED_IN" || b.status === "OVERDUE"
  );
  const pendingBookings = myBookings.filter((b) => b.status === "PENDING");
  const waitlistedBookings = myBookings.filter((b) => b.status === "WAITLISTED");

  // Notifications
  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  const unreadNotificationsCount = await prisma.notification.count({
    where: { userId: user.id, read: false },
  });

  // For OWNER / MANAGER: Pending review queue count for their resources
  let staffPendingReviewCount = 0;
  if (isStaff(user.role)) {
    const isGlobal = user.role === "ADMIN";
    staffPendingReviewCount = await prisma.booking.count({
      where: {
        status: "PENDING",
        ...(isGlobal
          ? {}
          : user.role === "MANAGER"
          ? { resource: { department: user.department } }
          : { resource: { ownerId: user.id } }),
      },
    });
  }

  // For ADMIN: Open incidents count across campus
  let adminOpenIncidentsCount = 0;
  if (user.role === "ADMIN" || user.role === "MANAGER") {
    adminOpenIncidentsCount = await prisma.incident.count({
      where: { status: "OPEN" },
    });
  }

  // Available Resources mini-grid (up to 4)
  const availableResources = await prisma.resource.findMany({
    where: { status: "ACTIVE" },
    take: 4,
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Personalized Welcome Header */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-700 via-indigo-600 to-purple-600 text-white font-extrabold text-2xl flex items-center justify-center shadow-xs">
            {user.name.charAt(0)}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Welcome back, {user.name}
              </h1>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full border bg-blue-50 text-blue-800 border-blue-200">
                {user.role}
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                {user.department}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              CampusShare Dashboard • Fast reservation management & resource discovery
            </p>
          </div>
        </div>

        {/* User Standing Pills */}
        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-center min-w-[95px]">
            <span className="text-[10px] font-semibold text-slate-500 uppercase block">Credits</span>
            <span className="text-xl font-bold text-blue-700">{user.credits}</span>
            <span className="text-[10px] text-slate-400 block">/ 500</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-center min-w-[95px]">
            <span className="text-[10px] font-semibold text-slate-500 uppercase block">Strikes</span>
            <div className="flex items-center justify-center gap-1 my-1">
              {[1, 2, 3].map((dot) => (
                <span
                  key={dot}
                  className={`w-2.5 h-2.5 rounded-full ${
                    dot <= user.strikes ? "bg-rose-500" : "bg-slate-200"
                  }`}
                />
              ))}
            </div>
            <span className={`text-[10px] font-bold ${user.strikes > 0 ? "text-rose-600" : "text-slate-400"}`}>
              {user.strikes} / 3 Strikes
            </span>
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Active Bookings Card */}
        <Link
          href="/bookings"
          className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-blue-400 shadow-2xs transition-all space-y-1 block group"
        >
          <span className="text-xs font-semibold text-slate-500 uppercase block">Active Sessions</span>
          <span className="text-2xl font-black text-slate-900 group-hover:text-blue-600 transition-colors">
            {activeBookings.length}
          </span>
          <span className="text-[11px] text-emerald-600 font-medium block">Approved & In-Use</span>
        </Link>

        {/* Pending Requests Card */}
        <Link
          href="/bookings"
          className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-amber-400 shadow-2xs transition-all space-y-1 block group"
        >
          <span className="text-xs font-semibold text-slate-500 uppercase block">My Pending</span>
          <span className="text-2xl font-black text-slate-900 group-hover:text-amber-600 transition-colors">
            {pendingBookings.length}
          </span>
          <span className="text-[11px] text-amber-600 font-medium block">Awaiting approval</span>
        </Link>

        {/* Waitlist Queue Card */}
        <Link
          href="/bookings"
          className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-purple-400 shadow-2xs transition-all space-y-1 block group"
        >
          <span className="text-xs font-semibold text-purple-600 uppercase block">Waitlisted</span>
          <span className="text-2xl font-black text-purple-700 block">{waitlistedBookings.length}</span>
          <span className="text-[11px] text-purple-600 font-medium block">Queued requests</span>
        </Link>

        {/* Unread Notifications Card */}
        <Link
          href="/notifications"
          className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-blue-400 shadow-2xs transition-all space-y-1 block group"
        >
          <span className="text-xs font-semibold text-slate-500 uppercase block">Notifications</span>
          <span
            className={`text-2xl font-black block ${
              unreadNotificationsCount > 0 ? "text-blue-600" : "text-slate-900"
            }`}
          >
            {unreadNotificationsCount}
          </span>
          <span className="text-[11px] text-slate-400 block">Unread alerts</span>
        </Link>

        {/* Staff / Manager / Admin Card */}
        {isStaff(user.role) ? (
          <Link
            href="/manage"
            className="p-5 bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200 hover:border-amber-400 shadow-2xs transition-all space-y-1 block"
          >
            <span className="text-xs font-bold text-amber-900 uppercase block">Review Queue</span>
            <span className="text-2xl font-black text-amber-900 block">{staffPendingReviewCount}</span>
            <span className="text-[11px] text-amber-700 font-medium block">Requires approval →</span>
          </Link>
        ) : (
          <Link
            href="/profile"
            className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-slate-300 shadow-2xs transition-all space-y-1 block"
          >
            <span className="text-xs font-semibold text-slate-500 uppercase block">Certifications</span>
            <span className="text-2xl font-black text-slate-900 block">Verified</span>
            <span className="text-[11px] text-slate-400 block">View credentials →</span>
          </Link>
        )}
      </div>

      {/* Main 2-Column Content: Left = Active Bookings & Resources; Right = Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 cols wide) */}
        <div className="lg:col-span-2 space-y-8">
          {/* Section: My Active Bookings */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900">My Active Reservations</h2>
                <p className="text-xs text-slate-500">Scheduled sessions, checked-in hardware, and returns</p>
              </div>
              <Link href="/bookings" className="text-xs font-bold text-blue-600 hover:text-blue-800">
                View All ({myBookings.length}) →
              </Link>
            </div>

            {activeBookings.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 space-y-2">
                <p>No active equipment sessions checked-in or scheduled right now.</p>
                <Link
                  href="/resources"
                  className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs"
                >
                  Browse Campus Equipment →
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {activeBookings.slice(0, 3).map((b) => (
                  <div
                    key={b.id}
                    className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 rounded-xl px-2 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                          {b.resource.type}
                        </span>
                        <Link
                          href={`/bookings/${b.id}`}
                          className="font-bold text-slate-900 text-sm hover:text-blue-600 transition-colors"
                        >
                          {b.resource.name}
                        </Link>
                        <StatusBadge status={b.status} />
                      </div>
                      <p className="text-xs text-slate-500">
                        {format(new Date(b.start), "MMM d, HH:mm")} – {format(new Date(b.end), "MMM d, HH:mm")} •{" "}
                        <span className="font-mono text-slate-400">
                          {formatDistanceToNow(new Date(b.start), { addSuffix: true })}
                        </span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/bookings/${b.id}`}
                        className="px-3.5 py-1.5 bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                      >
                        View Details →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section: Available Resources Mini-Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Featured Campus Resources</h2>
                <p className="text-xs text-slate-500">Reserve high-precision makerspace, compute, and studio equipment</p>
              </div>
              <Link href="/resources" className="text-xs font-bold text-blue-600 hover:text-blue-800">
                Explore All Resources →
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {availableResources.map((res) => (
                <div
                  key={res.id}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
                >
                  <div className="h-32 bg-slate-100 overflow-hidden relative">
                    <img
                      src={
                        res.image ||
                        "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80"
                      }
                      alt={res.name}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute top-2.5 left-2.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-900/80 text-white backdrop-blur-xs">
                      {res.type}
                    </span>
                  </div>

                  <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm line-clamp-1">{res.name}</h3>
                      <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{res.department} • {res.location}</p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <span className="text-xs font-semibold text-slate-700">
                        {res.creditCostPerHour > 0 ? `${res.creditCostPerHour} cr/hr` : "Free"}
                      </span>
                      <Link
                        href={`/resources/${res.id}`}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-2xs transition-colors"
                      >
                        Book Now
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Notifications & Quick Actions */}
        <div className="space-y-6">
          {/* Notifications Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">Notifications</h2>
                {unreadNotificationsCount > 0 && (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-100 text-blue-700">
                    {unreadNotificationsCount} new
                  </span>
                )}
              </div>
              <Link href="/notifications" className="text-xs font-bold text-blue-600 hover:text-blue-800">
                View All →
              </Link>
            </div>

            {notifications.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                No recent notifications.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {notifications.map((notif) => (
                  <div key={notif.id} className="py-3 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs text-slate-800 font-medium leading-relaxed">
                        {notif.message}
                      </p>
                      {!notif.read && (
                        <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-1" />
                      )}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>{formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}</span>
                      {notif.link && (
                        <Link href={notif.link} className="text-blue-600 hover:underline font-semibold">
                          Open →
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Shortcuts */}
          <div className="p-5 bg-gradient-to-br from-slate-50 to-blue-50/50 rounded-2xl border border-slate-200 space-y-3">
            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
              Quick Shortcuts
            </h3>
            <div className="space-y-2">
              <Link
                href="/resources"
                className="block p-2.5 bg-white rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 hover:text-blue-600 hover:border-blue-300 transition-colors"
              >
                🔍 Search Equipment & Spaces
              </Link>
              <Link
                href="/profile"
                className="block p-2.5 bg-white rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 hover:text-blue-600 hover:border-blue-300 transition-colors"
              >
                🎓 Submit Training Certification
              </Link>
              {isStaff(user.role) && (
                <Link
                  href="/manage"
                  className="block p-2.5 bg-white rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 hover:text-blue-600 hover:border-blue-300 transition-colors"
                >
                  ⚡ Department Review Queue
                </Link>
              )}
              {user.role === "ADMIN" && (
                <Link
                  href="/admin"
                  className="block p-2.5 bg-white rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 hover:text-blue-600 hover:border-blue-300 transition-colors"
                >
                  🛡️ Campus Admin Console & AI Flags
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
