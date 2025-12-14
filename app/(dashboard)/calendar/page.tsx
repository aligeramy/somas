"use client";

import {
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

      if (!eventsRes.ok || !rsvpsRes.ok) throw new Error("Failed to load data");

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
            },
          );
        },
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
                  (r.user?.role === "coach" || r.user?.role === "owner"),
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
                }),
              );
            attendeesMap[occId] = coaches;
          }
        }),
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
    status: "going" | "not_going",
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
            (r) => r.occurrenceId === occurrenceId,
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
          } else {
            // Add new RSVP
            return [
              ...prevRsvps,
              {
                id: data.rsvp.id,
                status: data.rsvp.status,
                occurrenceId: data.rsvp.occurrenceId,
              },
            ];
          }
        });
      }
    } catch (err) {
      console.error("Error RSVPing:", err);
    } finally {
      setUpdatingRsvp(null);
    }
  }

  function formatTime(time: string | undefined | null) {
    if (!time) return "";
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours, 10);
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

  if (loading) {
    return (
      <div className="flex flex-1 flex-col min-h-0 h-full overflow-hidden">
        <PageHeader title="Calendar" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-muted-foreground">Loading calendar...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col min-h-0 h-full overflow-hidden">
      <PageHeader
        title="Calendar"
        description="View all events and RSVP directly from the calendar"
      />

      <div className="flex-1 overflow-auto min-h-0 p-4">
        <div className="max-w-5xl mx-auto">
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={previousMonth}
              className="h-10 w-10 rounded-xl"
            >
              <IconChevronLeft className="h-5 w-5" />
            </Button>
            <h2 className="text-2xl font-semibold">
              {format(month, "MMMM yyyy")}
            </h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={nextMonth}
              className="h-10 w-10 rounded-xl"
            >
              <IconChevronRight className="h-5 w-5" />
            </Button>
          </div>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {weekDays.map((day) => (
              <div
                key={day}
                className="text-center text-xs font-medium text-muted-foreground py-1"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2">
            {days.map((day, idx) => {
              const occurrences = getOccurrencesForDate(day);
              const isCurrent = isCurrentMonth(day);
              const isDayToday = isToday(day);
              const hasEvents = occurrences.length > 0;

              let dayClasses =
                "h-20 rounded-xl flex flex-col items-center justify-center text-sm font-medium transition-all cursor-pointer border border-border p-1 ";

              if (!isCurrent) {
                dayClasses +=
                  "text-muted-foreground/40 border-muted/50 hover:bg-muted/30 hover:text-muted-foreground/60 ";
              } else {
                dayClasses +=
                  "text-foreground hover:bg-muted hover:text-foreground ";
              }

              if (isDayToday && isCurrent) {
                dayClasses += "ring-2 ring-primary border-primary ";
              }

              if (hasEvents && isCurrent) {
                dayClasses +=
                  "bg-primary/10 border-primary/50 hover:bg-primary/20 ";
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
                  key={idx}
                  className={dayClasses}
                  onClick={() => hasEvents && handleDayClick(day)}
                  onKeyDown={(e) => {
                    if ((e.key === "Enter" || e.key === " ") && hasEvents) {
                      e.preventDefault();
                      handleDayClick(day);
                    }
                  }}
                  role={hasEvents ? "button" : undefined}
                  tabIndex={hasEvents ? 0 : undefined}
                >
                  <span className="text-base font-semibold">
                    {format(day, "d")}
                  </span>
                  {hasEvents && (
                    <div className="flex flex-wrap gap-0.5 justify-center mt-0.5">
                      {occurrences.slice(0, 3).map((occ) => {
                        const rsvpStatus = isAthlete
                          ? getRSVPStatus(occ.id)
                          : null;
                        return (
                          <div
                            key={occ.id}
                            className={`h-1.5 w-1.5 rounded-full ${
                              occ.status === "canceled"
                                ? "bg-destructive"
                                : rsvpStatus === "going"
                                  ? "bg-emerald-500"
                                  : rsvpStatus === "not_going"
                                    ? "bg-red-500"
                                    : "bg-primary"
                            }`}
                            title={occ.event.title}
                          />
                        );
                      })}
                      {occurrences.length > 3 && (
                        <div
                          className="h-1.5 w-1.5 rounded-full bg-muted-foreground"
                          title={`+${occurrences.length - 3} more`}
                        />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-6 mt-6 text-xs text-muted-foreground justify-center flex-wrap">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-primary" />
              <span>Event</span>
            </div>
            {isAthlete && (
              <>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-emerald-500" />
                  <span>Going</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-500" />
                  <span>Can't Go</span>
                </div>
              </>
            )}
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-destructive" />
              <span>Canceled</span>
            </div>
          </div>
        </div>
      </div>

      {/* RSVP Dialog */}
      <Dialog open={rsvpDialogOpen} onOpenChange={setRsvpDialogOpen}>
        <DialogContent className="rounded-xl max-w-md">
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
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {selectedOccurrences.map((occ) => {
              const rsvpStatus = isAthlete ? getRSVPStatus(occ.id) : null;
              const isCanceled = occ.status === "canceled";
              const isUpdating = updatingRsvp === occ.id;

              const isCoachOrOwner =
                userInfo?.role === "coach" || userInfo?.role === "owner";

              return (
                <div
                  key={occ.id}
                  className={`p-4 rounded-xl border ${
                    isCanceled ? "opacity-50 bg-muted" : "bg-card"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm mb-1">
                        {occ.event.title}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <IconClock className="h-3 w-3" />
                        <span>
                          {formatTime(occ.event.startTime)} -{" "}
                          {formatTime(occ.event.endTime)}
                        </span>
                      </div>
                      {isCanceled && (
                        <Badge variant="destructive" className="mt-2 text-xs">
                          Canceled
                        </Badge>
                      )}
                      {isAthlete && rsvpStatus && !isCanceled && (
                        <Badge
                          variant={
                            rsvpStatus === "going" ? "default" : "secondary"
                          }
                          className="mt-2 text-xs"
                        >
                          {rsvpStatus === "going" ? "Going" : "Can't Go"}
                        </Badge>
                      )}
                      {/* Show coach attendees for athletes */}
                      {isAthlete &&
                        !isCanceled &&
                        coachAttendees[occ.id]?.length > 0 && (
                          <div className="mt-3 pt-3 border-t">
                            <p className="text-xs text-muted-foreground mb-2">
                              Coaches attending:
                            </p>
                            <div className="space-y-2">
                              {coachAttendees[occ.id].map((coach) => (
                                <div
                                  key={coach.id}
                                  className="flex items-center gap-2 group"
                                >
                                  <Avatar className="h-6 w-6">
                                    <AvatarImage
                                      src={coach.avatarUrl || undefined}
                                    />
                                    <AvatarFallback className="text-[10px]">
                                      {coach.name?.charAt(0) || "C"}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-sm flex-1">
                                    {coach.name || coach.email}
                                  </span>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
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
                                          href={`/chat?userId=${coach.id}`}
                                          className="flex items-center gap-2 cursor-pointer"
                                        >
                                          <IconMessage className="h-4 w-4" />
                                          Chat
                                        </Link>
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      {(coach.cellPhone || coach.phone) && (
                                        <DropdownMenuItem asChild>
                                          <a
                                            href={`tel:${coach.cellPhone || coach.phone}`}
                                            className="flex items-center gap-2 cursor-pointer"
                                          >
                                            <IconPhone className="h-4 w-4" />
                                            Call
                                          </a>
                                        </DropdownMenuItem>
                                      )}
                                      {(coach.cellPhone || coach.phone) && (
                                        <DropdownMenuItem asChild>
                                          <a
                                            href={`sms:${coach.cellPhone || coach.phone}`}
                                            className="flex items-center gap-2 cursor-pointer"
                                          >
                                            <IconMessage className="h-4 w-4" />
                                            Text
                                          </a>
                                        </DropdownMenuItem>
                                      )}
                                      <DropdownMenuItem asChild>
                                        <a
                                          href={`mailto:${coach.email}`}
                                          className="flex items-center gap-2 cursor-pointer"
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
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-xs text-muted-foreground">
                            Loading coaches...
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {isAthlete && !isCanceled && (
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant={
                              rsvpStatus === "going" ? "default" : "outline"
                            }
                            onClick={() => handleRSVP(occ.id, "going")}
                            disabled={isUpdating}
                            className={`h-8 rounded-lg ${
                              rsvpStatus === "going"
                                ? "bg-emerald-600 hover:bg-emerald-700"
                                : ""
                            }`}
                          >
                            <IconCheck className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant={
                              rsvpStatus === "not_going"
                                ? "secondary"
                                : "outline"
                            }
                            onClick={() => handleRSVP(occ.id, "not_going")}
                            disabled={isUpdating}
                            className="h-8 rounded-lg"
                          >
                            <IconX className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          asChild
                          className="h-8 rounded-lg gap-1 text-xs"
                        >
                          <Link
                            href={`/events?eventId=${occ.event.id}&occurrenceId=${occ.id}`}
                          >
                            <IconEye className="h-3 w-3" />
                            View Details
                          </Link>
                        </Button>
                        {isCoachOrOwner && (
                          <Button
                            size="sm"
                            variant="ghost"
                            asChild
                            className="h-8 rounded-lg gap-1 text-xs"
                          >
                            <Link href={`/events/${occ.event.id}/edit`}>
                              <IconEdit className="h-3 w-3" />
                              Edit
                            </Link>
                          </Button>
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
              variant="outline"
              onClick={() => setRsvpDialogOpen(false)}
              className="rounded-xl"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
