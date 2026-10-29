import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "CampusShare — Campus Equipment & Space Orchestration",
  description:
    "Next-generation university resource sharing, automated fair-use scheduling, verification, and condition tracking.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-slate-50/70 text-slate-900 antialiased selection:bg-indigo-500 selection:text-white">
        <Navbar />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-slate-200/70 bg-white/70 backdrop-blur-sm py-8 text-center text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p>
              &copy; {new Date().getFullYear()} Northfield University —{" "}
              <strong className="text-slate-800 font-bold">CampusShare</strong> Equipment & Space Commons
            </p>
            <div className="flex items-center gap-3 text-slate-400 text-xs flex-wrap justify-center">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/70 font-semibold text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Fairness Engine Active
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/70 font-semibold text-[11px]">
                OpenAI Assisted
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200/70 font-semibold text-[11px]">
                Audit Ledger Verified
              </span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
