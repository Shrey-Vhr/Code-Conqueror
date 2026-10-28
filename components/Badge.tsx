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
    default: "bg-primary text-secondary border-[#DDD0A9] font-medium",
    secondary: "bg-slate-100 text-slate-800 border-slate-200 font-medium",
    success: "bg-[#E8F1D2] text-[#172A0B] border-[#C3D86B] font-medium",
    warning: "bg-amber-100 text-amber-900 border-amber-300 font-medium",
    destructive: "bg-rose-100 text-rose-800 border-rose-200 font-medium",
    outline: "bg-transparent text-secondary border-slate-300 font-medium",
    purple: "bg-purple-100 text-purple-800 border-purple-200 font-medium",
    cyan: "bg-cyan-100 text-cyan-800 border-cyan-200 font-medium",
    addon: "bg-addon text-secondary border-[#B8CD2E] font-semibold",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
