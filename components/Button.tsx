import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "default"
    | "secondary"
    | "destructive"
    | "outline"
    | "ghost"
    | "success"
    | "addon";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export function Button({
  variant = "default",
  size = "md",
  isLoading = false,
  className = "",
  disabled,
  children,
  ...props
}: ButtonProps) {
  const baseStyles =
    "inline-flex items-center justify-center font-medium transition-all duration-200 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 disabled:opacity-50 disabled:pointer-events-none cursor-pointer active:scale-[0.98]";

  const sizeStyles = {
    sm: "px-3.5 py-1.5 text-xs",
    md: "px-5 py-2.5 text-sm",
    lg: "px-6 py-3 text-base",
  };

  const variantStyles = {
    default:
      "bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm hover:shadow-md focus-visible:ring-indigo-400",
    secondary:
      "bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/70 focus-visible:ring-indigo-300",
    destructive:
      "bg-rose-500 hover:bg-rose-400 text-white shadow-sm hover:shadow-md focus-visible:ring-rose-300",
    outline:
      "bg-white/70 text-slate-600 border border-slate-200 hover:bg-white hover:border-slate-300 focus-visible:ring-indigo-300",
    ghost:
      "bg-transparent text-slate-600 hover:bg-slate-100/80 hover:text-slate-800 focus-visible:ring-indigo-300",
    success:
      "bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm hover:shadow-md focus-visible:ring-emerald-300",
    addon:
      "bg-purple-500 hover:bg-purple-400 text-white shadow-sm hover:shadow-md focus-visible:ring-purple-300",
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center gap-2">
          <svg
            className="animate-spin h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            ></path>
          </svg>
          Loading...
        </span>
      ) : (
        children
      )}
    </button>
  );
}
