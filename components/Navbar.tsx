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
    STUDENT: "bg-indigo-50 text-indigo-700 border-indigo-200/80",
    RESEARCHER: "bg-purple-50 text-purple-700 border-purple-200/80",
    OWNER: "bg-amber-50 text-amber-800 border-amber-200/80",
    MANAGER: "bg-sky-50 text-sky-700 border-sky-200/80",
    ADMIN: "bg-rose-50 text-rose-700 border-rose-200/80",
  };

  const isStaff =
    session?.role === "OWNER" ||
    session?.role === "MANAGER" ||
    session?.role === "ADMIN";

  const isAdmin = session?.role === "ADMIN";

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200/70 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div className="flex items-center gap-6">
            <Link href="/resources" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-sm shadow-md shadow-indigo-300/40 group-hover:scale-105 group-hover:rotate-3 transition-transform">
                CS
              </div>
              <div>
                <span className="font-extrabold text-slate-900 text-lg tracking-tight bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 bg-clip-text">
                  CampusShare
                </span>
                <span className="hidden sm:inline-block ml-2 text-[10px] font-bold tracking-wider uppercase text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200/70">
                  Northfield Univ
                </span>
              </div>
            </Link>

            {/* Navigation links with pill buttons */}
            {session && (
              <nav className="hidden md:flex items-center gap-1">
                <Link
                  href="/resources"
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/70 rounded-full transition-all"
                >
                  Resources
                </Link>
                <Link
                  href="/bookings"
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/70 rounded-full transition-all"
                >
                  Bookings
                </Link>
                {isStaff && (
                  <Link
                    href="/manage"
                    className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/70 rounded-full transition-all flex items-center gap-1.5"
                  >
                    <span>Manage</span>
                    <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.2 rounded-full">
                      Staff
                    </span>
                  </Link>
                )}
                {isAdmin && (
                  <Link
                    href="/admin"
                    className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/70 rounded-full transition-all flex items-center gap-1.5"
                  >
                    <span>Admin</span>
                    <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.2 rounded-full">
                      Console
                    </span>
                  </Link>
                )}
                <Link
                  href="/profile"
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/70 rounded-full transition-all"
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

                {/* Judge Quick Switcher Pill Bar */}
                <div className="hidden xl:flex items-center">
                  <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-full border border-slate-200/60 shadow-inner text-xs">
                    <span className="px-2.5 text-slate-400 font-semibold text-[11px]">Switch:</span>
                    <form action={switchRoleAction.bind(null, "alice@northfield.edu")}>
                      <button
                        type="submit"
                        className={`px-2.5 py-1 rounded-full text-[11px] font-medium cursor-pointer transition-all ${
                          session.email === "alice@northfield.edu"
                            ? "bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-xs font-bold scale-[1.02]"
                            : "text-slate-600 hover:text-indigo-600 hover:bg-white"
                        }`}
                        title="Student (Active, all certs)"
                      >
                        Alice (Student)
                      </button>
                    </form>
                    <form action={switchRoleAction.bind(null, "bob@northfield.edu")}>
                      <button
                        type="submit"
                        className={`px-2.5 py-1 rounded-full text-[11px] font-medium cursor-pointer transition-all ${
                          session.email === "bob@northfield.edu"
                            ? "bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-xs font-bold scale-[1.02]"
                            : "text-slate-600 hover:text-indigo-600 hover:bg-white"
                        }`}
                        title="Student (Missing cert, overdue demo)"
                      >
                        Bob (Student)
                      </button>
                    </form>
                    <form action={switchRoleAction.bind(null, "carol@northfield.edu")}>
                      <button
                        type="submit"
                        className={`px-2.5 py-1 rounded-full text-[11px] font-medium cursor-pointer transition-all ${
                          session.email === "carol@northfield.edu"
                            ? "bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-xs font-bold scale-[1.02]"
                            : "text-slate-600 hover:text-indigo-600 hover:bg-white"
                        }`}
                        title="Researcher (High priority)"
                      >
                        Carol (Researcher)
                      </button>
                    </form>
                    <form action={switchRoleAction.bind(null, "dave@northfield.edu")}>
                      <button
                        type="submit"
                        className={`px-2.5 py-1 rounded-full text-[11px] font-medium cursor-pointer transition-all ${
                          session.email === "dave@northfield.edu"
                            ? "bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-xs font-bold scale-[1.02]"
                            : "text-slate-600 hover:text-indigo-600 hover:bg-white"
                        }`}
                        title="Owner (Engineering)"
                      >
                        Dave (Owner)
                      </button>
                    </form>
                    <form action={switchRoleAction.bind(null, "eve@northfield.edu")}>
                      <button
                        type="submit"
                        className={`px-2.5 py-1 rounded-full text-[11px] font-medium cursor-pointer transition-all ${
                          session.email === "eve@northfield.edu"
                            ? "bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-xs font-bold scale-[1.02]"
                            : "text-slate-600 hover:text-indigo-600 hover:bg-white"
                        }`}
                        title="Manager (Incident resolution)"
                      >
                        Eve (Manager)
                      </button>
                    </form>
                    <form action={switchRoleAction.bind(null, "frank@northfield.edu")}>
                      <button
                        type="submit"
                        className={`px-2.5 py-1 rounded-full text-[11px] font-medium cursor-pointer transition-all ${
                          session.email === "frank@northfield.edu"
                            ? "bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-xs font-bold scale-[1.02]"
                            : "text-slate-600 hover:text-indigo-600 hover:bg-white"
                        }`}
                        title="Admin (Global audits & approvals)"
                      >
                        Frank (Admin)
                      </button>
                    </form>
                  </div>
                </div>

                {/* User Role Pill */}
                <div className="flex items-center gap-2 pl-2 border-l border-slate-200/80">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs font-bold text-slate-800 leading-tight">
                      {session.name}
                    </p>
                    <span
                      className={`inline-block text-[10px] font-semibold px-2.5 py-0.5 rounded-full border mt-0.5 ${
                        rolePillStyles[session.role] || "bg-slate-100 text-slate-800 border-slate-200"
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
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-all cursor-pointer"
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
                className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 text-white rounded-full text-xs font-bold shadow-md shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all hover:-translate-y-0.5 flex items-center gap-1.5"
              >
                <span>Sign In</span>
                <span>→</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
