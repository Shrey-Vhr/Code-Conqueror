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
    outline: "bg-white/90 text-slate-700 border-slate-200 font-medium shadow-2xs",
    purple: "bg-purple-50 text-purple-700 border-purple-200/80 font-medium",
    cyan: "bg-sky-50 text-sky-700 border-sky-200/80 font-medium",
    addon: "bg-pink-50 text-pink-700 border-pink-200/80 font-semibold",
  };

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs tracking-tight border ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
