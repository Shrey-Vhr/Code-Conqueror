import React from "react";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { NotificationBell } from "./NotificationBell";
import { getUserNotifications, getUnreadCount } from "@/lib/notifications";
import { logoutAction, switchRoleAction } from "@/lib/auth";

export async function Navbar() {
  const session = await getSession();

  let notifications: any[] = [];
  let unreadCount = 0;

  if (session?.id) {
    notifications = await getUserNotifications(session.id);
    unreadCount = await getUnreadCount(session.id);
  }

  const rolePillStyles: Record<string, string> = {
    STUDENT: "bg-blue-100 text-blue-800 border-blue-200",
    RESEARCHER: "bg-emerald-100 text-emerald-800 border-emerald-200",
    OWNER: "bg-amber-100 text-amber-800 border-amber-200",
    MANAGER: "bg-purple-100 text-purple-800 border-purple-200",
    ADMIN: "bg-rose-100 text-rose-800 border-rose-200",
  };

  const isStaff =
    session?.role === "OWNER" ||
    session?.role === "MANAGER" ||
    session?.role === "ADMIN";

  const isAdmin = session?.role === "ADMIN";

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xs border-b border-slate-200 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div className="flex items-center gap-6">
            <Link href="/resources" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-500 flex items-center justify-center text-white font-bold text-lg shadow-sm group-hover:scale-105 transition-transform">
                CS
              </div>
              <div>
                <span className="font-bold text-slate-900 text-lg tracking-tight">
                  CampusShare
                </span>
                <span className="hidden sm:inline-block ml-2 text-[11px] font-semibold tracking-wider uppercase text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                  Northfield Univ
                </span>
              </div>
            </Link>

            {/* Navigation links */}
            {session && (
              <nav className="hidden md:flex items-center gap-1">
                <Link
                  href="/resources"
                  className="px-3 py-1.5 text-sm font-medium text-slate-700 hover:text-blue-600 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  Resources
                </Link>
                <Link
                  href="/bookings"
                  className="px-3 py-1.5 text-sm font-medium text-slate-700 hover:text-blue-600 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  Bookings
                </Link>
                {isStaff && (
                  <Link
                    href="/manage"
                    className="px-3 py-1.5 text-sm font-medium text-slate-700 hover:text-blue-600 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <span>Manage</span>
                    <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 rounded">
                      Staff
                    </span>
                  </Link>
                )}
                {isAdmin && (
                  <Link
                    href="/admin"
                    className="px-3 py-1.5 text-sm font-medium text-slate-700 hover:text-blue-600 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <span>Admin</span>
                    <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-1.5 py-0.5 rounded">
                      Console
                    </span>
                  </Link>
                )}
                <Link
                  href="/profile"
                  className="px-3 py-1.5 text-sm font-medium text-slate-700 hover:text-blue-600 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  My Profile
                </Link>
              </nav>
            )}
          </div>

          {/* Right Action Bar */}
          <div className="flex items-center gap-3">
            {session ? (
              <>
                {/* Notification Bell */}
                <NotificationBell
                  initialNotifications={notifications}
                  initialUnreadCount={unreadCount}
                />

                {/* Judge Quick Switcher Dropdown */}
                <div className="hidden lg:flex items-center">
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
                    <span className="px-2 text-slate-500 font-medium">Switch:</span>
                    <form action={switchRoleAction.bind(null, "alice@northfield.edu")}>
                      <button
                        type="submit"
                        className={`px-2 py-1 rounded-lg font-medium cursor-pointer transition-colors ${
                          session.email === "alice@northfield.edu"
                            ? "bg-white text-blue-700 shadow-2xs font-semibold"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                        title="Student (Active, all certs)"
                      >
                        Alice (Student)
                      </button>
                    </form>
                    <form action={switchRoleAction.bind(null, "bob@northfield.edu")}>
                      <button
                        type="submit"
                        className={`px-2 py-1 rounded-lg font-medium cursor-pointer transition-colors ${
                          session.email === "bob@northfield.edu"
                            ? "bg-white text-blue-700 shadow-2xs font-semibold"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                        title="Student (Missing cert, overdue demo)"
                      >
                        Bob (Student)
                      </button>
                    </form>
                    <form action={switchRoleAction.bind(null, "carol@northfield.edu")}>
                      <button
                        type="submit"
                        className={`px-2 py-1 rounded-lg font-medium cursor-pointer transition-colors ${
                          session.email === "carol@northfield.edu"
                            ? "bg-white text-blue-700 shadow-2xs font-semibold"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                        title="Researcher (High priority)"
                      >
                        Carol (Researcher)
                      </button>
                    </form>
                    <form action={switchRoleAction.bind(null, "dave@northfield.edu")}>
                      <button
                        type="submit"
                        className={`px-2 py-1 rounded-lg font-medium cursor-pointer transition-colors ${
                          session.email === "dave@northfield.edu"
                            ? "bg-white text-blue-700 shadow-2xs font-semibold"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                        title="Owner (Engineering)"
                      >
                        Dave (Owner)
                      </button>
                    </form>
                    <form action={switchRoleAction.bind(null, "eve@northfield.edu")}>
                      <button
                        type="submit"
                        className={`px-2 py-1 rounded-lg font-medium cursor-pointer transition-colors ${
                          session.email === "eve@northfield.edu"
                            ? "bg-white text-blue-700 shadow-2xs font-semibold"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                        title="Manager (Incident resolution)"
                      >
                        Eve (Manager)
                      </button>
                    </form>
                    <form action={switchRoleAction.bind(null, "frank@northfield.edu")}>
                      <button
                        type="submit"
                        className={`px-2 py-1 rounded-lg font-medium cursor-pointer transition-colors ${
                          session.email === "frank@northfield.edu"
                            ? "bg-white text-blue-700 shadow-2xs font-semibold"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                        title="Admin (Global audits & approvals)"
                      >
                        Frank (Admin)
                      </button>
                    </form>
                  </div>
                </div>

                {/* User Role Pill */}
                <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs font-semibold text-slate-900 leading-tight">
                      {session.name}
                    </p>
                    <span
                      className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        rolePillStyles[session.role] || "bg-slate-100 text-slate-800"
                      }`}
                    >
                      {session.role}
                    </span>
                  </div>

                  {/* Logout Button */}
                  <form action={logoutAction}>
                    <button
                      type="submit"
                      title="Log Out"
                      className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
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
                          d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"
                        />
                      </svg>
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <Link
                href="/login"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 shadow-sm transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
