"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IconDotsVertical, IconEdit, IconX, IconCheck } from "@tabler/icons-react";

export function EventActionsDropdown({
  eventId,
  occurrenceId,
  isCanceled,
}: {
  eventId: string;
  occurrenceId: string;
  isCanceled: boolean;
}) {
  const router = useRouter();
  const [canceling, setCanceling] = useState(false);

  async function handleCancel() {
    if (canceling) return;
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
      if (!response.ok) throw new Error("Failed to cancel");
      router.refresh();
    } catch (err) {
      console.error(err);
      alert("Failed to cancel session");
    } finally {
      setCanceling(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
        >
          <IconDotsVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="rounded-xl">
        <DropdownMenuItem asChild className="gap-2">
          <Link href={`/events/${eventId}/edit`} onClick={(e) => e.stopPropagation()}>
            <IconEdit className="h-4 w-4" />
            Edit Event
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className={`gap-2 ${isCanceled ? "" : "text-destructive focus:text-destructive"}`}
          onClick={(e) => {
            e.stopPropagation();
            handleCancel();
          }}
          disabled={canceling}
        >
          {isCanceled ? (
            <>
              <IconCheck className="h-4 w-4" />
              Restore Session
            </>
          ) : (
            <>
              <IconX className="h-4 w-4" />
              Cancel Session
            </>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}


