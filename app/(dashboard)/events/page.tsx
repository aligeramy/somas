"use client";

import {
  IconAlertTriangle,
  IconBell,
  IconCalendar,
  IconCheck,
  IconClock,
  IconDotsVertical,
  IconEdit,
  IconHistory,
  IconList,
  IconPlus,
  IconRepeat,
  IconTrash,
  IconUsers,
  IconX,
} from "@tabler/icons-react";
import { format } from "date-fns";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CustomEventCalendar } from "@/components/custom-event-calendar";
import { PageHeader } from "@/components/page-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface EventOccurrence {
  id: string;
  date: string;
  status: string;
  isCustom?: boolean;
  note?: string;
}

interface Event {
  id: string;
  title: string;
  description?: string;
  location?: string;
  startTime: string;
  endTime: string;
  recurrenceRule: string | null;
  occurrences: EventOccurrence[];
}

interface RSVPUser {
  id: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
  status: string;
}

interface GymMember {
  id: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
  role: string;
}

// Custom hook for events page breakpoint (1200px)
function useIsEventsMobile() {
  const [isEventsMobile, setIsEventsMobile] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    const checkWidth = () => {
      setIsEventsMobile(window.innerWidth < 1200);
    };
    
    checkWidth();
    window.addEventListener("resize", checkWidth);
    return () => window.removeEventListener("resize", checkWidth);
  }, []);

  return !!isEventsMobile;
}

