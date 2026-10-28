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
      <body className="min-h-screen flex flex-col bg-slate-50 text-slate-900 antialiased selection:bg-addon selection:text-secondary">
        <Navbar />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-slate-200 bg-white/80 py-6 text-center text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p>
              &copy; {new Date().getFullYear()} Northfield University — <strong className="text-secondary font-bold">CampusShare</strong> Equipment & Space Commons
            </p>
            <div className="flex items-center gap-4 text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-addon" />
                Fairness Engine Active
              </span>
              <span>•</span>
              <span>OpenAI Assisted</span>
              <span>•</span>
              <span>Audit Ledger Verified</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
