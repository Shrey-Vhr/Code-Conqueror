"use client";

import React, { useTransition } from "react";
import { useRouter } from "next/navigation";
import { promoteWaitlistToPendingAction } from "./actions";

interface WaitlistPromoteButtonProps {
  bookingId: string;
  resourceName: string;
  userName: string;
}

export function WaitlistPromoteButton({
  bookingId,
  resourceName,
  userName,
}: WaitlistPromoteButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handlePromote = () => {
    if (
      !confirm(
        `Promote ${userName}'s waitlisted request for "${resourceName}" to the pending approval queue?`
      )
    ) {
      return;
    }

    startTransition(async () => {
      const res = await promoteWaitlistToPendingAction(bookingId);
      if (res.success) {
        router.refresh();
      } else {
        alert(res.error || "Failed to promote booking");
      }
    });
  };

  return (
    <button
      onClick={handlePromote}
      disabled={isPending}
      className="px-4 py-2 bg-purple-500 hover:bg-purple-400 text-white rounded-full text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50 shrink-0 hover:-translate-y-0.5"
    >
      {isPending ? "Promoting..." : "Promote to Pending ↑"}
    </button>
  );
}
