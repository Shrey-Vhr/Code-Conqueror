import React from "react";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { NotificationBell } from "./NotificationBell";
import { NavLinks, NavItem } from "./NavLinks";
import { getUserNotifications, getUnreadCount } from "@/lib/notifications";
import { logoutAction, switchRoleAction } from "@/lib/auth";

const DEMO_USERS = [
  { email: "alice@northfield.edu", name: "Alice", role: "Student", hint: "All certs, active booking" },
  { email: "bob@northfield.edu", name: "Bob", role: "Student", hint: "Missing cert, overdue item" },
  { email: "carol@northfield.edu", name: "Carol", role: "Researcher", hint: "High priority" },
  { email: "dave@northfield.edu", name: "Dave", role: "Owner", hint: "Engineering lab" },
  { email: "eve@northfield.edu", name: "Eve", role: "Manager", hint: "Incident resolution" },
  { email: "frank@northfield.edu", name: "Frank", role: "Admin", hint: "Audits & approvals" },
];

export async function Navbar() {
  const session = await getSession();

  let notifications: any[] = [];
  let unreadCount = 0;

  if (session?.id) {
    notifications = await getUserNotifications(session.id);
    unreadCount = await getUnreadCount(session.id);
  }

  const isStaff =
    session?.role === "OWNER" ||
    session?.role === "MANAGER" ||
    session?.role === "ADMIN";
  const isAdmin = session?.role === "ADMIN";

  const items: NavItem[] = [
    { href: "/resources", label: "Resources" },
    { href: "/bookings", label: "Bookings" },
    ...(isStaff ? [{ href: "/manage", label: "Manage" }] : []),
    ...(isAdmin ? [{ href: "/admin", label: "Admin" }] : []),
    { href: "/profile", label: "Profile" },
  ];

  const demoEnabled = process.env.DEMO_MODE === "true";

  return (
    <header className="sticky top-0 z-40 bg-white/70 backdrop-blur-xl border-b border-slate-200/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href={session ? "/resources" : "/"} className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-semibold text-xs shadow-sm group-hover:bg-indigo-500 transition-colors">
                CS
              </div>
              <span className="font-semibold text-slate-800 text-[15px] tracking-tight">
                CampusShare
              </span>
            </Link>

            {session && <NavLinks items={items} />}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {session ? (
              <>
                <NotificationBell
                  initialNotifications={notifications}
                  initialUnreadCount={unreadCount}
                />

                {demoEnabled && (
                  <details className="relative group hidden sm:block">
                    <summary className="list-none cursor-pointer select-none px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100/80 rounded-full transition-colors [&::-webkit-details-marker]:hidden flex items-center gap-1.5">
                      Switch user
                      <svg
                        className="w-3 h-3 transition-transform group-open:rotate-180"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" />
                      </svg>
                    </summary>
                    <div className="reveal-pop absolute right-0 mt-2 w-64 bg-white rounded-2xl border border-slate-200/70 shadow-lg p-1.5">
                      {DEMO_USERS.map((u) => (
                        <form key={u.email} action={switchRoleAction.bind(null, u.email)}>
                          <button
                            type="submit"
                            className={`w-full flex items-center justify-between gap-3 text-left px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer ${
                              session.email === u.email
                                ? "bg-indigo-50 text-indigo-700"
                                : "text-slate-600 hover:bg-slate-100/80"
                            }`}
                          >
                            <span>
                              <span className="font-medium text-slate-800 block">
                                {u.name}{" "}
                                <span className="text-slate-400 font-normal">· {u.role}</span>
                              </span>
                              <span className="text-[11px] text-slate-400">{u.hint}</span>
                            </span>
                            {session.email === u.email && (
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                            )}
                          </button>
                        </form>
                      ))}
                    </div>
                  </details>
                )}

                <div className="flex items-center gap-2 pl-3 border-l border-slate-200/70">
                  <div className="text-right hidden sm:block leading-tight">
                    <p className="text-[13px] font-medium text-slate-700">{session.name}</p>
                    <p className="text-[11px] text-slate-400 capitalize">
                      {session.role.toLowerCase()}
                    </p>
                  </div>

                  <form action={logoutAction}>
                    <button
                      type="submit"
                      title="Log out"
                      className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100/80 rounded-full transition-colors cursor-pointer"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="1.5"
                        stroke="currentColor"
                        className="w-[18px] h-[18px]"
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
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full text-xs font-medium shadow-sm transition-colors"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
        {session && <NavLinks items={items} variant="mobile" />}
      </div>
    </header>
  );
}