export default function EventsPage() {
  const searchParams = useSearchParams();
  const isEventsMobile = useIsEventsMobile();
  const [events, setEvents] = useState<Event[]>([]);
  const [gymMembers, setGymMembers] = useState<GymMember[]>([]);
  const [gymMembersLoading, setGymMembersLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [selectedOccurrence, setSelectedOccurrence] =
    useState<EventOccurrence | null>(null);
  const [occurrenceRsvps, setOccurrenceRsvps] = useState<RSVPUser[]>([]);
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [showPastEvents, setShowPastEvents] = useState(false);
  const [sendingReminder, setSendingReminder] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [mobileView, setMobileView] = useState<"events" | "occurrences" | "details">("events");
  const isInitialMount = useRef(true);

  // Cancel dialog state
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [notifyOnCancel, setNotifyOnCancel] = useState(true);
  const [canceling, setCanceling] = useState(false);

  // Delete event dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Add custom date dialog
  const [addDateDialogOpen, setAddDateDialogOpen] = useState(false);
  const [customDate, setCustomDate] = useState<Date | null>(null);
  const [addingDate, setAddingDate] = useState(false);

  const loadEvents = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) {
        setInitialLoading(true);
      }
      const response = await fetch("/api/events");
      if (!response.ok) throw new Error("Failed to load events");
      const data = await response.json();
      const newEvents = data.events || [];
      setEvents(newEvents);
      
      // Check URL parameters for eventId and occurrenceId
      const eventIdParam = searchParams.get("eventId");
      const occurrenceIdParam = searchParams.get("occurrenceId");
      
      if (newEvents.length > 0) {
        let eventToSelect: Event | null = null;
        let occurrenceToSelect: EventOccurrence | null = null;
        
        // If URL params exist, try to select that event/occurrence
        if (eventIdParam) {
          eventToSelect = newEvents.find((e: Event) => e.id === eventIdParam) || null;
          if (eventToSelect && occurrenceIdParam) {
            occurrenceToSelect = eventToSelect.occurrences.find(
              (o: EventOccurrence) => o.id === occurrenceIdParam
            ) || null;
          }
        }
        
        // If no URL params or not found, use default selection logic
        if (!eventToSelect) {
          if (!selectedEvent) {
            eventToSelect = newEvents[0];
          } else {
            // Check if current selected event still exists
            const stillExists = newEvents.find((e: Event) => e.id === selectedEvent.id);
            if (!stillExists) {
              eventToSelect = newEvents[0];
            } else {
              eventToSelect = selectedEvent;
            }
          }
        }
        
        setSelectedEvent(eventToSelect);
        setSelectedOccurrence(occurrenceToSelect);
        
        // Set mobile view based on selection
        if (isEventsMobile) {
          if (occurrenceToSelect) {
            setMobileView("details");
          } else if (eventToSelect) {
            setMobileView("occurrences");
          } else {
            setMobileView("events");
          }
        }
        
        // Load RSVPs if occurrence is selected (will be handled by useEffect)
        if (!occurrenceToSelect) {
          setOccurrenceRsvps([]);
        }
      } else {
        setSelectedEvent(null);
        setSelectedOccurrence(null);
        setOccurrenceRsvps([]);
        if (isEventsMobile) {
          setMobileView("events");
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (isInitial) {
        setInitialLoading(false);
      }
    }
  }, [selectedEvent, searchParams, isEventsMobile]);

  const loadGymMembers = useCallback(async () => {
    try {
      setGymMembersLoading(true);
      const response = await fetch("/api/roster");
      if (!response.ok) {
        console.error("Failed to fetch roster:", response.statusText);
        setGymMembers([]);
        return;
      }
      const data = await response.json();
      // Include all gym members (athletes, coaches, and owners) for the "all" tab
      setGymMembers(data.roster || []);
    } catch (err) {
      console.error("Failed to load gym members:", err);
      setGymMembers([]);
    } finally {
      setGymMembersLoading(false);
    }
  }, []);

  const loadOccurrenceRsvps = useCallback(async (occurrenceId: string) => {
    try {
      setRsvpLoading(true);
      const response = await fetch(`/api/rsvp?occurrenceId=${occurrenceId}`);
      if (!response.ok) throw new Error("Failed to load RSVPs");
      const data = await response.json();
      setOccurrenceRsvps(
        (data.rsvps || []).map(
          (r: {
            user: {
              id: string;
              name: string | null;
              email: string;
              avatarUrl: string | null;
            };
            status: string;
          }) => ({
            id: r.user.id,
            name: r.user.name,
            email: r.user.email,
            avatarUrl: r.user.avatarUrl,
            status: r.status,
          }),
        ),
      );
    } catch (err) {
      console.error(err);
    } finally {
      setRsvpLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      loadEvents(true);
      loadGymMembers();
    }
  }, [loadEvents, loadGymMembers]);

  // Load RSVPs when occurrence is selected from URL params
  useEffect(() => {
    if (selectedOccurrence) {
      loadOccurrenceRsvps(selectedOccurrence.id);
    }
  }, [selectedOccurrence, loadOccurrenceRsvps]);

  async function handleCancelWithNotify() {
    if (!selectedOccurrence) return;
    setCanceling(true);
    try {
      const response = await fetch(
        `/api/events/${selectedEvent?.id}/cancel-notify`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            occurrenceId: selectedOccurrence.id,
            notifyUsers: notifyOnCancel,
          }),
        },
      );
      if (!response.ok) throw new Error("Failed to cancel");
      const data = await response.json();

      setCancelDialogOpen(false);
      await loadEvents();
      setSelectedOccurrence(null);

      if (notifyOnCancel && data.notified > 0) {
        alert(`Session canceled. ${data.notified} user(s) notified.`);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to cancel session");
    } finally {
      setCanceling(false);
    }
  }

  async function handleDeleteEvent() {
    if (!selectedEvent) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/events/${selectedEvent.id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete");

      setDeleteDialogOpen(false);
      setSelectedEvent(null);
      setSelectedOccurrence(null);
      await loadEvents();
    } catch (err) {
      console.error(err);
      alert("Failed to delete event");
    } finally {
      setDeleting(false);
    }
  }

  async function handleToggleOccurrence(
    date: Date,
    currentStatus: string | null,
  ) {
    if (!selectedEvent) return;

    const occurrence = selectedEvent.occurrences.find((occ) => {
      const occDate = new Date(occ.date);
      return occDate.toDateString() === date.toDateString();
    });

    if (!occurrence) return;

    if (currentStatus === "scheduled") {
      setSelectedOccurrence(occurrence);
      setCancelDialogOpen(true);
    } else if (currentStatus === "canceled") {
      // Restore the occurrence
      try {
        const response = await fetch(`/api/events/${selectedEvent.id}/cancel`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            occurrenceId: occurrence.id,
            date: occurrence.date,
            restore: true,
          }),
        });
        if (response.ok) {
          await loadEvents();
        }
      } catch (err) {
        console.error(err);
      }
    }
  }

  async function handleAddCustomDate(date: Date) {
    setCustomDate(date);
    setAddDateDialogOpen(true);
  }

  async function confirmAddCustomDate() {
    if (!selectedEvent || !customDate) return;
    setAddingDate(true);
    try {
      const response = await fetch(
        `/api/events/${selectedEvent.id}/occurrences`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date: customDate.toISOString() }),
        },
      );
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to add date");
      }
      setAddDateDialogOpen(false);
      setCustomDate(null);
      await loadEvents();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to add date");
    } finally {
      setAddingDate(false);
    }
  }

  async function handleRemoveCustomDate(occurrenceId: string) {
    if (!selectedEvent) return;
    try {
      const response = await fetch(
        `/api/events/${selectedEvent.id}/occurrences`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ occurrenceId }),
        },
      );
      if (!response.ok) throw new Error("Failed to remove");
      await loadEvents();
    } catch (err) {
      console.error(err);
      alert("Failed to remove custom date");
    }
  }

  async function handleEditRsvp(userId: string, status: "going" | "not_going") {
    if (!selectedOccurrence) return;
    try {
      const response = await fetch("/api/rsvp/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          occurrenceId: selectedOccurrence.id,
          status,
        }),
      });
      if (!response.ok) throw new Error("Failed to edit RSVP");
      await loadOccurrenceRsvps(selectedOccurrence.id);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleSendReminders() {
    if (!selectedOccurrence) return;
    setSendingReminder(true);
    try {
      const response = await fetch("/api/reminders/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ occurrenceId: selectedOccurrence.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      alert(`Sent ${data.sent} reminder(s)`);
    } catch (err) {
      console.error(err);
      alert("Failed to send reminders");
    } finally {
      setSendingReminder(false);
    }
  }

  function selectEvent(event: Event) {
    setSelectedEvent(event);
    setSelectedOccurrence(null);
    setOccurrenceRsvps([]);
    if (isEventsMobile && event) {
      setMobileView("occurrences");
    }
  }

  function selectOccurrence(occurrence: EventOccurrence) {
    setSelectedOccurrence(occurrence);
    loadOccurrenceRsvps(occurrence.id);
    if (isEventsMobile && occurrence) {
      setMobileView("details");
    }
  }

  function formatDate(dateValue: string | Date | undefined | null) {
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

  function formatTime(time: string | undefined | null) {
    if (!time) return "";
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours, 10);
    if (Number.isNaN(hour)) return time;
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  }

  function getRecurrenceLabel(rule: string | null) {
    if (!rule) return "One-time";
    if (rule.includes("DAILY")) return "Daily";
    if (rule.includes("WEEKLY")) return "Weekly";
    if (rule.includes("MONTHLY")) return "Monthly";
    return "Recurring";
  }

  function getInitials(name: string | null, email: string) {
    if (name)
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    return email[0].toUpperCase();
  }

  function isPastDate(dateStr: string) {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  }

  const futureOccurrences =
    selectedEvent?.occurrences.filter((o) => !isPastDate(o.date)) || [];
  const pastOccurrences =
    selectedEvent?.occurrences.filter((o) => isPastDate(o.date)) || [];
  const displayedOccurrences = showPastEvents
    ? [...futureOccurrences, ...pastOccurrences]
    : futureOccurrences;

  const goingUsers = occurrenceRsvps.filter((r) => r.status === "going");
  const notGoingUsers = occurrenceRsvps.filter((r) => r.status === "not_going");
  const respondedIds = new Set(occurrenceRsvps.map((r) => r.id));
  const notAnsweredUsers = gymMembers.filter((m) => !respondedIds.has(m.id));

  // Mobile fullscreen tabs experience (for screens < 1200px)
  if (isEventsMobile) {
    return (
      <div className="flex flex-1 flex-col min-h-0 h-full overflow-hidden">
        <PageHeader title="Events">
          <Button size="sm" className="gap-2 rounded-xl" asChild>
            <Link href="/events/new">
              <IconPlus className="h-4 w-4" />
              New Event
            </Link>
          </Button>
        </PageHeader>

        <Tabs value={mobileView} onValueChange={(value) => setMobileView(value as typeof mobileView)} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Mobile Tab Navigation */}
          <div className="px-4 shrink-0">
            <TabsList className="w-full grid grid-cols-3 h-12">
              <TabsTrigger value="events" className="text-sm">
                Events
              </TabsTrigger>
              <TabsTrigger value="occurrences" className="text-sm" disabled={!selectedEvent}>
                Sessions
              </TabsTrigger>
              <TabsTrigger value="details" className="text-sm" disabled={!selectedOccurrence}>
                Details
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Events Tab - Fullscreen */}
          <TabsContent value="events" className="flex-1 flex flex-col min-h-0 m-0 overflow-hidden">
            <ScrollArea className="flex-1">
              <div className="p-4">
                {initialLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4].map((i) => (
                      <Skeleton key={i} className="h-24 w-full rounded-xl" />
                    ))}
                  </div>
                ) : events.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <IconCalendar className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p className="text-sm">No events yet</p>
                    <Button className="mt-4" asChild>
                      <Link href="/events/new">Create your first event</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {events.map((event) => (
                      <div
                        key={event.id}
                        className={`relative w-full rounded-xl transition-all ${
                          selectedEvent?.id === event.id
                            ? "bg-primary text-primary-foreground"
                            : "bg-card hover:bg-muted/50"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <button
                            type="button"
                            onClick={() => selectEvent(event)}
                            className="flex-1 text-left p-4 min-w-0"
                          >
                            <p className="font-semibold text-base mb-2">
                              {event.title}
                            </p>
                            <div className="flex flex-wrap items-center gap-3 text-sm opacity-80">
                              <div className="flex items-center gap-1.5">
                                <IconClock className="h-4 w-4" />
                                {formatTime(event.startTime)}
                              </div>
                              <div className="flex items-center gap-1.5">
                                <IconRepeat className="h-4 w-4" />
                                {getRecurrenceLabel(event.recurrenceRule)}
                              </div>
                            </div>
                          </button>
                          <div className="p-2">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
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
                                  <Link href={`/events/${event.id}/edit`}>
                                    <IconEdit className="h-4 w-4" />
                                    Edit Event
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="gap-2 text-destructive focus:text-destructive"
                                  onClick={() => {
                                    setSelectedEvent(event);
                                    setDeleteDialogOpen(true);
                                  }}
                                >
                                  <IconTrash className="h-4 w-4" />
                                  Delete Event
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Occurrences Tab - Fullscreen */}
          <TabsContent value="occurrences" className="flex-1 flex flex-col min-h-0 m-0 overflow-hidden">
            {selectedEvent ? (
              <>
                <div className="p-4 shrink-0">
                  <h2 className="font-semibold text-lg">{selectedEvent.title}</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {formatTime(selectedEvent.startTime)} - {formatTime(selectedEvent.endTime)}
                  </p>
                </div>
                <ScrollArea className="flex-1">
                  <div className="p-4">
                    {displayedOccurrences.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground">
                        <IconCalendar className="h-12 w-12 mx-auto mb-4 opacity-20" />
                        <p className="text-sm">No upcoming sessions</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {displayedOccurrences.map((occ) => {
                          const isPast = isPastDate(occ.date);
                          const dateInfo = formatDate(occ.date);
                          return (
                            <button
                              key={occ.id}
                              type="button"
                              onClick={() => selectOccurrence(occ)}
                              className={`w-full text-left p-4 rounded-xl transition-all ${
                                selectedOccurrence?.id === occ.id
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-card hover:bg-muted/50"
                              } ${isPast ? "opacity-60" : ""} ${occ.status === "canceled" ? "opacity-40" : ""}`}
                            >
                              <div className="flex items-center gap-4">
                                <div
                                  className={`h-16 w-16 rounded-xl flex flex-col items-center justify-center shrink-0 ${
                                    selectedOccurrence?.id === occ.id
                                      ? "bg-primary-foreground/20"
                                      : "bg-muted"
                                  }`}
                                >
                                  <span className="text-2xl font-bold leading-none">
                                    {dateInfo.day}
                                  </span>
                                  <span className="text-xs font-medium opacity-70 mt-1">
                                    {dateInfo.month}
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-base mb-1">
                                    {dateInfo.weekday}
                                  </p>
                                  <p className="text-sm opacity-80">
                                    {formatTime(selectedEvent.startTime)}
                                  </p>
                                </div>
                                <div className="flex flex-col items-end gap-1 shrink-0">
                                  {occ.status === "canceled" && (
                                    <Badge variant="destructive" className="text-xs">
                                      Canceled
                                    </Badge>
                                  )}
                                  {(
                                    occ as EventOccurrence & { isCustom?: boolean }
                                  ).isCustom && (
                                    <Badge variant="outline" className="text-xs">
                                      Custom
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {pastOccurrences.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowPastEvents(!showPastEvents)}
                        className="w-full mt-4 p-3 text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-2 rounded-xl"
                      >
                        <IconHistory className="h-4 w-4" />
                        {showPastEvents ? "Hide" : "Show"} past sessions ({pastOccurrences.length})
                      </button>
                    )}
                  </div>
                </ScrollArea>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <IconCalendar className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p className="text-sm">Select an event first</p>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Details Tab - Fullscreen */}
          <TabsContent value="details" className="flex-1 flex flex-col min-h-0 m-0 overflow-hidden">
            {selectedOccurrence ? (
              <>
                <div className="p-4 shrink-0">
                  <h2 className="font-semibold text-lg">{selectedEvent?.title}</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {formatDate(selectedOccurrence.date).weekday},{" "}
                    {formatDate(selectedOccurrence.date).month}{" "}
                    {formatDate(selectedOccurrence.date).day} •{" "}
                    {formatTime(selectedEvent?.startTime)}
                  </p>
                  <div className="flex flex-col gap-2 mt-4">
                    {notAnsweredUsers.length > 0 &&
                      selectedOccurrence.status !== "canceled" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleSendReminders}
                          disabled={sendingReminder}
                          className="w-full gap-2 rounded-xl"
                        >
                          <IconBell className="h-4 w-4" />
                          {sendingReminder
                            ? "Sending..."
                            : `Send Reminders (${notAnsweredUsers.length})`}
                        </Button>
                      )}
                    {selectedOccurrence.status !== "canceled" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCancelDialogOpen(true)}
                        className="w-full text-destructive hover:text-destructive rounded-xl"
                      >
                        <IconX className="h-4 w-4 mr-2" />
                        Cancel Session
                      </Button>
                    )}
                  </div>
                </div>
                <div className="flex-1 overflow-hidden">
                  {rsvpLoading ? (
                    <div className="flex flex-col h-full p-4">
                      <Skeleton className="h-12 w-full mb-4 rounded-xl" />
                      <div className="space-y-3">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <div key={i} className="flex items-center gap-3 p-3 rounded-xl">
                            <Skeleton className="h-12 w-12 rounded-xl" />
                            <div className="flex-1 space-y-2">
                              <Skeleton className="h-4 w-32" />
                              <Skeleton className="h-3 w-48" />
                            </div>
                            <Skeleton className="h-6 w-20 rounded-full" />
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <Tabs defaultValue="all" className="h-full flex flex-col min-h-0">
                      <div className="px-4 pt-4 shrink-0">
                        <TabsList className="w-full grid grid-cols-4 h-10 rounded-xl">
                          <TabsTrigger value="all" className="text-xs rounded-lg">
                            All ({gymMembers.length})
                          </TabsTrigger>
                          <TabsTrigger value="going" className="text-xs rounded-lg">
                            Going ({goingUsers.length})
                          </TabsTrigger>
                          <TabsTrigger value="not_going" className="text-xs rounded-lg">
                            Can't ({notGoingUsers.length})
                          </TabsTrigger>
                          <TabsTrigger value="pending" className="text-xs rounded-lg">
                            Pending ({notAnsweredUsers.length})
                          </TabsTrigger>
                        </TabsList>
                      </div>
                      <TabsContent value="all" className="flex-1 overflow-auto mt-0 p-4 min-h-0">
                        {gymMembersLoading ? (
                          <div className="space-y-3">
                            {[1, 2, 3].map((i) => (
                              <div key={i} className="flex items-center gap-3 p-3 rounded-xl">
                                <Skeleton className="h-10 w-10 rounded-xl" />
                                <div className="flex-1 space-y-2">
                                  <Skeleton className="h-4 w-32" />
                                  <Skeleton className="h-3 w-48" />
                                </div>
                                <Skeleton className="h-6 w-16 rounded-full" />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <UserList
                            users={gymMembers.map((m) => ({
                              ...m,
                              status:
                                occurrenceRsvps.find((r) => r.id === m.id)?.status || null,
                            }))}
                            getInitials={getInitials}
                            onEditRsvp={handleEditRsvp}
                          />
                        )}
                      </TabsContent>
                      <TabsContent value="going" className="flex-1 overflow-auto mt-0 p-4">
                        <UserList
                          users={goingUsers.map((u) => ({
                            ...u,
                            status: "going",
                          }))}
                          getInitials={getInitials}
                          onEditRsvp={handleEditRsvp}
                        />
                      </TabsContent>
                      <TabsContent value="not_going" className="flex-1 overflow-auto mt-0 p-4">
                        <UserList
                          users={notGoingUsers.map((u) => ({
                            ...u,
                            status: "not_going",
                          }))}
                          getInitials={getInitials}
                          onEditRsvp={handleEditRsvp}
                        />
                      </TabsContent>
                      <TabsContent value="pending" className="flex-1 overflow-auto mt-0 p-4">
                        <UserList
                          users={notAnsweredUsers.map((u) => ({
                            ...u,
                            status: null,
                          }))}
                          getInitials={getInitials}
                          onEditRsvp={handleEditRsvp}
                        />
                      </TabsContent>
                    </Tabs>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <IconUsers className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p className="text-sm">Select a session to view details</p>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // Desktop layout (unchanged)
  return (
    <div className="flex flex-1 flex-col min-h-0 h-full overflow-hidden">
      <PageHeader title="Events">
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border p-1 gap-1">
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8 rounded-lg p-0"
              onClick={() => setViewMode("list")}
            >
              <IconList className="h-4 w-4 !m-0" />
            </Button>
            <Button
              variant={viewMode === "calendar" ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8 rounded-lg p-0"
              onClick={() => setViewMode("calendar")}
            >
              <IconCalendar className="h-4 w-4 !m-0" />
            </Button>
          </div>
          <Button size="sm" className="gap-2 rounded-xl" asChild>
            <Link href="/events/new">
              <IconPlus className="h-4 w-4" />
              New Event
            </Link>
          </Button>
        </div>
      </PageHeader>

      <div className="flex flex-1 overflow-hidden gap-4 min-h-0 h-0">
        {/* Events Sidebar */}
        <div className="w-64 flex flex-col bg-card border rounded-xl shadow-sm overflow-hidden min-h-0 h-full">
          <ScrollArea className="h-full">
            <div className="p-2">
              {initialLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-20 w-full rounded-xl" />
                  ))}
                </div>
              ) : events.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No events yet
                </div>
              ) : (
                events.map((event) => (
                  <div key={event.id} className="relative group">
                    <button
                      type="button"
                      onClick={() => selectEvent(event)}
                      className={`w-full text-left p-3 rounded-xl mb-1 transition-all ${
                        selectedEvent?.id === event.id
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted"
                      }`}
                    >
                      <p className="font-medium truncate text-sm pr-6">
                        {event.title}
                      </p>
                      <div
                        className={`flex items-center gap-2 mt-1.5 text-xs ${
                          selectedEvent?.id === event.id
                            ? "text-primary-foreground/70"
                            : "text-muted-foreground"
                        }`}
                      >
                        <IconClock className="h-3 w-3" />
                        {formatTime(event.startTime)}
                        <span className="opacity-50">•</span>
                        <IconRepeat className="h-3 w-3" />
                        {getRecurrenceLabel(event.recurrenceRule)}
                      </div>
                    </button>

                    {/* Event Actions */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`absolute right-2 top-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity ${
                            selectedEvent?.id === event.id
                              ? "text-primary-foreground hover:bg-primary-foreground/20"
                              : ""
                          }`}
                        >
                          <IconDotsVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl">
                        <DropdownMenuItem asChild className="gap-2">
                          <Link href={`/events/${event.id}/edit`}>
                            <IconEdit className="h-4 w-4" />
                            Edit Event
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="gap-2 text-destructive focus:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEvent(event);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <IconTrash className="h-4 w-4" />
                          Delete Event
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Main Content */}
        {viewMode === "calendar" ? (
          <div className="flex-1 overflow-auto min-h-0 h-full">
            {selectedEvent ? (
              <div className="h-full flex flex-col p-4">
                <div className="mb-4 shrink-0">
                  <h2 className="text-xl font-semibold">
                    {selectedEvent.title}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {formatTime(selectedEvent.startTime)} -{" "}
                    {formatTime(selectedEvent.endTime)}
                  </p>
                </div>
                <div className="flex-1 min-h-0">
                  <CustomEventCalendar
                    occurrences={selectedEvent.occurrences.map((o) => ({
                      ...o,
                      isCustom:
                        (o as EventOccurrence & { isCustom?: boolean })
                          .isCustom || false,
                    }))}
                    eventTitle={selectedEvent.title}
                    onToggleDate={handleToggleOccurrence}
                    onAddCustomDate={handleAddCustomDate}
                    onRemoveDate={handleRemoveCustomDate}
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Select an event to view calendar
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Occurrences List */}
            <div className="w-72 flex flex-col bg-card border rounded-xl shadow-sm overflow-hidden min-h-0 h-full">
              {initialLoading ? (
                <>
                  <ScrollArea className="h-full">
                    <div className="p-2 space-y-2">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-20 w-full rounded-xl" />
                      ))}
                    </div>
                  </ScrollArea>
                </>
              ) : selectedEvent ? (
                <>
                  <ScrollArea className="h-full">
                    <div className="p-2">
                      {displayedOccurrences.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          No upcoming sessions
                        </div>
                      ) : (
                        displayedOccurrences.map((occ) => {
                          const isPast = isPastDate(occ.date);
                          const dateInfo = formatDate(occ.date);
                          return (
                            <button
                              key={occ.id}
                              type="button"
                              onClick={() => selectOccurrence(occ)}
                              className={`w-full text-left p-3 rounded-xl mb-1 transition-all flex items-center gap-3 ${
                                selectedOccurrence?.id === occ.id
                                  ? "bg-primary/10 ring-1 ring-primary"
                                  : "hover:bg-muted"
                              } ${isPast ? "opacity-50" : ""} ${occ.status === "canceled" ? "opacity-40" : ""}`}
                            >
                              <div
                                className={`h-14 w-14 rounded-xl flex flex-col items-center justify-center shrink-0 ${
                                  selectedOccurrence?.id === occ.id
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted"
                                }`}
                              >
                                <span className="text-xl font-bold leading-none">
                                  {dateInfo.day}
                                </span>
                                <span className="text-[10px] font-medium opacity-70 mt-0.5">
                                  {dateInfo.month}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm whitespace-nowrap">
                                  {dateInfo.weekday}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {formatTime(selectedEvent.startTime)}
                                </p>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                {occ.status === "canceled" && (
                                  <Badge
                                    variant="destructive"
                                    className="text-[10px]"
                                  >
                                    Canceled
                                  </Badge>
                                )}
                                {(
                                  occ as EventOccurrence & {
                                    isCustom?: boolean;
                                  }
                                ).isCustom && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px]"
                                  >
                                    Custom
                                  </Badge>
                                )}
                              </div>
                            </button>
                          );
                        })
                      )}
                      {pastOccurrences.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setShowPastEvents(!showPastEvents)}
                          className="w-full p-3 text-xs text-muted-foreground hover:text-foreground flex items-center justify-center gap-2"
                        >
                          <IconHistory className="h-4 w-4" />
                          {showPastEvents ? "Hide" : "Show"} past sessions
                        </button>
                      )}
                    </div>
                  </ScrollArea>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
                  Select an event
                </div>
              )}
            </div>

            {/* RSVP Detail */}
            <div className="flex-1 flex flex-col bg-card border rounded-xl shadow-sm overflow-hidden min-h-0">
              {selectedOccurrence ? (
                <>
                  <div className="p-4 border-b flex items-center justify-between shrink-0">
                    <div>
                      <h3 className="font-semibold">{selectedEvent?.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(selectedOccurrence.date).weekday},{" "}
                        {formatDate(selectedOccurrence.date).month}{" "}
                        {formatDate(selectedOccurrence.date).day} •{" "}
                        {formatTime(selectedEvent?.startTime)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {notAnsweredUsers.length > 0 &&
                        selectedOccurrence.status !== "canceled" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleSendReminders}
                            disabled={sendingReminder}
                            className="gap-2 rounded-xl"
                          >
                            <IconBell className="h-4 w-4" />
                            {sendingReminder
                              ? "Sending..."
                              : `Remind (${notAnsweredUsers.length})`}
                          </Button>
                        )}
                      {selectedOccurrence.status !== "canceled" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCancelDialogOpen(true)}
                          className="text-destructive hover:text-destructive rounded-xl"
                        >
                          <IconX className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    {rsvpLoading ? (
                      <div className="flex flex-col h-full p-4">
                        <Skeleton className="h-10 w-full mb-4 rounded-xl" />
                        <div className="space-y-3">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="flex items-center gap-3 p-3 rounded-xl">
                              <Skeleton className="h-10 w-10 rounded-xl" />
                              <div className="flex-1 space-y-2">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-3 w-48" />
                              </div>
                              <Skeleton className="h-6 w-16 rounded-full" />
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <Tabs defaultValue="all" className="h-full flex flex-col min-h-0">
                        <div className="px-4 pt-4 shrink-0">
                          <TabsList className="w-full grid grid-cols-4 h-10 rounded-xl">
                            <TabsTrigger
                              value="all"
                              className="text-xs rounded-lg"
                            >
                              All ({gymMembers.length})
                            </TabsTrigger>
                            <TabsTrigger
                              value="going"
                              className="text-xs rounded-lg"
                            >
                              Going ({goingUsers.length})
                            </TabsTrigger>
                            <TabsTrigger
                              value="not_going"
                              className="text-xs rounded-lg"
                            >
                              Can't ({notGoingUsers.length})
                            </TabsTrigger>
                            <TabsTrigger
                              value="pending"
                              className="text-xs rounded-lg"
                            >
                              Pending ({notAnsweredUsers.length})
                            </TabsTrigger>
                          </TabsList>
                        </div>
                        <TabsContent
                          value="all"
                          className="flex-1 overflow-auto mt-0 p-4 min-h-0"
                        >
                          {gymMembersLoading ? (
                            <div className="space-y-3">
                              {[1, 2, 3].map((i) => (
                                <div key={i} className="flex items-center gap-3 p-3 rounded-xl">
                                  <Skeleton className="h-10 w-10 rounded-xl" />
                                  <div className="flex-1 space-y-2">
                                    <Skeleton className="h-4 w-32" />
                                    <Skeleton className="h-3 w-48" />
                                  </div>
                                  <Skeleton className="h-6 w-16 rounded-full" />
                                </div>
                              ))}
                            </div>
                          ) : (
                            <UserList
                              users={gymMembers.map((m) => ({
                                ...m,
                                status:
                                  occurrenceRsvps.find((r) => r.id === m.id)
                                    ?.status || null,
                              }))}
                              getInitials={getInitials}
                              onEditRsvp={handleEditRsvp}
                            />
                          )}
                        </TabsContent>
                        <TabsContent
                          value="going"
                          className="flex-1 overflow-auto mt-0 p-4"
                        >
                          <UserList
                            users={goingUsers.map((u) => ({
                              ...u,
                              status: "going",
                            }))}
                            getInitials={getInitials}
                            onEditRsvp={handleEditRsvp}
                          />
                        </TabsContent>
                        <TabsContent
                          value="not_going"
                          className="flex-1 overflow-auto mt-0 p-4"
                        >
                          <UserList
                            users={notGoingUsers.map((u) => ({
                              ...u,
                              status: "not_going",
                            }))}
                            getInitials={getInitials}
                            onEditRsvp={handleEditRsvp}
                          />
                        </TabsContent>
                        <TabsContent
                          value="pending"
                          className="flex-1 overflow-auto mt-0 p-4"
                        >
                          <UserList
                            users={notAnsweredUsers.map((u) => ({
                              ...u,
                              status: null,
                            }))}
                            getInitials={getInitials}
                            onEditRsvp={handleEditRsvp}
                          />
                        </TabsContent>
                      </Tabs>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                  <IconUsers className="h-12 w-12 mb-3 opacity-20" />
                  <p className="text-sm">Select a session to view attendance</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Cancel Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="rounded-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconAlertTriangle className="h-5 w-5 text-destructive" />
              Cancel Session
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this session?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="p-3 rounded-xl bg-muted/50 mb-4">
              <p className="font-medium">{selectedEvent?.title}</p>
              <p className="text-sm text-muted-foreground">
                {selectedOccurrence &&
                  formatDate(selectedOccurrence.date).weekday}
                ,{" "}
                {selectedOccurrence &&
                  formatDate(selectedOccurrence.date).month}{" "}
                {selectedOccurrence && formatDate(selectedOccurrence.date).day}
              </p>
            </div>
            <button
              type="button"
              className="flex items-center space-x-3 p-3 rounded-xl bg-muted/50 cursor-pointer w-full text-left"
              onClick={() => setNotifyOnCancel(!notifyOnCancel)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setNotifyOnCancel(!notifyOnCancel);
                }
              }}
            >
              <Checkbox
                checked={notifyOnCancel}
                onCheckedChange={(checked) =>
                  setNotifyOnCancel(checked as boolean)
                }
              />
              <Label className="cursor-pointer">
                Notify all users who RSVP'd "Going" via email
              </Label>
            </button>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCancelDialogOpen(false)}
              className="rounded-xl"
            >
              Keep Session
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelWithNotify}
              disabled={canceling}
              className="rounded-xl"
            >
              {canceling ? "Canceling..." : "Cancel Session"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Event Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="rounded-xl max-w-[calc(100vw-2rem)] sm:max-w-lg">
          <DialogHeader className="text-left">
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <IconTrash className="h-5 w-5" />
              Delete Event
            </DialogTitle>
            <DialogDescription className="text-left">
              This will permanently delete "{selectedEvent?.title}" and all its
              sessions. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              className="rounded-xl w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteEvent}
              disabled={deleting}
              className="rounded-xl w-full sm:w-auto"
            >
              {deleting ? "Deleting..." : "Delete Event"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Custom Date Dialog */}
      <Dialog open={addDateDialogOpen} onOpenChange={setAddDateDialogOpen}>
        <DialogContent className="rounded-xl">
          <DialogHeader>
            <DialogTitle>Add Custom Session</DialogTitle>
            <DialogDescription>
              Add a one-time session for {selectedEvent?.title} on{" "}
              {customDate && format(customDate, "PPPP")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddDateDialogOpen(false)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmAddCustomDate}
              disabled={addingDate}
              className="rounded-xl"
            >
              {addingDate ? "Adding..." : "Add Session"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface UserListProps {
  users: Array<{
    id: string;
    name: string | null;
    email: string;
    avatarUrl: string | null;
    status: string | null;
  }>;
  getInitials: (name: string | null, email: string) => string;
  onEditRsvp?: (userId: string, status: "going" | "not_going") => void;
}

function UserList({ users, getInitials, onEditRsvp }: UserListProps) {
  if (users.length === 0) {
    return (
      <div className="text-center text-sm text-muted-foreground py-8">
        No members in this list
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {users.map((user) => (
        <div
          key={user.id}
          className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors group"
        >
          <Avatar className="h-10 w-10 rounded-xl">
            <AvatarImage src={user.avatarUrl || undefined} />
            <AvatarFallback className="rounded-xl text-xs bg-linear-to-br from-primary/20 to-primary/5">
              {getInitials(user.name, user.email)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">
              {user.name || "Unnamed"}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {user.email}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {user.status === "going" && (
              <div className="flex items-center gap-1 text-emerald-600 bg-emerald-100 dark:bg-emerald-950/50 px-2.5 py-1 rounded-full text-xs font-medium">
                <IconCheck className="h-3 w-3" />
                Going
              </div>
            )}
            {user.status === "not_going" && (
              <div className="flex items-center gap-1 text-red-600 bg-red-100 dark:bg-red-950/50 px-2.5 py-1 rounded-full text-xs font-medium">
                <IconX className="h-3 w-3" />
                Can't Go
              </div>
            )}
            {user.status === null && (
              <div className="flex items-center gap-1 text-amber-600 bg-amber-100 dark:bg-amber-950/50 px-2.5 py-1 rounded-full text-xs font-medium">
                <IconBell className="h-3 w-3" />
                Pending
              </div>
            )}
            {onEditRsvp && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <IconEdit className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-xl">
                  <DropdownMenuItem
                    onClick={() => onEditRsvp(user.id, "going")}
                    className="gap-2"
                  >
                    <IconCheck className="h-4 w-4 text-emerald-600" />
                    Mark as Going
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onEditRsvp(user.id, "not_going")}
                    className="gap-2"
                  >
                    <IconX className="h-4 w-4 text-red-600" />
                    Mark as Can't Go
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
