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

  // Get next event
  const nextEvent = occurrences[0];

  return (
    <div className="flex flex-1 flex-col min-h-0 h-full overflow-hidden">
      <PageHeader
        title={`Hey${userName ? `, ${userName.split(" ")[0]}` : ""}! 👋`}
        description="Here's your upcoming schedule"
      >
        <PWAInstallButton />
      </PageHeader>

      <div className="flex-1 overflow-auto min-h-0">
        <div className="p-4 lg:p-6 space-y-6 max-w-2xl mx-auto">
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
              {/* Featured Next Event */}
              {nextEvent && (
                <Card
                  className={`rounded-xl overflow-hidden transition-all hover:shadow-md ${
                    rsvpStates[nextEvent.id] === "going"
                      ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800"
                      : rsvpStates[nextEvent.id] === "not_going"
                        ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800"
                        : "bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20"
                  }`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      {/* Big Date */}
                      <div
                        className={`h-20 w-20 rounded-xl flex flex-col items-center justify-center shrink-0 ${
                          rsvpStates[nextEvent.id] === "going"
                            ? "bg-emerald-500 text-white"
                            : rsvpStates[nextEvent.id] === "not_going"
                              ? "bg-red-500 text-white"
                              : "bg-primary text-primary-foreground"
                        }`}
                      >
                        <span className="text-3xl font-bold leading-none">
                          {formatDate(nextEvent.date).day}
                        </span>
                        <span className="text-xs font-medium opacity-80 mt-1">
                          {formatDate(nextEvent.date).month}
                        </span>
                      </div>

                      {/* Event Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {formatDate(nextEvent.date).relative && (
                            <Badge
                              variant="secondary"
                              className="text-xs rounded-md"
                            >
                              {formatDate(nextEvent.date).relative}
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            Next up
                          </span>
                        </div>
                        <Link
                          href={`/events?eventId=${nextEvent.eventId}&occurrenceId=${nextEvent.id}`}
                          className="block"
                        >
                          <h2 className="text-xl font-semibold hover:underline">
                            {nextEvent.eventTitle}
                          </h2>
                          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                            <span className="whitespace-nowrap">
                              {formatDate(nextEvent.date).weekday}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <IconClock className="h-3.5 w-3.5" />
                              {formatTime(nextEvent.startTime)} -{" "}
                              {formatTime(nextEvent.endTime)}
                            </span>
                          </p>
                        </Link>

                        {/* Coaches and Athletes */}
                        <div className="flex items-center gap-2 mt-3 flex-wrap">
                          {nextEvent.goingCoaches.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {nextEvent.goingCoaches.map((coach) => {
                                const getInitials = (name: string | null, email: string) => {
                                  if (name) {
                                    return name
                                      .split(" ")
                                      .map((n) => n[0])
                                      .join("")
                                      .toUpperCase()
                                      .slice(0, 2);
                                  }
                                  return email[0].toUpperCase();
                                };
                                return (
                                  <Badge
                                    key={coach.id}
                                    variant="secondary"
                                    className="h-6 w-6 rounded-full p-0 flex items-center justify-center shrink-0 border-transparent bg-emerald-500 text-white"
                                  >
                                    <span className="text-[9px] font-medium">
                                      {getInitials(coach.name, coach.email)}
                                    </span>
                                  </Badge>
                                );
                              })}
                            </div>
                          )}
                          {nextEvent.goingAthletesCount > 0 && (
                            <span className="text-sm text-emerald-600 font-medium">
                              {nextEvent.goingAthletesCount} going
                            </span>
                          )}
                        </div>

                        {/* RSVP Buttons */}
                        <div
                          className="flex gap-2 mt-4 relative z-20"
                          onClick={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                        >
                          <Button
                            size="lg"
                            variant={
                              rsvpStates[nextEvent.id] === "going"
                                ? "default"
                                : "outline"
                            }
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleRsvp(nextEvent.id, "going");
                            }}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                            }}
                            disabled={loading === nextEvent.id}
                            className={`flex-1 h-10 sm:h-12 rounded-xl gap-1.5 sm:gap-2 text-sm sm:text-base ${
                              rsvpStates[nextEvent.id] === "going"
                                ? "bg-emerald-600 hover:bg-emerald-700"
                                : ""
                            }`}
                            type="button"
                          >
                            <IconCheck className="h-4 w-4 sm:h-5 sm:w-5" />
                            {rsvpStates[nextEvent.id] === "going"
                              ? "Going!"
                              : "I'm In"}
                          </Button>
                          <Button
                            size="lg"
                            variant={
                              rsvpStates[nextEvent.id] === "not_going"
                                ? "secondary"
                                : "outline"
                            }
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleRsvp(nextEvent.id, "not_going");
                            }}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                            }}
                            disabled={loading === nextEvent.id}
                            className={`flex-1 h-10 sm:h-12 rounded-xl gap-1.5 sm:gap-2 text-sm sm:text-base ${
                              rsvpStates[nextEvent.id] === "not_going"
                                ? "bg-red-400 hover:bg-red-500 text-white"
                                : ""
                            }`}
                            type="button"
                          >
                            <IconX className="h-4 w-4 sm:h-5 sm:w-5" />
                            <span className="hidden sm:inline">
                              Can't Make It
                            </span>
                            <span className="sm:hidden">Can't Go</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Rest of Events */}
              {occurrences.length > 1 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground px-1">
                    Coming Up
                  </h3>
                  {occurrences.slice(1).map((occ) => {
                    const dateInfo = formatDate(occ.date);
                    const rsvpStatus = rsvpStates[occ.id];
                    const isLoading = loading === occ.id;

                    return (
                      <Card
                        key={occ.id}
                        className={`rounded-xl transition-all hover:shadow-md ${
                          rsvpStatus === "not_going"
                            ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800"
                            : ""
                        }`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            {/* Date */}
                            <div
                              className={`h-14 w-14 rounded-xl flex flex-col items-center justify-center shrink-0 ${
                                rsvpStatus === "going"
                                  ? "bg-emerald-100 dark:bg-emerald-950/50"
                                  : rsvpStatus === "not_going"
                                    ? "bg-red-100 dark:bg-red-950/50"
                                    : "bg-primary/10"
                              }`}
                            >
                              <span
                                className={`text-lg font-bold leading-none ${
                                  rsvpStatus === "going"
                                    ? "text-emerald-600"
                                    : rsvpStatus === "not_going"
                                      ? "text-red-600"
                                      : ""
                                }`}
                              >
                                {dateInfo.day}
                              </span>
                              <span className="text-[10px] font-medium text-muted-foreground">
                                {dateInfo.month}
                              </span>
                            </div>

                            {/* Details */}
                            <div className="flex-1 min-w-0">
                              <Link
                                href={`/events?eventId=${occ.eventId}&occurrenceId=${occ.id}`}
                                className="block"
                              >
                                <p className="font-medium hover:underline">
                                  {occ.eventTitle}
                                </p>
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <IconClock className="h-3 w-3" />
                                  {formatTime(occ.startTime)}
                                </p>
                              </Link>
                              {/* Coaches and Athletes */}
                              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                {occ.goingCoaches.length > 0 && (
                                  <div className="flex items-center gap-1 flex-wrap">
                                    {occ.goingCoaches.map((coach) => (
                                      <Badge
                                        key={coach.id}
                                        variant="secondary"
                                        className="text-[10px] rounded-md"
                                      >
                                        {coach.name || coach.email}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                                {occ.goingAthletesCount > 0 && (
                                  <span className="text-xs text-emerald-600 font-medium">
                                    {occ.goingAthletesCount} going
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* RSVP Buttons */}
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant={
                                  rsvpStatus === "going" ? "default" : "outline"
                                }
                                onClick={() => {
                                  handleRsvp(occ.id, "going");
                                }}
                                disabled={isLoading}
                                className={`h-9 w-9 p-0 rounded-lg ${
                                  rsvpStatus === "going"
                                    ? "bg-emerald-600 hover:bg-emerald-700"
                                    : ""
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
                                className={`h-9 w-9 p-0 rounded-lg ${
                                  rsvpStatus === "not_going"
                                    ? "bg-red-400 hover:bg-red-500 text-white"
                                    : ""
                                }`}
                              >
                                <IconX className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
