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
      className="px-3.5 py-1.5 bg-secondary hover:bg-secondary-hover text-addon rounded-lg text-xs font-bold shadow-2xs transition-colors cursor-pointer disabled:opacity-50 shrink-0 border border-secondary"
    >
      {isPending ? "Promoting..." : "Promote to Pending ↑"}
    </button>
  );
}
