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
    "inline-flex items-center justify-center font-medium transition-colors rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer";

  const sizeStyles = {
    sm: "px-2.5 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-5 py-2.5 text-base",
  };

  const variantStyles = {
    default:
      "bg-secondary text-white hover:bg-secondary-hover focus:ring-addon shadow-sm font-semibold",
    secondary:
      "bg-primary text-secondary hover:bg-primary-hover focus:ring-secondary border border-slate-300 font-semibold",
    destructive:
      "bg-rose-700 text-white hover:bg-rose-800 focus:ring-rose-500 shadow-sm font-semibold",
    outline:
      "bg-white text-secondary border border-slate-300 hover:bg-primary-light focus:ring-secondary shadow-2xs font-semibold",
    ghost:
      "bg-transparent text-secondary hover:bg-primary focus:ring-secondary font-medium",
    success:
      "bg-[#1C360E] text-[#D5E84A] hover:bg-secondary focus:ring-addon shadow-sm font-bold",
    addon:
      "bg-addon text-secondary hover:bg-addon-hover focus:ring-secondary font-bold shadow-sm",
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
