"use client";

import { IconCalendar, IconCheck, IconClock, IconX } from "@tabler/icons-react";
import Link from "next/link";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { PWAInstallButton } from "@/components/pwa-install-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Occurrence {
  id: string;
  date: string;
  status: string;
  eventId: string;
  eventTitle: string;
  startTime: string;
  endTime: string;
  rsvpStatus: string | null;
  goingCoaches: Array<{ id: string; name: string | null; email: string }>;
  goingAthletesCount: number;
}

interface ActiveNotice {
  id: string;
  title: string;
  content: string;
  createdAt: Date | string;
  author: { id: string; name: string | null };
}

interface AthleteDashboardProps {
  userName: string | null;
  occurrences: Occurrence[];
  activeNotice: ActiveNotice | null;
  isOnboarded: boolean;
  gymLogo: string | null;
  gymName: string | null;
}

export function AthleteDashboard({
  userName,
  occurrences,
  activeNotice,
  isOnboarded,
  gymLogo,
  gymName,
}: AthleteDashboardProps) {
  const [rsvpStates, setRsvpStates] = useState<Record<string, string | null>>(
    Object.fromEntries(occurrences.map((o) => [o.id, o.rsvpStatus]))
  );
  const [loading, setLoading] = useState<string | null>(null);

  async function handleRsvp(
    occurrenceId: string,
    status: "going" | "not_going"
  ) {
    setLoading(occurrenceId);
    try {
      const response = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ occurrenceId, status }),
      });
      if (response.ok) {
        setRsvpStates((prev) => ({ ...prev, [occurrenceId]: status }));
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error("RSVP failed:", response.status, errorData);
      }
    } catch (err) {
      console.error("RSVP error:", err);
    } finally {
      setLoading(null);
    }
  }

  function formatDate(dateValue: string) {
    const date = new Date(dateValue);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let relative = "";
    if (date.toDateString() === today.toDateString()) relative = "Today";
    else if (date.toDateString() === tomorrow.toDateString())
      relative = "Tomorrow";

    return {
      day: date.getDate().toString(),
      month: date.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
      weekday: date.toLocaleDateString("en-US", { weekday: "long" }),
      relative,
    };
  }

  function formatTime(time: string) {
    const [hours, minutes] = time.split(":");
    const hour = Number.parseInt(hours, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <PageHeader
        description="Here's your upcoming schedule"
        title={`Hey${userName ? `, ${userName.split(" ")[0]}` : ""}! 👋`}
      >
        <PWAInstallButton />
      </PageHeader>

      <div
        className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <div className="mx-auto max-w-2xl space-y-6 p-4 pb-8 lg:p-6">
          {/* Gym Logo - Mobile Only */}
          {gymLogo && (
            <div className="flex justify-center py-4 lg:hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt={gymName || "Club"}
                className="w-[150px]"
                src={gymLogo}
              />
            </div>
          )}

          {/* Active Notice */}
          {activeNotice && (
            <Card className="rounded-xl border border-primary/20 bg-primary/5">
              <CardContent className="px-4 py-2">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-sm leading-tight">
                      {activeNotice.title}
                    </h3>
                    <Badge className="rounded-lg text-xs" variant="default">
                      Notice
                    </Badge>
                  </div>
                  <p className="line-clamp-2 text-muted-foreground text-sm">
                    {activeNotice.content}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {occurrences.length === 0 ? (
            <Card className="rounded-xl border-dashed">
              <CardContent className="py-16 text-center">
                <IconCalendar className="mx-auto mb-4 h-12 w-12 text-muted-foreground/30" />
                <p className="text-muted-foreground">No upcoming events</p>
                <p className="mt-1 text-muted-foreground text-sm">
                  Check back later for new sessions!
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* All Events */}
              {occurrences.length > 0 && (
                <div>
                  <h3 className="mb-3 px-1 font-medium text-muted-foreground text-sm md:mb-2">
                    Coming Up
                  </h3>
                  <div className="overflow-hidden rounded-lg border border-border bg-card md:rounded-none md:border-0 md:bg-transparent md:shadow-none">
                    {occurrences.map((occ, index) => {
                      const dateInfo = formatDate(occ.date);
                      const rsvpStatus = rsvpStates[occ.id];
                      const isLoading = loading === occ.id;

                      return (
                        <div className="md:mb-3" key={occ.id}>
                          <div
                            className={`transition-all md:rounded-xl md:border md:bg-card md:shadow-sm md:hover:shadow-md ${
                              rsvpStatus === "not_going"
                                ? "md:bg-red-50 md:dark:bg-red-950/30"
                                : ""
                            }`}
                          >
                            <div className="px-4 py-3 active:bg-muted/50 md:p-4 md:active:bg-transparent">
                              <div className="flex items-center gap-3 md:gap-4">
                                {/* Date - Compact on mobile, bigger on desktop */}
                                <div
                                  className={`flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg md:h-16 md:w-16 md:rounded-xl ${
                                    rsvpStatus === "going"
                                      ? "bg-emerald-100 dark:bg-emerald-950/50"
                                      : rsvpStatus === "not_going"
                                        ? "bg-red-100 dark:bg-red-950/50"
                                        : "bg-black dark:bg-white"
                                  }`}
                                >
                                  <span
                                    className={`font-bold text-base leading-none md:text-xl ${
                                      rsvpStatus === "going"
                                        ? "text-emerald-600 dark:text-emerald-400"
                                        : rsvpStatus === "not_going"
                                          ? "text-red-600 dark:text-red-400"
                                          : "text-white dark:text-black"
                                    }`}
                                  >
                                    {dateInfo.day}
                                  </span>
                                  <span
                                    className={`mt-0.5 font-medium text-[9px] md:text-xs ${
                                      rsvpStatus === "going" ||
                                      rsvpStatus === "not_going"
                                        ? "text-muted-foreground"
                                        : "text-white dark:text-black"
                                    }`}
                                  >
                                    {dateInfo.month}
                                  </span>
                                </div>

                                {/* Details - List item style on mobile */}
                                <div className="min-w-0 flex-1">
                                  <Link
                                    className="block"
                                    href={`/events?eventId=${occ.eventId}&occurrenceId=${occ.id}`}
                                  >
                                    <p className="line-clamp-1 font-semibold text-base hover:underline md:text-base">
                                      {occ.eventTitle}
                                    </p>
                                    <div className="mt-1 flex flex-wrap items-center gap-2">
                                      <p className="flex items-center gap-1 text-muted-foreground text-xs">
                                        <IconClock className="h-3 w-3" />
                                        {formatTime(occ.startTime)}
                                      </p>
                                      {/* Coaches and Athletes - Inline */}
                                      {occ.goingCoaches.length > 0 && (
                                        <>
                                          <span className="text-muted-foreground">
                                            •
                                          </span>
                                          <div className="flex flex-wrap items-center gap-1">
                                            {occ.goingCoaches
                                              .slice(0, 2)
                                              .map((coach) => (
                                                <Badge
                                                  className="h-4 rounded-md bg-muted px-1.5 py-0 text-[9px] md:h-5 md:text-[10px]"
                                                  key={coach.id}
                                                  variant="secondary"
                                                >
                                                  {coach.name?.split(" ")[0] ||
                                                    coach.email.split("@")[0]}
                                                </Badge>
                                              ))}
                                            {occ.goingCoaches.length > 2 && (
                                              <span className="text-[9px] text-muted-foreground md:text-[10px]">
                                                +{occ.goingCoaches.length - 2}
                                              </span>
                                            )}
                                          </div>
                                        </>
                                      )}
                                      {occ.goingAthletesCount > 0 && (
                                        <>
                                          <span className="text-muted-foreground">
                                            •
                                          </span>
                                          <span className="font-medium text-[10px] text-emerald-600 md:text-xs dark:text-emerald-400">
                                            {occ.goingAthletesCount} going
                                          </span>
                                        </>
                                      )}
                                    </div>
                                  </Link>
                                </div>

                                {/* RSVP Buttons - Compact on mobile */}
                                <div className="flex shrink-0 gap-1.5">
                                  <Button
                                    className={`h-9 w-9 rounded-lg p-0 md:h-9 md:w-9 ${
                                      rsvpStatus === "going"
                                        ? "border-0 bg-emerald-600 hover:bg-emerald-700"
                                        : "border-border"
                                    }`}
                                    disabled={isLoading}
                                    onClick={() => {
                                      handleRsvp(occ.id, "going");
                                    }}
                                    size="sm"
                                    variant={
                                      rsvpStatus === "going"
                                        ? "default"
                                        : "outline"
                                    }
                                  >
                                    <IconCheck className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    className={`h-9 w-9 rounded-lg p-0 md:h-9 md:w-9 ${
                                      rsvpStatus === "not_going"
                                        ? "border-0 bg-red-500 text-white hover:bg-red-600"
                                        : "border-border"
                                    }`}
                                    disabled={isLoading}
                                    onClick={() => {
                                      handleRsvp(occ.id, "not_going");
                                    }}
                                    size="sm"
                                    variant={
                                      rsvpStatus === "not_going"
                                        ? "secondary"
                                        : "outline"
                                    }
                                  >
                                    <IconX className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                          {/* Divider between items on mobile */}
                          {index < occurrences.length - 1 && (
                            <div className="mx-4 h-px bg-border md:hidden" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
