import React from "react";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    | "default"
    | "secondary"
    | "success"
    | "warning"
    | "destructive"
    | "outline"
    | "purple"
    | "cyan"
    | "addon";
  children: React.ReactNode;
}

export function Badge({
  variant = "default",
  className = "",
  children,
  ...props
}: BadgeProps) {
  const variantStyles = {
    default: "bg-indigo-50 text-indigo-700 border-indigo-200/80 font-medium",
    secondary: "bg-slate-100 text-slate-700 border-slate-200/80 font-medium",
    success: "bg-emerald-50 text-emerald-700 border-emerald-200/80 font-medium",
    warning: "bg-amber-50 text-amber-800 border-amber-200/80 font-medium",
    destructive: "bg-rose-50 text-rose-700 border-rose-200/80 font-medium",
    outline: "bg-white/70 text-slate-600 border-slate-200 font-medium",
    purple: "bg-purple-50 text-purple-700 border-purple-200/80 font-medium",
    cyan: "bg-sky-50 text-sky-700 border-sky-200/80 font-medium",
    addon: "bg-purple-50 text-purple-700 border-purple-200/80 font-medium",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] tracking-normal border ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
