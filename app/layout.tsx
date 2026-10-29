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
    <html lang="en" suppressHydrationWarning style={{ backgroundColor: "#eaf0eb" }}>
      <body
        suppressHydrationWarning
        className="min-h-screen flex flex-col text-slate-800 antialiased"
      >
        <Navbar />
        <main className="flex-1">{children}</main>
        <footer className="py-8 text-center text-xs text-slate-400">
          <p>
            &copy; {new Date().getFullYear()} Northfield University ·{" "}
            <span className="text-slate-500 font-medium">CampusShare</span> — fair, transparent
            sharing of campus equipment and spaces
          </p>
        </footer>
      </body>
    </html>
  );
}
