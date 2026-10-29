import React from "react";
import { Badge } from "./Badge";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const norm = status.toUpperCase();

  switch (norm) {
    case "APPROVED":
    case "RESOLVED":
    case "ACTIVE":
    case "VERIFIED":
      return (
        <Badge variant="success" className={className}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
          {status}
        </Badge>
      );
    case "PENDING":
    case "UNDER_REVIEW":
    case "MAINTENANCE":
      return (
        <Badge variant="warning" className={className}>
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5"></span>
          {status}
        </Badge>
      );
    case "CHECKED_IN":
      return (
        <Badge variant="cyan" className={className}>
          <span className="w-1.5 h-1.5 rounded-full bg-sky-500 mr-1.5"></span>
          CHECKED IN
        </Badge>
      );
    case "WAITLISTED":
      return (
        <Badge variant="purple" className={className}>
          <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mr-1.5"></span>
          WAITLISTED
        </Badge>
      );
    case "OVERDUE":
      return (
        <Badge variant="destructive" className={`font-semibold ${className}`}>
          OVERDUE
        </Badge>
      );
    case "REJECTED":
    case "EXPIRED":
    case "CRITICAL":
    case "HIGH":
      return (
        <Badge variant="destructive" className={className}>
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1.5"></span>
          {status}
        </Badge>
      );
    case "RETURNED":
    case "COMPLETED":
      return (
        <Badge variant="secondary" className={className}>
          {status}
        </Badge>
      );
    case "CANCELLED":
    case "RETIRED":
    default:
      return (
        <Badge variant="secondary" className={className}>
          {status}
        </Badge>
      );
  }
}
