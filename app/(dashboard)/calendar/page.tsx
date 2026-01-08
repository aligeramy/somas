"use client";

import {
  IconBan,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconClock,
  IconDotsVertical,
  IconEdit,
  IconEye,
  IconMail,
  IconMessage,
  IconPhone,
  IconX,
} from "@tabler/icons-react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface EventOccurrence {
  id: string;
  date: string;
  status: string;
  event: {
    id: string;
    title: string;
    startTime: string;
    endTime: string;
  };
}

interface RSVP {
  id: string;
  status: string;
  occurrenceId: string;
}

interface UserInfo {
  id: string;
  role: string;
}

interface CoachAttendee {
  id: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
  phone: string | null;
  cellPhone: string | null;
}

// Color palette for events (for athletes view)
// Using darker shades that work well in dark mode with white text
const EVENT_COLORS = [
  "bg-blue-600 dark:bg-blue-700",
  "bg-purple-600 dark:bg-purple-700",
  "bg-pink-600 dark:bg-pink-700",
  "bg-indigo-600 dark:bg-indigo-700",
  "bg-cyan-600 dark:bg-cyan-700",
  "bg-teal-600 dark:bg-teal-700",
  "bg-orange-600 dark:bg-orange-700",
  "bg-amber-600 dark:bg-amber-700",
  "bg-lime-600 dark:bg-lime-700",
  "bg-emerald-600 dark:bg-emerald-700",
  "bg-violet-600 dark:bg-violet-700",
  "bg-fuchsia-600 dark:bg-fuchsia-700",
];

