"use client";

import {
  IconArrowRight,
  IconCheck,
  IconEdit,
  IconX,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Separator } from "@/components/ui/separator";

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
  const isCoachOrOwner = userRole === "owner" || userRole === "coach";
  const showRsvpOptions = isOwner && !isCanceled;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        {/* Compact Header with Event Name on Left, Go to Event on Right */}
        <div className="px-4 pt-4 pb-3 border-b">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <DrawerTitle className="text-base font-semibold truncate">
                {eventTitle}
              </DrawerTitle>
              {isCanceled && (
                <p className="text-xs text-destructive mt-0.5">Canceled</p>
              )}
            </div>
            <Button
              size="sm"
              className="shrink-0 gap-2 px-4 py-2.5"
              onClick={() => {
                onOpenChange(false);
                router.push(
                  `/events?eventId=${eventId}&occurrenceId=${occurrenceId}`,
                );
              }}
            >
              <IconArrowRight className="h-4 w-4" />
              Go to Event
            </Button>
          </div>
        </div>

        <div
          className="px-4 py-3 space-y-2.5 overflow-y-auto"
          style={{
            paddingBottom: `calc(0.75rem + env(safe-area-inset-bottom, 0))`,
          }}
        >
          {/* RSVP Actions (for owners) */}
          {showRsvpOptions && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className={`flex-1 justify-center gap-2 px-4 py-2.5 h-10 ${
                  currentRsvpStatus === "going"
                    ? "bg-emerald-500 text-white border-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:text-white dark:border-emerald-600 dark:hover:bg-emerald-700"
                    : "bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800 dark:hover:bg-emerald-950/70"
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
                size="sm"
                className={`flex-1 justify-center gap-2 px-4 py-2.5 h-10 ${
                  currentRsvpStatus === "not_going"
                    ? "bg-red-500 text-white border-red-500 hover:bg-red-600 dark:bg-red-600 dark:text-white dark:border-red-600 dark:hover:bg-red-700"
                    : "bg-red-50 text-red-600 border-red-200 hover:bg-red-100 dark:bg-red-950/50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-950/70"
                }`}
                onClick={() => {
                  handleRsvp("not_going");
                }}
                disabled={rsvping || currentRsvpStatus === "not_going"}
              >
                <IconX className="h-4 w-4" />
                Can't Go
              </Button>
            </div>
          )}

          {/* Management Actions (for coaches/owners) */}
          {isCoachOrOwner && (
            <>
              {showRsvpOptions && <Separator className="my-2.5" />}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 justify-center gap-2 px-4 py-2.5 h-10"
                  onClick={() => {
                    onOpenChange(false);
                    router.push(`/events/${eventId}/edit`);
                  }}
                >
                  <IconEdit className="h-4 w-4" />
                  Edit Event
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className={`flex-1 justify-center gap-2 px-4 py-2.5 h-10 ${
                    isCanceled
                      ? ""
                      : "text-destructive focus:text-destructive border-destructive/20 bg-red-50 dark:bg-red-950/20 focus:bg-red-100 dark:focus:bg-red-950/30"
                  }`}
                  onClick={() => {
                    handleCancel();
                  }}
                  disabled={canceling}
                >
                  {isCanceled ? (
                    <>
                      <IconCheck className="h-4 w-4" />
                      Restore
                    </>
                  ) : (
                    <>
                      <IconX className="h-4 w-4" />
                      Cancel Session
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
