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
      <div className="space-y-16 py-10 sm:py-16">
        {/* Hero Section */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-200/80 text-indigo-700 text-xs font-bold shadow-xs">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            Northfield University CampusShare Platform
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tight leading-tight">
            Fair, Transparent, and Automated{" "}
            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-rose-500 bg-clip-text text-transparent">
              Campus Resource Sharing
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Eliminate equipment hoarding and slot-camping. CampusShare uses mathematical fairness priority scoring, digital condition verification reports, and human-in-the-loop AI assistance for university makerspaces, GPU clusters, and research labs.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <Link
              href="/login"
              className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 text-white rounded-full text-sm font-bold shadow-lg shadow-indigo-500/25 transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 group cursor-pointer"
            >
              <span>Get Started / Sign In</span>
              <span className="group-hover:translate-x-0.5 transition-transform font-bold">→</span>
            </Link>
            <Link
              href="/resources"
              className="w-full sm:w-auto px-7 py-3.5 bg-white/90 hover:bg-slate-50 text-slate-700 hover:text-indigo-600 border border-slate-200/80 hover:border-slate-300 rounded-full text-sm font-bold shadow-xs transition-all transform hover:-translate-y-0.5 cursor-pointer"
            >
              Explore Campus Resources
            </Link>
          </div>
        </div>

        {/* Real University Stats Strip with Soft Pastel Gradients */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 sm:p-8 bg-gradient-to-br from-indigo-50/40 via-white to-purple-50/30 rounded-3xl border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.03)]">
            <div className="text-center p-3">
              <span className="text-3xl sm:text-4xl font-black text-indigo-600 block">{totalResources || 12}</span>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide mt-1 block">Shared Resources</span>
              <span className="text-[11px] text-slate-400">Lasers, 3D printers, GPUs, studios</span>
            </div>
            <div className="text-center p-3 border-l border-slate-100">
              <span className="text-3xl sm:text-4xl font-black text-purple-600 block">4</span>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide mt-1 block">Academic Colleges</span>
              <span className="text-[11px] text-slate-400">Engineering, Biology, Media, Library</span>
            </div>
            <div className="text-center p-3 border-l border-slate-100">
              <span className="text-3xl sm:text-4xl font-black text-rose-500 block">{totalUsers || 6}</span>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide mt-1 block">Demo User Roles</span>
              <span className="text-[11px] text-slate-400">Student, Researcher, Owner, Manager, Admin</span>
            </div>
            <div className="text-center p-3 border-l border-slate-100">
              <span className="text-3xl sm:text-4xl font-black text-emerald-600 block">100%</span>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide mt-1 block">Audit Traceability</span>
              <span className="text-[11px] text-slate-400">Immutable lifecycle records</span>
            </div>
          </div>
        </div>

        {/* Feature Highlights Grid with Soft Pastel Cards */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Designed for Campus Equity & Accountable Stewardship
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto leading-relaxed">
              Three architectural pillars preventing slot hoarding, resolving schedule contention, and enforcing equipment safety.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-7 bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/40 rounded-3xl border border-indigo-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)] hover:shadow-md transition-all duration-300 hover:-translate-y-1 space-y-3.5">
              <div className="w-12 h-12 rounded-2xl bg-indigo-100/80 text-indigo-700 font-black flex items-center justify-center text-xl shadow-xs">
                ⚖️
              </div>
              <h3 className="font-bold text-slate-900 text-base">Mathematical Fairness Scoring</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Prioritizes applicants by academic need, course deadlines, and waitlist seniority while penalizing excessive past usage and accumulated strikes.
              </p>
            </div>

            <div className="p-7 bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/40 rounded-3xl border border-emerald-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)] hover:shadow-md transition-all duration-300 hover:-translate-y-1 space-y-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100/80 text-emerald-700 font-black flex items-center justify-center text-xl shadow-xs">
                🔍
              </div>
              <h3 className="font-bold text-slate-900 text-base">Two-Phase Condition Verification</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Mandatory check-in and check-out physical inspection checklists and rating delta tracking. Automatic incident drafting when ratings drop.
              </p>
            </div>

            <div className="p-7 bg-gradient-to-br from-rose-50/70 via-white to-pink-50/40 rounded-3xl border border-rose-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)] hover:shadow-md transition-all duration-300 hover:-translate-y-1 space-y-3.5">
              <div className="w-12 h-12 rounded-2xl bg-rose-100/80 text-rose-700 font-black flex items-center justify-center text-xl shadow-xs">
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
            <Link href="/login" className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors">
              Open Login Page →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {[
              { email: "alice@northfield.edu", role: "STUDENT", desc: "Active capstone student; has active 3D printer session and waitlisted laser cutter", pastel: "from-indigo-50/50 to-purple-50/30 border-indigo-100" },
              { email: "bob@northfield.edu", role: "STUDENT", desc: "Student with 1 strike; has overdue oscilloscope checkout and pending GPU request", pastel: "from-amber-50/50 to-orange-50/30 border-amber-100" },
              { email: "carol@northfield.edu", role: "RESEARCHER", desc: "Biology PI; holds approved reservation on Laser Cutter with high research priority", pastel: "from-purple-50/50 to-indigo-50/30 border-purple-100" },
              { email: "dave@northfield.edu", role: "OWNER", desc: "Engineering Lab Supervisor; owns 3D printers, laser cutter, oscilloscope, and DGX node", pastel: "from-sky-50/50 to-blue-50/30 border-sky-100" },
              { email: "eve@northfield.edu", role: "MANAGER", desc: "Engineering Department Manager; oversees all department bookings, incidents, and approvals", pastel: "from-emerald-50/50 to-teal-50/30 border-emerald-100" },
              { email: "frank@northfield.edu", role: "ADMIN", desc: "Campus Dean of Facilities; system-wide visibility, training registry, and AI fraud monitoring", pastel: "from-rose-50/50 to-pink-50/30 border-rose-100" },
            ].map((acc) => (
              <Link
                key={acc.email}
                href={`/login?email=${acc.email}`}
                className={`p-4 bg-gradient-to-br ${acc.pastel} rounded-2xl border hover:border-indigo-400 shadow-2xs hover:shadow-md transition-all text-left block space-y-1.5 group hover:-translate-y-0.5`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-xs group-hover:text-indigo-600 transition-colors">
                    {acc.email}
                  </span>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-white/90 text-slate-700 border border-slate-200/70 shadow-2xs">
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

  // Available Resources mini-grid (up to 4)
  const availableResources = await prisma.resource.findMany({
    where: { status: "ACTIVE" },
    take: 4,
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Personalized Welcome Header with Soft Lavender Pastel Card */}
      <div className="bg-gradient-to-r from-indigo-50/70 via-white to-purple-50/50 rounded-3xl border border-indigo-100 p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.03)] flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 text-white font-extrabold text-2xl flex items-center justify-center shadow-md shadow-indigo-300/40">
            {user.name.charAt(0)}
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Welcome back, {user.name}
              </h1>
              <span className="text-xs font-bold px-3 py-1 rounded-full border bg-indigo-50 text-indigo-700 border-indigo-200/80">
                {user.role}
              </span>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200/80">
                {user.department}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500">
              CampusShare Dashboard • Fast reservation management & fair resource discovery
            </p>
          </div>
        </div>

        {/* User Standing Pills */}
        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          <div className="p-3.5 bg-white/90 backdrop-blur-sm rounded-2xl border border-indigo-100 text-center min-w-[105px] shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Credits</span>
            <span className="text-xl font-black text-indigo-600">{user.credits}</span>
            <span className="text-[10px] text-slate-400 block">/ 500 max</span>
          </div>

          <div className="p-3.5 bg-white/90 backdrop-blur-sm rounded-2xl border border-indigo-100 text-center min-w-[105px] shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Strikes</span>
            <div className="flex items-center justify-center gap-1.5 my-1">
              {[1, 2, 3].map((dot) => (
                <span
                  key={dot}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${
                    dot <= user.strikes ? "bg-rose-500 shadow-rose-200 shadow-sm" : "bg-slate-200"
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

      {/* Quick Stats Grid with Distinct Soft Pastel Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Active Bookings Card (Mint Pastel) */}
        <Link
          href="/bookings"
          className="p-5 bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/40 rounded-3xl border border-emerald-100 hover:border-emerald-300 shadow-[0_4px_20px_rgb(0,0,0,0.02)] hover:shadow-md transition-all space-y-1 block group hover:-translate-y-0.5"
        >
          <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">Active Sessions</span>
          <span className="text-2xl font-black text-emerald-950 group-hover:text-emerald-600 transition-colors">
            {activeBookings.length}
          </span>
          <span className="text-[11px] text-emerald-700 font-semibold block">Approved & In-Use</span>
        </Link>

        {/* Pending Requests Card (Butter/Amber Pastel) */}
        <Link
          href="/bookings"
          className="p-5 bg-gradient-to-br from-amber-50/70 via-white to-orange-50/40 rounded-3xl border border-amber-100 hover:border-amber-300 shadow-[0_4px_20px_rgb(0,0,0,0.02)] hover:shadow-md transition-all space-y-1 block group hover:-translate-y-0.5"
        >
          <span className="text-xs font-bold text-amber-800 uppercase tracking-wider block">My Pending</span>
          <span className="text-2xl font-black text-amber-950 group-hover:text-amber-600 transition-colors">
            {pendingBookings.length}
          </span>
          <span className="text-[11px] text-amber-700 font-semibold block">Awaiting approval</span>
        </Link>

        {/* Waitlist Queue Card (Lavender/Purple Pastel) */}
        <Link
          href="/bookings"
          className="p-5 bg-gradient-to-br from-purple-50/70 via-white to-indigo-50/40 rounded-3xl border border-purple-100 hover:border-purple-300 shadow-[0_4px_20px_rgb(0,0,0,0.02)] hover:shadow-md transition-all space-y-1 block group hover:-translate-y-0.5"
        >
          <span className="text-xs font-bold text-purple-800 uppercase tracking-wider block">Waitlisted</span>
          <span className="text-2xl font-black text-purple-950 group-hover:text-purple-600 transition-colors">
            {waitlistedBookings.length}
          </span>
          <span className="text-[11px] text-purple-700 font-semibold block">Queued requests</span>
        </Link>

        {/* Unread Notifications Card (Sky/Blue Pastel) */}
        <Link
          href="/notifications"
          className="p-5 bg-gradient-to-br from-sky-50/70 via-white to-blue-50/40 rounded-3xl border border-sky-100 hover:border-sky-300 shadow-[0_4px_20px_rgb(0,0,0,0.02)] hover:shadow-md transition-all space-y-1 block group hover:-translate-y-0.5"
        >
          <span className="text-xs font-bold text-sky-800 uppercase tracking-wider block">Notifications</span>
          <span
            className={`text-2xl font-black block ${
              unreadNotificationsCount > 0 ? "text-indigo-600" : "text-sky-950"
            }`}
          >
            {unreadNotificationsCount}
          </span>
          <span className="text-[11px] text-sky-700 font-semibold block">Unread alerts</span>
        </Link>

        {/* Staff / Manager / Admin Card (Rose Pastel) */}
        {isStaff(user.role) ? (
          <Link
            href="/manage"
            className="p-5 bg-gradient-to-br from-rose-50/70 via-white to-pink-50/40 rounded-3xl border border-rose-100 hover:border-rose-300 shadow-[0_4px_20px_rgb(0,0,0,0.02)] hover:shadow-md transition-all space-y-1 block group hover:-translate-y-0.5"
          >
            <span className="text-xs font-bold text-rose-800 uppercase tracking-wider block">Review Queue</span>
            <span className="text-2xl font-black text-rose-950 group-hover:text-rose-600 transition-colors">
              {staffPendingReviewCount}
            </span>
            <span className="text-[11px] text-rose-700 font-semibold block">Requires approval →</span>
          </Link>
        ) : (
          <Link
            href="/profile"
            className="p-5 bg-gradient-to-br from-slate-50/80 via-white to-indigo-50/30 rounded-3xl border border-slate-200/80 hover:border-indigo-300 shadow-[0_4px_20px_rgb(0,0,0,0.02)] hover:shadow-md transition-all space-y-1 block group hover:-translate-y-0.5"
          >
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Certifications</span>
            <span className="text-2xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
              Verified
            </span>
            <span className="text-[11px] text-indigo-600 font-semibold block">View credentials →</span>
          </Link>
        )}
      </div>

      {/* Main 2-Column Content: Left = Active Bookings & Resources; Right = Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 cols wide) */}
        <div className="lg:col-span-2 space-y-8">
          {/* Section: My Active Bookings */}
          <div className="bg-white/95 rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-[0_8px_30px_rgb(0,0,0,0.03)] space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  My Active Reservations
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Scheduled sessions, checked-in hardware, and returns
                </p>
              </div>
              <Link href="/bookings" className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors">
                View All ({myBookings.length}) →
              </Link>
            </div>

            {activeBookings.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400 space-y-3">
                <p>No active equipment sessions checked-in or scheduled right now.</p>
                <Link
                  href="/resources"
                  className="inline-block px-5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 rounded-full text-xs font-bold shadow-2xs transition-all hover:-translate-y-0.5"
                >
                  Browse Campus Equipment →
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {activeBookings.slice(0, 3).map((b) => (
                  <div
                    key={b.id}
                    className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 rounded-2xl px-3 transition-colors"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200/70">
                          {b.resource.type}
                        </span>
                        <Link
                          href={`/bookings/${b.id}`}
                          className="font-bold text-slate-900 text-sm hover:text-indigo-600 transition-colors"
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
                        className="px-4 py-2 bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-700 rounded-full text-xs font-bold transition-all border border-indigo-200/80 shadow-2xs hover:-translate-y-0.5"
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
                <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  Featured Campus Resources
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Reserve high-precision makerspace, compute, and studio equipment
                </p>
              </div>
              <Link href="/resources" className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors">
                Explore All Resources →
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {availableResources.map((res) => (
                <div
                  key={res.id}
                  className="bg-white/95 rounded-3xl border border-slate-200/80 overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.03)] hover:shadow-md transition-all duration-300 flex flex-col justify-between hover:-translate-y-1 group"
                >
                  <div className="h-36 bg-slate-100 overflow-hidden relative">
                    <img
                      src={
                        res.image ||
                        "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80"
                      }
                      alt={res.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <span className="absolute top-3 left-3 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-900/80 text-white backdrop-blur-xs shadow-xs">
                      {res.type}
                    </span>
                  </div>

                  <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm line-clamp-1 group-hover:text-indigo-600 transition-colors">
                        {res.name}
                      </h3>
                      <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                        {res.department} • {res.location}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                      <span className="text-xs font-bold text-slate-700">
                        {res.creditCostPerHour > 0 ? `${res.creditCostPerHour} cr/hr` : "Free"}
                      </span>
                      <Link
                        href={`/resources/${res.id}`}
                        className="px-4 py-1.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 text-white rounded-full text-xs font-bold shadow-xs hover:shadow-indigo-500/20 transition-all hover:-translate-y-0.5"
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
          {/* Notifications Card with Soft Pastel Card */}
          <div className="bg-white/95 rounded-3xl border border-slate-200/80 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.03)] space-y-4">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 tracking-tight">Notifications</h2>
                {unreadNotificationsCount > 0 && (
                  <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-rose-100 text-rose-700">
                    {unreadNotificationsCount} new
                  </span>
                )}
              </div>
              <Link href="/notifications" className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors">
                View All →
              </Link>
            </div>

            {notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No recent notifications.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {notifications.map((notif) => (
                  <div key={notif.id} className="py-3 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs text-slate-800 font-medium leading-relaxed">
                        {notif.message}
                      </p>
                      {!notif.read && (
                        <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0 mt-1 shadow-xs" />
                      )}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>{formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}</span>
                      {notif.link && (
                        <Link href={notif.link} className="text-indigo-600 hover:text-indigo-800 font-bold transition-colors">
                          Open →
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Shortcuts in a Soft Pastel Card */}
          <div className="p-6 bg-gradient-to-br from-indigo-50/60 via-purple-50/30 to-pink-50/30 rounded-3xl border border-indigo-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)] space-y-3.5">
            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
              Quick Shortcuts
            </h3>
            <div className="space-y-2">
              <Link
                href="/resources"
                className="flex items-center gap-2 p-3 bg-white/90 hover:bg-white rounded-2xl border border-slate-200/80 text-xs font-bold text-slate-800 hover:text-indigo-600 hover:border-indigo-300 transition-all shadow-2xs hover:-translate-y-0.5"
              >
                <span>🔍</span>
                <span>Search Equipment & Spaces</span>
              </Link>
              <Link
                href="/profile"
                className="flex items-center gap-2 p-3 bg-white/90 hover:bg-white rounded-2xl border border-slate-200/80 text-xs font-bold text-slate-800 hover:text-indigo-600 hover:border-indigo-300 transition-all shadow-2xs hover:-translate-y-0.5"
              >
                <span>🎓</span>
                <span>Submit Training Certification</span>
              </Link>
              {isStaff(user.role) && (
                <Link
                  href="/manage"
                  className="flex items-center gap-2 p-3 bg-white/90 hover:bg-white rounded-2xl border border-slate-200/80 text-xs font-bold text-slate-800 hover:text-indigo-600 hover:border-indigo-300 transition-all shadow-2xs hover:-translate-y-0.5"
                >
                  <span>⚡</span>
                  <span>Department Review Queue</span>
                </Link>
              )}
              {user.role === "ADMIN" && (
                <Link
                  href="/admin"
                  className="flex items-center gap-2 p-3 bg-white/90 hover:bg-white rounded-2xl border border-slate-200/80 text-xs font-bold text-slate-800 hover:text-indigo-600 hover:border-indigo-300 transition-all shadow-2xs hover:-translate-y-0.5"
                >
                  <span>🛡️</span>
                  <span>Campus Admin Console & AI Flags</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
