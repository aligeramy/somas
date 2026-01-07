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
    Object.fromEntries(occurrences.map((o) => [o.id, o.rsvpStatus])),
  );
  const [loading, setLoading] = useState<string | null>(null);

  async function handleRsvp(
    occurrenceId: string,
    status: "going" | "not_going",
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
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  }

  return (
    <div className="flex flex-1 flex-col min-h-0 h-full overflow-hidden">
      <PageHeader
        title={`Hey${userName ? `, ${userName.split(" ")[0]}` : ""}! 👋`}
        description="Here's your upcoming schedule"
      >
        <PWAInstallButton />
      </PageHeader>

      <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="p-4 lg:p-6 pb-8 space-y-6 max-w-2xl mx-auto">
          {/* Gym Logo - Mobile Only */}
          {gymLogo && (
            <div className="lg:hidden flex justify-center py-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={gymLogo}
                alt={gymName || "Club"}
                className="w-[150px]"
              />
            </div>
          )}

          {/* Active Notice */}
          {activeNotice && (
            <Card className="rounded-xl border border-primary/20 bg-primary/5">
              <CardContent className="px-4 py-2">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-sm leading-tight">
                      {activeNotice.title}
                    </h3>
                    <Badge variant="default" className="rounded-lg text-xs">
                      Notice
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {activeNotice.content}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {occurrences.length === 0 ? (
            <Card className="rounded-xl border-dashed">
              <CardContent className="py-16 text-center">
                <IconCalendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                <p className="text-muted-foreground">No upcoming events</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Check back later for new sessions!
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* All Events */}
              {occurrences.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground px-1 mb-3 md:mb-2">
                    Coming Up
                  </h3>
                  <div className="bg-card md:bg-transparent rounded-lg md:rounded-none border border-border md:border-0 md:shadow-none overflow-hidden">
                  {occurrences.map((occ, index) => {
                    const dateInfo = formatDate(occ.date);
                    const rsvpStatus = rsvpStates[occ.id];
                    const isLoading = loading === occ.id;

                    return (
                      <div key={occ.id} className="md:mb-3">
                        <div
                          className={`md:rounded-xl transition-all md:border md:shadow-sm md:bg-card md:hover:shadow-md ${
                            rsvpStatus === "not_going"
                              ? "md:bg-red-50 md:dark:bg-red-950/30 md:border-red-200 md:dark:border-red-800"
                              : ""
                          }`}
                        >
                          <div className="px-4 py-3 md:p-4 active:bg-muted/50 md:active:bg-transparent">
                            <div className="flex items-center gap-3 md:gap-4">
                              {/* Date - Compact on mobile, bigger on desktop */}
                              <div
                                className={`h-12 w-12 md:h-16 md:w-16 rounded-lg md:rounded-xl flex flex-col items-center justify-center shrink-0 ${
                                  rsvpStatus === "going"
                                    ? "bg-emerald-100 dark:bg-emerald-950/50"
                                    : rsvpStatus === "not_going"
                                      ? "bg-red-100 dark:bg-red-950/50"
                                      : "bg-black dark:bg-white"
                                }`}
                              >
                                <span
                                  className={`text-base md:text-xl font-bold leading-none ${
                                    rsvpStatus === "going"
                                      ? "text-emerald-600 dark:text-emerald-400"
                                      : rsvpStatus === "not_going"
                                        ? "text-red-600 dark:text-red-400"
                                        : "text-white dark:text-black"
                                  }`}
                                >
                                  {dateInfo.day}
                                </span>
                                <span className={`text-[9px] md:text-xs font-medium mt-0.5 ${
                                  rsvpStatus === "going" || rsvpStatus === "not_going"
                                    ? "text-muted-foreground"
                                    : "text-white dark:text-black"
                                }`}>
                                  {dateInfo.month}
                                </span>
                              </div>

                              {/* Details - List item style on mobile */}
                              <div className="flex-1 min-w-0">
                                <Link
                                  href={`/events?eventId=${occ.eventId}&occurrenceId=${occ.id}`}
                                  className="block"
                                >
                                  <p className="font-semibold text-base md:text-base hover:underline line-clamp-1">
                                    {occ.eventTitle}
                                  </p>
                                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                      <IconClock className="h-3 w-3" />
                                      {formatTime(occ.startTime)}
                                    </p>
                                    {/* Coaches and Athletes - Inline */}
                                    {occ.goingCoaches.length > 0 && (
                                      <>
                                        <span className="text-muted-foreground">•</span>
                                        <div className="flex items-center gap-1 flex-wrap">
                                          {occ.goingCoaches.slice(0, 2).map((coach) => (
                                            <Badge
                                              key={coach.id}
                                              variant="secondary"
                                              className="text-[9px] md:text-[10px] rounded-md px-1.5 py-0 h-4 md:h-5 bg-muted"
                                            >
                                              {coach.name?.split(" ")[0] || coach.email.split("@")[0]}
                                            </Badge>
                                          ))}
                                          {occ.goingCoaches.length > 2 && (
                                            <span className="text-[9px] md:text-[10px] text-muted-foreground">
                                              +{occ.goingCoaches.length - 2}
                                            </span>
                                          )}
                                        </div>
                                      </>
                                    )}
                                    {occ.goingAthletesCount > 0 && (
                                      <>
                                        <span className="text-muted-foreground">•</span>
                                        <span className="text-[10px] md:text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                                          {occ.goingAthletesCount} going
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </Link>
                              </div>

                              {/* RSVP Buttons - Compact on mobile */}
                              <div className="flex gap-1.5 shrink-0">
                                <Button
                                  size="sm"
                                  variant={
                                    rsvpStatus === "going" ? "default" : "outline"
                                  }
                                  onClick={() => {
                                    handleRsvp(occ.id, "going");
                                  }}
                                  disabled={isLoading}
                                  className={`h-9 w-9 md:h-9 md:w-9 p-0 rounded-lg ${
                                    rsvpStatus === "going"
                                      ? "bg-emerald-600 hover:bg-emerald-700 border-0"
                                      : "border-border"
                                  }`}
                                >
                                  <IconCheck className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant={
                                    rsvpStatus === "not_going"
                                      ? "secondary"
                                      : "outline"
                                  }
                                  onClick={() => {
                                    handleRsvp(occ.id, "not_going");
                                  }}
                                  disabled={isLoading}
                                  className={`h-9 w-9 md:h-9 md:w-9 p-0 rounded-lg ${
                                    rsvpStatus === "not_going"
                                      ? "bg-red-500 hover:bg-red-600 text-white border-0"
                                      : "border-border"
                                  }`}
                                >
                                  <IconX className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                        {/* Divider between items on mobile */}
                        {index < occurrences.length - 1 && (
                          <div className="h-px bg-border mx-4 md:hidden" />
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