export default function CalendarPage() {
  const [month, setMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedOccurrences, setSelectedOccurrences] = useState<
    EventOccurrence[]
  >([]);
  const [events, setEvents] = useState<EventOccurrence[]>([]);
  const [rsvps, setRsvps] = useState<RSVP[]>([]);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [rsvpDialogOpen, setRsvpDialogOpen] = useState(false);
  const [updatingRsvp, setUpdatingRsvp] = useState<string | null>(null);
  const [cancelingOccurrence, setCancelingOccurrence] = useState<string | null>(
    null
  );
  const [coachAttendees, setCoachAttendees] = useState<
    Record<string, CoachAttendee[]>
  >({});
  const [loadingAttendees, setLoadingAttendees] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [eventsRes, rsvpsRes, userRes] = await Promise.all([
        fetch("/api/events"),
        fetch("/api/rsvp"),
        fetch("/api/user-info"),
      ]);

      if (!(eventsRes.ok && rsvpsRes.ok))
        throw new Error("Failed to load data");

      const eventsData = await eventsRes.json();
      const rsvpsData = await rsvpsRes.json();

      if (userRes.ok) {
        const userData = await userRes.json();
        setUserInfo(userData);
      }

      // Flatten all occurrences from all events
      const allOccurrences: EventOccurrence[] = [];
      eventsData.events.forEach(
        (event: {
          id: string;
          title: string;
          startTime: string;
          endTime: string;
          occurrences: Array<{ id: string; date: string; status: string }>;
        }) => {
          event.occurrences.forEach(
            (occ: { id: string; date: string; status: string }) => {
              const occDate = new Date(occ.date);
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              // Only show future occurrences
              if (occDate >= today) {
                allOccurrences.push({
                  ...occ,
                  event: {
                    id: event.id,
                    title: event.title,
                    startTime: event.startTime,
                    endTime: event.endTime,
                  },
                });
              }
            }
          );
        }
      );

      setEvents(allOccurrences);
      setRsvps(rsvpsData.rsvps || []);
    } catch (err) {
      console.error("Error loading data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Create a map of dates to occurrences
  const occurrenceMap = useMemo(() => {
    const map = new Map<string, EventOccurrence[]>();
    events.forEach((occ) => {
      const dateKey = format(parseISO(occ.date), "yyyy-MM-dd");
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      const existing = map.get(dateKey);
      if (existing) {
        existing.push(occ);
      }
    });
    return map;
  }, [events]);

  function getOccurrencesForDate(date: Date): EventOccurrence[] {
    const dateKey = format(date, "yyyy-MM-dd");
    return occurrenceMap.get(dateKey) || [];
  }

  function getRSVPStatus(occurrenceId: string): "going" | "not_going" | null {
    const rsvp = rsvps.find((r) => r.occurrenceId === occurrenceId);
    return rsvp ? (rsvp.status as "going" | "not_going") : null;
  }

  async function loadCoachAttendeesForOccurrences(occurrenceIds: string[]) {
    if (occurrenceIds.length === 0) return;
    setLoadingAttendees(true);
    try {
      const attendeesMap: Record<string, CoachAttendee[]> = {};

      // Fetch RSVPs for each occurrence
      await Promise.all(
        occurrenceIds.map(async (occId) => {
          const response = await fetch(`/api/rsvp?occurrenceId=${occId}`);
          if (response.ok) {
            const data = await response.json();
            // Filter to only coaches/owners who are going
            const coaches = (data.rsvps || [])
              .filter(
                (r: { status: string; user: { role?: string } }) =>
                  r.status === "going" &&
                  (r.user?.role === "coach" || r.user?.role === "owner")
              )
              .map(
                (r: {
                  user: {
                    id: string;
                    name: string | null;
                    email: string;
                    avatarUrl: string | null;
                    phone?: string | null;
                    cellPhone?: string | null;
                  };
                }) => ({
                  id: r.user.id,
                  name: r.user.name,
                  email: r.user.email,
                  avatarUrl: r.user.avatarUrl,
                  phone: r.user.phone || null,
                  cellPhone: r.user.cellPhone || null,
                })
              );
            attendeesMap[occId] = coaches;
          }
        })
      );

      setCoachAttendees(attendeesMap);
    } catch (err) {
      console.error("Error loading coach attendees:", err);
    } finally {
      setLoadingAttendees(false);
    }
  }

  function handleDayClick(date: Date) {
    const occurrences = getOccurrencesForDate(date);
    if (occurrences.length > 0) {
      setSelectedDate(date);
      setSelectedOccurrences(occurrences);
      setRsvpDialogOpen(true);
      // Load coach attendees for athletes
      if (isAthlete) {
        loadCoachAttendeesForOccurrences(occurrences.map((o) => o.id));
      }
    }
  }

  async function handleRSVP(
    occurrenceId: string,
    status: "going" | "not_going"
  ) {
    if (userInfo?.role !== "athlete") return;

    try {
      setUpdatingRsvp(occurrenceId);
      const response = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ occurrenceId, status }),
      });
      if (!response.ok) throw new Error("Failed to RSVP");

      const data = await response.json();

      // Optimistically update the RSVP state without refetching everything
      if (data.rsvp) {
        setRsvps((prevRsvps) => {
          const existingIndex = prevRsvps.findIndex(
            (r) => r.occurrenceId === occurrenceId
          );
          if (existingIndex >= 0) {
            // Update existing RSVP
            const updated = [...prevRsvps];
            updated[existingIndex] = {
              id: data.rsvp.id,
              status: data.rsvp.status,
              occurrenceId: data.rsvp.occurrenceId,
            };
            return updated;
          }
          // Add new RSVP
          return [
            ...prevRsvps,
            {
              id: data.rsvp.id,
              status: data.rsvp.status,
              occurrenceId: data.rsvp.occurrenceId,
            },
          ];
        });
      }
    } catch (err) {
      console.error("Error RSVPing:", err);
    } finally {
      setUpdatingRsvp(null);
    }
  }

  async function handleCancelOccurrence(occurrenceId: string) {
    if (userInfo?.role !== "coach" && userInfo?.role !== "owner") return;

    try {
      setCancelingOccurrence(occurrenceId);

      // Find the occurrence to get the event ID
      const occurrence = events.find((occ) => occ.id === occurrenceId);
      if (!occurrence) {
        throw new Error("Occurrence not found");
      }

      const response = await fetch(
        `/api/events/${occurrence.event.id}/cancel-notify`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ occurrenceId, notifyUsers: true }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to cancel occurrence");
      }

      // Reload events to get updated occurrence status
      await loadData();
    } catch (err) {
      console.error("Error canceling occurrence:", err);
      alert(err instanceof Error ? err.message : "Failed to cancel occurrence");
    } finally {
      setCancelingOccurrence(null);
    }
  }

  function formatTime(time: string | undefined | null) {
    if (!time) return "";
    const [hours, minutes] = time.split(":");
    const hour = Number.parseInt(hours, 10);
    if (Number.isNaN(hour)) return time;
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  }

  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const previousMonth = () => setMonth(subMonths(month, 1));
  const nextMonth = () => setMonth(addMonths(month, 1));

  const isCurrentMonth = (date: Date) => {
    return format(date, "yyyy-MM") === format(month, "yyyy-MM");
  };

  const isToday = (date: Date) => {
    return isSameDay(date, new Date());
  };

  const isAthlete = userInfo?.role === "athlete";

  // Hash function to deterministically assign colors based on event ID
  function hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  // Get unique events and assign colors deterministically
  const uniqueEvents = useMemo(() => {
    const eventMap = new Map<
      string,
      { id: string; title: string; color: string }
    >();
    events.forEach((occ) => {
      if (!eventMap.has(occ.event.id)) {
        // Use hash of event ID to ensure consistent color assignment
        const colorIndex = hashString(occ.event.id) % EVENT_COLORS.length;
        eventMap.set(occ.event.id, {
          id: occ.event.id,
          title: occ.event.title,
          color: EVENT_COLORS[colorIndex],
        });
      }
    });
    return Array.from(eventMap.values());
  }, [events]);

  // Get color for an event
  function getEventColor(eventId: string): string {
    const event = uniqueEvents.find((e) => e.id === eventId);
    return event?.color || "bg-slate-600 dark:bg-slate-700";
  }

  if (loading) {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
        <PageHeader title="Calendar" />
        <div className="flex flex-1 items-center justify-center">
          <div className="text-muted-foreground">Loading calendar...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <PageHeader
        description="View all events and RSVP directly from the calendar"
        title="Calendar"
      />

      <div className="min-h-0 flex-1 overflow-auto p-4">
        <div className="mx-auto max-w-5xl">
          {/* Calendar Header */}
          <div className="mb-4 flex items-center justify-between">
            <Button
              className="h-10 w-10 rounded-xl"
              onClick={previousMonth}
              size="icon"
              variant="ghost"
            >
              <IconChevronLeft className="h-5 w-5" />
            </Button>
            <h2 className="font-semibold text-2xl">
              {format(month, "MMMM yyyy")}
            </h2>
            <Button
              className="h-10 w-10 rounded-xl"
              onClick={nextMonth}
              size="icon"
              variant="ghost"
            >
              <IconChevronRight className="h-5 w-5" />
            </Button>
          </div>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 border-border border-b">
            {weekDays.map((day) => (
              <div
                className="border-border border-r py-2 text-center font-medium text-muted-foreground text-xs last:border-r-0"
                key={day}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 rounded-none border border-border">
            {days.map((day, idx) => {
              const occurrences = getOccurrencesForDate(day);
              const isCurrent = isCurrentMonth(day);
              const isDayToday = isToday(day);
              const hasEvents = occurrences.length > 0;

              // Calculate row and col for border styling
              const row = Math.floor(idx / 7);
              const col = idx % 7;
              const isLastRow = row === Math.floor((days.length - 1) / 7);
              const isLastCol = col === 6;

              let dayClasses =
                "min-h-[100px] flex flex-col p-1.5 text-sm font-medium transition-all cursor-pointer border-r border-b border-border ";

              // Remove right border on last column
              if (isLastCol) {
                dayClasses += "border-r-0 ";
              }

              // Remove bottom border on last row
              if (isLastRow) {
                dayClasses += "border-b-0 ";
              }

              if (isCurrent) {
                dayClasses +=
                  "text-foreground bg-background hover:bg-muted/50 ";
              } else {
                dayClasses +=
                  "text-muted-foreground/40 bg-muted/20 hover:bg-muted/40 ";
              }

              if (isDayToday && isCurrent) {
                dayClasses += "bg-primary/10 ring-2 ring-primary ring-inset ";
              }

              // Check if user has RSVP'd to any occurrence on this day
              const _hasRsvp =
                isAthlete &&
                occurrences.some((occ) => {
                  const rsvpStatus = getRSVPStatus(occ.id);
                  return rsvpStatus !== null;
                });

              return (
                <div
                  className={dayClasses}
                  key={format(day, "yyyy-MM-dd")}
                  {...(hasEvents
                    ? {
                        onClick: () => handleDayClick(day),
                        onKeyDown: (e: React.KeyboardEvent) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleDayClick(day);
                          }
                        },
                        role: "button",
                        tabIndex: 0,
                      }
                    : {})}
                >
                  <span className="mb-1 font-semibold text-sm">
                    {format(day, "d")}
                  </span>
                  {hasEvents && (
                    <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-hidden">
                      {occurrences.slice(0, 3).map((occ) => {
                        const rsvpStatus = isAthlete
                          ? getRSVPStatus(occ.id)
                          : null;
                        // For athletes, use event-specific colors; for others, use RSVP-based colors
                        const eventColor = isAthlete
                          ? getEventColor(occ.event.id)
                          : "bg-slate-600 dark:bg-slate-700";
                        const bgColor =
                          occ.status === "canceled"
                            ? "bg-destructive dark:bg-destructive/80"
                            : isAthlete
                              ? eventColor
                              : rsvpStatus === "going"
                                ? "bg-emerald-600 dark:bg-emerald-700"
                                : rsvpStatus === "not_going"
                                  ? "bg-red-600 dark:bg-red-700"
                                  : "bg-slate-600 dark:bg-slate-700";
                        return (
                          <div
                            className={`rounded-sm px-1.5 py-0.5 text-[10px] ${bgColor} truncate font-medium text-white leading-tight`}
                            key={occ.id}
                            title={occ.event.title}
                          >
                            <span className="block truncate">
                              {occ.event.title}
                            </span>
                          </div>
                        );
                      })}
                      {occurrences.length > 3 && (
                        <div
                          className="truncate rounded-sm bg-muted-foreground/60 px-1.5 py-0.5 font-medium text-[10px] text-white leading-tight dark:bg-muted-foreground/30"
                          title={`+${occurrences.length - 3} more`}
                        >
                          +{occurrences.length - 3} more
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-6 flex justify-center">
            {isAthlete && uniqueEvents.length > 0 ? (
              <div className="inline-flex flex-wrap items-center justify-center gap-2">
                {uniqueEvents.map((event) => (
                  <div
                    className="flex items-center gap-1.5 rounded-sm border border-border bg-muted/30 px-2 py-0.5"
                    key={event.id}
                    title={event.title}
                  >
                    <div
                      className={`h-2.5 w-2.5 rounded-full ${event.color} shrink-0 border border-background`}
                    />
                    <span className="whitespace-nowrap text-foreground text-xs">
                      {event.title}
                    </span>
                  </div>
                ))}
                <div className="flex items-center gap-1.5 rounded-sm border border-destructive/50 bg-destructive/10 px-2 py-0.5">
                  <div className="h-2.5 w-2.5 shrink-0 rounded-full border border-background bg-destructive" />
                  <span className="font-medium text-destructive text-xs">
                    Canceled
                  </span>
                </div>
              </div>
            ) : (
              <div className="inline-flex flex-wrap items-center justify-center gap-2">
                <div className="flex items-center gap-1.5 rounded-sm border border-border bg-muted/30 px-2 py-0.5">
                  <div className="h-2.5 w-2.5 shrink-0 rounded-full border border-background bg-primary" />
                  <span className="text-foreground text-xs">Event</span>
                </div>
                {isAthlete && (
                  <>
                    <div className="flex items-center gap-1.5 rounded-sm border border-emerald-500/50 bg-emerald-500/10 px-2 py-0.5">
                      <div className="h-2.5 w-2.5 shrink-0 rounded-full border border-background bg-emerald-500" />
                      <span className="text-emerald-600 text-xs dark:text-emerald-400">
                        Going
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 rounded-sm border border-red-500/50 bg-red-500/10 px-2 py-0.5">
                      <div className="h-2.5 w-2.5 shrink-0 rounded-full border border-background bg-red-500" />
                      <span className="text-red-600 text-xs dark:text-red-400">
                        Can't Go
                      </span>
                    </div>
                  </>
                )}
                <div className="flex items-center gap-1.5 rounded-sm border border-destructive/50 bg-destructive/10 px-2 py-0.5">
                  <div className="h-2.5 w-2.5 shrink-0 rounded-full border border-background bg-destructive" />
                  <span className="font-medium text-destructive text-xs">
                    Canceled
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RSVP Dialog */}
      <Dialog onOpenChange={setRsvpDialogOpen} open={rsvpDialogOpen}>
        <DialogContent className="max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle>
              {selectedDate && format(selectedDate, "EEEE, MMMM d, yyyy")}
            </DialogTitle>
            <DialogDescription>
              {selectedOccurrences.length === 1
                ? "RSVP to this event"
                : `${selectedOccurrences.length} events on this day`}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] space-y-3 overflow-y-auto">
            {selectedOccurrences.map((occ) => {
              const rsvpStatus = isAthlete ? getRSVPStatus(occ.id) : null;
              const isCanceled = occ.status === "canceled";
              const isUpdating = updatingRsvp === occ.id;
              const isCanceling = cancelingOccurrence === occ.id;

              const isCoachOrOwner =
                userInfo?.role === "coach" || userInfo?.role === "owner";

              return (
                <div
                  className={`rounded-xl border p-4 ${
                    isCanceled ? "bg-muted opacity-50" : "bg-card"
                  }`}
                  key={occ.id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="mb-1 font-semibold text-sm">
                        {occ.event.title}
                      </h3>
                      <div className="flex items-center gap-2 text-muted-foreground text-xs">
                        <IconClock className="h-3 w-3" />
                        <span>
                          {formatTime(occ.event.startTime)} -{" "}
                          {formatTime(occ.event.endTime)}
                        </span>
                      </div>
                      {isCanceled && (
                        <Badge className="mt-2 text-xs" variant="destructive">
                          Canceled
                        </Badge>
                      )}
                      {isAthlete && rsvpStatus && !isCanceled && (
                        <Badge
                          className="mt-2 text-xs"
                          variant={
                            rsvpStatus === "going" ? "default" : "secondary"
                          }
                        >
                          {rsvpStatus === "going" ? "Going" : "Can't Go"}
                        </Badge>
                      )}
                      {/* Show coach attendees for athletes */}
                      {isAthlete &&
                        !isCanceled &&
                        coachAttendees[occ.id]?.length > 0 && (
                          <div className="mt-3 border-t pt-3">
                            <p className="mb-2 text-muted-foreground text-xs">
                              Coaches attending:
                            </p>
                            <div className="space-y-2">
                              {coachAttendees[occ.id].map((coach) => (
                                <div
                                  className="group flex items-center gap-2"
                                  key={coach.id}
                                >
                                  <Avatar className="h-6 w-6">
                                    <AvatarImage
                                      src={coach.avatarUrl || undefined}
                                    />
                                    <AvatarFallback className="text-[10px]">
                                      {coach.name?.charAt(0) || "C"}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="flex-1 text-sm">
                                    {coach.name || coach.email}
                                  </span>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
                                        size="icon"
                                        variant="ghost"
                                      >
                                        <IconDotsVertical className="h-3 w-3" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent
                                      align="end"
                                      className="rounded-xl"
                                    >
                                      <DropdownMenuItem asChild>
                                        <Link
                                          className="flex cursor-pointer items-center gap-2"
                                          href={`/chat?userId=${coach.id}`}
                                        >
                                          <IconMessage className="h-4 w-4" />
                                          Chat
                                        </Link>
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      {(coach.cellPhone || coach.phone) && (
                                        <DropdownMenuItem asChild>
                                          <a
                                            className="flex cursor-pointer items-center gap-2"
                                            href={`tel:${coach.cellPhone || coach.phone}`}
                                          >
                                            <IconPhone className="h-4 w-4" />
                                            Call
                                          </a>
                                        </DropdownMenuItem>
                                      )}
                                      {(coach.cellPhone || coach.phone) && (
                                        <DropdownMenuItem asChild>
                                          <a
                                            className="flex cursor-pointer items-center gap-2"
                                            href={`sms:${coach.cellPhone || coach.phone}`}
                                          >
                                            <IconMessage className="h-4 w-4" />
                                            Text
                                          </a>
                                        </DropdownMenuItem>
                                      )}
                                      <DropdownMenuItem asChild>
                                        <a
                                          className="flex cursor-pointer items-center gap-2"
                                          href={`mailto:${coach.email}`}
                                        >
                                          <IconMail className="h-4 w-4" />
                                          Email
                                        </a>
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      {isAthlete && loadingAttendees && (
                        <div className="mt-3 border-t pt-3">
                          <p className="text-muted-foreground text-xs">
                            Loading coaches...
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      {isAthlete && !isCanceled && (
                        <div className="flex items-center gap-2">
                          <Button
                            className={`h-8 rounded-lg ${
                              rsvpStatus === "going"
                                ? "bg-emerald-600 hover:bg-emerald-700"
                                : ""
                            }`}
                            disabled={isUpdating}
                            onClick={() => handleRSVP(occ.id, "going")}
                            size="sm"
                            variant={
                              rsvpStatus === "going" ? "default" : "outline"
                            }
                          >
                            <IconCheck className="h-3 w-3" />
                          </Button>
                          <Button
                            className="h-8 rounded-lg"
                            disabled={isUpdating}
                            onClick={() => handleRSVP(occ.id, "not_going")}
                            size="sm"
                            variant={
                              rsvpStatus === "not_going"
                                ? "secondary"
                                : "outline"
                            }
                          >
                            <IconX className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Button
                          asChild
                          className="h-8 gap-1 rounded-lg text-xs"
                          size="sm"
                          variant="ghost"
                        >
                          <Link
                            href={`/events?eventId=${occ.event.id}&occurrenceId=${occ.id}`}
                          >
                            <IconEye className="h-3 w-3" />
                            View Details
                          </Link>
                        </Button>
                        {isCoachOrOwner && (
                          <>
                            <Button
                              asChild
                              className="h-8 gap-1 rounded-lg text-xs"
                              size="sm"
                              variant="ghost"
                            >
                              <Link href={`/events/${occ.event.id}/edit`}>
                                <IconEdit className="h-3 w-3" />
                                Edit
                              </Link>
                            </Button>
                            {!isCanceled && (
                              <Button
                                className="h-8 gap-1 rounded-lg text-destructive text-xs hover:bg-destructive/10 hover:text-destructive"
                                disabled={isCanceling}
                                onClick={() => handleCancelOccurrence(occ.id)}
                                size="sm"
                                variant="ghost"
                              >
                                <IconBan className="h-3 w-3" />
                                Cancel
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button
              className="rounded-xl"
              onClick={() => setRsvpDialogOpen(false)}
              variant="outline"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
