"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface NavItem {
  href: string;
  label: string;
}

export function NavLinks({
  items,
  variant = "desktop",
}: {
  items: NavItem[];
  variant?: "desktop" | "mobile";
}) {
  const pathname = usePathname();

  return (
    <nav
      className={
        variant === "desktop"
          ? "hidden md:flex items-center gap-0.5"
          : "md:hidden flex items-center gap-1 overflow-x-auto pb-2.5 -mx-1 px-1"
      }
    >
      {items.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`relative shrink-0 px-3.5 py-1.5 text-[13px] font-medium rounded-full transition-colors duration-200 ${
              active
                ? "text-indigo-700 bg-indigo-100/70"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-100/80"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
