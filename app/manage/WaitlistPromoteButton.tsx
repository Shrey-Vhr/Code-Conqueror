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
      className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-full text-xs font-bold shadow-md shadow-purple-500/20 transition-all cursor-pointer disabled:opacity-50 shrink-0 hover:-translate-y-0.5"
    >
      {isPending ? "Promoting..." : "Promote to Pending ↑"}
    </button>
  );
}
