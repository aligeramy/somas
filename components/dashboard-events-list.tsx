"use client";

import { IconCalendar, IconChevronRight } from "@tabler/icons-react";
import Link from "next/link";
import { useState } from "react";
import { EventActionsDropdown } from "@/components/event-actions-dropdown";
import { MobileEventActions } from "@/components/mobile-event-actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useIsMobile } from "@/hooks/use-mobile";

interface DashboardEventsListProps {
  upcomingOccurrences: Array<{ occurrence: any; event: any }>;
  rsvpsByOccurrence: Map<
    string,
    {
      going: Array<{
        id: string;
        name: string | null;
        email: string;
        avatarUrl: string | null;
        role: string;
      }>;
      notGoing: Array<{
        id: string;
        name: string | null;
        email: string;
        avatarUrl: string | null;
        role: string;
      }>;
      goingCoaches: Array<{
        id: string;
        name: string | null;
        email: string;
        avatarUrl: string | null;
      }>;
      goingAthletes: Array<{
        id: string;
        name: string | null;
        email: string;
        avatarUrl: string | null;
      }>;
    }
  >;
  userRole: string;
  currentUserRsvpMap: Map<string, "going" | "not_going">;
}

export function DashboardEventsList({
  upcomingOccurrences,
  rsvpsByOccurrence,
  userRole,
  currentUserRsvpMap,
}: DashboardEventsListProps) {
  const isMobile = useIsMobile();

  function getInitials(name: string | null, email: string) {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return email[0].toUpperCase();
  }

  function formatDate(dateValue: Date | string | null) {
    if (!dateValue) return { day: "", month: "", weekday: "" };
    const date =
      typeof dateValue === "string" ? new Date(dateValue) : dateValue;
    if (Number.isNaN(date.getTime()))
      return { day: "", month: "", weekday: "" };
    return {
      day: date.getDate().toString(),
      month: date.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
      weekday: date.toLocaleDateString("en-US", { weekday: "long" }),
    };
  }

  function formatTime(time: string | null) {
    if (!time) return "";
    const [hours, minutes] = time.split(":");
    const hour = Number.parseInt(hours, 10);
    if (Number.isNaN(hour)) return time;
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  }
  const [selectedEvent, setSelectedEvent] = useState<{
    eventId: string;
    occurrenceId: string;
    eventTitle: string;
    isCanceled: boolean;
  } | null>(null);

  const isCoachOrOwner = userRole === "owner" || userRole === "coach";

  return (
    <>
      <Card
        className={`rounded-xl ${isMobile ? "border-0 bg-transparent shadow-none" : ""}`}
      >
        <CardHeader
          className={`${isMobile ? "-mt-1 px-0 pt-0 pb-1" : "px-4 pb-2"}`}
        >
          <div className="flex items-center justify-between">
            <CardTitle
              className={`font-semibold ${isMobile ? "text-lg" : "text-base"}`}
            >
              Upcoming Events
            </CardTitle>
            <Button
              asChild
              className={`text-muted-foreground ${isMobile ? "rounded-lg text-sm" : "rounded-xl"}`}
              size="sm"
              variant="ghost"
            >
              <Link href="/events">
                {isMobile ? "All" : "View all"}
                <IconChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className={`pt-0 ${isMobile ? "px-0" : "px-4"}`}>
          {upcomingOccurrences.length === 0 ? (
            <div className={`text-center ${isMobile ? "py-12" : "py-8"}`}>
              <IconCalendar
                className={`mx-auto mb-3 text-muted-foreground/30 ${isMobile ? "h-12 w-12" : "h-10 w-10"}`}
              />
              <p
                className={`mb-4 text-muted-foreground ${isMobile ? "text-base" : "text-sm"}`}
              >
                No upcoming events
              </p>
              <Button
                asChild
                className={isMobile ? "rounded-lg" : "rounded-xl"}
                size="sm"
                variant="outline"
              >
                <Link href="/events/new">Create an event</Link>
              </Button>
            </div>
          ) : (
            <div className={isMobile ? "space-y-3" : "space-y-2"}>
              {upcomingOccurrences.map(({ occurrence, event }) => {
                const dateInfo = formatDate(occurrence.date);
                const isCanceled = occurrence.status === "canceled";
                const rsvpData = rsvpsByOccurrence.get(occurrence.id) || {
                  going: [],
                  notGoing: [],
                  goingCoaches: [],
                  goingAthletes: [],
                };
                const goingCoaches = rsvpData.goingCoaches || [];
                const goingAthletes = rsvpData.goingAthletes || [];

                const handleEventClick = (e: React.MouseEvent) => {
                  if (isMobile && isCoachOrOwner) {
                    e.preventDefault();
                    setSelectedEvent({
                      eventId: event.id,
                      occurrenceId: occurrence.id,
                      eventTitle: event.title,
                      isCanceled,
                    });
                  }
                };

                return (
                  <div
                    className={`group relative ${
                      isMobile
                        ? `overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-transform active:scale-[0.98] ${
                            isCanceled ? "opacity-60" : ""
                          }`
                        : `flex items-start gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-muted/50 ${
                            isCanceled ? "opacity-50" : ""
                          }`
                    }`}
                    key={occurrence.id}
                  >
                    <Link
                      className={
                        isMobile
                          ? "block"
                          : "flex min-w-0 flex-1 items-start gap-3"
                      }
                      href={`/events?eventId=${event.id}&occurrenceId=${occurrence.id}`}
                      onClick={handleEventClick}
                    >
                      {isMobile ? (
                        <div className="p-4">
                          <div className="flex items-start gap-4">
                            {/* Date Badge - Mobile */}
                            <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-[#000000] dark:bg-[#ffffff]">
                              <span className="font-bold text-[#ffffff] text-xl leading-none dark:text-[#000000]">
                                {dateInfo.day}
                              </span>
                              <span className="mt-1 font-semibold text-[#ffffff] text-[10px] uppercase tracking-wide dark:text-[#000000]">
                                {dateInfo.month}
                              </span>
                            </div>

                            {/* Content - Mobile */}
                            <div className="min-w-0 flex-1 pt-1">
                              <div className="mb-1 flex items-start justify-between gap-2">
                                <p className="line-clamp-2 font-semibold text-base leading-tight">
                                  {event.title}
                                </p>
                                {isCanceled && (
                                  <Badge
                                    className="shrink-0 rounded-md text-[10px]"
                                    variant="destructive"
                                  >
                                    Canceled
                                  </Badge>
                                )}
                              </div>
                              <p className="mb-3 text-muted-foreground text-sm">
                                {formatTime(event.startTime)} -{" "}
                                {formatTime(event.endTime)}
                              </p>
                              {/* RSVP Section - Mobile */}
                              {(goingCoaches.length > 0 ||
                                goingAthletes.length > 0 ||
                                rsvpData.notGoing.length > 0) && (
                                <div className="flex items-center gap-2 border-border/50 border-t pt-2">
                                  {/* Coaches badges - stacked together */}
                                  {(goingCoaches.length > 0 ||
                                    rsvpData.notGoing.filter(
                                      (user) =>
                                        user.role === "coach" ||
                                        user.role === "owner"
                                    ).length > 0) && (
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <button
                                          aria-label={`View coaches for ${event.title}`}
                                          className="flex shrink-0 cursor-pointer items-center -space-x-2"
                                          onClick={(e) => e.stopPropagation()}
                                          suppressHydrationWarning
                                          type="button"
                                        >
                                          {[
                                            ...goingCoaches.map((c) => ({
                                              ...c,
                                              status: "going" as const,
                                            })),
                                            ...rsvpData.notGoing
                                              .filter(
                                                (u) =>
                                                  u.role === "coach" ||
                                                  u.role === "owner"
                                              )
                                              .map((c) => ({
                                                id: c.id,
                                                name: c.name,
                                                email: c.email,
                                                status: "not_going" as const,
                                              })),
                                          ]
                                            .slice(0, 3)
                                            .map((coach, index) => (
                                              <Badge
                                                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-background p-0 text-white ${
                                                  coach.status === "going"
                                                    ? "bg-emerald-500"
                                                    : "bg-red-500"
                                                }`}
                                                key={coach.id}
                                                style={{ zIndex: 10 - index }}
                                                variant="secondary"
                                              >
                                                <span className="font-semibold text-[10px]">
                                                  {getInitials(
                                                    coach.name,
                                                    coach.email
                                                  )}
                                                </span>
                                              </Badge>
                                            ))}
                                          {goingCoaches.length +
                                            rsvpData.notGoing.filter(
                                              (u) =>
                                                u.role === "coach" ||
                                                u.role === "owner"
                                            ).length >
                                            3 && (
                                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-background bg-muted font-semibold text-[10px]">
                                              +
                                              {goingCoaches.length +
                                                rsvpData.notGoing.filter(
                                                  (u) =>
                                                    u.role === "coach" ||
                                                    u.role === "owner"
                                                ).length -
                                                3}
                                            </div>
                                          )}
                                        </button>
                                      </PopoverTrigger>
                                      <PopoverContent
                                        className="w-64 p-3"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <div className="space-y-3">
                                          {goingCoaches.length > 0 && (
                                            <div>
                                              <p className="mb-2 font-semibold text-muted-foreground text-xs">
                                                Going ({goingCoaches.length})
                                              </p>
                                              <div className="flex flex-wrap gap-2">
                                                {goingCoaches.map((coach) => (
                                                  <div
                                                    className="flex items-center gap-2"
                                                    key={coach.id}
                                                  >
                                                    <Badge
                                                      className="flex h-8 w-8 items-center justify-center rounded-full border-transparent bg-emerald-500 p-0 text-white"
                                                      variant="secondary"
                                                    >
                                                      <span className="font-medium text-xs">
                                                        {getInitials(
                                                          coach.name,
                                                          coach.email
                                                        )}
                                                      </span>
                                                    </Badge>
                                                    <span className="text-xs">
                                                      {coach.name ||
                                                        coach.email}
                                                    </span>
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          )}
                                          {rsvpData.notGoing.filter(
                                            (u) =>
                                              u.role === "coach" ||
                                              u.role === "owner"
                                          ).length > 0 && (
                                            <div>
                                              <p className="mb-2 font-semibold text-muted-foreground text-xs">
                                                Not Going (
                                                {
                                                  rsvpData.notGoing.filter(
                                                    (u) =>
                                                      u.role === "coach" ||
                                                      u.role === "owner"
                                                  ).length
                                                }
                                                )
                                              </p>
                                              <div className="flex flex-wrap gap-2">
                                                {rsvpData.notGoing
                                                  .filter(
                                                    (u) =>
                                                      u.role === "coach" ||
                                                      u.role === "owner"
                                                  )
                                                  .map((coach) => (
                                                    <div
                                                      className="flex items-center gap-2"
                                                      key={coach.id}
                                                    >
                                                      <Badge
                                                        className="flex h-8 w-8 items-center justify-center rounded-full border-transparent bg-red-500 p-0 text-white"
                                                        variant="secondary"
                                                      >
                                                        <span className="font-medium text-xs">
                                                          {getInitials(
                                                            coach.name,
                                                            coach.email
                                                          )}
                                                        </span>
                                                      </Badge>
                                                      <span className="text-xs">
                                                        {coach.name ||
                                                          coach.email}
                                                      </span>
                                                    </div>
                                                  ))}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      </PopoverContent>
                                    </Popover>
                                  )}
                                  {/* Athletes avatars - stacked with expand */}
                                  {(goingAthletes.length > 0 ||
                                    rsvpData.notGoing.filter(
                                      (user) => user.role === "athlete"
                                    ).length > 0) && (
                                    <>
                                      {(goingCoaches.length > 0 ||
                                        rsvpData.notGoing.filter(
                                          (user) =>
                                            user.role === "coach" ||
                                            user.role === "owner"
                                        ).length > 0) && (
                                        <span className="shrink-0 text-muted-foreground text-sm">
                                          •
                                        </span>
                                      )}
                                      {/* All athletes - stacked together */}
                                      <Popover>
                                        <PopoverTrigger asChild>
                                          <button
                                            aria-label={`View athletes for ${event.title}`}
                                            className="flex shrink-0 cursor-pointer items-center -space-x-2"
                                            onClick={(e) => e.stopPropagation()}
                                            suppressHydrationWarning
                                            type="button"
                                          >
                                            {[
                                              ...goingAthletes.map((a) => ({
                                                ...a,
                                                status: "going" as const,
                                              })),
                                              ...rsvpData.notGoing
                                                .filter(
                                                  (u) => u.role === "athlete"
                                                )
                                                .map((a) => ({
                                                  id: a.id,
                                                  name: a.name,
                                                  email: a.email,
                                                  avatarUrl: a.avatarUrl,
                                                  status: "not_going" as const,
                                                })),
                                            ]
                                              .slice(0, 3)
                                              .map((athlete, index) => (
                                                <Avatar
                                                  className={`h-7 w-7 shrink-0 border-2 border-background ${
                                                    athlete.status === "going"
                                                      ? "border-emerald-500"
                                                      : "border-red-500"
                                                  }`}
                                                  key={athlete.id}
                                                  style={{ zIndex: 10 - index }}
                                                >
                                                  <AvatarImage
                                                    src={
                                                      athlete.avatarUrl ||
                                                      undefined
                                                    }
                                                  />
                                                  <AvatarFallback className="bg-muted font-semibold text-[10px]">
                                                    {getInitials(
                                                      athlete.name,
                                                      athlete.email
                                                    )}
                                                  </AvatarFallback>
                                                </Avatar>
                                              ))}
                                            {goingAthletes.length +
                                              rsvpData.notGoing.filter(
                                                (u) => u.role === "athlete"
                                              ).length >
                                              3 && (
                                              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-background bg-muted font-semibold text-[10px]">
                                                +
                                                {goingAthletes.length +
                                                  rsvpData.notGoing.filter(
                                                    (u) => u.role === "athlete"
                                                  ).length -
                                                  3}
                                              </div>
                                            )}
                                          </button>
                                        </PopoverTrigger>
                                        <PopoverContent
                                          className="w-64 p-3"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <div className="space-y-3">
                                            {goingAthletes.length > 0 && (
                                              <div>
                                                <p className="mb-2 font-semibold text-muted-foreground text-xs">
                                                  Going ({goingAthletes.length})
                                                </p>
                                                <div className="flex flex-wrap gap-2">
                                                  {goingAthletes.map(
                                                    (athlete) => (
                                                      <div
                                                        className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-2 py-1.5"
                                                        key={athlete.id}
                                                      >
                                                        <Avatar className="h-8 w-8 border-0">
                                                          <AvatarImage
                                                            src={
                                                              athlete.avatarUrl ||
                                                              undefined
                                                            }
                                                          />
                                                          <AvatarFallback className="bg-muted text-xs">
                                                            {getInitials(
                                                              athlete.name,
                                                              athlete.email
                                                            )}
                                                          </AvatarFallback>
                                                        </Avatar>
                                                        <span className="text-xs">
                                                          {athlete.name ||
                                                            athlete.email}
                                                        </span>
                                                      </div>
                                                    )
                                                  )}
                                                </div>
                                              </div>
                                            )}
                                            {rsvpData.notGoing.filter(
                                              (u) => u.role === "athlete"
                                            ).length > 0 && (
                                              <div>
                                                <p className="mb-2 font-semibold text-muted-foreground text-xs">
                                                  Not Going (
                                                  {
                                                    rsvpData.notGoing.filter(
                                                      (u) =>
                                                        u.role === "athlete"
                                                    ).length
                                                  }
                                                  )
                                                </p>
                                                <div className="flex flex-wrap gap-2">
                                                  {rsvpData.notGoing
                                                    .filter(
                                                      (u) =>
                                                        u.role === "athlete"
                                                    )
                                                    .map((athlete) => (
                                                      <div
                                                        className="flex items-center gap-2 rounded-lg bg-red-500/10 px-2 py-1.5"
                                                        key={athlete.id}
                                                      >
                                                        <Avatar className="h-8 w-8 border-0">
                                                          <AvatarImage
                                                            src={
                                                              athlete.avatarUrl ||
                                                              undefined
                                                            }
                                                          />
                                                          <AvatarFallback className="bg-muted text-xs">
                                                            {getInitials(
                                                              athlete.name,
                                                              athlete.email
                                                            )}
                                                          </AvatarFallback>
                                                        </Avatar>
                                                        <span className="text-xs">
                                                          {athlete.name ||
                                                            athlete.email}
                                                        </span>
                                                      </div>
                                                    ))}
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        </PopoverContent>
                                      </Popover>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* Desktop Layout */}
                          <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-[#000000] dark:bg-[#ffffff]">
                            <span className="font-bold text-[#ffffff] text-sm leading-none dark:text-[#000000]">
                              {dateInfo.day}
                            </span>
                            <span
                              className="mt-0.5 font-medium text-[#ffffff] text-[9px]! dark:text-[#000000]"
                              style={{
                                fontSize: "9px",
                                WebkitTextSizeAdjust: "none",
                                display: "inline-block",
                              }}
                            >
                              {dateInfo.month}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-sm">
                              {event.title}
                            </p>
                            <p className="mt-0.5 truncate text-muted-foreground text-xs">
                              {formatTime(event.startTime)} -{" "}
                              {formatTime(event.endTime)}
                            </p>
                            {/* Coaches and athletes - Desktop */}
                            {(goingCoaches.length > 0 ||
                              goingAthletes.length > 0 ||
                              rsvpData.notGoing.length > 0) && (
                              <div className="mt-2 flex items-center gap-1.5 overflow-hidden">
                                {/* Coaches badges - stacked together */}
                                {(goingCoaches.length > 0 ||
                                  rsvpData.notGoing.filter(
                                    (user) =>
                                      user.role === "coach" ||
                                      user.role === "owner"
                                  ).length > 0) && (
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <button
                                        aria-label={`View coaches for ${event.title}`}
                                        className="flex shrink-0 cursor-pointer items-center -space-x-2"
                                        onClick={(e) => e.stopPropagation()}
                                        suppressHydrationWarning
                                        type="button"
                                      >
                                        {[
                                          ...goingCoaches.map((c) => ({
                                            ...c,
                                            status: "going" as const,
                                          })),
                                          ...rsvpData.notGoing
                                            .filter(
                                              (u) =>
                                                u.role === "coach" ||
                                                u.role === "owner"
                                            )
                                            .map((c) => ({
                                              id: c.id,
                                              name: c.name,
                                              email: c.email,
                                              status: "not_going" as const,
                                            })),
                                        ]
                                          .slice(0, 3)
                                          .map((coach, index) => (
                                            <Badge
                                              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-transparent p-0 text-white ${
                                                coach.status === "going"
                                                  ? "bg-emerald-500"
                                                  : "bg-red-500"
                                              }`}
                                              key={coach.id}
                                              style={{ zIndex: 10 - index }}
                                              variant="secondary"
                                            >
                                              <span className="font-medium text-[9px]">
                                                {getInitials(
                                                  coach.name,
                                                  coach.email
                                                )}
                                              </span>
                                            </Badge>
                                          ))}
                                        {goingCoaches.length +
                                          rsvpData.notGoing.filter(
                                            (u) =>
                                              u.role === "coach" ||
                                              u.role === "owner"
                                          ).length >
                                          3 && (
                                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-background bg-muted font-medium text-[9px]">
                                            +
                                            {goingCoaches.length +
                                              rsvpData.notGoing.filter(
                                                (u) =>
                                                  u.role === "coach" ||
                                                  u.role === "owner"
                                              ).length -
                                              3}
                                          </div>
                                        )}
                                      </button>
                                    </PopoverTrigger>
                                    <PopoverContent
                                      className="w-64 p-3"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <div className="space-y-3">
                                        {goingCoaches.length > 0 && (
                                          <div>
                                            <p className="mb-2 font-semibold text-muted-foreground text-xs">
                                              Going ({goingCoaches.length})
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                              {goingCoaches.map((coach) => (
                                                <div
                                                  className="flex items-center gap-2"
                                                  key={coach.id}
                                                >
                                                  <Badge
                                                    className="flex h-8 w-8 items-center justify-center rounded-full border-transparent bg-emerald-500 p-0 text-white"
                                                    variant="secondary"
                                                  >
                                                    <span className="font-medium text-xs">
                                                      {getInitials(
                                                        coach.name,
                                                        coach.email
                                                      )}
                                                    </span>
                                                  </Badge>
                                                  <span className="text-xs">
                                                    {coach.name || coach.email}
                                                  </span>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                        {rsvpData.notGoing.filter(
                                          (u) =>
                                            u.role === "coach" ||
                                            u.role === "owner"
                                        ).length > 0 && (
                                          <div>
                                            <p className="mb-2 font-semibold text-muted-foreground text-xs">
                                              Not Going (
                                              {
                                                rsvpData.notGoing.filter(
                                                  (u) =>
                                                    u.role === "coach" ||
                                                    u.role === "owner"
                                                ).length
                                              }
                                              )
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                              {rsvpData.notGoing
                                                .filter(
                                                  (u) =>
                                                    u.role === "coach" ||
                                                    u.role === "owner"
                                                )
                                                .map((coach) => (
                                                  <div
                                                    className="flex items-center gap-2"
                                                    key={coach.id}
                                                  >
                                                    <Badge
                                                      className="flex h-8 w-8 items-center justify-center rounded-full border-transparent bg-red-500 p-0 text-white"
                                                      variant="secondary"
                                                    >
                                                      <span className="font-medium text-xs">
                                                        {getInitials(
                                                          coach.name,
                                                          coach.email
                                                        )}
                                                      </span>
                                                    </Badge>
                                                    <span className="text-xs">
                                                      {coach.name ||
                                                        coach.email}
                                                    </span>
                                                  </div>
                                                ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </PopoverContent>
                                  </Popover>
                                )}
                                {/* Athletes avatars - stacked with expand */}
                                {(goingAthletes.length > 0 ||
                                  rsvpData.notGoing.filter(
                                    (user) => user.role === "athlete"
                                  ).length > 0) && (
                                  <>
                                    {(goingCoaches.length > 0 ||
                                      rsvpData.notGoing.filter(
                                        (user) =>
                                          user.role === "coach" ||
                                          user.role === "owner"
                                      ).length > 0) && (
                                      <span className="shrink-0 text-muted-foreground">
                                        •
                                      </span>
                                    )}
                                    {/* All athletes - stacked together */}
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <button
                                          aria-label={`View athletes for ${event.title}`}
                                          className="flex shrink-0 cursor-pointer items-center -space-x-2"
                                          onClick={(e) => e.stopPropagation()}
                                          suppressHydrationWarning
                                          type="button"
                                        >
                                          {[
                                            ...goingAthletes.map((a) => ({
                                              ...a,
                                              status: "going" as const,
                                            })),
                                            ...rsvpData.notGoing
                                              .filter(
                                                (u) => u.role === "athlete"
                                              )
                                              .map((a) => ({
                                                id: a.id,
                                                name: a.name,
                                                email: a.email,
                                                avatarUrl: a.avatarUrl,
                                                status: "not_going" as const,
                                              })),
                                          ]
                                            .slice(0, 3)
                                            .map((athlete, index) => (
                                              <Avatar
                                                className={`h-6 w-6 shrink-0 border-2 border-background ${
                                                  athlete.status === "going"
                                                    ? "border-emerald-500"
                                                    : "border-red-500"
                                                }`}
                                                key={athlete.id}
                                                style={{ zIndex: 10 - index }}
                                              >
                                                <AvatarImage
                                                  src={
                                                    athlete.avatarUrl ||
                                                    undefined
                                                  }
                                                />
                                                <AvatarFallback className="bg-muted text-[9px]">
                                                  {getInitials(
                                                    athlete.name,
                                                    athlete.email
                                                  )}
                                                </AvatarFallback>
                                              </Avatar>
                                            ))}
                                          {goingAthletes.length +
                                            rsvpData.notGoing.filter(
                                              (u) => u.role === "athlete"
                                            ).length >
                                            3 && (
                                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-background bg-muted font-medium text-[9px]">
                                              +
                                              {goingAthletes.length +
                                                rsvpData.notGoing.filter(
                                                  (u) => u.role === "athlete"
                                                ).length -
                                                3}
                                            </div>
                                          )}
                                        </button>
                                      </PopoverTrigger>
                                      <PopoverContent
                                        className="w-64 p-3"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <div className="space-y-3">
                                          {goingAthletes.length > 0 && (
                                            <div>
                                              <p className="mb-2 font-semibold text-muted-foreground text-xs">
                                                Going ({goingAthletes.length})
                                              </p>
                                              <div className="flex flex-wrap gap-2">
                                                {goingAthletes.map(
                                                  (athlete) => (
                                                    <div
                                                      className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-2 py-1.5"
                                                      key={athlete.id}
                                                    >
                                                      <Avatar className="h-8 w-8 border-0">
                                                        <AvatarImage
                                                          src={
                                                            athlete.avatarUrl ||
                                                            undefined
                                                          }
                                                        />
                                                        <AvatarFallback className="bg-muted text-xs">
                                                          {getInitials(
                                                            athlete.name,
                                                            athlete.email
                                                          )}
                                                        </AvatarFallback>
                                                      </Avatar>
                                                      <span className="text-xs">
                                                        {athlete.name ||
                                                          athlete.email}
                                                      </span>
                                                    </div>
                                                  )
                                                )}
                                              </div>
                                            </div>
                                          )}
                                          {rsvpData.notGoing.filter(
                                            (u) => u.role === "athlete"
                                          ).length > 0 && (
                                            <div>
                                              <p className="mb-2 font-semibold text-muted-foreground text-xs">
                                                Not Going (
                                                {
                                                  rsvpData.notGoing.filter(
                                                    (u) => u.role === "athlete"
                                                  ).length
                                                }
                                                )
                                              </p>
                                              <div className="flex flex-wrap gap-2">
                                                {rsvpData.notGoing
                                                  .filter(
                                                    (u) => u.role === "athlete"
                                                  )
                                                  .map((athlete) => (
                                                    <div
                                                      className="flex items-center gap-2 rounded-lg bg-red-500/10 px-2 py-1.5"
                                                      key={athlete.id}
                                                    >
                                                      <Avatar className="h-8 w-8 border-0">
                                                        <AvatarImage
                                                          src={
                                                            athlete.avatarUrl ||
                                                            undefined
                                                          }
                                                        />
                                                        <AvatarFallback className="bg-muted text-xs">
                                                          {getInitials(
                                                            athlete.name,
                                                            athlete.email
                                                          )}
                                                        </AvatarFallback>
                                                      </Avatar>
                                                      <span className="text-xs">
                                                        {athlete.name ||
                                                          athlete.email}
                                                      </span>
                                                    </div>
                                                  ))}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      </PopoverContent>
                                    </Popover>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-2">
                            {isCanceled && (
                              <Badge
                                className="rounded-md text-[10px]"
                                variant="destructive"
                              >
                                Canceled
                              </Badge>
                            )}
                          </div>
                        </>
                      )}
                    </Link>
                    {isCoachOrOwner && !isMobile && (
                      <div className="opacity-0 transition-opacity group-hover:opacity-100">
                        <EventActionsDropdown
                          currentRsvpStatus={
                            currentUserRsvpMap.get(occurrence.id) || null
                          }
                          eventId={event.id}
                          isCanceled={isCanceled}
                          occurrenceId={occurrence.id}
                          userRole={userRole}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
      {selectedEvent && (
        <MobileEventActions
          currentRsvpStatus={
            currentUserRsvpMap.get(selectedEvent.occurrenceId) || null
          }
          eventId={selectedEvent.eventId}
          eventTitle={selectedEvent.eventTitle}
          isCanceled={selectedEvent.isCanceled}
          occurrenceId={selectedEvent.occurrenceId}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedEvent(null);
            }
          }}
          open={!!selectedEvent}
          userRole={userRole}
        />
      )}
    </>
  );
}
