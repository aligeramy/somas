"use client";

import { IconCheck, IconEdit, IconX } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

export function MobileEventActions({
  eventId,
  occurrenceId,
  isCanceled,
  userRole,
  currentRsvpStatus,
  eventTitle,
  open,
  onOpenChange,
}: {
  eventId: string;
  occurrenceId: string;
  isCanceled: boolean;
  userRole?: string;
  currentRsvpStatus?: "going" | "not_going" | null;
  eventTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [canceling, setCanceling] = useState(false);
  const [rsvping, setRsvping] = useState(false);

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
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      alert("Failed to cancel session");
    } finally {
      setCanceling(false);
    }
  }

  async function handleRsvp(status: "going" | "not_going") {
    if (rsvping || isCanceled) return;
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
      if (!response.ok) throw new Error("Failed to RSVP");
      router.refresh();
      onOpenChange(false);
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
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{eventTitle}</DrawerTitle>
          <DrawerDescription>Event actions</DrawerDescription>
        </DrawerHeader>
        <div className="px-4 pb-4 space-y-2">
          <Button
            className="w-full justify-start gap-2"
            onClick={() => {
              onOpenChange(false);
              router.push(
                `/events?eventId=${eventId}&occurrenceId=${occurrenceId}`,
              );
            }}
          >
            <IconCheck className="h-4 w-4" />
            Go to Event
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={() => {
              onOpenChange(false);
              router.push(`/events/${eventId}/edit`);
            }}
          >
            <IconEdit className="h-4 w-4" />
            Edit Event
          </Button>
          {showRsvpOptions && (
            <>
              <Button
                variant="outline"
                className={`w-full justify-start gap-2 ${
                  currentRsvpStatus === "going"
                    ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400"
                    : ""
                }`}
                onClick={() => {
                  handleRsvp("going");
                }}
                disabled={rsvping || currentRsvpStatus === "going"}
              >
                <IconCheck className="h-4 w-4" />
                Going
              </Button>
              <Button
                variant="outline"
                className={`w-full justify-start gap-2 ${
                  currentRsvpStatus === "not_going"
                    ? "bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400"
                    : ""
                }`}
                onClick={() => {
                  handleRsvp("not_going");
                }}
                disabled={rsvping || currentRsvpStatus === "not_going"}
              >
                <IconX className="h-4 w-4" />
                Can't Go
              </Button>
            </>
          )}
          <Button
            variant="outline"
            className={`w-full justify-start gap-2 ${
              isCanceled
                ? ""
                : "text-destructive focus:text-destructive bg-red-50 dark:bg-red-950/20 focus:bg-red-100 dark:focus:bg-red-950/30"
            }`}
            onClick={() => {
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
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
