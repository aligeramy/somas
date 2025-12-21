"use client";

import {
  IconAlertTriangle,
  IconArrowLeft,
  IconBan,
  IconBell,
  IconCalendar,
  IconCheck,
  IconClock,
  IconDotsVertical,
  IconEdit,
  IconHistory,
  IconList,
  IconMail,
  IconMessageCircle,
  IconPhone,
  IconPlus,
  IconRepeat,
  IconTrash,
  IconUsers,
  IconX,
} from "@tabler/icons-react";
import { format } from "date-fns";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { CustomEventCalendar } from "@/components/custom-event-calendar";
import { PageHeader } from "@/components/page-header";
import { RealtimeChat } from "@/components/realtime-chat";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { createClient } from "@/lib/supabase/client";

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
  phone?: string | null;
  cellPhone?: string | null;
  role?: string;
}

interface GymMember {
  id: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
  role: string;
  phone?: string | null;
  cellPhone?: string | null;
}

// Custom hook for events page breakpoint (1200px)
function useIsEventsMobile() {
  const [isEventsMobile, setIsEventsMobile] = useState<boolean | undefined>(
    undefined,
  );

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

// Event Chat Component
function EventChatContent({
  eventId,
  channelId,
  eventTitle,
  onChannelLoad,
}: {
  eventId?: string;
  channelId?: string;
  eventTitle: string;
  onChannelLoad: (id: string) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [currentChannelId, setCurrentChannelId] = useState<string | null>(
    channelId || null,
  );
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const supabase = createClient();

  const loadUser = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("User")
        .select("id, name")
        .eq("id", user.id)
        .single();
      if (data) {
        setCurrentUser({ id: data.id, name: data.name || "User" });
      }
    }
  }, [supabase]);

  const loadOrCreateChannel = useCallback(async () => {
    try {
      setLoading(true);
      // Try to find existing channel for this event
      const response = await fetch(`/api/chat/channels?eventId=${eventId}`);
      if (response.ok) {
        const result = await response.json();
        if (result.channels && result.channels.length > 0) {
          setCurrentChannelId(result.channels[0].id);
          onChannelLoad(result.channels[0].id);
          setLoading(false);
          return;
        }
      }

      // Create new channel for this event
      const createResponse = await fetch("/api/chat/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${eventTitle} Chat`,
          type: "group",
          eventId,
        }),
      });

      if (createResponse.ok) {
        const result = await createResponse.json();
        setCurrentChannelId(result.channel.id);
        onChannelLoad(result.channel.id);
      }
    } catch (error) {
      console.error("Error loading channel:", error);
    } finally {
      setLoading(false);
    }
  }, [eventId, eventTitle, onChannelLoad]);

  useEffect(() => {
    loadUser();
    if (channelId) {
      setCurrentChannelId(channelId);
      setLoading(false);
    } else if (eventId) {
      loadOrCreateChannel();
    }
  }, [eventId, channelId, loadUser, loadOrCreateChannel]);

  if (loading) {
    return (
      <div className="flex flex-1 flex-col p-4">
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton className="h-10 w-10 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-16 w-full rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!currentChannelId || !currentUser) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted-foreground">
        <p>Unable to load chat</p>
      </div>
    );
  }

  return (
    <RealtimeChat
      channelId={currentChannelId}
      roomName={`${eventTitle} Chat`}
      username={currentUser.name}
    />
  );
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
  const [mobileView, setMobileView] = useState<
    "events" | "occurrences" | "details" | "chat"
  >("events");
  const [eventDetailTab, setEventDetailTab] = useState<"details" | "chat">(
    "details",
  );
  const [eventChannelId, setEventChannelId] = useState<string | null>(null);
  const [eventChatDialogOpen, setEventChatDialogOpen] = useState(false);
  const [eventChatEventId, setEventChatEventId] = useState<string | null>(null);
  const [eventChatChannelId, setEventChatChannelId] = useState<string | null>(
    null,
  );
  const isInitialMount = useRef(true);
  const selectedEventIdRef = useRef<string | null>(null);
  const hasNavigatedAwayRef = useRef(false);

  // Current user info
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRsvps, setCurrentUserRsvps] = useState<
    Map<string, "going" | "not_going">
  >(new Map());
  const [occurrenceRsvpsLoading, setOccurrenceRsvpsLoading] = useState(false);

  // Owner/Coach view RSVP summary state for occurrences list
  const [occurrenceRsvpSummaries, setOccurrenceRsvpSummaries] = useState<
    Record<string, { goingCount: number; notGoingCount: number }>
  >({});

  // Athlete view state (always declared)
  const [selectedOccurrenceForAthlete, setSelectedOccurrenceForAthlete] =
    useState<{ id: string; date: string; status: string; event: Event } | null>(
      null,
    );
  const [selectedEventForAthlete, setSelectedEventForAthlete] =
    useState<Event | null>(null);
  const [
    selectedOccurrenceForAthleteDetail,
    setSelectedOccurrenceForAthleteDetail,
  ] = useState<EventOccurrence | null>(null);
  const [athleteEventDetailTab, setAthleteEventDetailTab] = useState<
    "details" | "chat"
  >("details");
  const [athleteEventChannelId, setAthleteEventChannelId] = useState<
    string | null
  >(null);

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

  // Load or create channel when event is selected
  useEffect(() => {
    const eventId = selectedEvent?.id;
    const eventTitle = selectedEvent?.title;

    // Only run if event ID actually changed
    if (eventId === selectedEventIdRef.current) {
      return;
    }

    selectedEventIdRef.current = eventId || null;

    if (!selectedEvent || !eventId) {
      setEventChannelId(null);
      return;
    }

    // Reset channel ID when event changes
    setEventChannelId(null);

    // Load or create channel for the selected event
    fetch(`/api/chat/channels?eventId=${eventId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.channels && data.channels.length > 0) {
          setEventChannelId(data.channels[0].id);
        } else {
          // Create channel for event
          fetch("/api/chat/channels", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: `${eventTitle || "Event"} Chat`,
              type: "group",
              eventId: eventId,
            }),
          })
            .then((res) => res.json())
            .then((data) => {
              if (data.channel) {
                setEventChannelId(data.channel.id);
              }
            });
        }
      })
      .catch((error) => {
        console.error("Error loading event channel:", error);
      });
  }, [selectedEvent]);

  const loadEvents = useCallback(
    async (isInitial = false) => {
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
            eventToSelect =
              newEvents.find((e: Event) => e.id === eventIdParam) || null;
            if (eventToSelect && occurrenceIdParam) {
              occurrenceToSelect =
                eventToSelect.occurrences.find(
                  (o: EventOccurrence) => o.id === occurrenceIdParam,
                ) || null;
            }
          }

          // If no URL params or not found, use default selection logic
          if (!eventToSelect) {
            const currentSelectedId = selectedEventIdRef.current;
            if (!currentSelectedId) {
              // On mobile, don't auto-select the first event - user must click
              if (!isEventsMobile) {
                eventToSelect = newEvents[0];
              }
            } else {
              // Check if current selected event still exists
              const stillExists = newEvents.find(
                (e: Event) => e.id === currentSelectedId,
              );
              if (!stillExists) {
                // On mobile, don't auto-select the first event - user must click
                if (!isEventsMobile) {
                  eventToSelect = newEvents[0];
                }
              } else {
                // Find the updated event object from newEvents
                eventToSelect =
                  newEvents.find((e: Event) => e.id === currentSelectedId) ||
                  null;
                // On mobile, if we're on events view, don't keep selection
                if (isEventsMobile && mobileView === "events") {
                  eventToSelect = null;
                } else if (!eventToSelect && !isEventsMobile) {
                  eventToSelect = newEvents[0];
                }
              }
            }
          }

          // On mobile, if we're starting on events view (no URL params), clear selection
          if (isEventsMobile && !eventIdParam && !occurrenceIdParam) {
            eventToSelect = null;
            occurrenceToSelect = null;
          }

          // Only update if the ID actually changed
          if (
            eventToSelect &&
            eventToSelect.id !== selectedEventIdRef.current
          ) {
            selectedEventIdRef.current = eventToSelect.id;
            setSelectedEvent(eventToSelect);
          } else if (!eventToSelect && selectedEventIdRef.current) {
            selectedEventIdRef.current = null;
            setSelectedEvent(null);
          } else if (
            eventToSelect &&
            eventToSelect.id === selectedEventIdRef.current
          ) {
            // Update the event object to get latest data, but only if ID matches
            setSelectedEvent(eventToSelect);
          }
          setSelectedOccurrence(occurrenceToSelect);

          // Set mobile view based on selection
          if (isEventsMobile) {
            // Only navigate away from events view if URL params explicitly specify it
            // Otherwise, start on events view even if an event is selected
            if (occurrenceToSelect && occurrenceIdParam) {
              setMobileView("details");
            } else if (eventToSelect && eventIdParam) {
              // Only go to occurrences if eventId was in URL
              setMobileView("occurrences");
            } else {
              // Start on events view - no event selected
              setMobileView("events");
            }
          }

          // Load RSVPs if occurrence is selected (will be handled by useEffect)
          if (!occurrenceToSelect) {
            setOccurrenceRsvps([]);
          }
        } else {
          selectedEventIdRef.current = null;
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
    },
    [searchParams, isEventsMobile],
  ); // Removed selectedEvent dependency to prevent infinite loops

  const loadGymMembers = useCallback(async () => {
    try {
      setGymMembersLoading(true);
      // Use forEvents=true to allow athletes to see other athletes for RSVP purposes
      const response = await fetch("/api/roster?forEvents=true");
      if (!response.ok) {
        console.error("Failed to fetch roster:", response.statusText);
        setGymMembers([]);
        return;
      }
      const data = await response.json();
      // Include all gym members (athletes, coaches, and head coaches) for events
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
              phone?: string | null;
              cellPhone?: string | null;
              role?: string;
            };
            status: string;
          }) => ({
            id: r.user.id,
            name: r.user.name,
            email: r.user.email,
            avatarUrl: r.user.avatarUrl,
            status: r.status,
            phone: r.user.phone,
            cellPhone: r.user.cellPhone,
            role: r.user.role,
          }),
        ),
      );
    } catch (err) {
      console.error(err);
    } finally {
      setRsvpLoading(false);
    }
  }, []);

  const loadCurrentUserInfo = useCallback(async () => {
    try {
      const response = await fetch("/api/user-info");
      if (response.ok) {
        const data = await response.json();
        setCurrentUserRole(data.role);
        setCurrentUserId(data.id);
      }
    } catch (err) {
      console.error("Failed to load user info:", err);
    }
  }, []);

  const loadCurrentUserRsvps = useCallback(async (eventId: string) => {
    setOccurrenceRsvpsLoading(true);
    try {
      const response = await fetch(`/api/rsvp?eventId=${eventId}`);
      if (response.ok) {
        const data = await response.json();
        const rsvpMap = new Map<string, "going" | "not_going">();
        if (data.rsvps) {
          data.rsvps.forEach(
            (rsvp: {
              occurrenceId?: string;
              occurrence?: { id: string };
              status: string;
            }) => {
              const occId = rsvp.occurrenceId || rsvp.occurrence?.id;
              if (
                occId &&
                (rsvp.status === "going" || rsvp.status === "not_going")
              ) {
                rsvpMap.set(occId, rsvp.status as "going" | "not_going");
              }
            },
          );
        }
        setCurrentUserRsvps(rsvpMap);
      }
    } catch (err) {
      console.error("Failed to load user RSVPs:", err);
    } finally {
      setOccurrenceRsvpsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      loadEvents(true);
      loadGymMembers();
      loadCurrentUserInfo();
    }
  }, [loadEvents, loadGymMembers, loadCurrentUserInfo]);

  // Reload events when URL params change (e.g., when clicking from dashboard)
  useEffect(() => {
    const eventIdParam = searchParams.get("eventId");
    const occurrenceIdParam = searchParams.get("occurrenceId");
    
    // If URL params are present and events are already loaded, reload to ensure selection matches
    if ((eventIdParam || occurrenceIdParam) && !initialLoading && events.length > 0 && !isInitialMount.current) {
      loadEvents(false);
    }
  }, [searchParams, initialLoading, events.length, loadEvents]);

  // Load user RSVPs for all events when user is athlete
  useEffect(() => {
    if (currentUserRole === "athlete" && events.length > 0) {
      setOccurrenceRsvpsLoading(true);
      // Fetch all user RSVPs at once
      fetch("/api/rsvp")
        .then((res) => res.json())
        .then((data) => {
          if (data.rsvps) {
            const rsvpMap = new Map<string, "going" | "not_going">();
            data.rsvps.forEach(
              (rsvp: {
                occurrenceId?: string;
                occurrence?: { id: string };
                status: string;
              }) => {
                const occId = rsvp.occurrenceId || rsvp.occurrence?.id;
                if (
                  occId &&
                  (rsvp.status === "going" || rsvp.status === "not_going")
                ) {
                  rsvpMap.set(occId, rsvp.status as "going" | "not_going");
                }
              },
            );
            setCurrentUserRsvps(rsvpMap);
          }
        })
        .catch(() => {})
        .finally(() => {
          setOccurrenceRsvpsLoading(false);
        });
    }
  }, [currentUserRole, events]);

  // Load RSVP summary for athlete view
  useEffect(() => {
    // This function is kept for potential future use but currently doesn't set any state
    if (currentUserRole === "athlete" && events.length > 0) {
      // Flatten events to occurrences for list view
      const allOccurrences = events
        .flatMap((event) =>
          event.occurrences.map((occ) => ({
            ...occ,
            event,
          })),
        )
        .filter((occ) => {
          const occDate = new Date(occ.date);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          return occDate >= today && occ.status === "scheduled";
        });

      if (allOccurrences.length === 0) {
        return;
      }

      const occurrenceIds = allOccurrences.map((occ) => occ.id).join(",");
      fetch(`/api/rsvp?summaryOccurrences=${occurrenceIds}`)
        .then((res) => res.json())
        .then((data) => {
          // Summary data fetched but not currently used
          void data;
        })
        .catch(() => {
          // Error handling - no state to update
        });
    }
  }, [currentUserRole, events]);

  // Load user RSVPs when event is selected
  useEffect(() => {
    const eventId = currentUserRole === "athlete" 
      ? selectedEventForAthlete?.id 
      : selectedEvent?.id;
    if (eventId) {
      loadCurrentUserRsvps(eventId);
    } else {
      setCurrentUserRsvps(new Map());
      setOccurrenceRsvpsLoading(false);
    }
  }, [selectedEvent?.id, selectedEventForAthlete?.id, currentUserRole, loadCurrentUserRsvps]);

  // Load RSVP summaries for owner/coach view when event is selected
  const loadOccurrenceSummaries = useCallback(async () => {
    if (
      (currentUserRole === "owner" || currentUserRole === "coach") &&
      selectedEvent
    ) {
      const occurrenceIds = selectedEvent.occurrences.map((occ) => occ.id);
      if (occurrenceIds.length > 0) {
        try {
          const response = await fetch(
            `/api/rsvp?summaryOccurrences=${occurrenceIds.join(",")}`,
          );
          if (response.ok) {
            const data = await response.json();
            setOccurrenceRsvpSummaries(data.summary || {});
          }
        } catch (err) {
          console.error("Failed to load occurrence summaries:", err);
          setOccurrenceRsvpSummaries({});
        }
      } else {
        setOccurrenceRsvpSummaries({});
      }
    } else {
      setOccurrenceRsvpSummaries({});
    }
  }, [selectedEvent, currentUserRole]);

  useEffect(() => {
    loadOccurrenceSummaries();
  }, [loadOccurrenceSummaries]);

  // Load or create channel when event is selected (for athletes)
  useEffect(() => {
    const eventId = selectedEventForAthlete?.id;
    const eventTitle = selectedEventForAthlete?.title;

    if (!eventId) {
      setAthleteEventChannelId(null);
      return;
    }

    // Load or create channel for the selected event
    fetch(`/api/chat/channels?eventId=${eventId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.channels && data.channels.length > 0) {
          setAthleteEventChannelId(data.channels[0].id);
        } else {
          // Create channel for event
          fetch("/api/chat/channels", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: `${eventTitle || "Event"} Chat`,
              type: "group",
              eventId: eventId,
            }),
          })
            .then((res) => res.json())
            .then((data) => {
              if (data.channel) {
                setAthleteEventChannelId(data.channel.id);
              }
            });
        }
      })
      .catch((error) => {
        console.error("Error loading event channel:", error);
      });
  }, [selectedEventForAthlete]);

  // Load RSVPs when occurrence is selected from URL params
  useEffect(() => {
    if (selectedOccurrence) {
      loadOccurrenceRsvps(selectedOccurrence.id);
    }
  }, [selectedOccurrence, loadOccurrenceRsvps]);

  // Load RSVPs for athlete occurrence detail
  useEffect(() => {
    if (currentUserRole === "athlete" && selectedOccurrenceForAthleteDetail) {
      loadOccurrenceRsvps(selectedOccurrenceForAthleteDetail.id);
    }
  }, [
    currentUserRole,
    selectedOccurrenceForAthleteDetail,
    loadOccurrenceRsvps,
  ]);

  async function handleCancelWithNotify() {
    if (!selectedOccurrence || !selectedEvent) return;
    const occurrenceIdToCancel = selectedOccurrence.id;
    const eventIdToKeep = selectedEvent.id;
    setCanceling(true);
    try {
      const response = await fetch(
        `/api/events/${selectedEvent.id}/cancel-notify`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            occurrenceId: occurrenceIdToCancel,
            notifyUsers: notifyOnCancel,
          }),
        },
      );
      if (!response.ok) throw new Error("Failed to cancel");
      const data = await response.json();

      setCancelDialogOpen(false);

      // Reload events to get updated occurrence status
      const eventsResponse = await fetch("/api/events");
      if (!eventsResponse.ok) throw new Error("Failed to reload events");
      const eventsData = await eventsResponse.json();
      const newEvents = eventsData.events || [];
      setEvents(newEvents);

      // Reload gym members to update counts
      await loadGymMembers();

      // Find and update the selected event and occurrence with fresh data
      const updatedEvent = newEvents.find((e: Event) => e.id === eventIdToKeep);
      if (updatedEvent) {
        setSelectedEvent(updatedEvent);
        const updatedOccurrence = updatedEvent.occurrences.find(
          (o: EventOccurrence) => o.id === occurrenceIdToCancel,
        );
        if (updatedOccurrence) {
          setSelectedOccurrence(updatedOccurrence);
          // Reload RSVPs for the updated occurrence
          await loadOccurrenceRsvps(updatedOccurrence.id);
        } else {
          setSelectedOccurrence(null);
          setOccurrenceRsvps([]);
        }
      } else {
        // Event was deleted, select first event or clear selection
        if (newEvents.length > 0) {
          setSelectedEvent(newEvents[0]);
          setSelectedOccurrence(null);
        } else {
          setSelectedEvent(null);
          setSelectedOccurrence(null);
        }
        setOccurrenceRsvps([]);
      }

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
      const occurrenceIdToRestore = occurrence.id;
      const eventIdToKeep = selectedEvent.id;
      try {
        const response = await fetch(`/api/events/${selectedEvent.id}/cancel`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            occurrenceId: occurrenceIdToRestore,
            date: occurrence.date,
            restore: true,
          }),
        });
        if (response.ok) {
          // Reload events to get updated occurrence status
          const eventsResponse = await fetch("/api/events");
          if (eventsResponse.ok) {
            const eventsData = await eventsResponse.json();
            const newEvents = eventsData.events || [];
            setEvents(newEvents);

            // Reload gym members to update counts
            await loadGymMembers();

            // Find and update the selected event and occurrence with fresh data
            const updatedEvent = newEvents.find(
              (e: Event) => e.id === eventIdToKeep,
            );
            if (updatedEvent) {
              setSelectedEvent(updatedEvent);
              const updatedOccurrence = updatedEvent.occurrences.find(
                (o: EventOccurrence) => o.id === occurrenceIdToRestore,
              );
              if (updatedOccurrence) {
                setSelectedOccurrence(updatedOccurrence);
                // Reload RSVPs for the updated occurrence
                await loadOccurrenceRsvps(updatedOccurrence.id);
              }
            }
          }
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
      // Reload summaries for owner/coach view
      if (currentUserRole === "owner" || currentUserRole === "coach") {
        await loadOccurrenceSummaries();
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleRsvp(
    occurrenceId: string,
    status: "going" | "not_going",
  ) {
    try {
      const response = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          occurrenceId,
          status,
        }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to RSVP");
      }

      // Update local RSVP map
      const newRsvps = new Map(currentUserRsvps);
      newRsvps.set(occurrenceId, status);
      setCurrentUserRsvps(newRsvps);

      // Reload occurrence RSVPs if this occurrence is selected
      if (selectedOccurrence?.id === occurrenceId) {
        await loadOccurrenceRsvps(occurrenceId);
      }

      // Reload summaries for owner/coach view
      if (currentUserRole === "owner" || currentUserRole === "coach") {
        await loadOccurrenceSummaries();
      }

      // Reload events to update counts
      await loadEvents();
    } catch (err) {
      console.error("RSVP error:", err);
      alert(err instanceof Error ? err.message : "Failed to RSVP");
      throw err;
    }
  }

  async function handleCancelFromCalendar(occurrenceId: string) {
    if (!selectedEvent) return;
    const eventIdToKeep = selectedEvent.id;
    try {
      const response = await fetch(`/api/events/${selectedEvent.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          occurrenceId,
          restore: false,
        }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to cancel");
      }

      // Reload events to get updated occurrence status
      const eventsResponse = await fetch("/api/events");
      if (!eventsResponse.ok) throw new Error("Failed to reload events");
      const eventsData = await eventsResponse.json();
      const newEvents = eventsData.events || [];
      setEvents(newEvents);

      // Reload gym members to update counts
      await loadGymMembers();

      // Find and update the selected event with fresh data
      const updatedEvent = newEvents.find((e: Event) => e.id === eventIdToKeep);
      if (updatedEvent) {
        setSelectedEvent(updatedEvent);
        const updatedOccurrence = updatedEvent.occurrences.find(
          (o: EventOccurrence) => o.id === occurrenceId,
        );
        if (updatedOccurrence) {
          setSelectedOccurrence(updatedOccurrence);
          // Reload RSVPs for the updated occurrence
          await loadOccurrenceRsvps(updatedOccurrence.id);
        } else {
          setSelectedOccurrence(null);
          setOccurrenceRsvps([]);
        }
      } else {
        // Event was deleted, select first event or clear selection
        if (newEvents.length > 0) {
          setSelectedEvent(newEvents[0]);
          setSelectedOccurrence(null);
        } else {
          setSelectedEvent(null);
          setSelectedOccurrence(null);
        }
        setOccurrenceRsvps([]);
      }

      // Reload user RSVPs for the event
      if (updatedEvent) {
        await loadCurrentUserRsvps(updatedEvent.id);
      }
    } catch (err) {
      console.error("Cancel error:", err);
      alert(err instanceof Error ? err.message : "Failed to cancel session");
      throw err;
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
    // If clicking the same event that's already selected
    if (event.id === selectedEventIdRef.current) {
      // On mobile, always navigate forward instead of deselecting
      if (isEventsMobile) {
        if (currentUserRole === "athlete") {
          // For athletes, ensure event is set and navigate to occurrences
          setSelectedEventForAthlete(event);
          // Don't auto-select first occurrence - user must click
          setSelectedOccurrenceForAthleteDetail(null);
          setMobileView("occurrences");
        } else {
          setMobileView("occurrences");
        }
        return;
      }
      // On desktop, deselect the event
      selectedEventIdRef.current = null;
      setSelectedEvent(null);
      setSelectedOccurrence(null);
      setOccurrenceRsvps([]);
    } else {
      // Select the new event
      selectedEventIdRef.current = event.id;
      setSelectedEvent(event);
      setSelectedOccurrence(null);
      setOccurrenceRsvps([]);
      // Reset navigation flag when selecting a different event
      // The useEffect will set it to true when we actually navigate away
      if (isEventsMobile) {
        hasNavigatedAwayRef.current = false;
        if (currentUserRole === "athlete") {
          // For athletes, go to occurrences view to pick which day
          setSelectedEventForAthlete(event);
          // Don't auto-select first occurrence - user must click
          setSelectedOccurrenceForAthleteDetail(null);
          setMobileView("occurrences");
        } else {
          setMobileView("occurrences");
        }
      }
    }
  }

  function selectOccurrence(occurrence: EventOccurrence) {
    setSelectedOccurrence(occurrence);
    loadOccurrenceRsvps(occurrence.id);
    if (isEventsMobile && occurrence) {
      if (currentUserRole === "athlete") {
        setSelectedOccurrenceForAthleteDetail(occurrence);
      }
      setMobileView("details");
    }
  }

  // Track when we navigate away from events view on mobile
  // This is used to ensure clicking a selected event navigates forward
  useEffect(() => {
    if (isEventsMobile && mobileView !== "events") {
      hasNavigatedAwayRef.current = true;
    }
  }, [isEventsMobile, mobileView]);

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

  // Get occurrences from the appropriate event source
  const eventForOccurrences = currentUserRole === "athlete" 
    ? selectedEventForAthlete 
    : selectedEvent;
  
  const futureOccurrences =
    eventForOccurrences?.occurrences.filter((o) => !isPastDate(o.date)) || [];
  const pastOccurrences =
    eventForOccurrences?.occurrences.filter((o) => isPastDate(o.date)) || [];
  const displayedOccurrences = showPastEvents
    ? [...futureOccurrences, ...pastOccurrences]
    : futureOccurrences;

  const goingUsers = occurrenceRsvps.filter((r) => r.status === "going");
  const notGoingUsers = occurrenceRsvps.filter((r) => r.status === "not_going");
  const respondedIds = new Set(occurrenceRsvps.map((r) => r.id));
  // Only include coaches/owners and athletes in notAnsweredUsers (filter out any other roles)
  const notAnsweredUsers = gymMembers.filter((m) => {
    const role = m.role;
    const isCoachOrAthlete =
      role === "coach" || role === "owner" || role === "athlete" || !role;
    return isCoachOrAthlete && !respondedIds.has(m.id);
  });

  // Update selected occurrence for athletes when URL or events change (must be before any returns)
  useEffect(() => {
    if (currentUserRole === "athlete" && events.length > 0) {
      const allOccurrences = events
        .flatMap((event) =>
          event.occurrences.map((occ) => ({
            ...occ,
            event,
          })),
        )
        .filter((occ) => {
          const occDate = new Date(occ.date);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          return occDate >= today && occ.status === "scheduled";
        });

      const eventIdParam = searchParams.get("eventId");
      const occurrenceIdParam = searchParams.get("occurrenceId");

      if (currentUserRole === "athlete") {
        // For athletes, set event and occurrence separately
        if (eventIdParam) {
          const event = events.find((e) => e.id === eventIdParam);
          if (event) {
            setSelectedEventForAthlete(event);
            if (occurrenceIdParam) {
              const occ = event.occurrences.find(
                (o) => o.id === occurrenceIdParam,
              );
              if (occ) {
                setSelectedOccurrenceForAthleteDetail(occ);
                // Set mobile view to details when occurrence is selected from URL
                if (isEventsMobile) {
                  setMobileView("details");
                }
              } else if (event.occurrences.length > 0) {
                // On mobile, don't auto-select first occurrence - user must click
                if (!isEventsMobile) {
                  const upcomingOccs = event.occurrences.filter((occ) => {
                    const occDate = new Date(occ.date);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    return occDate >= today && occ.status === "scheduled";
                  });
                  if (upcomingOccs.length > 0) {
                    setSelectedOccurrenceForAthleteDetail(upcomingOccs[0]);
                  }
                } else {
                  // On mobile, go to occurrences view without selecting
                  setSelectedOccurrenceForAthleteDetail(null);
                  setMobileView("occurrences");
                }
              }
            } else if (event.occurrences.length > 0) {
              // On mobile, don't auto-select first occurrence - user must click
              if (!isEventsMobile) {
                const upcomingOccs = event.occurrences.filter((occ) => {
                  const occDate = new Date(occ.date);
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  return occDate >= today && occ.status === "scheduled";
                });
                if (upcomingOccs.length > 0) {
                  setSelectedOccurrenceForAthleteDetail(upcomingOccs[0]);
                }
              } else {
                // On mobile, go to occurrences view without selecting
                setSelectedOccurrenceForAthleteDetail(null);
                setMobileView("occurrences");
              }
            }
          }
        } else if (events.length > 0 && !selectedEventForAthlete) {
          // On mobile, don't auto-select - user must click
          if (!isEventsMobile) {
            // Select first event with upcoming occurrences (desktop only)
            const eventWithOccs = events.find((e) => {
              const upcomingOccs = e.occurrences.filter((occ) => {
                const occDate = new Date(occ.date);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                return occDate >= today && occ.status === "scheduled";
              });
              return upcomingOccs.length > 0;
            });
            if (eventWithOccs) {
              setSelectedEventForAthlete(eventWithOccs);
              const upcomingOccs = eventWithOccs.occurrences.filter((occ) => {
                const occDate = new Date(occ.date);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                return occDate >= today && occ.status === "scheduled";
              });
              if (upcomingOccs.length > 0) {
                setSelectedOccurrenceForAthleteDetail(upcomingOccs[0]);
              }
            }
          }
        }
      } else {
        // Original logic for non-athletes
        const selectedOccFromUrl =
          eventIdParam && occurrenceIdParam
            ? allOccurrences.find(
                (occ) =>
                  occ.id === occurrenceIdParam && occ.event.id === eventIdParam,
              )
            : null;

        if (selectedOccFromUrl) {
          setSelectedOccurrenceForAthlete(selectedOccFromUrl);
        } else if (allOccurrences.length > 0 && !selectedOccurrenceForAthlete) {
          setSelectedOccurrenceForAthlete(allOccurrences[0]);
        }
      }
    }
  }, [
    currentUserRole,
    events,
    searchParams,
    selectedOccurrenceForAthlete,
    selectedEventForAthlete,
    isEventsMobile,
  ]);

  // Ensure mobile view shows details when clicking from dashboard with eventId and occurrenceId
  useEffect(() => {
    if (!isEventsMobile || currentUserRole === "athlete" || initialLoading) return;

    const eventIdParam = searchParams.get("eventId");
    const occurrenceIdParam = searchParams.get("occurrenceId");

    // If URL has both params and we have matching selected event/occurrence, show details view
    if (eventIdParam && occurrenceIdParam) {
      if (
        selectedEvent?.id === eventIdParam &&
        selectedOccurrence?.id === occurrenceIdParam
      ) {
        setMobileView("details");
      } else if (events.length > 0) {
        // Events are loaded but selection might not match yet - wait for loadEvents to handle it
        // The loadEvents function already sets mobile view correctly, but we ensure it here too
        const matchingEvent = events.find((e) => e.id === eventIdParam);
        if (matchingEvent) {
          const matchingOccurrence = matchingEvent.occurrences.find(
            (o) => o.id === occurrenceIdParam,
          );
          if (matchingOccurrence) {
            setMobileView("details");
          }
        }
      }
    }
  }, [
    searchParams,
    selectedEvent,
    selectedOccurrence,
    isEventsMobile,
    currentUserRole,
    initialLoading,
    events,
  ]);

  // Mobile fullscreen tabs experience (for screens < 1200px)
  if (isEventsMobile) {
    // Function to handle back navigation
    const handleBack = () => {
      if (mobileView === "chat") {
        setMobileView("details");
      } else if (mobileView === "details") {
        setMobileView("occurrences");
      } else if (mobileView === "occurrences") {
        setMobileView("events");
      }
    };

    // Get page title based on current view
    const getPageTitle = () => {
      if (mobileView === "events") return "Events";
      if (mobileView === "occurrences") {
        if (currentUserRole === "athlete") {
          return selectedEventForAthlete?.title || "Sessions";
        }
        return selectedEvent?.title || "Sessions";
      }
      if (mobileView === "details") {
        if (currentUserRole === "athlete") {
          return selectedEventForAthlete?.title || "Details";
        }
        return selectedEvent?.title || "Details";
      }
      if (mobileView === "chat") {
        if (currentUserRole === "athlete") {
          return selectedEventForAthlete?.title || "Chat";
        }
        return selectedEvent?.title || "Chat";
      }
      return "Events";
    };

    // Check if back button should be shown
    const showBackButton = mobileView !== "events";

    return (
      <div className="flex flex-1 flex-col min-h-0 h-full overflow-hidden">
        {/* Custom Mobile Header */}
        <div className="flex items-center justify-between px-4 h-14 shrink-0 border-b bg-background">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {showBackButton && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBack}
                className="h-9 w-9 shrink-0 rounded-xl"
              >
                <IconArrowLeft className="h-5 w-5" />
              </Button>
            )}
            <h1 className="font-semibold text-base truncate">{getPageTitle()}</h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {mobileView === "events" && (
              <Button size="sm" className="gap-2 rounded-xl" asChild>
                <Link href="/events/new">
                  <IconPlus className="h-4 w-4" />
                  New Event
                </Link>
              </Button>
            )}
            {(mobileView === "details" || mobileView === "occurrences") && mobileView !== "chat" && (selectedEvent || selectedEventForAthlete) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileView("chat")}
                className="h-9 rounded-xl gap-2"
              >
                <IconMessageCircle className="h-5 w-5" />
                Chat
              </Button>
            )}
          </div>
        </div>

        <Tabs
          value={mobileView}
          onValueChange={(value) => setMobileView(value as typeof mobileView)}
          className="flex-1 flex flex-col min-h-0 overflow-hidden"
        >

          {/* Events Tab - Fullscreen */}
          <TabsContent
            value="events"
            className="flex-1 flex flex-col min-h-0 m-0 overflow-hidden"
          >
            <ScrollArea className="flex-1">
              <div className="p-4">
                {initialLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="relative w-full rounded-xl bg-card p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-5 w-3/4 rounded" />
                            <div className="flex items-center gap-3">
                              <Skeleton className="h-4 w-20 rounded" />
                              <Skeleton className="h-4 w-24 rounded" />
                            </div>
                          </div>
                          <Skeleton className="h-8 w-8 rounded shrink-0" />
                        </div>
                      </div>
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
                          selectedEvent?.id === event.id && (!isEventsMobile || mobileView !== "events")
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
                              <DropdownMenuContent
                                align="end"
                                className="rounded-xl"
                              >
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
          <TabsContent
            value="occurrences"
            className="flex-1 flex flex-col min-h-0 m-0 overflow-hidden"
          >
            {(selectedEvent || selectedEventForAthlete) ? (
              <>
                <div className="p-4 shrink-0">
                  <h2 className="font-semibold text-lg">
                    {currentUserRole === "athlete" 
                      ? selectedEventForAthlete?.title 
                      : selectedEvent?.title}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {formatTime(
                      currentUserRole === "athlete"
                        ? selectedEventForAthlete?.startTime
                        : selectedEvent?.startTime
                    )}{" "}
                    -{" "}
                    {formatTime(
                      currentUserRole === "athlete"
                        ? selectedEventForAthlete?.endTime
                        : selectedEvent?.endTime
                    )}
                  </p>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto">
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
                          const rsvpSummary = occurrenceRsvpSummaries[occ.id];
                          const goingCount = rsvpSummary?.goingCount || 0;
                          const notGoingCount = rsvpSummary?.notGoingCount || 0;
                          const isSelected = currentUserRole === "athlete"
                            ? selectedOccurrenceForAthleteDetail?.id === occ.id
                            : selectedOccurrence?.id === occ.id;
                          return (
                            <div
                              key={occ.id}
                              className={`w-full rounded-xl transition-all ${
                                isSelected
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-card hover:bg-muted/50"
                              } ${isPast ? "opacity-60" : ""} ${occ.status === "canceled" ? "opacity-40" : ""}`}
                            >
                              <div className="flex items-center gap-2 p-4">
                                <button
                                  type="button"
                                  onClick={() => selectOccurrence(occ)}
                                  className="flex-1 text-left flex items-center gap-4 min-w-0"
                                >
                                  <div
                                    className={`h-16 w-16 rounded-xl flex flex-col items-center justify-center shrink-0 ${
                                      isSelected
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
                                      {formatTime(
                                        currentUserRole === "athlete"
                                          ? selectedEventForAthlete?.startTime
                                          : selectedEvent?.startTime
                                      )}
                                    </p>
                                    {/* RSVP counts for coaches/owners */}
                                    {(currentUserRole === "owner" ||
                                      currentUserRole === "coach") && (
                                      <div
                                        className={`flex items-center gap-2 mt-1 ${
                                          isSelected
                                            ? "opacity-90"
                                            : ""
                                        }`}
                                      >
                                        <div className="flex items-center gap-1">
                                          <IconCheck
                                            className={`h-3 w-3 ${
                                              isSelected
                                                ? "text-primary-foreground"
                                                : "text-emerald-600"
                                            }`}
                                          />
                                          <span
                                            className={`text-xs font-medium ${
                                              isSelected
                                                ? "text-primary-foreground"
                                                : "text-emerald-600"
                                            }`}
                                          >
                                            {goingCount}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <IconX
                                            className={`h-3 w-3 ${
                                              isSelected
                                                ? "text-primary-foreground"
                                                : "text-red-600"
                                            }`}
                                          />
                                          <span
                                            className={`text-xs font-medium ${
                                              isSelected
                                                ? "text-primary-foreground"
                                                : "text-red-600"
                                            }`}
                                          >
                                            {notGoingCount}
                                          </span>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </button>
                                <div className="flex items-center gap-2 shrink-0">
                                  {/* User's RSVP Status */}
                                  {occurrenceRsvpsLoading ? (
                                    <Skeleton className="h-5 w-5 rounded shrink-0" />
                                  ) : (() => {
                                    const userRsvpStatus = currentUserRsvps.get(occ.id);
                                    if (userRsvpStatus === "going") {
                                      return (
                                        <div className={`flex items-center shrink-0 ${
                                          isSelected ? "text-primary-foreground" : "text-emerald-600"
                                        }`}>
                                          <IconCheck className="h-5 w-5" />
                                        </div>
                                      );
                                    }
                                    if (userRsvpStatus === "not_going") {
                                      return (
                                        <div className={`flex items-center shrink-0 ${
                                          isSelected ? "text-primary-foreground" : "text-red-600"
                                        }`}>
                                          <IconX className="h-5 w-5" />
                                        </div>
                                      );
                                    }
                                    return (
                                      <div className={`flex items-center shrink-0 ${
                                        isSelected ? "text-primary-foreground/60" : "text-amber-600"
                                      }`}>
                                        <IconBell className="h-4 w-4" />
                                      </div>
                                    );
                                  })()}
                                  <div className="flex flex-col items-end gap-1">
                                    {occ.status === "canceled" && (
                                      <Badge
                                        variant="destructive"
                                        className="text-xs"
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
                                        className="text-xs"
                                      >
                                        Custom
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
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
                        {showPastEvents ? "Hide" : "Show"} past sessions (
                        {pastOccurrences.length})
                      </button>
                    )}
                  </div>
                </div>
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
          <TabsContent
            value="details"
            className="flex-1 flex flex-col min-h-0 m-0 overflow-hidden"
          >
            {currentUserRole === "athlete" && selectedOccurrenceForAthleteDetail ? (
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <div className="p-4 shrink-0 border-b">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h2 className="font-semibold text-lg">
                        {selectedEventForAthlete?.title}
                      </h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        {formatDate(selectedOccurrenceForAthleteDetail.date).weekday},{" "}
                        {formatDate(selectedOccurrenceForAthleteDetail.date).month}{" "}
                        {formatDate(selectedOccurrenceForAthleteDetail.date).day} •{" "}
                        {formatTime(selectedEventForAthlete?.startTime)}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          const response = await fetch("/api/rsvp", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              occurrenceId: selectedOccurrenceForAthleteDetail.id,
                              status: "going",
                            }),
                          });
                          if (response.ok) {
                            setCurrentUserRsvps((prev) => {
                              const newMap = new Map(prev);
                              newMap.set(
                                selectedOccurrenceForAthleteDetail.id,
                                "going",
                              );
                              return newMap;
                            });
                            loadOccurrenceRsvps(selectedOccurrenceForAthleteDetail.id);
                          }
                        }}
                        className={`h-9 rounded-xl gap-1.5 px-3 ${
                          currentUserRsvps.get(selectedOccurrenceForAthleteDetail.id) === "going"
                            ? "!bg-emerald-600 hover:!bg-emerald-700 !text-white border-emerald-600"
                            : "border-emerald-400 text-emerald-400 hover:bg-emerald-50 hover:text-emerald-500 dark:hover:bg-emerald-950"
                        }`}
                      >
                        <IconCheck className="h-4 w-4" />
                        {currentUserRsvps.get(selectedOccurrenceForAthleteDetail.id) === "going"
                          ? "Going!"
                          : "Going"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          const response = await fetch("/api/rsvp", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              occurrenceId: selectedOccurrenceForAthleteDetail.id,
                              status: "not_going",
                            }),
                          });
                          if (response.ok) {
                            setCurrentUserRsvps((prev) => {
                              const newMap = new Map(prev);
                              newMap.set(
                                selectedOccurrenceForAthleteDetail.id,
                                "not_going",
                              );
                              return newMap;
                            });
                            loadOccurrenceRsvps(selectedOccurrenceForAthleteDetail.id);
                          }
                        }}
                        className={`h-9 rounded-xl gap-1.5 px-3 ${
                          currentUserRsvps.get(selectedOccurrenceForAthleteDetail.id) === "not_going"
                            ? "!bg-red-600 hover:!bg-red-700 !text-white border-red-600"
                            : "border-red-400 text-red-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950"
                        }`}
                      >
                        <IconX className="h-4 w-4" />
                        Can't
                      </Button>
                    </div>
                  </div>
                </div>
                <ScrollArea className="flex-1">
                  <div className="p-4">
                    {selectedEventForAthlete?.description && (
                      <div className="mb-4">
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {selectedEventForAthlete.description}
                        </p>
                        {selectedEventForAthlete.location && (
                          <p className="text-sm text-muted-foreground mt-2">
                            📍 {selectedEventForAthlete.location}
                          </p>
                        )}
                      </div>
                    )}

                    {/* RSVP Lists - Same as desktop view */}
                    {(() => {
                      // Compute RSVP lists for athlete mobile view
                      const occurrenceRsvpsForAthlete = occurrenceRsvps || [];
                      const goingUsers = occurrenceRsvpsForAthlete.filter(
                        (r) => r.status === "going",
                      );
                      const notGoingUsers = occurrenceRsvpsForAthlete.filter(
                        (r) => r.status === "not_going",
                      );
                      const rsvpedUserIds = new Set(occurrenceRsvpsForAthlete.map((r) => r.id));

                      const isCoachOrOwner = (userId: string, userRole?: string): boolean => {
                        if (userRole === "coach" || userRole === "owner") return true;
                        const member = gymMembers.find((m) => m.id === userId);
                        return member?.role === "coach" || member?.role === "owner";
                      };

                      const isAthlete = (userId: string, userRole?: string): boolean => {
                        if (userRole === "athlete") return true;
                        if (userRole === "coach" || userRole === "owner") return false;
                        const member = gymMembers.find((m) => m.id === userId);
                        return member?.role === "athlete" || !member?.role;
                      };

                      const goingCoaches = goingUsers
                        .filter((u) => isCoachOrOwner(u.id, u.role))
                        .sort((a, b) => {
                          const nameA = a.name || a.email || "";
                          const nameB = b.name || b.email || "";
                          return nameA.localeCompare(nameB);
                        });
                      const goingAthletes = goingUsers
                        .filter((u) => isAthlete(u.id, u.role))
                        .sort((a, b) => {
                          const nameA = a.name || a.email || "";
                          const nameB = b.name || b.email || "";
                          return nameA.localeCompare(nameB);
                        });
                      const notGoingCoaches = notGoingUsers
                        .filter((u) => isCoachOrOwner(u.id, u.role))
                        .sort((a, b) => {
                          const nameA = a.name || a.email || "";
                          const nameB = b.name || b.email || "";
                          return nameA.localeCompare(nameB);
                        });
                      const notGoingAthletes = notGoingUsers
                        .filter((u) => isAthlete(u.id, u.role))
                        .sort((a, b) => {
                          const nameA = a.name || a.email || "";
                          const nameB = b.name || b.email || "";
                          return nameA.localeCompare(nameB);
                        });
                      const pendingCoaches = gymMembers
                        .filter((m) => {
                          const isCoach = m.role === "coach" || m.role === "owner";
                          return isCoach && !rsvpedUserIds.has(m.id);
                        })
                        .map((m) => ({
                          id: m.id,
                          name: m.name,
                          email: m.email,
                          avatarUrl: m.avatarUrl,
                          status: null,
                          phone: m.phone,
                          cellPhone: m.cellPhone,
                          role: m.role || "",
                        }))
                        .sort((a, b) => {
                          const nameA = a.name || a.email || "";
                          const nameB = b.name || b.email || "";
                          return nameA.localeCompare(nameB);
                        });
                      const pendingAthletes = gymMembers
                        .filter((m) => {
                          const isAthleteMember = m.role === "athlete" || !m.role;
                          return isAthleteMember && !rsvpedUserIds.has(m.id);
                        })
                        .map((m) => ({
                          id: m.id,
                          name: m.name,
                          email: m.email,
                          avatarUrl: m.avatarUrl,
                          status: null,
                          phone: m.phone,
                          cellPhone: m.cellPhone,
                          role: m.role || "",
                        }))
                        .sort((a, b) => {
                          const nameA = a.name || a.email || "";
                          const nameB = b.name || b.email || "";
                          return nameA.localeCompare(nameB);
                        });

                      const renderStatusBadge = (
                        status: "going" | "not_going" | "pending",
                      ) => {
                        if (status === "going") {
                          return (
                            <div className="flex items-center gap-1 text-emerald-600 bg-emerald-100 dark:bg-emerald-950/50 px-2.5 py-1 rounded-full text-xs font-medium">
                              <IconCheck className="h-3 w-3" />
                              Going
                            </div>
                          );
                        }
                        if (status === "not_going") {
                          return (
                            <div className="flex items-center gap-1 text-red-600 bg-red-100 dark:bg-red-950/50 px-2.5 py-1 rounded-full text-xs font-medium">
                              <IconX className="h-3 w-3" />
                              Can't
                            </div>
                          );
                        }
                        return (
                          <div className="flex items-center gap-1 text-amber-600 bg-amber-100 dark:bg-amber-950/50 px-2.5 py-1 rounded-full text-xs font-medium">
                            <IconBell className="h-3 w-3" />
                            Pending
                          </div>
                        );
                      };

                      const renderUserItem = (
                        user: typeof goingCoaches[0] | typeof goingAthletes[0] | typeof notGoingCoaches[0] | typeof notGoingAthletes[0] | typeof pendingCoaches[0] | typeof pendingAthletes[0],
                        _isCoach: boolean,
                        displayStatusOverride?: "going" | "not_going" | "pending",
                      ) => {
                        const displayStatus: "going" | "not_going" | "pending" = displayStatusOverride 
                          || ("displayStatus" in user && (user.displayStatus === "going" || user.displayStatus === "not_going" || user.displayStatus === "pending") 
                            ? user.displayStatus 
                            : (user.status === "going" ? "going" : user.status === "not_going" ? "not_going" : "pending"));
                        return (
                          <div
                            key={user.id}
                            className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors"
                          >
                            <Avatar className="h-10 w-10 rounded-xl">
                              <AvatarImage src={user.avatarUrl || undefined} />
                              <AvatarFallback className="rounded-xl text-xs bg-muted">
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
                            {renderStatusBadge(displayStatus)}
                          </div>
                        );
                      };

                      return (
                        <Tabs defaultValue="all" className="w-full">
                          <TabsList className="w-full grid grid-cols-4 h-10 rounded-xl mb-4">
                            <TabsTrigger value="all" className="text-xs rounded-lg">
                              All (
                              {goingCoaches.length +
                                goingAthletes.length +
                                notGoingCoaches.length +
                                notGoingAthletes.length +
                                pendingCoaches.length +
                                pendingAthletes.length}
                              )
                            </TabsTrigger>
                            <TabsTrigger value="going" className="text-xs rounded-lg">
                              Going ({goingCoaches.length + goingAthletes.length})
                            </TabsTrigger>
                            <TabsTrigger value="not_going" className="text-xs rounded-lg">
                              Can't ({notGoingCoaches.length + notGoingAthletes.length})
                            </TabsTrigger>
                            <TabsTrigger value="pending" className="text-xs rounded-lg">
                              Pending ({pendingCoaches.length + pendingAthletes.length})
                            </TabsTrigger>
                          </TabsList>
                          <TabsContent value="all" className="mt-0">
                            <div className="space-y-3">
                              {(() => {
                                const allCoaches = [
                                  ...goingCoaches.map((c) => ({
                                    ...c,
                                    displayStatus: "going" as const,
                                  })),
                                  ...notGoingCoaches.map((c) => ({
                                    ...c,
                                    displayStatus: "not_going" as const,
                                  })),
                                  ...pendingCoaches.map((c) => ({
                                    ...c,
                                    displayStatus: "pending" as const,
                                  })),
                                ].sort((a, b) => {
                                  const nameA = a.name || a.email || "";
                                  const nameB = b.name || b.email || "";
                                  return nameA.localeCompare(nameB);
                                });

                                const allAthletes = [
                                  ...goingAthletes.map((a) => ({
                                    ...a,
                                    displayStatus: "going" as const,
                                  })),
                                  ...notGoingAthletes.map((a) => ({
                                    ...a,
                                    displayStatus: "not_going" as const,
                                  })),
                                  ...pendingAthletes.map((a) => ({
                                    ...a,
                                    displayStatus: "pending" as const,
                                  })),
                                ].sort((a, b) => {
                                  const nameA = a.name || a.email || "";
                                  const nameB = b.name || b.email || "";
                                  return nameA.localeCompare(nameB);
                                });

                                return (
                                  <>
                                    {allCoaches.length > 0 && (
                                      <div>
                                        <p className="text-xs font-medium text-muted-foreground mb-2">
                                          Coaches
                                        </p>
                                        <div className="space-y-1">
                                          {allCoaches.map((coach) =>
                                            renderUserItem(coach, true),
                                          )}
                                        </div>
                                      </div>
                                    )}
                                    {allAthletes.length > 0 && (
                                      <div>
                                        <p className="text-xs font-medium text-muted-foreground mb-2">
                                          Athletes
                                        </p>
                                        <div className="space-y-1">
                                          {allAthletes.map((athlete) =>
                                            renderUserItem(athlete, false),
                                          )}
                                        </div>
                                      </div>
                                    )}
                                    {allCoaches.length === 0 &&
                                      allAthletes.length === 0 && (
                                        <div className="text-center text-sm text-muted-foreground py-8">
                                          No members found
                                        </div>
                                      )}
                                  </>
                                );
                              })()}
                            </div>
                          </TabsContent>
                          <TabsContent value="going" className="mt-0">
                            <div className="space-y-3">
                              {goingCoaches.length > 0 && (
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground mb-2">
                                    Coaches
                                  </p>
                                  <div className="space-y-1">
                                    {goingCoaches.map((coach) =>
                                      renderUserItem(coach, true, "going"),
                                    )}
                                  </div>
                                </div>
                              )}
                              {goingAthletes.length > 0 && (
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground mb-2">
                                    Athletes
                                  </p>
                                  <div className="space-y-1">
                                    {goingAthletes.map((athlete) =>
                                      renderUserItem(athlete, false, "going"),
                                    )}
                                  </div>
                                </div>
                              )}
                              {goingCoaches.length === 0 && goingAthletes.length === 0 && (
                                <div className="text-center text-sm text-muted-foreground py-8">
                                  No one is going
                                </div>
                              )}
                            </div>
                          </TabsContent>
                          <TabsContent value="not_going" className="mt-0">
                            <div className="space-y-3">
                              {notGoingCoaches.length > 0 && (
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground mb-2">
                                    Coaches
                                  </p>
                                  <div className="space-y-1">
                                    {notGoingCoaches.map((coach) =>
                                      renderUserItem(coach, true, "not_going"),
                                    )}
                                  </div>
                                </div>
                              )}
                              {notGoingAthletes.length > 0 && (
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground mb-2">
                                    Athletes
                                  </p>
                                  <div className="space-y-1">
                                    {notGoingAthletes.map((athlete) =>
                                      renderUserItem(athlete, false, "not_going"),
                                    )}
                                  </div>
                                </div>
                              )}
                              {notGoingCoaches.length === 0 && notGoingAthletes.length === 0 && (
                                <div className="text-center text-sm text-muted-foreground py-8">
                                  No one can't make it
                                </div>
                              )}
                            </div>
                          </TabsContent>
                          <TabsContent value="pending" className="mt-0">
                            <div className="space-y-3">
                              {pendingCoaches.length > 0 && (
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground mb-2">
                                    Coaches
                                  </p>
                                  <div className="space-y-1">
                                    {pendingCoaches.map((coach) =>
                                      renderUserItem(coach, true, "pending"),
                                    )}
                                  </div>
                                </div>
                              )}
                              {pendingAthletes.length > 0 && (
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground mb-2">
                                    Athletes
                                  </p>
                                  <div className="space-y-1">
                                    {pendingAthletes.map((athlete) =>
                                      renderUserItem(athlete, false, "pending"),
                                    )}
                                  </div>
                                </div>
                              )}
                              {pendingCoaches.length === 0 && pendingAthletes.length === 0 && (
                                <div className="text-center text-sm text-muted-foreground py-8">
                                  Everyone has responded
                                </div>
                              )}
                            </div>
                          </TabsContent>
                        </Tabs>
                      );
                    })()}
                  </div>
                </ScrollArea>
              </div>
            ) : selectedOccurrence ? (
              <>
                <div className="p-4 shrink-0">
                  <h2 className="font-semibold text-lg">
                    {selectedEvent?.title}
                  </h2>
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
                          <div
                            key={i}
                            className="flex items-center gap-3 p-3 rounded-xl"
                          >
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
                    <Tabs
                      defaultValue="all"
                      className="h-full flex flex-col min-h-0"
                    >
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
                              <div
                                key={i}
                                className="flex items-center gap-3 p-3 rounded-xl"
                              >
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
                            currentUserRole={currentUserRole}
                          />
                        )}
                      </TabsContent>
                      <TabsContent
                        value="going"
                        className="flex-1 overflow-auto mt-0 p-4"
                      >
                        <UserList
                          users={goingUsers.map((u) => {
                            const member = gymMembers.find(
                              (m) => m.id === u.id,
                            );
                            // Use role from RSVP user object first, then fall back to gymMembers
                            return {
                              ...u,
                              status: "going",
                              role: u.role || member?.role,
                            };
                          })}
                          getInitials={getInitials}
                          onEditRsvp={handleEditRsvp}
                          currentUserRole={currentUserRole}
                        />
                      </TabsContent>
                      <TabsContent
                        value="not_going"
                        className="flex-1 overflow-auto mt-0 p-4"
                      >
                        <UserList
                          users={notGoingUsers.map((u) => {
                            const member = gymMembers.find(
                              (m) => m.id === u.id,
                            );
                            // Use role from RSVP user object first, then fall back to gymMembers
                            return {
                              ...u,
                              status: "not_going",
                              role: u.role || member?.role,
                            };
                          })}
                          getInitials={getInitials}
                          onEditRsvp={handleEditRsvp}
                          currentUserRole={currentUserRole}
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
                          currentUserRole={currentUserRole}
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

          {/* Chat Tab */}
          <TabsContent
            value="chat"
            className="flex-1 flex flex-col min-h-0 m-0 overflow-hidden"
          >
            {selectedEvent && eventChannelId ? (
              <EventChatContent
                channelId={eventChannelId}
                eventTitle={selectedEvent.title}
                onChannelLoad={setEventChannelId}
              />
            ) : selectedEvent ? (
              <EventChatContent
                eventId={selectedEvent.id}
                eventTitle={selectedEvent.title}
                onChannelLoad={setEventChannelId}
              />
            ) : selectedEventForAthlete && athleteEventChannelId ? (
              <EventChatContent
                channelId={athleteEventChannelId}
                eventTitle={selectedEventForAthlete.title}
                onChannelLoad={setAthleteEventChannelId}
              />
            ) : selectedEventForAthlete ? (
              <EventChatContent
                eventId={selectedEventForAthlete.id}
                eventTitle={selectedEventForAthlete.title}
                onChannelLoad={setAthleteEventChannelId}
              />
            ) : (
              <div className="flex flex-1 items-center justify-center text-muted-foreground">
                <p>Select an event to view chat</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // Athlete view - similar to owner/coach but with privacy restrictions
  if (currentUserRole === "athlete") {
    // Get selected event occurrences
    const selectedEventOccurrences = selectedEventForAthlete
      ? selectedEventForAthlete.occurrences
          .filter((occ) => {
            const occDate = new Date(occ.date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return occDate >= today && occ.status === "scheduled";
          })
          .sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
          )
      : [];

    // Filter RSVPs: show coaches individually, athletes as counts only
    const occurrenceRsvpsForAthlete = occurrenceRsvps || [];
    const goingUsers = occurrenceRsvpsForAthlete.filter(
      (r) => r.status === "going",
    );
    const notGoingUsers = occurrenceRsvpsForAthlete.filter(
      (r) => r.status === "not_going",
    );

    // Get IDs of users who have RSVP'd
    const rsvpedUserIds = new Set(occurrenceRsvpsForAthlete.map((r) => r.id));

    // Helper function to determine if user is coach/owner (use role from RSVP first, then gymMembers)
    const isCoachOrOwner = (userId: string, userRole?: string): boolean => {
      if (userRole === "coach" || userRole === "owner") return true;
      const member = gymMembers.find((m) => m.id === userId);
      return member?.role === "coach" || member?.role === "owner";
    };

    // Helper function to determine if user is athlete (use role from RSVP first, then gymMembers)
    const isAthlete = (userId: string, userRole?: string): boolean => {
      if (userRole === "athlete") return true;
      if (userRole === "coach" || userRole === "owner") return false;
      const member = gymMembers.find((m) => m.id === userId);
      return member?.role === "athlete" || !member?.role;
    };

    // Separate coaches and athletes (include current user in appropriate list)
    // Only include users who are coaches/owners or athletes (filter out any other roles)
    const goingCoaches = goingUsers
      .filter((u) => isCoachOrOwner(u.id, u.role))
      .sort((a, b) => {
        // Sort alphabetically by name, current user appears with others
        const nameA = a.name || a.email || "";
        const nameB = b.name || b.email || "";
        return nameA.localeCompare(nameB);
      });
    const goingAthletes = goingUsers
      .filter((u) => isAthlete(u.id, u.role))
      .sort((a, b) => {
        // Sort alphabetically by name, current user appears with others
        const nameA = a.name || a.email || "";
        const nameB = b.name || b.email || "";
        return nameA.localeCompare(nameB);
      });
    const notGoingCoaches = notGoingUsers
      .filter((u) => isCoachOrOwner(u.id, u.role))
      .sort((a, b) => {
        // Sort alphabetically by name, current user appears with others
        const nameA = a.name || a.email || "";
        const nameB = b.name || b.email || "";
        return nameA.localeCompare(nameB);
      });
    const notGoingAthletes = notGoingUsers
      .filter((u) => isAthlete(u.id, u.role))
      .sort((a, b) => {
        // Sort alphabetically by name, current user appears with others
        const nameA = a.name || a.email || "";
        const nameB = b.name || b.email || "";
        return nameA.localeCompare(nameB);
      });

    // Pending coaches: those who haven't RSVP'd at all (not in rsvpedUserIds)
    // Only include coaches/owners, and always include current user if they're a coach/owner
    const pendingCoaches = gymMembers
      .filter((m) => {
        const isCoach = m.role === "coach" || m.role === "owner";
        return isCoach && !rsvpedUserIds.has(m.id);
      })
      .map((m) => ({
        id: m.id,
        name: m.name,
        email: m.email,
        avatarUrl: m.avatarUrl,
        status: null,
        phone: m.phone,
        cellPhone: m.cellPhone,
        role: m.role || "",
      }))
      .sort((a, b) => {
        // Sort alphabetically by name, current user appears with others
        const nameA = a.name || a.email || "";
        const nameB = b.name || b.email || "";
        return nameA.localeCompare(nameB);
      });

    // Pending athletes: those who haven't RSVP'd at all (not in rsvpedUserIds)
    // Only include athletes, and always include current user if they're an athlete
    const pendingAthletes = gymMembers
      .filter((m) => {
        const isAthleteMember = m.role === "athlete" || !m.role;
        return isAthleteMember && !rsvpedUserIds.has(m.id);
      })
      .map((m) => ({
        id: m.id,
        name: m.name,
        email: m.email,
        avatarUrl: m.avatarUrl,
        status: null,
        phone: m.phone,
        cellPhone: m.cellPhone,
        role: m.role || "",
      }))
      .sort((a, b) => {
        // Sort alphabetically by name, current user appears with others
        const nameA = a.name || a.email || "";
        const nameB = b.name || b.email || "";
        return nameA.localeCompare(nameB);
      });

    // Ensure current user is always included in the appropriate category
    if (currentUserId) {
      const currentUserMember = gymMembers.find((m) => m.id === currentUserId);
      const currentUserRsvp = occurrenceRsvpsForAthlete.find(
        (r) => r.id === currentUserId,
      );
      // Determine role: use RSVP role first, then gymMembers role, then assume athlete if none
      const currentUserRole = currentUserRsvp?.role || currentUserMember?.role;

      // Check if current user is already in any list
      const isInGoingCoaches = goingCoaches.some((u) => u.id === currentUserId);
      const isInGoingAthletes = goingAthletes.some(
        (u) => u.id === currentUserId,
      );
      const isInNotGoingCoaches = notGoingCoaches.some(
        (u) => u.id === currentUserId,
      );
      const isInNotGoingAthletes = notGoingAthletes.some(
        (u) => u.id === currentUserId,
      );
      const isInPendingCoaches = pendingCoaches.some(
        (u) => u.id === currentUserId,
      );
      const isInPendingAthletes = pendingAthletes.some(
        (u) => u.id === currentUserId,
      );

      const isCurrentUserCoach = isCoachOrOwner(currentUserId, currentUserRole);
      const isCurrentUserAthlete = isAthlete(currentUserId, currentUserRole);

      // If current user is not in any list, add them to the appropriate pending list
      if (
        !isInGoingCoaches &&
        !isInGoingAthletes &&
        !isInNotGoingCoaches &&
        !isInNotGoingAthletes &&
        !isInPendingCoaches &&
        !isInPendingAthletes
      ) {
        // Create entry from RSVP data if available, otherwise from gymMembers, or create minimal entry
        const currentUserEntry = currentUserRsvp
          ? {
              id: currentUserRsvp.id,
              name: currentUserRsvp.name,
              email: currentUserRsvp.email,
              avatarUrl: currentUserRsvp.avatarUrl,
              status: null,
              phone: currentUserRsvp.phone,
              cellPhone: currentUserRsvp.cellPhone,
              role: currentUserRsvp.role || "",
            }
          : currentUserMember
            ? {
                id: currentUserMember.id,
                name: currentUserMember.name,
                email: currentUserMember.email,
                avatarUrl: currentUserMember.avatarUrl,
                status: null,
                phone: currentUserMember.phone,
                cellPhone: currentUserMember.cellPhone,
                role: currentUserMember.role || "",
              }
            : null;

        if (currentUserEntry) {
          if (isCurrentUserCoach) {
            pendingCoaches.push(currentUserEntry);
            pendingCoaches.sort((a, b) => {
              const nameA = a.name || a.email || "";
              const nameB = b.name || b.email || "";
              return nameA.localeCompare(nameB);
            });
          } else if (isCurrentUserAthlete) {
            pendingAthletes.push(currentUserEntry);
            pendingAthletes.sort((a, b) => {
              const nameA = a.name || a.email || "";
              const nameB = b.name || b.email || "";
              return nameA.localeCompare(nameB);
            });
          }
        }
      }
    }

    // Get current user's RSVP
    const currentUserRsvpForOccurrence = selectedOccurrenceForAthleteDetail
      ? currentUserRsvps.get(selectedOccurrenceForAthleteDetail.id)
      : null;

    return (
      <div className="flex flex-1 flex-col min-h-0 h-full overflow-hidden">
        <PageHeader title="Events" description="View all upcoming events" />
        <div className="flex flex-1 overflow-hidden gap-4 min-h-0 h-0">
          {/* Events Sidebar */}
          <div className="w-64 flex flex-col bg-card border rounded-xl shadow-sm overflow-hidden min-h-0 h-full">
            <ScrollArea className="h-full">
              <div className="p-2">
                {initialLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="w-full rounded-xl p-3 space-y-2">
                        <Skeleton className="h-4 w-3/4 rounded" />
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-3 w-16 rounded" />
                          <Skeleton className="h-3 w-1 rounded-full" />
                          <Skeleton className="h-3 w-20 rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : events.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No upcoming events
                  </div>
                ) : (
                  events.map((event) => {
                    const upcomingOccs = event.occurrences.filter((occ) => {
                      const occDate = new Date(occ.date);
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      return occDate >= today && occ.status === "scheduled";
                    });
                    if (upcomingOccs.length === 0) return null;

                    return (
                      <div key={event.id} className="relative group mb-1">
                        <button
                          type="button"
                          onClick={() => {
                            // If clicking the same event that's already selected, deselect it
                            if (selectedEventForAthlete?.id === event.id) {
                              setSelectedEventForAthlete(null);
                              setSelectedOccurrenceForAthleteDetail(null);
                            } else {
                              setSelectedEventForAthlete(event);
                              if (upcomingOccs.length > 0) {
                                setSelectedOccurrenceForAthleteDetail(
                                  upcomingOccs[0],
                                );
                              }
                            }
                          }}
                          className={`w-full text-left p-3 rounded-xl transition-all ${
                            selectedEventForAthlete?.id === event.id && (!isEventsMobile || mobileView !== "events")
                              ? "bg-primary text-primary-foreground"
                              : "hover:bg-muted"
                          }`}
                        >
                          <p className="font-medium truncate text-sm pr-6">
                            {event.title}
                          </p>
                          <div
                            className={`flex items-center gap-2 mt-1.5 text-xs ${
                              selectedEventForAthlete?.id === event.id && (!isEventsMobile || mobileView !== "events")
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
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Occurrences List */}
          <div className="w-72 flex flex-col bg-card border rounded-xl shadow-sm overflow-hidden min-h-0 h-full">
            {selectedEventForAthlete ? (
              <ScrollArea className="h-full">
                <div className="p-2">
                  {selectedEventOccurrences.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      No upcoming sessions
                    </div>
                  ) : (
                    selectedEventOccurrences.map((occ) => {
                      const dateInfo = formatDate(occ.date);
                      return (
                        <button
                          key={occ.id}
                          type="button"
                          onClick={() =>
                            setSelectedOccurrenceForAthleteDetail(occ)
                          }
                          className={`w-full text-left p-3 rounded-xl mb-1 transition-all flex items-center gap-3 ${
                            selectedOccurrenceForAthleteDetail?.id === occ.id
                              ? "bg-primary/10 ring-1 ring-primary"
                              : "hover:bg-muted"
                          } ${occ.status === "canceled" ? "opacity-40" : ""}`}
                        >
                          <div
                            className={`h-14 w-14 rounded-xl flex flex-col items-center justify-center shrink-0 ${
                              selectedOccurrenceForAthleteDetail?.id === occ.id
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
                              {formatTime(selectedEventForAthlete.startTime)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {/* User's RSVP Status */}
                            {occurrenceRsvpsLoading ? (
                              <Skeleton className="h-5 w-5 rounded shrink-0" />
                            ) : (() => {
                              const userRsvpStatus = currentUserRsvps.get(occ.id);
                              if (userRsvpStatus === "going") {
                                return (
                                  <div className="flex items-center text-emerald-600 shrink-0">
                                    <IconCheck className="h-5 w-5" />
                                  </div>
                                );
                              }
                              if (userRsvpStatus === "not_going") {
                                return (
                                  <div className="flex items-center text-red-600 shrink-0">
                                    <IconX className="h-5 w-5" />
                                  </div>
                                );
                              }
                              return (
                                <div className="flex items-center text-amber-600 shrink-0">
                                  <IconBell className="h-4 w-4" />
                                </div>
                              );
                            })()}
                            {occ.status === "canceled" && (
                              <Badge
                                variant="destructive"
                                className="text-[10px]"
                              >
                                Canceled
                              </Badge>
                            )}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            ) : (
              <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
                Select an event
              </div>
            )}
          </div>

          {/* Event Detail */}
          <div className="flex-1 flex flex-col bg-card border rounded-xl shadow-sm overflow-hidden min-h-0">
            {selectedOccurrenceForAthleteDetail ? (
              <>
                <div className="p-4 border-b flex items-center justify-between shrink-0 gap-4">
                  <div>
                    <h3 className="font-semibold">
                      {selectedEventForAthlete?.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {
                        formatDate(selectedOccurrenceForAthleteDetail.date)
                          .weekday
                      }
                      ,{" "}
                      {
                        formatDate(selectedOccurrenceForAthleteDetail.date)
                          .month
                      }{" "}
                      {formatDate(selectedOccurrenceForAthleteDetail.date).day}{" "}
                      • {formatTime(selectedEventForAthlete?.startTime)}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        const response = await fetch("/api/rsvp", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            occurrenceId: selectedOccurrenceForAthleteDetail.id,
                            status: "going",
                          }),
                        });
                        if (response.ok) {
                          setCurrentUserRsvps((prev) => {
                            const newMap = new Map(prev);
                            newMap.set(
                              selectedOccurrenceForAthleteDetail.id,
                              "going",
                            );
                            return newMap;
                          });
                          loadOccurrenceRsvps(
                            selectedOccurrenceForAthleteDetail.id,
                          );
                        }
                      }}
                      className={`h-9 rounded-xl gap-1.5 px-3 ${
                        currentUserRsvpForOccurrence === "going"
                          ? "!bg-emerald-600 hover:!bg-emerald-700 !text-white border-emerald-600"
                          : "border-emerald-400 text-emerald-400 hover:bg-emerald-50 hover:text-emerald-500 dark:hover:bg-emerald-950"
                      }`}
                    >
                      <IconCheck className="h-4 w-4" />
                      {currentUserRsvpForOccurrence === "going"
                        ? "Going!"
                        : "Going"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        const response = await fetch("/api/rsvp", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            occurrenceId: selectedOccurrenceForAthleteDetail.id,
                            status: "not_going",
                          }),
                        });
                        if (response.ok) {
                          setCurrentUserRsvps((prev) => {
                            const newMap = new Map(prev);
                            newMap.set(
                              selectedOccurrenceForAthleteDetail.id,
                              "not_going",
                            );
                            return newMap;
                          });
                          loadOccurrenceRsvps(
                            selectedOccurrenceForAthleteDetail.id,
                          );
                        }
                      }}
                      className={`h-9 rounded-xl gap-1.5 px-3 ${
                        currentUserRsvpForOccurrence === "not_going"
                          ? "!bg-red-600 hover:!bg-red-700 !text-white border-red-600"
                          : "border-red-400 text-red-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950"
                      }`}
                    >
                      <IconX className="h-4 w-4" />
                      Can't
                    </Button>
                  </div>
                </div>
                <Tabs
                  value={athleteEventDetailTab}
                  onValueChange={(value) =>
                    setAthleteEventDetailTab(
                      value as typeof athleteEventDetailTab,
                    )
                  }
                  className="flex-1 flex flex-col min-h-0"
                >
                  <div className="px-4 py-4 shrink-0 border-b">
                    <TabsList className="w-full grid grid-cols-2 h-10 rounded-xl">
                      <TabsTrigger
                        value="details"
                        className="text-xs rounded-lg"
                      >
                        Details
                      </TabsTrigger>
                      <TabsTrigger value="chat" className="text-xs rounded-lg">
                        Chat
                      </TabsTrigger>
                    </TabsList>
                  </div>
                  <TabsContent
                    value="details"
                    className="flex-1 overflow-hidden mt-0 min-h-0"
                  >
                    {rsvpLoading ? (
                      <div className="flex flex-col h-full p-4">
                        <Skeleton className="h-10 w-full mb-4 rounded-xl" />
                        <div className="space-y-3">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <div
                              key={i}
                              className="flex items-center gap-3 p-3 rounded-xl"
                            >
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
                      <div className="flex flex-col h-full">
                        {/* Event Description */}
                        {selectedEventForAthlete?.description && (
                          <div className="p-4 border-b">
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                              {selectedEventForAthlete.description}
                            </p>
                            {selectedEventForAthlete.location && (
                              <p className="text-sm text-muted-foreground mt-2">
                                📍 {selectedEventForAthlete.location}
                              </p>
                            )}
                          </div>
                        )}

                        {/* RSVP Section */}
                        <div className="flex-1 overflow-auto p-4">
                          <div className="space-y-6">
                            {/* RSVP Lists */}
                            <Tabs defaultValue="all" className="flex-1">
                              <TabsList className="w-full grid grid-cols-4 h-10 rounded-xl mb-4">
                                <TabsTrigger
                                  value="all"
                                  className="text-xs rounded-lg"
                                >
                                  All (
                                  {goingCoaches.length +
                                    goingAthletes.length +
                                    notGoingCoaches.length +
                                    notGoingAthletes.length +
                                    pendingCoaches.length +
                                    pendingAthletes.length}
                                  )
                                </TabsTrigger>
                                <TabsTrigger
                                  value="going"
                                  className="text-xs rounded-lg"
                                >
                                  Going (
                                  {goingCoaches.length + goingAthletes.length})
                                </TabsTrigger>
                                <TabsTrigger
                                  value="not_going"
                                  className="text-xs rounded-lg"
                                >
                                  Can't (
                                  {notGoingCoaches.length +
                                    notGoingAthletes.length}
                                  )
                                </TabsTrigger>
                                <TabsTrigger
                                  value="pending"
                                  className="text-xs rounded-lg"
                                >
                                  Pending (
                                  {pendingCoaches.length +
                                    pendingAthletes.length}
                                  )
                                </TabsTrigger>
                              </TabsList>
                              <TabsContent value="all" className="mt-0">
                                <div className="space-y-3">
                                  {/* Combine all coaches and athletes into single arrays */}
                                  {(() => {
                                    // Combine all coaches with their status
                                    const allCoaches = [
                                      ...goingCoaches.map((c) => ({
                                        ...c,
                                        displayStatus: "going" as const,
                                      })),
                                      ...notGoingCoaches.map((c) => ({
                                        ...c,
                                        displayStatus: "not_going" as const,
                                      })),
                                      ...pendingCoaches.map((c) => ({
                                        ...c,
                                        displayStatus: "pending" as const,
                                      })),
                                    ].sort((a, b) => {
                                      const nameA = a.name || a.email || "";
                                      const nameB = b.name || b.email || "";
                                      return nameA.localeCompare(nameB);
                                    });

                                    // Combine all athletes with their status
                                    const allAthletes = [
                                      ...goingAthletes.map((a) => ({
                                        ...a,
                                        displayStatus: "going" as const,
                                      })),
                                      ...notGoingAthletes.map((a) => ({
                                        ...a,
                                        displayStatus: "not_going" as const,
                                      })),
                                      ...pendingAthletes.map((a) => ({
                                        ...a,
                                        displayStatus: "pending" as const,
                                      })),
                                    ].sort((a, b) => {
                                      const nameA = a.name || a.email || "";
                                      const nameB = b.name || b.email || "";
                                      return nameA.localeCompare(nameB);
                                    });

                                    // Helper function to render status badge
                                    const renderStatusBadge = (
                                      status: "going" | "not_going" | "pending",
                                    ) => {
                                      if (status === "going") {
                                        return (
                                          <div className="flex items-center gap-1 text-emerald-600 bg-emerald-100 dark:bg-emerald-950/50 px-2.5 py-1 rounded-full text-xs font-medium">
                                            <IconCheck className="h-3 w-3" />
                                            Going
                                          </div>
                                        );
                                      }
                                      if (status === "not_going") {
                                        return (
                                          <div className="flex items-center gap-1 text-red-600 bg-red-100 dark:bg-red-950/50 px-2.5 py-1 rounded-full text-xs font-medium">
                                            <IconX className="h-3 w-3" />
                                            Can't
                                          </div>
                                        );
                                      }
                                      return (
                                        <div className="flex items-center gap-1 text-amber-600 bg-amber-100 dark:bg-amber-950/50 px-2.5 py-1 rounded-full text-xs font-medium">
                                          <IconBell className="h-3 w-3" />
                                          Pending
                                        </div>
                                      );
                                    };

                                    // Helper function to render user item
                                    const renderUserItem = (
                                      user:
                                        | (typeof allCoaches)[0]
                                        | (typeof allAthletes)[0],
                                      isCoach: boolean,
                                    ) => {
                                      const phoneNumber =
                                        user.phone || user.cellPhone;
                                      return (
                                        <div
                                          key={user.id}
                                          className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors group"
                                        >
                                          <Avatar className="h-10 w-10 rounded-xl">
                                            <AvatarImage
                                              src={user.avatarUrl || undefined}
                                            />
                                            <AvatarFallback className="rounded-xl text-xs bg-linear-to-br from-primary/20 to-primary/5">
                                              {getInitials(
                                                user.name,
                                                user.email,
                                              )}
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
                                          {renderStatusBadge(
                                            user.displayStatus,
                                          )}
                                          <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                              >
                                                <IconDotsVertical className="h-4 w-4" />
                                              </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent
                                              align="end"
                                              className="rounded-xl"
                                            >
                                              <DropdownMenuItem asChild>
                                                <Link
                                                  href={`/chat?userId=${user.id}`}
                                                  className="flex items-center gap-2 cursor-pointer"
                                                >
                                                  <IconMessageCircle className="h-4 w-4" />
                                                  Chat
                                                </Link>
                                              </DropdownMenuItem>
                                              {isCoach && phoneNumber && (
                                                <DropdownMenuItem asChild>
                                                  <a
                                                    href={`tel:${phoneNumber.replace(/\D/g, "")}`}
                                                    className="flex items-center gap-2 cursor-pointer"
                                                  >
                                                    <IconPhone className="h-4 w-4" />
                                                    Call
                                                  </a>
                                                </DropdownMenuItem>
                                              )}
                                              {isCoach && (
                                                <DropdownMenuItem asChild>
                                                  <a
                                                    href={`mailto:${user.email}`}
                                                    className="flex items-center gap-2 cursor-pointer"
                                                  >
                                                    <IconMail className="h-4 w-4" />
                                                    Email
                                                  </a>
                                                </DropdownMenuItem>
                                              )}
                                            </DropdownMenuContent>
                                          </DropdownMenu>
                                        </div>
                                      );
                                    };

                                    return (
                                      <>
                                        {allCoaches.length > 0 && (
                                          <div>
                                            <p className="text-xs font-medium text-muted-foreground mb-2">
                                              Coaches
                                            </p>
                                            <div className="space-y-1">
                                              {allCoaches.map((coach) =>
                                                renderUserItem(coach, true),
                                              )}
                                            </div>
                                          </div>
                                        )}
                                        {allAthletes.length > 0 && (
                                          <div>
                                            <p className="text-xs font-medium text-muted-foreground mb-2">
                                              Athletes
                                            </p>
                                            <div className="space-y-1">
                                              {allAthletes.map((athlete) =>
                                                renderUserItem(athlete, false),
                                              )}
                                            </div>
                                          </div>
                                        )}
                                        {allCoaches.length === 0 &&
                                          allAthletes.length === 0 && (
                                            <div className="text-center text-sm text-muted-foreground py-8">
                                              No members found
                                            </div>
                                          )}
                                      </>
                                    );
                                  })()}
                                </div>
                              </TabsContent>
                              <TabsContent value="going" className="mt-0">
                                <div className="space-y-3">
                                  {goingCoaches.length > 0 && (
                                    <div>
                                      <p className="text-xs font-medium text-muted-foreground mb-2">
                                        Coaches
                                      </p>
                                      <div className="space-y-1">
                                        {goingCoaches.map((coach) => {
                                          const phoneNumber =
                                            coach.phone || coach.cellPhone;
                                          return (
                                            <div
                                              key={coach.id}
                                              className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors group"
                                            >
                                              <Avatar className="h-10 w-10 rounded-xl">
                                                <AvatarImage
                                                  src={
                                                    coach.avatarUrl || undefined
                                                  }
                                                />
                                                <AvatarFallback className="rounded-xl text-xs bg-linear-to-br from-primary/20 to-primary/5">
                                                  {getInitials(
                                                    coach.name,
                                                    coach.email,
                                                  )}
                                                </AvatarFallback>
                                              </Avatar>
                                              <div className="flex-1 min-w-0">
                                                <p className="font-medium text-sm truncate">
                                                  {coach.name || "Unnamed"}
                                                </p>
                                                <p className="text-xs text-muted-foreground truncate">
                                                  {coach.email}
                                                </p>
                                              </div>
                                              <div className="flex items-center gap-1 text-emerald-600 bg-emerald-100 dark:bg-emerald-950/50 px-2.5 py-1 rounded-full text-xs font-medium">
                                                <IconCheck className="h-3 w-3" />
                                                Going
                                              </div>
                                              <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                  <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                                  >
                                                    <IconDotsVertical className="h-4 w-4" />
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
                                                      <IconMessageCircle className="h-4 w-4" />
                                                      Chat
                                                    </Link>
                                                  </DropdownMenuItem>
                                                  {phoneNumber && (
                                                    <DropdownMenuItem asChild>
                                                      <a
                                                        href={`tel:${phoneNumber.replace(/\D/g, "")}`}
                                                        className="flex items-center gap-2 cursor-pointer"
                                                      >
                                                        <IconPhone className="h-4 w-4" />
                                                        Call
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
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                  {goingAthletes.length > 0 && (
                                    <div>
                                      <p className="text-xs font-medium text-muted-foreground mb-2">
                                        Athletes
                                      </p>
                                      <div className="space-y-1">
                                        {goingAthletes.map((athlete) => (
                                          <div
                                            key={athlete.id}
                                            className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors group"
                                          >
                                            <Avatar className="h-10 w-10 rounded-xl">
                                              <AvatarImage
                                                src={
                                                  athlete.avatarUrl || undefined
                                                }
                                              />
                                              <AvatarFallback className="rounded-xl text-xs bg-linear-to-br from-primary/20 to-primary/5">
                                                {getInitials(
                                                  athlete.name,
                                                  athlete.email,
                                                )}
                                              </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0">
                                              <p className="font-medium text-sm truncate">
                                                {athlete.name || "Unnamed"}
                                              </p>
                                              <p className="text-xs text-muted-foreground truncate">
                                                {athlete.email}
                                              </p>
                                            </div>
                                            <div className="flex items-center gap-1 text-emerald-600 bg-emerald-100 dark:bg-emerald-950/50 px-2.5 py-1 rounded-full text-xs font-medium">
                                              <IconCheck className="h-3 w-3" />
                                              Going
                                            </div>
                                            <DropdownMenu>
                                              <DropdownMenuTrigger asChild>
                                                <Button
                                                  variant="ghost"
                                                  size="icon"
                                                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                  <IconDotsVertical className="h-4 w-4" />
                                                </Button>
                                              </DropdownMenuTrigger>
                                              <DropdownMenuContent
                                                align="end"
                                                className="rounded-xl"
                                              >
                                                <DropdownMenuItem asChild>
                                                  <Link
                                                    href={`/chat?userId=${athlete.id}`}
                                                    className="flex items-center gap-2 cursor-pointer"
                                                  >
                                                    <IconMessageCircle className="h-4 w-4" />
                                                    Chat
                                                  </Link>
                                                </DropdownMenuItem>
                                              </DropdownMenuContent>
                                            </DropdownMenu>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {goingCoaches.length === 0 &&
                                    goingAthletes.length === 0 && (
                                      <div className="text-center text-sm text-muted-foreground py-8">
                                        No one going yet
                                      </div>
                                    )}
                                </div>
                              </TabsContent>
                              <TabsContent value="not_going" className="mt-0">
                                <div className="space-y-3">
                                  {notGoingCoaches.length > 0 && (
                                    <div>
                                      <p className="text-xs font-medium text-muted-foreground mb-2">
                                        Coaches
                                      </p>
                                      <div className="space-y-1">
                                        {notGoingCoaches.map((coach) => {
                                          const phoneNumber =
                                            coach.phone || coach.cellPhone;
                                          return (
                                            <div
                                              key={coach.id}
                                              className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors group"
                                            >
                                              <Avatar className="h-10 w-10 rounded-xl">
                                                <AvatarImage
                                                  src={
                                                    coach.avatarUrl || undefined
                                                  }
                                                />
                                                <AvatarFallback className="rounded-xl text-xs bg-linear-to-br from-primary/20 to-primary/5">
                                                  {getInitials(
                                                    coach.name,
                                                    coach.email,
                                                  )}
                                                </AvatarFallback>
                                              </Avatar>
                                              <div className="flex-1 min-w-0">
                                                <p className="font-medium text-sm truncate">
                                                  {coach.name || "Unnamed"}
                                                </p>
                                                <p className="text-xs text-muted-foreground truncate">
                                                  {coach.email}
                                                </p>
                                              </div>
                                              <div className="flex items-center gap-1 text-red-600 bg-red-100 dark:bg-red-950/50 px-2.5 py-1 rounded-full text-xs font-medium">
                                                <IconX className="h-3 w-3" />
                                                Can't
                                              </div>
                                              <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                  <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                                  >
                                                    <IconDotsVertical className="h-4 w-4" />
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
                                                      <IconMessageCircle className="h-4 w-4" />
                                                      Chat
                                                    </Link>
                                                  </DropdownMenuItem>
                                                  {phoneNumber && (
                                                    <DropdownMenuItem asChild>
                                                      <a
                                                        href={`tel:${phoneNumber.replace(/\D/g, "")}`}
                                                        className="flex items-center gap-2 cursor-pointer"
                                                      >
                                                        <IconPhone className="h-4 w-4" />
                                                        Call
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
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                  {notGoingAthletes.length > 0 && (
                                    <div>
                                      <p className="text-xs font-medium text-muted-foreground mb-2">
                                        Athletes
                                      </p>
                                      <div className="space-y-1">
                                        {notGoingAthletes.map((athlete) => (
                                          <div
                                            key={athlete.id}
                                            className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors group"
                                          >
                                            <Avatar className="h-10 w-10 rounded-xl">
                                              <AvatarImage
                                                src={
                                                  athlete.avatarUrl || undefined
                                                }
                                              />
                                              <AvatarFallback className="rounded-xl text-xs bg-linear-to-br from-primary/20 to-primary/5">
                                                {getInitials(
                                                  athlete.name,
                                                  athlete.email,
                                                )}
                                              </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0">
                                              <p className="font-medium text-sm truncate">
                                                {athlete.name || "Unnamed"}
                                              </p>
                                              <p className="text-xs text-muted-foreground truncate">
                                                {athlete.email}
                                              </p>
                                            </div>
                                            <div className="flex items-center gap-1 text-red-600 bg-red-100 dark:bg-red-950/50 px-2.5 py-1 rounded-full text-xs font-medium">
                                              <IconX className="h-3 w-3" />
                                              Can't
                                            </div>
                                            <DropdownMenu>
                                              <DropdownMenuTrigger asChild>
                                                <Button
                                                  variant="ghost"
                                                  size="icon"
                                                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                  <IconDotsVertical className="h-4 w-4" />
                                                </Button>
                                              </DropdownMenuTrigger>
                                              <DropdownMenuContent
                                                align="end"
                                                className="rounded-xl"
                                              >
                                                <DropdownMenuItem asChild>
                                                  <Link
                                                    href={`/chat?userId=${athlete.id}`}
                                                    className="flex items-center gap-2 cursor-pointer"
                                                  >
                                                    <IconMessageCircle className="h-4 w-4" />
                                                    Chat
                                                  </Link>
                                                </DropdownMenuItem>
                                              </DropdownMenuContent>
                                            </DropdownMenu>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {notGoingCoaches.length === 0 &&
                                    notGoingAthletes.length === 0 && (
                                      <div className="text-center text-sm text-muted-foreground py-8">
                                        Everyone is going
                                      </div>
                                    )}
                                </div>
                              </TabsContent>
                              <TabsContent value="pending" className="mt-0">
                                <div className="space-y-3">
                                  {pendingCoaches.length > 0 && (
                                    <div>
                                      <p className="text-xs font-medium text-muted-foreground mb-2">
                                        Coaches
                                      </p>
                                      <div className="space-y-1">
                                        {pendingCoaches.map((coach) => {
                                          const phoneNumber =
                                            coach.phone || coach.cellPhone;
                                          return (
                                            <div
                                              key={coach.id}
                                              className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors group"
                                            >
                                              <Avatar className="h-10 w-10 rounded-xl">
                                                <AvatarImage
                                                  src={
                                                    coach.avatarUrl || undefined
                                                  }
                                                />
                                                <AvatarFallback className="rounded-xl text-xs bg-linear-to-br from-primary/20 to-primary/5">
                                                  {getInitials(
                                                    coach.name,
                                                    coach.email,
                                                  )}
                                                </AvatarFallback>
                                              </Avatar>
                                              <div className="flex-1 min-w-0">
                                                <p className="font-medium text-sm truncate">
                                                  {coach.name || "Unnamed"}
                                                </p>
                                                <p className="text-xs text-muted-foreground truncate">
                                                  {coach.email}
                                                </p>
                                              </div>
                                              <div className="flex items-center gap-1 text-amber-600 bg-amber-100 dark:bg-amber-950/50 px-2.5 py-1 rounded-full text-xs font-medium">
                                                <IconBell className="h-3 w-3" />
                                                Pending
                                              </div>
                                              <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                  <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                                  >
                                                    <IconDotsVertical className="h-4 w-4" />
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
                                                      <IconMessageCircle className="h-4 w-4" />
                                                      Chat
                                                    </Link>
                                                  </DropdownMenuItem>
                                                  {phoneNumber && (
                                                    <DropdownMenuItem asChild>
                                                      <a
                                                        href={`tel:${phoneNumber.replace(/\D/g, "")}`}
                                                        className="flex items-center gap-2 cursor-pointer"
                                                      >
                                                        <IconPhone className="h-4 w-4" />
                                                        Call
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
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                  {pendingAthletes.length > 0 && (
                                    <div>
                                      <p className="text-xs font-medium text-muted-foreground mb-2">
                                        Athletes
                                      </p>
                                      <div className="space-y-1">
                                        {pendingAthletes.map((athlete) => {
                                          const phoneNumber =
                                            athlete.phone || athlete.cellPhone;
                                          return (
                                            <div
                                              key={athlete.id}
                                              className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors group"
                                            >
                                              <Avatar className="h-10 w-10 rounded-xl">
                                                <AvatarImage
                                                  src={
                                                    athlete.avatarUrl ||
                                                    undefined
                                                  }
                                                />
                                                <AvatarFallback className="rounded-xl text-xs bg-linear-to-br from-primary/20 to-primary/5">
                                                  {getInitials(
                                                    athlete.name,
                                                    athlete.email,
                                                  )}
                                                </AvatarFallback>
                                              </Avatar>
                                              <div className="flex-1 min-w-0">
                                                <p className="font-medium text-sm truncate">
                                                  {athlete.name || "Unnamed"}
                                                </p>
                                                <p className="text-xs text-muted-foreground truncate">
                                                  {athlete.email}
                                                </p>
                                              </div>
                                              <div className="flex items-center gap-1 text-amber-600 bg-amber-100 dark:bg-amber-950/50 px-2.5 py-1 rounded-full text-xs font-medium">
                                                <IconBell className="h-3 w-3" />
                                                Pending
                                              </div>
                                              <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                  <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                                  >
                                                    <IconDotsVertical className="h-4 w-4" />
                                                  </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent
                                                  align="end"
                                                  className="rounded-xl"
                                                >
                                                  <DropdownMenuItem asChild>
                                                    <Link
                                                      href={`/chat?userId=${athlete.id}`}
                                                      className="flex items-center gap-2 cursor-pointer"
                                                    >
                                                      <IconMessageCircle className="h-4 w-4" />
                                                      Chat
                                                    </Link>
                                                  </DropdownMenuItem>
                                                  {phoneNumber && (
                                                    <DropdownMenuItem asChild>
                                                      <a
                                                        href={`tel:${phoneNumber.replace(/\D/g, "")}`}
                                                        className="flex items-center gap-2 cursor-pointer"
                                                      >
                                                        <IconPhone className="h-4 w-4" />
                                                        Call
                                                      </a>
                                                    </DropdownMenuItem>
                                                  )}
                                                  <DropdownMenuItem asChild>
                                                    <a
                                                      href={`mailto:${athlete.email}`}
                                                      className="flex items-center gap-2 cursor-pointer"
                                                    >
                                                      <IconMail className="h-4 w-4" />
                                                      Email
                                                    </a>
                                                  </DropdownMenuItem>
                                                </DropdownMenuContent>
                                              </DropdownMenu>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                  {pendingCoaches.length === 0 &&
                                    pendingAthletes.length === 0 && (
                                      <div className="text-center text-sm text-muted-foreground py-8">
                                        Everyone has responded
                                      </div>
                                    )}
                                </div>
                              </TabsContent>
                            </Tabs>
                          </div>
                        </div>
                      </div>
                    )}
                  </TabsContent>
                  <TabsContent
                    value="chat"
                    className="flex-1 overflow-hidden mt-0 min-h-0"
                  >
                    {selectedEventForAthlete && athleteEventChannelId ? (
                      <EventChatContent
                        channelId={athleteEventChannelId}
                        eventTitle={selectedEventForAthlete.title}
                        onChannelLoad={setAthleteEventChannelId}
                      />
                    ) : selectedEventForAthlete ? (
                      <EventChatContent
                        eventId={selectedEventForAthlete.id}
                        eventTitle={selectedEventForAthlete.title}
                        onChannelLoad={setAthleteEventChannelId}
                      />
                    ) : (
                      <div className="flex flex-1 items-center justify-center text-muted-foreground">
                        <p>Select an event to view chat</p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <IconCalendar className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p className="text-sm">Select a session to view details</p>
                </div>
              </div>
            )}
          </div>
        </div>
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
                    <div key={i} className="w-full rounded-xl p-3 space-y-2">
                      <Skeleton className="h-4 w-3/4 rounded" />
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-3 w-16 rounded" />
                        <Skeleton className="h-3 w-1 rounded-full" />
                        <Skeleton className="h-3 w-20 rounded" />
                      </div>
                    </div>
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
                        selectedEvent?.id === event.id && (!isEventsMobile || mobileView !== "events")
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted"
                      }`}
                    >
                      <p className="font-medium truncate text-sm pr-6">
                        {event.title}
                      </p>
                      <div
                        className={`flex items-center gap-2 mt-1.5 text-xs ${
                          selectedEvent?.id === event.id && (!isEventsMobile || mobileView !== "events")
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
                            selectedEvent?.id === event.id && (!isEventsMobile || mobileView !== "events")
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
                    key={`${selectedEvent.id}-${selectedEvent.occurrences.filter((o) => o.status === "canceled").length}`}
                    occurrences={selectedEvent.occurrences.map((o) => ({
                      ...o,
                      isCustom:
                        (o as EventOccurrence & { isCustom?: boolean })
                          .isCustom || false,
                    }))}
                    eventTitle={selectedEvent.title}
                    eventId={selectedEvent.id}
                    currentUserRole={currentUserRole}
                    currentUserRsvps={currentUserRsvps}
                    onToggleDate={handleToggleOccurrence}
                    onAddCustomDate={handleAddCustomDate}
                    onRemoveDate={handleRemoveCustomDate}
                    onRsvp={handleRsvp}
                    onCancel={handleCancelFromCalendar}
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
                <ScrollArea className="h-full">
                  <div className="p-2 space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="w-full rounded-xl p-3 flex items-center gap-3">
                        <Skeleton className="h-14 w-14 rounded-xl shrink-0" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-24 rounded" />
                          <Skeleton className="h-3 w-16 rounded" />
                        </div>
                        <Skeleton className="h-5 w-5 rounded shrink-0" />
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : selectedEvent ? (
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
                            <div className="flex items-center gap-2 shrink-0">
                              {/* User's RSVP Status */}
                              {occurrenceRsvpsLoading ? (
                                <Skeleton className="h-5 w-5 rounded shrink-0" />
                              ) : (() => {
                                const userRsvpStatus = currentUserRsvps.get(occ.id);
                                if (userRsvpStatus === "going") {
                                  return (
                                    <div className="flex items-center text-emerald-600 shrink-0">
                                      <IconCheck className="h-5 w-5" />
                                    </div>
                                  );
                                }
                                if (userRsvpStatus === "not_going") {
                                  return (
                                    <div className="flex items-center text-red-600 shrink-0">
                                      <IconX className="h-5 w-5" />
                                    </div>
                                  );
                                }
                                return (
                                  <div className="flex items-center text-amber-600 shrink-0">
                                    <IconBell className="h-4 w-4" />
                                  </div>
                                );
                              })()}
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
              ) : (
                <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
                  Select an event
                </div>
              )}
            </div>

            {/* Event Detail */}
            <div className="flex-1 flex flex-col bg-card border rounded-xl shadow-sm overflow-hidden min-h-0">
              {selectedOccurrence ? (
                <>
                  <div className="p-4 border-b flex items-center justify-between shrink-0">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold">{selectedEvent?.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(selectedOccurrence.date).weekday},{" "}
                        {formatDate(selectedOccurrence.date).month}{" "}
                        {formatDate(selectedOccurrence.date).day} •{" "}
                        {formatTime(selectedEvent?.startTime)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Going/Not Going buttons for coaches/head coaches */}
                      {(currentUserRole === "coach" ||
                        currentUserRole === "owner") &&
                        selectedOccurrence.status !== "canceled" &&
                        eventDetailTab === "details" && (
                          <>
                            {(() => {
                              const currentUserRsvp = occurrenceRsvps.find(
                                (r) => r.id === currentUserId,
                              );
                              const currentUserRsvpStatus =
                                currentUserRsvp?.status;
                              return (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={async () => {
                                      const response = await fetch(
                                        "/api/rsvp",
                                        {
                                          method: "POST",
                                          headers: {
                                            "Content-Type": "application/json",
                                          },
                                          body: JSON.stringify({
                                            occurrenceId: selectedOccurrence.id,
                                            status: "going",
                                          }),
                                        },
                                      );
                                      if (response.ok) {
                                        loadOccurrenceRsvps(
                                          selectedOccurrence.id,
                                        );
                                      }
                                    }}
                                    className={`h-9 rounded-xl gap-1.5 px-3 ${
                                      currentUserRsvpStatus === "going"
                                        ? "!bg-emerald-600 hover:!bg-emerald-700 !text-white border-emerald-600"
                                        : "border-emerald-400 text-emerald-400 hover:bg-emerald-50 hover:text-emerald-500 dark:hover:bg-emerald-950"
                                    }`}
                                  >
                                    <IconCheck className="h-4 w-4" />
                                    {currentUserRsvpStatus === "going"
                                      ? "Going!"
                                      : "Going"}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={async () => {
                                      const response = await fetch(
                                        "/api/rsvp",
                                        {
                                          method: "POST",
                                          headers: {
                                            "Content-Type": "application/json",
                                          },
                                          body: JSON.stringify({
                                            occurrenceId: selectedOccurrence.id,
                                            status: "not_going",
                                          }),
                                        },
                                      );
                                      if (response.ok) {
                                        loadOccurrenceRsvps(
                                          selectedOccurrence.id,
                                        );
                                      }
                                    }}
                                    className={`h-9 rounded-xl gap-1.5 px-3 ${
                                      currentUserRsvpStatus === "not_going"
                                        ? "!bg-red-600 hover:!bg-red-700 !text-white border-red-600"
                                        : "border-red-400 text-red-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950"
                                    }`}
                                  >
                                    <IconX className="h-4 w-4" />
                                    Can't
                                  </Button>
                                </>
                              );
                            })()}
                            <div className="h-9 w-px bg-border mx-2" />
                          </>
                        )}
                      {notAnsweredUsers.length > 0 &&
                        selectedOccurrence.status !== "canceled" &&
                        eventDetailTab === "details" && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={handleSendReminders}
                                disabled={sendingReminder}
                                className="h-9 w-9 rounded-xl"
                              >
                                <IconBell className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {sendingReminder
                                ? "Sending..."
                                : `Remind (${notAnsweredUsers.length})`}
                            </TooltipContent>
                          </Tooltip>
                        )}
                      {selectedOccurrence.status !== "canceled" &&
                        eventDetailTab === "details" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCancelDialogOpen(true)}
                            className="h-9 text-destructive hover:text-destructive rounded-xl gap-2"
                          >
                            <IconBan className="h-4 w-4" />
                            Cancel Event
                          </Button>
                        )}
                    </div>
                  </div>
                  <Tabs
                    value={eventDetailTab}
                    onValueChange={(value) =>
                      setEventDetailTab(value as typeof eventDetailTab)
                    }
                    className="flex-1 flex flex-col min-h-0"
                  >
                    <div className="px-4 py-4 shrink-0 border-b">
                      <TabsList className="w-full grid grid-cols-2 h-10 rounded-xl">
                        <TabsTrigger
                          value="details"
                          className="text-xs rounded-lg"
                        >
                          Details
                        </TabsTrigger>
                        <TabsTrigger
                          value="chat"
                          className="text-xs rounded-lg"
                        >
                          Chat
                        </TabsTrigger>
                      </TabsList>
                    </div>
                    <TabsContent
                      value="details"
                      className="flex-1 overflow-hidden mt-0 min-h-0"
                    >
                      {rsvpLoading ? (
                        <div className="flex flex-col h-full p-4">
                          <Skeleton className="h-10 w-full mb-4 rounded-xl" />
                          <div className="space-y-3">
                            {[1, 2, 3, 4, 5].map((i) => (
                              <div
                                key={i}
                                className="flex items-center gap-3 p-3 rounded-xl"
                              >
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
                        <Tabs
                          defaultValue="all"
                          className="h-full flex flex-col min-h-0"
                        >
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
                                  <div
                                    key={i}
                                    className="flex items-center gap-3 p-3 rounded-xl"
                                  >
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
                                currentUserRole={currentUserRole}
                              />
                            )}
                          </TabsContent>
                          <TabsContent
                            value="going"
                            className="flex-1 overflow-auto mt-0 p-4"
                          >
                            <UserList
                              users={goingUsers.map((u) => {
                                const member = gymMembers.find(
                                  (m) => m.id === u.id,
                                );
                                // Use role from RSVP user object first, then fall back to gymMembers
                                return {
                                  ...u,
                                  status: "going",
                                  role: u.role || member?.role,
                                };
                              })}
                              getInitials={getInitials}
                              onEditRsvp={handleEditRsvp}
                              currentUserRole={currentUserRole}
                            />
                          </TabsContent>
                          <TabsContent
                            value="not_going"
                            className="flex-1 overflow-auto mt-0 p-4"
                          >
                            <UserList
                              users={notGoingUsers.map((u) => {
                                const member = gymMembers.find(
                                  (m) => m.id === u.id,
                                );
                                // Use role from RSVP user object first, then fall back to gymMembers
                                return {
                                  ...u,
                                  status: "not_going",
                                  role: u.role || member?.role,
                                };
                              })}
                              getInitials={getInitials}
                              onEditRsvp={handleEditRsvp}
                              currentUserRole={currentUserRole}
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
                    </TabsContent>
                    <TabsContent
                      value="chat"
                      className="flex-1 overflow-hidden mt-0 min-h-0"
                    >
                      {selectedEvent && eventChannelId ? (
                        <EventChatContent
                          channelId={eventChannelId}
                          eventTitle={selectedEvent.title}
                          onChannelLoad={setEventChannelId}
                        />
                      ) : selectedEvent ? (
                        <EventChatContent
                          eventId={selectedEvent.id}
                          eventTitle={selectedEvent.title}
                          onChannelLoad={setEventChannelId}
                        />
                      ) : (
                        <div className="flex flex-1 items-center justify-center text-muted-foreground">
                          <p>Select an event to view chat</p>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </>
              ) : selectedEvent ? (
                <div className="flex-1 flex flex-col min-h-0">
                  <Tabs
                    value={eventDetailTab}
                    onValueChange={(value) =>
                      setEventDetailTab(value as typeof eventDetailTab)
                    }
                    className="flex-1 flex flex-col min-h-0"
                  >
                    <div className="px-4 py-4 shrink-0 border-b">
                      <TabsList className="w-full grid grid-cols-2 h-10 rounded-xl">
                        <TabsTrigger
                          value="details"
                          className="text-xs rounded-lg"
                        >
                          Details
                        </TabsTrigger>
                        <TabsTrigger
                          value="chat"
                          className="text-xs rounded-lg"
                        >
                          Chat
                        </TabsTrigger>
                      </TabsList>
                    </div>
                    <TabsContent
                      value="details"
                      className="flex-1 overflow-auto mt-0 p-4 min-h-0"
                    >
                      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                        <IconUsers className="h-12 w-12 mb-3 opacity-20" />
                        <p className="text-sm">
                          Select a session to view attendance
                        </p>
                      </div>
                    </TabsContent>
                    <TabsContent
                      value="chat"
                      className="flex-1 overflow-hidden mt-0 min-h-0"
                    >
                      {eventChannelId ? (
                        <EventChatContent
                          channelId={eventChannelId}
                          eventTitle={selectedEvent.title}
                          onChannelLoad={setEventChannelId}
                        />
                      ) : (
                        <EventChatContent
                          eventId={selectedEvent.id}
                          eventTitle={selectedEvent.title}
                          onChannelLoad={setEventChannelId}
                        />
                      )}
                    </TabsContent>
                  </Tabs>
                </div>
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
            <div className="flex items-center space-x-3 p-3 rounded-xl bg-muted/50 w-full">
              <Checkbox
                id="notify-on-cancel"
                checked={notifyOnCancel}
                onCheckedChange={(checked) =>
                  setNotifyOnCancel(checked as boolean)
                }
              />
              <Label htmlFor="notify-on-cancel" className="cursor-pointer flex-1">
                Notify all users who RSVP'd "Going" via email
              </Label>
            </div>
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
      <Dialog open={eventChatDialogOpen} onOpenChange={setEventChatDialogOpen}>
        <DialogContent className="rounded-xl max-w-4xl h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{selectedEvent?.title} Chat</DialogTitle>
            <DialogDescription>
              Chat with other members about this event
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-hidden">
            {eventChatEventId && eventChatChannelId ? (
              <EventChatContent
                eventId={eventChatEventId}
                channelId={eventChatChannelId}
                eventTitle={selectedEvent?.title || "Event"}
                onChannelLoad={(id) => setEventChatChannelId(id)}
              />
            ) : eventChatEventId ? (
              <EventChatContent
                eventId={eventChatEventId}
                eventTitle={selectedEvent?.title || "Event"}
                onChannelLoad={(id) => setEventChatChannelId(id)}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <p>Select an event to view chat</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
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
    role?: string;
    phone?: string | null;
    cellPhone?: string | null;
  }>;
  getInitials: (name: string | null, email: string) => string;
  onEditRsvp?: (userId: string, status: "going" | "not_going") => void;
  currentUserRole?: string | null;
}

function UserList({
  users,
  getInitials,
  onEditRsvp,
  currentUserRole,
}: UserListProps) {
  // Filter to only include coaches/owners and athletes (exclude any other roles)
  const filteredUsers = users.filter((u) => {
    const role = u.role;
    return role === "coach" || role === "owner" || role === "athlete" || !role;
  });

  if (filteredUsers.length === 0) {
    return (
      <div className="text-center text-sm text-muted-foreground py-8">
        No members in this list
      </div>
    );
  }

  // Separate coaches and athletes
  const coaches = filteredUsers.filter(
    (u) => u.role === "coach" || u.role === "owner",
  );
  const athletes = filteredUsers.filter((u) => u.role === "athlete" || !u.role);

  return (
    <div className="space-y-1">
      {coaches.map((user) => (
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
                    <IconDotsVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-xl">
                  <DropdownMenuItem asChild>
                    <Link
                      href={`/chat?userId=${user.id}`}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <IconMessageCircle className="h-4 w-4" />
                      Chat
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link
                      href={`/roster/${user.id}`}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <IconUsers className="h-4 w-4" />
                      View Profile
                    </Link>
                  </DropdownMenuItem>
                  {(currentUserRole === "owner" ||
                    currentUserRole === "coach") &&
                    user.status === null && (
                      <>
                        <DropdownMenuSeparator />
                        {(user.phone || user.cellPhone) && (
                          <DropdownMenuItem asChild>
                            <a
                              href={`tel:${(user.phone || user.cellPhone || "").replace(/\D/g, "")}`}
                              className="flex items-center gap-2 cursor-pointer"
                            >
                              <IconPhone className="h-4 w-4" />
                              Call
                            </a>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem asChild>
                          <a
                            href={`mailto:${user.email}`}
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <IconMail className="h-4 w-4" />
                            Email
                          </a>
                        </DropdownMenuItem>
                      </>
                    )}
                  <DropdownMenuSeparator />
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
      {coaches.length > 0 && athletes.length > 0 && (
        <hr className="my-3 border-border" />
      )}
      {athletes.map((user) => (
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
                    <IconDotsVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-xl">
                  <DropdownMenuItem asChild>
                    <Link
                      href={`/chat?userId=${user.id}`}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <IconMessageCircle className="h-4 w-4" />
                      Chat
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link
                      href={`/roster/${user.id}`}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <IconUsers className="h-4 w-4" />
                      View Profile
                    </Link>
                  </DropdownMenuItem>
                  {(currentUserRole === "owner" ||
                    currentUserRole === "coach") &&
                    user.status === null && (
                      <>
                        <DropdownMenuSeparator />
                        {(user.phone || user.cellPhone) && (
                          <DropdownMenuItem asChild>
                            <a
                              href={`tel:${(user.phone || user.cellPhone || "").replace(/\D/g, "")}`}
                              className="flex items-center gap-2 cursor-pointer"
                            >
                              <IconPhone className="h-4 w-4" />
                              Call
                            </a>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem asChild>
                          <a
                            href={`mailto:${user.email}`}
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <IconMail className="h-4 w-4" />
                            Email
                          </a>
                        </DropdownMenuItem>
                      </>
                    )}
                  <DropdownMenuSeparator />
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
