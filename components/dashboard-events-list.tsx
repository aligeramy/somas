"use client";

import {
  IconCalendar,
  IconChevronRight,
} from "@tabler/icons-react";
import Link from "next/link";
import { useId, useState } from "react";
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
    const hour = parseInt(hours, 10);
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
      <Card className={`rounded-xl ${isMobile ? "border-0 shadow-none bg-transparent" : ""}`}>
        <CardHeader className={`${isMobile ? "px-0 pt-0 pb-1 -mt-1" : "px-4 pb-2"}`}>
          <div className="flex items-center justify-between">
            <CardTitle className={`font-semibold ${isMobile ? "text-lg" : "text-base"}`}>
              Upcoming Events
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              asChild
              className={`text-muted-foreground ${isMobile ? "rounded-lg text-sm" : "rounded-xl"}`}
            >
              <Link href="/events">
                {isMobile ? "All" : "View all"}
                <IconChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className={`pt-0 ${isMobile ? "px-0" : "px-4"}`}>
          {upcomingOccurrences.length === 0 ? (
            <div className={`text-center ${isMobile ? "py-12" : "py-8"}`}>
              <IconCalendar className={`mx-auto mb-3 text-muted-foreground/30 ${isMobile ? "h-12 w-12" : "h-10 w-10"}`} />
              <p className={`text-muted-foreground mb-4 ${isMobile ? "text-base" : "text-sm"}`}>
                No upcoming events
              </p>
              <Button
                variant="outline"
                size="sm"
                asChild
                className={isMobile ? "rounded-lg" : "rounded-xl"}
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
                    key={occurrence.id}
                    className={`group relative ${
                      isMobile
                        ? `bg-card border border-border rounded-2xl shadow-sm overflow-hidden active:scale-[0.98] transition-transform ${
                            isCanceled ? "opacity-60" : ""
                          }`
                        : `flex items-start gap-3 py-2 px-2 rounded-xl hover:bg-muted/50 transition-colors ${
                      isCanceled ? "opacity-50" : ""
                          }`
                    }`}
                  >
                    <Link
                      href={`/events?eventId=${event.id}&occurrenceId=${occurrence.id}`}
                      className={isMobile ? "block" : "flex items-start gap-3 flex-1 min-w-0"}
                      onClick={handleEventClick}
                    >
                      {isMobile ? (
                        <div className="p-4">
                          <div className="flex items-start gap-4">
                            {/* Date Badge - Mobile */}
                            <div className="h-16 w-16 rounded-2xl flex flex-col items-center justify-center shrink-0 bg-[#000000] dark:bg-[#ffffff]">
                              <span className="text-xl font-bold leading-none text-[#ffffff] dark:text-[#000000]">
                                {dateInfo.day}
                              </span>
                              <span className="text-[10px] font-semibold text-[#ffffff] dark:text-[#000000] mt-1 uppercase tracking-wide">
                                {dateInfo.month}
                              </span>
                            </div>
                            
                            {/* Content - Mobile */}
                            <div className="flex-1 min-w-0 pt-1">
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <p className="font-semibold text-base leading-tight line-clamp-2">
                                  {event.title}
                                </p>
                                {isCanceled && (
                                  <Badge
                                    variant="destructive"
                                    className="text-[10px] rounded-md shrink-0"
                                  >
                                    Canceled
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mb-3">
                                {formatTime(event.startTime)} - {formatTime(event.endTime)}
                              </p>
                              {/* RSVP Section - Mobile */}
                              {(goingCoaches.length > 0 ||
                                goingAthletes.length > 0 ||
                                rsvpData.notGoing.length > 0) && (
                                <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                                  {/* Coaches badges - stacked together */}
                                  {(goingCoaches.length > 0 ||
                                    rsvpData.notGoing.filter(
                                      (user) =>
                                        user.role === "coach" ||
                                        user.role === "owner",
                                    ).length > 0) && (
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <button
                                          type="button"
                                          className="flex items-center -space-x-2 shrink-0 cursor-pointer"
                                          onClick={(e) => e.stopPropagation()}
                                          aria-label={`View coaches for ${event.title}`}
                                          suppressHydrationWarning
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
                                                  u.role === "owner",
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
                                        key={coach.id}
                                        variant="secondary"
                                                className={`h-7 w-7 rounded-full p-0 flex items-center justify-center shrink-0 border-2 border-background text-white ${
                                                  coach.status === "going"
                                                    ? "bg-emerald-500"
                                                    : "bg-red-500"
                                                }`}
                                                style={{ zIndex: 10 - index }}
                                              >
                                                <span className="text-[10px] font-semibold">
                                                  {getInitials(coach.name, coach.email)}
                                                </span>
                                              </Badge>
                                            ))}
                                          {goingCoaches.length +
                                            rsvpData.notGoing.filter(
                                              (u) =>
                                                u.role === "coach" ||
                                                u.role === "owner",
                                            ).length >
                                              3 && (
                                            <div className="h-7 w-7 rounded-full border-2 border-background bg-muted flex items-center justify-center shrink-0 text-[10px] font-semibold">
                                              +
                                              {goingCoaches.length +
                                                rsvpData.notGoing.filter(
                                                  (u) =>
                                                    u.role === "coach" ||
                                                    u.role === "owner",
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
                                        <p className="text-xs font-semibold text-muted-foreground mb-2">
                                          Going ({goingCoaches.length})
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                          {goingCoaches.map((coach) => (
                                            <div
                                              key={coach.id}
                                              className="flex items-center gap-2"
                                            >
                                              <Badge
                                                variant="secondary"
                                                className="h-8 w-8 rounded-full p-0 flex items-center justify-center border-transparent bg-emerald-500 text-white"
                                              >
                                                <span className="text-xs font-medium">
                                                  {getInitials(
                                                    coach.name,
                                                    coach.email,
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
                                        u.role === "coach" || u.role === "owner",
                                    ).length > 0 && (
                                      <div>
                                        <p className="text-xs font-semibold text-muted-foreground mb-2">
                                          Not Going (
                                          {
                                            rsvpData.notGoing.filter(
                                              (u) =>
                                                u.role === "coach" ||
                                                u.role === "owner",
                                            ).length
                                          }
                                          )
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                          {rsvpData.notGoing
                                            .filter(
                                              (u) =>
                                                u.role === "coach" ||
                                                u.role === "owner",
                                            )
                                            .map((coach) => (
                                              <div
                                                key={coach.id}
                                                className="flex items-center gap-2"
                                              >
                                                <Badge
                                                  variant="secondary"
                                                  className="h-8 w-8 rounded-full p-0 flex items-center justify-center border-transparent bg-red-500 text-white"
                                                >
                                                  <span className="text-xs font-medium">
                                                    {getInitials(
                                                      coach.name,
                                                      coach.email,
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
                                  </div>
                                </PopoverContent>
                              </Popover>
                            )}
                                  {/* Athletes avatars - stacked with expand */}
                                  {(goingAthletes.length > 0 ||
                                    rsvpData.notGoing.filter(
                                      (user) => user.role === "athlete",
                                    ).length > 0) && (
                                    <>
                                      {(goingCoaches.length > 0 ||
                                        rsvpData.notGoing.filter(
                                          (user) =>
                                            user.role === "coach" ||
                                            user.role === "owner",
                                        ).length > 0) && (
                                        <span className="text-muted-foreground shrink-0 text-sm">
                                          •
                                        </span>
                                      )}
                                      {/* All athletes - stacked together */}
                                      <Popover>
                                        <PopoverTrigger asChild>
                                          <button
                                            type="button"
                                            className="flex items-center -space-x-2 shrink-0 cursor-pointer"
                                            onClick={(e) => e.stopPropagation()}
                                            aria-label={`View athletes for ${event.title}`}
                                            suppressHydrationWarning
                                          >
                                            {[
                                              ...goingAthletes.map((a) => ({
                                                ...a,
                                                status: "going" as const,
                                              })),
                                              ...rsvpData.notGoing
                                                .filter((u) => u.role === "athlete")
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
                                            key={athlete.id}
                                                  className={`h-7 w-7 border-2 border-background shrink-0 ${
                                                    athlete.status === "going"
                                                      ? "border-emerald-500"
                                                      : "border-red-500"
                                                  }`}
                                                  style={{ zIndex: 10 - index }}
                                          >
                                            <AvatarImage
                                              src={athlete.avatarUrl || undefined}
                                            />
                                            <AvatarFallback className="text-[10px] bg-muted font-semibold">
                                              {getInitials(
                                                athlete.name,
                                                athlete.email,
                                              )}
                                            </AvatarFallback>
                                          </Avatar>
                                        ))}
                                            {goingAthletes.length +
                                              rsvpData.notGoing.filter(
                                                (u) => u.role === "athlete",
                                              ).length >
                                              3 && (
                                              <div className="h-7 w-7 rounded-full border-2 border-background bg-muted flex items-center justify-center shrink-0 text-[10px] font-semibold">
                                                +
                                                {goingAthletes.length +
                                                  rsvpData.notGoing.filter(
                                                    (u) => u.role === "athlete",
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
                                          <p className="text-xs font-semibold text-muted-foreground mb-2">
                                            Going ({goingAthletes.length})
                                          </p>
                                          <div className="flex flex-wrap gap-2">
                                            {goingAthletes.map((athlete) => (
                                              <div
                                                key={athlete.id}
                                                className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-emerald-500/10"
                                              >
                                                <Avatar className="h-8 w-8 border-0">
                                                  <AvatarImage
                                                    src={
                                                      athlete.avatarUrl ||
                                                      undefined
                                                    }
                                                  />
                                                  <AvatarFallback className="text-xs bg-muted">
                                                    {getInitials(
                                                      athlete.name,
                                                      athlete.email,
                                                    )}
                                                  </AvatarFallback>
                                                </Avatar>
                                                <span className="text-xs">
                                                  {athlete.name || athlete.email}
                                                </span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                      {rsvpData.notGoing.filter(
                                        (u) => u.role === "athlete",
                                      ).length > 0 && (
                                        <div>
                                          <p className="text-xs font-semibold text-muted-foreground mb-2">
                                            Not Going (
                                            {
                                              rsvpData.notGoing.filter(
                                                (u) => u.role === "athlete",
                                              ).length
                                            }
                                            )
                                          </p>
                                          <div className="flex flex-wrap gap-2">
                                            {rsvpData.notGoing
                                              .filter((u) => u.role === "athlete")
                                              .map((athlete) => (
                                                <div
                                                  key={athlete.id}
                                                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-red-500/10"
                                                >
                                                  <Avatar className="h-8 w-8 border-0">
                                                    <AvatarImage
                                                      src={
                                                        athlete.avatarUrl ||
                                                        undefined
                                                      }
                                                    />
                                                    <AvatarFallback className="text-xs bg-muted">
                                                      {getInitials(
                                                        athlete.name,
                                                        athlete.email,
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
                          <div className="h-12 w-12 rounded-xl flex flex-col items-center justify-center shrink-0 bg-[#000000] dark:bg-[#ffffff]">
                            <span className="text-sm font-bold leading-none text-[#ffffff] dark:text-[#000000]">
                          {dateInfo.day}
                        </span>
                        <span
                              className="text-[9px]! font-medium text-[#ffffff] dark:text-[#000000] mt-0.5"
                          style={{
                            fontSize: "9px",
                            WebkitTextSizeAdjust: "none",
                            display: "inline-block",
                          }}
                        >
                          {dateInfo.month}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {event.title}
                        </p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {formatTime(event.startTime)} -{" "}
                          {formatTime(event.endTime)}
                        </p>
                            {/* Coaches and athletes - Desktop */}
                        {(goingCoaches.length > 0 ||
                          goingAthletes.length > 0 ||
                          rsvpData.notGoing.length > 0) && (
                          <div className="flex items-center gap-1.5 mt-2 overflow-hidden">
                            {/* Coaches badges - stacked together */}
                            {(goingCoaches.length > 0 ||
                              rsvpData.notGoing.filter(
                                (user) =>
                                  user.role === "coach" ||
                                  user.role === "owner",
                              ).length > 0) && (
                              <Popover>
                                <PopoverTrigger asChild>
                                  <button
                                    type="button"
                                    className="flex items-center -space-x-2 shrink-0 cursor-pointer"
                                    onClick={(e) => e.stopPropagation()}
                                    aria-label={`View coaches for ${event.title}`}
                                    suppressHydrationWarning
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
                                            u.role === "owner",
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
                                  key={coach.id}
                                  variant="secondary"
                                          className={`h-6 w-6 rounded-full p-0 flex items-center justify-center shrink-0 border-transparent text-white ${
                                            coach.status === "going"
                                              ? "bg-emerald-500"
                                              : "bg-red-500"
                                          }`}
                                          style={{ zIndex: 10 - index }}
                                        >
                                          <span className="text-[9px] font-medium">
                                            {getInitials(coach.name, coach.email)}
                                          </span>
                                        </Badge>
                                      ))}
                                    {goingCoaches.length +
                                      rsvpData.notGoing.filter(
                                        (u) =>
                                          u.role === "coach" ||
                                          u.role === "owner",
                                      ).length >
                                        3 && (
                                      <div className="h-6 w-6 rounded-full border-2 border-background bg-muted flex items-center justify-center shrink-0 text-[9px] font-medium">
                                        +
                                        {goingCoaches.length +
                                          rsvpData.notGoing.filter(
                                            (u) =>
                                              u.role === "coach" ||
                                              u.role === "owner",
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
                                        <p className="text-xs font-semibold text-muted-foreground mb-2">
                                          Going ({goingCoaches.length})
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                          {goingCoaches.map((coach) => (
                                            <div
                                              key={coach.id}
                                              className="flex items-center gap-2"
                                            >
                                              <Badge
                                                variant="secondary"
                                                className="h-8 w-8 rounded-full p-0 flex items-center justify-center border-transparent bg-emerald-500 text-white"
                                              >
                                                <span className="text-xs font-medium">
                                                  {getInitials(
                                                    coach.name,
                                                    coach.email,
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
                                        u.role === "coach" || u.role === "owner",
                                    ).length > 0 && (
                                      <div>
                                        <p className="text-xs font-semibold text-muted-foreground mb-2">
                                          Not Going (
                                          {
                                            rsvpData.notGoing.filter(
                                              (u) =>
                                                u.role === "coach" ||
                                                u.role === "owner",
                                            ).length
                                          }
                                          )
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                          {rsvpData.notGoing
                                            .filter(
                                              (u) =>
                                                u.role === "coach" ||
                                                u.role === "owner",
                                            )
                                            .map((coach) => (
                                              <div
                                                key={coach.id}
                                                className="flex items-center gap-2"
                                              >
                                                <Badge
                                                  variant="secondary"
                                                  className="h-8 w-8 rounded-full p-0 flex items-center justify-center border-transparent bg-red-500 text-white"
                                                >
                                                  <span className="text-xs font-medium">
                                                    {getInitials(
                                                      coach.name,
                                                      coach.email,
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
                                  </div>
                                </PopoverContent>
                              </Popover>
                            )}
                            {/* Athletes avatars - stacked with expand */}
                            {(goingAthletes.length > 0 ||
                              rsvpData.notGoing.filter(
                                (user) => user.role === "athlete",
                              ).length > 0) && (
                              <>
                                {(goingCoaches.length > 0 ||
                                  rsvpData.notGoing.filter(
                                    (user) =>
                                      user.role === "coach" ||
                                      user.role === "owner",
                                  ).length > 0) && (
                                  <span className="text-muted-foreground shrink-0">
                                    •
                                  </span>
                                )}
                                {/* All athletes - stacked together */}
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <button
                                      type="button"
                                      className="flex items-center -space-x-2 shrink-0 cursor-pointer"
                                      onClick={(e) => e.stopPropagation()}
                                      aria-label={`View athletes for ${event.title}`}
                                      suppressHydrationWarning
                                    >
                                      {[
                                        ...goingAthletes.map((a) => ({
                                          ...a,
                                          status: "going" as const,
                                        })),
                                        ...rsvpData.notGoing
                                          .filter((u) => u.role === "athlete")
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
                                      key={athlete.id}
                                            className={`h-6 w-6 border-2 border-background shrink-0 ${
                                              athlete.status === "going"
                                                ? "border-emerald-500"
                                                : "border-red-500"
                                            }`}
                                            style={{ zIndex: 10 - index }}
                                    >
                                      <AvatarImage
                                        src={athlete.avatarUrl || undefined}
                                      />
                                      <AvatarFallback className="text-[9px] bg-muted">
                                        {getInitials(
                                          athlete.name,
                                          athlete.email,
                                        )}
                                      </AvatarFallback>
                                    </Avatar>
                                  ))}
                                      {goingAthletes.length +
                                        rsvpData.notGoing.filter(
                                          (u) => u.role === "athlete",
                                        ).length >
                                        3 && (
                                        <div className="h-6 w-6 rounded-full border-2 border-background bg-muted flex items-center justify-center shrink-0 text-[9px] font-medium">
                                          +
                                          {goingAthletes.length +
                                            rsvpData.notGoing.filter(
                                              (u) => u.role === "athlete",
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
                                          <p className="text-xs font-semibold text-muted-foreground mb-2">
                                            Going ({goingAthletes.length})
                                          </p>
                                          <div className="flex flex-wrap gap-2">
                                            {goingAthletes.map((athlete) => (
                                              <div
                                                key={athlete.id}
                                                className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-emerald-500/10"
                                              >
                                                <Avatar className="h-8 w-8 border-0">
                                                  <AvatarImage
                                                    src={
                                                      athlete.avatarUrl ||
                                                      undefined
                                                    }
                                                  />
                                                  <AvatarFallback className="text-xs bg-muted">
                                                    {getInitials(
                                                      athlete.name,
                                                      athlete.email,
                                                    )}
                                                  </AvatarFallback>
                                                </Avatar>
                                                <span className="text-xs">
                                                  {athlete.name || athlete.email}
                                                </span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                      {rsvpData.notGoing.filter(
                                        (u) => u.role === "athlete",
                                      ).length > 0 && (
                                        <div>
                                          <p className="text-xs font-semibold text-muted-foreground mb-2">
                                            Not Going (
                                            {
                                              rsvpData.notGoing.filter(
                                                (u) => u.role === "athlete",
                                              ).length
                                            }
                                            )
                                          </p>
                                          <div className="flex flex-wrap gap-2">
                                            {rsvpData.notGoing
                                              .filter((u) => u.role === "athlete")
                                              .map((athlete) => (
                                                <div
                                                  key={athlete.id}
                                                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-red-500/10"
                                                >
                                                  <Avatar className="h-8 w-8 border-0">
                                                    <AvatarImage
                                                      src={
                                                        athlete.avatarUrl ||
                                                        undefined
                                                      }
                                                    />
                                                    <AvatarFallback className="text-xs bg-muted">
                                                      {getInitials(
                                                        athlete.name,
                                                        athlete.email,
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
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        {isCanceled && (
                          <Badge
                            variant="destructive"
                            className="text-[10px] rounded-md"
                          >
                            Canceled
                          </Badge>
                        )}
                      </div>
                        </>
                      )}
                    </Link>
                    {isCoachOrOwner && !isMobile && (
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <EventActionsDropdown
                          eventId={event.id}
                          occurrenceId={occurrence.id}
                          isCanceled={isCanceled}
                          userRole={userRole}
                          currentRsvpStatus={
                            currentUserRsvpMap.get(occurrence.id) || null
                          }
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
          eventId={selectedEvent.eventId}
          occurrenceId={selectedEvent.occurrenceId}
          isCanceled={selectedEvent.isCanceled}
          userRole={userRole}
          currentRsvpStatus={
            currentUserRsvpMap.get(selectedEvent.occurrenceId) || null
          }
          eventTitle={selectedEvent.eventTitle}
          open={!!selectedEvent}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedEvent(null);
            }
          }}
        />
      )}
    </>
  );
}
