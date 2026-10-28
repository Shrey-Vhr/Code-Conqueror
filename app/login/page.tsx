"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { loginAction, quickLoginAction } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeQuickEmail, setActiveQuickEmail] = useState<string | null>(null);

  const demoAccounts = [
    {
      name: "Alice Johnson",
      email: "alice@northfield.edu",
      role: "Student (USER)",
      desc: "Good standing, all certifications, active booking",
      badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
      password: "Alice2024!",
    },
    {
      name: "Bob Martinez",
      email: "bob@northfield.edu",
      role: "Student (USER)",
      desc: "Missing laser cert, has overdue oscilloscope & damage report",
      badgeColor: "bg-amber-100 text-amber-800 border-amber-200",
      password: "Bob2024!",
    },
    {
      name: "Dr. Carol Zhang",
      email: "carol@northfield.edu",
      role: "Researcher (USER)",
      desc: "High priority score, approved laser slot with waitlist competition",
      badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
      password: "Carol2024!",
    },
    {
      name: "Prof. Dave Miller",
      email: "dave@northfield.edu",
      role: "Owner (OWNER)",
      desc: "Owns Engineering lab tools, reviews booking queue",
      badgeColor: "bg-purple-100 text-purple-800 border-purple-200",
      password: "Dave2024!",
    },
    {
      name: "Eve Sinclair",
      email: "eve@northfield.edu",
      role: "Manager (MANAGER)",
      desc: "Department approver, resolves incidents, applies penalties",
      badgeColor: "bg-indigo-100 text-indigo-800 border-indigo-200",
      password: "Eve2024!",
    },
    {
      name: "Frank Reynolds",
      email: "frank@northfield.edu",
      role: "Admin (ADMIN)",
      desc: "Dean of Facilities, verifies certs, global audit & fairness policy",
      badgeColor: "bg-rose-100 text-rose-800 border-rose-200",
      password: "Frank2024!",
    },
  ];

  const handleQuickLogin = async (accEmail: string) => {
    setActiveQuickEmail(accEmail);
    setError(null);
    try {
      const res = await quickLoginAction(accEmail);
      if (res.success) {
        router.push("/resources");
        router.refresh();
      } else {
        setError(("error" in res && typeof res.error === "string") ? res.error : "Login failed");
      }
    } catch {
      setError("An unexpected error occurred during quick sign in.");
    } finally {
      setActiveQuickEmail(null);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("email", email);
    formData.append("password", password);

    try {
      const res = await loginAction(formData);
      if (res.success) {
        router.push("/resources");
        router.refresh();
      } else {
        setError(("error" in res && typeof res.error === "string") ? res.error : "Invalid email or password");
      }
    } catch {
      setError("Network or authentication error.");
    } finally {
      setIsLoading(false);
    }
  };

  const fillCredentials = (accEmail: string, accPass: string) => {
    setEmail(accEmail);
    setPassword(accPass);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] py-12 px-4 sm:px-6 lg:px-8 flex flex-col justify-center items-center bg-slate-50">
      <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Traditional Login Box */}
        <div className="lg:col-span-5 bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
          <div className="mb-6">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg mb-3 shadow-sm">
              CS
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Sign in to CampusShare
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Northfield University Equipment & Space Federation
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2">
              <svg
                className="w-4 h-4 shrink-0 text-rose-600"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Campus Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="netid@northfield.edu"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? "Signing in..." : "Sign In with Single Sign-On"}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 text-center text-xs text-slate-400">
            Northfield CAS / SAML 2.0 Auth Simulation
          </div>
        </div>

        {/* Right Column: Hackathon Judge One-Click Role Switcher */}
        <div className="lg:col-span-7 bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500"></span>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Judge Sandbox Ready
                </span>
              </div>
              <h2 className="text-lg font-bold text-slate-900 mt-1">
                One-Click Demo Account Switcher
              </h2>
            </div>
          </div>
          <p className="text-xs text-slate-500 mb-5">
            Click any demo profile to instantly log in as that persona and explore role-specific capabilities:
          </p>

          <div className="space-y-3">
            {demoAccounts.map((acc) => {
              const isLoggingIn = activeQuickEmail === acc.email;

              return (
                <div
                  key={acc.email}
                  className="p-3.5 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 transition-all flex items-center justify-between gap-4 group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900 text-sm">
                        {acc.name}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border ${acc.badgeColor}`}
                      >
                        {acc.role}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                      {acc.desc}
                    </p>
                    <span className="text-[11px] font-mono text-slate-400">
                      {acc.email}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => fillCredentials(acc.email, acc.password)}
                      className="hidden sm:inline-block text-xs text-slate-500 hover:text-slate-800 px-2 py-1 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Fill into form"
                    >
                      Fill
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickLogin(acc.email)}
                      disabled={isLoggingIn}
                      className="px-3.5 py-1.5 rounded-lg bg-slate-900 group-hover:bg-blue-600 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isLoggingIn ? "Switching..." : "Login →"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
