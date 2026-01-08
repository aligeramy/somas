"use client";

import {
  IconCheck,
  IconDotsVertical,
  IconEdit,
  IconX,
} from "@tabler/icons-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function EventActionsDropdown({
  eventId,
  occurrenceId,
  isCanceled,
  userRole,
  currentRsvpStatus,
}: {
  eventId: string;
  occurrenceId: string;
  isCanceled: boolean;
  userRole?: string;
  currentRsvpStatus?: "going" | "not_going" | null;
}) {
  const router = useRouter();
  const [canceling, setCanceling] = useState(false);
  const [rsvping, setRsvping] = useState(false);

  async function handleCancel() {
    if (canceling) {
      return;
    }
    setCanceling(true);
    try {
      const response = await fetch(`/api/events/${eventId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          occurrenceId,
          restore: isCanceled,
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to cancel");
      }
      router.refresh();
    } catch (err) {
      console.error(err);
      alert("Failed to cancel session");
    } finally {
      setCanceling(false);
    }
  }

  async function handleRsvp(status: "going" | "not_going") {
    if (rsvping || isCanceled) {
      return;
    }
    setRsvping(true);
    try {
      const response = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          occurrenceId,
          status,
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to RSVP");
      }
      router.refresh();
    } catch (err) {
      console.error(err);
      alert("Failed to RSVP");
    } finally {
      setRsvping(false);
    }
  }

  const isOwner = userRole === "owner";
  const showRsvpOptions = isOwner && !isCanceled;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
        <Button className="h-8 w-8 shrink-0" size="icon" variant="ghost">
          <IconDotsVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="rounded-xl">
        <DropdownMenuItem asChild className="gap-2">
          <Link
            href={`/events/${eventId}/edit`}
            onClick={(e) => e.stopPropagation()}
          >
            <IconEdit className="h-4 w-4" />
            Edit Event
          </Link>
        </DropdownMenuItem>
        {showRsvpOptions && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className={`gap-2 text-emerald-600 focus:text-emerald-600 dark:text-emerald-400 dark:focus:text-emerald-400 ${currentRsvpStatus === "going" ? "bg-muted" : ""}`}
              disabled={rsvping || currentRsvpStatus === "going"}
              onClick={(e) => {
                e.stopPropagation();
                handleRsvp("going");
              }}
            >
              <IconCheck className="h-4 w-4" />
              Going
            </DropdownMenuItem>
            <DropdownMenuItem
              className={`gap-2 text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400 ${currentRsvpStatus === "not_going" ? "bg-muted" : ""}`}
              disabled={rsvping || currentRsvpStatus === "not_going"}
              onClick={(e) => {
                e.stopPropagation();
                handleRsvp("not_going");
              }}
            >
              <IconX className="h-4 w-4" />
              Can't Go
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className={`gap-2 ${isCanceled ? "" : "bg-red-50 text-destructive focus:bg-red-100 focus:text-destructive dark:bg-red-950/20 dark:focus:bg-red-950/30"}`}
          disabled={canceling}
          onClick={(e) => {
            e.stopPropagation();
            handleCancel();
          }}
        >
          {isCanceled ? (
            <>
              <IconCheck className="h-4 w-4" />
              Restore Session
            </>
          ) : (
            <>
              <IconX className="h-4 w-4 text-red-600 dark:text-red-400" />
              Cancel Session
            </>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
