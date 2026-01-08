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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
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
import { useIsMobile } from "@/hooks/use-mobile";
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
    undefined
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
    channelId || null
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
            <div className="flex items-start gap-3" key={i}>
              <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
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

  if (!(currentChannelId && currentUser)) {
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

// Color palette for events
const EVENT_COLORS = [
  "bg-blue-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-indigo-500",
  "bg-cyan-500",
  "bg-teal-500",
  "bg-orange-500",
  "bg-amber-500",
  "bg-lime-500",
  "bg-emerald-500",
  "bg-violet-500",
  "bg-fuchsia-500",
];

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
  const [mobileSortMode, setMobileSortMode] = useState<"event" | "session">(
    "session"
  );
  const [cameFromSessionView, setCameFromSessionView] = useState(false);
  const cameFromSessionViewRef = useRef(false);
  const [eventDetailTab, setEventDetailTab] = useState<"details" | "chat">(
    "details"
  );
  const [eventChannelId, setEventChannelId] = useState<string | null>(null);
  const [eventChatDialogOpen, setEventChatDialogOpen] = useState(false);
  const [eventChatEventId, _setEventChatEventId] = useState<string | null>(
    null
  );
  const [eventChatChannelId, setEventChatChannelId] = useState<string | null>(
    null
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
      null
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
  const [athleteFilterTab, setAthleteFilterTab] = useState<
    "all" | "going" | "not_going" | "pending"
  >("all");
  const [coachFilterTab, setCoachFilterTab] = useState<
    "all" | "going" | "not_going" | "pending"
  >("all");
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

  // Get unique events and assign colors
  const uniqueEvents = useMemo(() => {
    const eventMap = new Map<
      string,
      { id: string; title: string; color: string }
    >();
    events.forEach((event) => {
      if (!eventMap.has(event.id)) {
        const colorIndex = eventMap.size % EVENT_COLORS.length;
        eventMap.set(event.id, {
          id: event.id,
          title: event.title,
          color: EVENT_COLORS[colorIndex],
        });
      }
    });
    return Array.from(eventMap.values());
  }, [events]);

  // Get color for an event
  const getEventColor = (eventId: string): string => {
    const event = uniqueEvents.find((e) => e.id === eventId);
    return event?.color || "bg-primary";
  };

  // Load or create channel when event is selected
  useEffect(() => {
    const eventId = selectedEvent?.id;
    const eventTitle = selectedEvent?.title;

    // Only run if event ID actually changed
    if (eventId === selectedEventIdRef.current) {
      return;
    }

    selectedEventIdRef.current = eventId || null;

    if (!(selectedEvent && eventId)) {
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
              eventId,
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
        if (!response.ok) {
          throw new Error("Failed to load events");
        }
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
                  (o: EventOccurrence) => o.id === occurrenceIdParam
                ) || null;
            }
          }

          // If no URL params or not found, use default selection logic
          if (!eventToSelect) {
            const currentSelectedId = selectedEventIdRef.current;
            if (currentSelectedId) {
              // Check if current selected event still exists
              const stillExists = newEvents.find(
                (e: Event) => e.id === currentSelectedId
              );
              if (stillExists) {
                // Find the updated event object from newEvents
                eventToSelect =
                  newEvents.find((e: Event) => e.id === currentSelectedId) ||
                  null;
                // On mobile, if we're on events view, don't keep selection
                if (isEventsMobile && mobileView === "events") {
                  eventToSelect = null;
                } else if (!(eventToSelect || isEventsMobile)) {
                  eventToSelect = newEvents[0];
                }
              } else {
                // On mobile, don't auto-select the first event - user must click
                if (!isEventsMobile) {
                  eventToSelect = newEvents[0];
                }
              }
            } else {
              // On mobile, don't auto-select the first event - user must click
              if (!isEventsMobile) {
                eventToSelect = newEvents[0];
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
    [searchParams, isEventsMobile, mobileView]
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
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData.error ||
          `Failed to load RSVPs: ${response.status} ${response.statusText}`;
        console.error("RSVP loading error:", errorMessage);
        // Set empty array on error instead of throwing
        setOccurrenceRsvps([]);
        return;
      }
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
          })
        )
      );
    } catch (err) {
      console.error("RSVP loading error:", err);
      // Set empty array on error instead of throwing
      setOccurrenceRsvps([]);
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
            }
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
    if (
      (eventIdParam || occurrenceIdParam) &&
      !initialLoading &&
      events.length > 0 &&
      !isInitialMount.current
    ) {
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
              }
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
          }))
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
    const eventId =
      currentUserRole === "athlete"
        ? selectedEventForAthlete?.id
        : selectedEvent?.id;
    if (eventId) {
      loadCurrentUserRsvps(eventId);
    } else {
      setCurrentUserRsvps(new Map());
      setOccurrenceRsvpsLoading(false);
    }
  }, [
    selectedEvent?.id,
    selectedEventForAthlete?.id,
    currentUserRole,
    loadCurrentUserRsvps,
  ]);

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
            `/api/rsvp?summaryOccurrences=${occurrenceIds.join(",")}`
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
              eventId,
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
    if (!(selectedOccurrence && selectedEvent)) {
      return;
    }
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
        }
      );
      if (!response.ok) {
        throw new Error("Failed to cancel");
      }
      const data = await response.json();

      setCancelDialogOpen(false);

      // Reload events to get updated occurrence status
      const eventsResponse = await fetch("/api/events");
      if (!eventsResponse.ok) {
        throw new Error("Failed to reload events");
      }
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
          (o: EventOccurrence) => o.id === occurrenceIdToCancel
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
    if (!selectedEvent) {
      return;
    }
    setDeleting(true);
    try {
      const response = await fetch(`/api/events/${selectedEvent.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to delete");
      }

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
    currentStatus: string | null
  ) {
    if (!selectedEvent) {
      return;
    }

    const occurrence = selectedEvent.occurrences.find((occ) => {
      const occDate = new Date(occ.date);
      return occDate.toDateString() === date.toDateString();
    });

    if (!occurrence) {
      return;
    }

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
              (e: Event) => e.id === eventIdToKeep
            );
            if (updatedEvent) {
              setSelectedEvent(updatedEvent);
              const updatedOccurrence = updatedEvent.occurrences.find(
                (o: EventOccurrence) => o.id === occurrenceIdToRestore
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
    if (!(selectedEvent && customDate)) {
      return;
    }
    setAddingDate(true);
    try {
      const response = await fetch(
        `/api/events/${selectedEvent.id}/occurrences`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date: customDate.toISOString() }),
        }
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
    if (!selectedEvent) {
      return;
    }
    try {
      const response = await fetch(
        `/api/events/${selectedEvent.id}/occurrences`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ occurrenceId }),
        }
      );
      if (!response.ok) {
        throw new Error("Failed to remove");
      }
      await loadEvents();
    } catch (err) {
      console.error(err);
      alert("Failed to remove custom date");
    }
  }

  async function handleEditRsvp(userId: string, status: "going" | "not_going") {
    if (!selectedOccurrence) {
      return;
    }
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
      if (!response.ok) {
        throw new Error("Failed to edit RSVP");
      }
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
    status: "going" | "not_going"
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
    if (!selectedEvent) {
      return;
    }
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
      if (!eventsResponse.ok) {
        throw new Error("Failed to reload events");
      }
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
          (o: EventOccurrence) => o.id === occurrenceId
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
    if (!selectedOccurrence) {
      return;
    }
    setSendingReminder(true);
    try {
      const response = await fetch("/api/reminders/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ occurrenceId: selectedOccurrence.id }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error);
      }
      alert(`Sent ${data.sent} reminder(s)`);
    } catch (err) {
      console.error(err);
      alert("Failed to send reminders");
    } finally {
      setSendingReminder(false);
    }
  }

  function selectEvent(event: Event, skipViewChange = false) {
    // If clicking the same event that's already selected
    if (event.id === selectedEventIdRef.current) {
      // On mobile, always navigate forward instead of deselecting
      if (isEventsMobile) {
        if (skipViewChange) {
          // When skipping view change, still set athlete event if needed
          if (currentUserRole === "athlete") {
            setSelectedEventForAthlete(event);
          }
        } else if (currentUserRole === "athlete") {
          // For athletes, ensure event is set and navigate to occurrences
          setSelectedEventForAthlete(event);
          // Don't auto-select first occurrence - user must click
          setSelectedOccurrenceForAthleteDetail(null);
          setMobileView("occurrences");
        } else {
          setMobileView("occurrences");
        }
        // Only reset session view flag if not already set (preserve it when coming from session view)
        if (!(cameFromSessionView || skipViewChange)) {
          setCameFromSessionView(false);
          cameFromSessionViewRef.current = false;
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
        // Only reset session view flag if not already set (preserve it when coming from session view)
        if (!(cameFromSessionView || skipViewChange)) {
          setCameFromSessionView(false);
          cameFromSessionViewRef.current = false;
        }
        // If skipViewChange is true (coming from session view), don't set view to occurrences
        // selectOccurrence will handle the view change
        if (skipViewChange) {
          // When coming from session view, still set athlete event but don't change view yet
          // selectOccurrence will handle the view change
          if (currentUserRole === "athlete") {
            setSelectedEventForAthlete(event);
          }
        } else if (currentUserRole === "athlete") {
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
      // Track if we're coming from occurrences view (session view)
      if (mobileView === "occurrences") {
        setCameFromSessionView(true);
        cameFromSessionViewRef.current = true;
      }
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
    if (!dateValue) {
      return { day: "", month: "", weekday: "" };
    }
    const date =
      typeof dateValue === "string" ? new Date(dateValue) : dateValue;
    if (Number.isNaN(date.getTime())) {
      return { day: "", month: "", weekday: "" };
    }
    return {
      day: date.getDate().toString(),
      month: date.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
      weekday: date.toLocaleDateString("en-US", { weekday: "long" }),
    };
  }

  function formatTime(time: string | undefined | null) {
    if (!time) {
      return "";
    }
    const [hours, minutes] = time.split(":");
    const hour = Number.parseInt(hours, 10);
    if (Number.isNaN(hour)) {
      return time;
    }
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  }

  function getRecurrenceLabel(rule: string | null) {
    if (!rule) {
      return "One-time";
    }
    if (rule.includes("DAILY")) {
      return "Daily";
    }
    if (rule.includes("WEEKLY")) {
      return "Weekly";
    }
    if (rule.includes("MONTHLY")) {
      return "Monthly";
    }
    return "Recurring";
  }

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

  function isPastDate(dateStr: string) {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  }

  // Get occurrences from the appropriate event source
  const eventForOccurrences =
    currentUserRole === "athlete" ? selectedEventForAthlete : selectedEvent;

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
          }))
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
                (o) => o.id === occurrenceIdParam
              );
              if (occ) {
                setSelectedOccurrenceForAthleteDetail(occ);
                // Set mobile view to details when occurrence is selected from URL
                if (isEventsMobile) {
                  setMobileView("details");
                }
              } else if (event.occurrences.length > 0) {
                // On mobile, don't auto-select first occurrence - user must click
                if (isEventsMobile) {
                  // On mobile, go to occurrences view without selecting
                  setSelectedOccurrenceForAthleteDetail(null);
                  setMobileView("occurrences");
                } else {
                  const upcomingOccs = event.occurrences.filter((occ) => {
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
            } else if (event.occurrences.length > 0) {
              // On mobile, don't auto-select first occurrence - user must click
              if (isEventsMobile) {
                // On mobile, go to occurrences view without selecting
                setSelectedOccurrenceForAthleteDetail(null);
                setMobileView("occurrences");
              } else {
                const upcomingOccs = event.occurrences.filter((occ) => {
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
                  occ.id === occurrenceIdParam && occ.event.id === eventIdParam
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
    if (!isEventsMobile || currentUserRole === "athlete" || initialLoading) {
      return;
    }

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
            (o) => o.id === occurrenceIdParam
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
        // For athletes, skip occurrences and go directly to events
        // For coaches/owners, check if we came from session view
        if (currentUserRole === "athlete") {
          setMobileView("events");
          setCameFromSessionView(false);
          cameFromSessionViewRef.current = false;
        } else if (cameFromSessionViewRef.current) {
          setMobileView("events");
          setCameFromSessionView(false);
          cameFromSessionViewRef.current = false;
        } else {
          setMobileView("occurrences");
        }
      } else if (mobileView === "occurrences") {
        setMobileView("events");
        setCameFromSessionView(false);
        cameFromSessionViewRef.current = false;
      }
    };

    // Get page title based on current view
    const getPageTitle = () => {
      if (mobileView === "events") {
        return "Events";
      }
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
      <div className="flex h-full min-h-0 flex-1 flex-col">
        {/* Custom Mobile Header */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b bg-background px-6">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {showBackButton && (
              <Button
                className="h-9 w-9 shrink-0 rounded-xl"
                onClick={handleBack}
                size="icon"
                variant="ghost"
              >
                <IconArrowLeft className="h-5 w-5" />
              </Button>
            )}
            <h1 className="truncate font-semibold text-base">
              {getPageTitle()}
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {mobileView === "events" && (
              <>
                <Button
                  className="h-8 gap-2 rounded-sm px-3 text-xs"
                  data-show-text-mobile
                  onClick={() =>
                    setMobileSortMode(
                      mobileSortMode === "event" ? "session" : "event"
                    )
                  }
                  size="sm"
                  variant="outline"
                >
                  {mobileSortMode === "event" ? (
                    <>
                      <IconCalendar className="h-3.5 w-3.5" />
                      Sort by Session
                    </>
                  ) : (
                    <>
                      <IconList className="h-3.5 w-3.5" />
                      Sort by Event
                    </>
                  )}
                </Button>
                <Button
                  asChild
                  className="h-8 gap-2 rounded-sm px-3 text-xs"
                  size="sm"
                >
                  <Link href="/events/new">
                    <IconPlus className="h-4 w-4" />
                    New Event
                  </Link>
                </Button>
              </>
            )}
            {(mobileView === "details" || mobileView === "occurrences") &&
              (selectedEvent || selectedEventForAthlete) && (
                <Button
                  className="h-9 gap-2 rounded-xl"
                  onClick={() => setMobileView("chat")}
                  size="sm"
                  variant="ghost"
                >
                  <IconMessageCircle className="h-5 w-5" />
                  Chat
                </Button>
              )}
          </div>
        </div>

        {/* Filter Tabs - Directly under top header for details view */}
        {mobileView === "details" &&
          (selectedOccurrence || selectedOccurrenceForAthleteDetail) && (
            <div className="shrink-0 border-b bg-background">
              {currentUserRole === "athlete" ? (
                (() => {
                  const occurrenceRsvpsForAthlete = occurrenceRsvps || [];
                  const goingUsers = occurrenceRsvpsForAthlete.filter(
                    (r) => r.status === "going"
                  );
                  const notGoingUsers = occurrenceRsvpsForAthlete.filter(
                    (r) => r.status === "not_going"
                  );
                  const rsvpedUserIds = new Set(
                    occurrenceRsvpsForAthlete.map((r) => r.id)
                  );
                  const isCoachOrOwner = (
                    userId: string,
                    userRole?: string
                  ): boolean => {
                    if (userRole === "coach" || userRole === "owner") {
                      return true;
                    }
                    const member = gymMembers.find((m) => m.id === userId);
                    return member?.role === "coach" || member?.role === "owner";
                  };
                  const isAthlete = (
                    userId: string,
                    userRole?: string
                  ): boolean => {
                    if (userRole === "athlete") {
                      return true;
                    }
                    if (userRole === "coach" || userRole === "owner") {
                      return false;
                    }
                    const member = gymMembers.find((m) => m.id === userId);
                    return member?.role === "athlete" || !member?.role;
                  };
                  const goingCoaches = goingUsers.filter((u) =>
                    isCoachOrOwner(u.id, u.role)
                  );
                  const goingAthletes = goingUsers.filter((u) =>
                    isAthlete(u.id, u.role)
                  );
                  const notGoingCoaches = notGoingUsers.filter((u) =>
                    isCoachOrOwner(u.id, u.role)
                  );
                  const notGoingAthletes = notGoingUsers.filter((u) =>
                    isAthlete(u.id, u.role)
                  );
                  const pendingCoaches = gymMembers.filter((m) => {
                    const isCoach = m.role === "coach" || m.role === "owner";
                    return isCoach && !rsvpedUserIds.has(m.id);
                  });
                  const pendingAthletes = gymMembers.filter((m) => {
                    const isAthleteMember = m.role === "athlete" || !m.role;
                    return isAthleteMember && !rsvpedUserIds.has(m.id);
                  });

                  return (
                    <Tabs
                      onValueChange={(value) =>
                        setAthleteFilterTab(value as typeof athleteFilterTab)
                      }
                      value={athleteFilterTab}
                    >
                      <TabsList className="grid h-10 w-full grid-cols-4 rounded-none border-b-0 bg-transparent">
                        <TabsTrigger
                          className="rounded-none text-xs data-[state=active]:border-primary data-[state=active]:border-b-2 data-[state=active]:bg-transparent"
                          value="all"
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
                          className="rounded-none text-xs data-[state=active]:border-primary data-[state=active]:border-b-2 data-[state=active]:bg-transparent"
                          value="going"
                        >
                          Going ({goingCoaches.length + goingAthletes.length})
                        </TabsTrigger>
                        <TabsTrigger
                          className="rounded-none text-xs data-[state=active]:border-primary data-[state=active]:border-b-2 data-[state=active]:bg-transparent"
                          value="not_going"
                        >
                          Can't (
                          {notGoingCoaches.length + notGoingAthletes.length})
                        </TabsTrigger>
                        <TabsTrigger
                          className="rounded-none text-xs data-[state=active]:border-primary data-[state=active]:border-b-2 data-[state=active]:bg-transparent"
                          value="pending"
                        >
                          Pending (
                          {pendingCoaches.length + pendingAthletes.length})
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  );
                })()
              ) : (
                <Tabs
                  onValueChange={(value) =>
                    setCoachFilterTab(value as typeof coachFilterTab)
                  }
                  value={coachFilterTab}
                >
                  <TabsList className="grid h-10 w-full grid-cols-4 rounded-none border-b-0 bg-transparent">
                    <TabsTrigger
                      className="rounded-none text-xs data-[state=active]:border-primary data-[state=active]:border-b-2 data-[state=active]:bg-transparent"
                      value="all"
                    >
                      All ({gymMembers.length})
                    </TabsTrigger>
                    <TabsTrigger
                      className="rounded-none text-xs data-[state=active]:border-primary data-[state=active]:border-b-2 data-[state=active]:bg-transparent"
                      value="going"
                    >
                      Going ({goingUsers.length})
                    </TabsTrigger>
                    <TabsTrigger
                      className="rounded-none text-xs data-[state=active]:border-primary data-[state=active]:border-b-2 data-[state=active]:bg-transparent"
                      value="not_going"
                    >
                      Can't ({notGoingUsers.length})
                    </TabsTrigger>
                    <TabsTrigger
                      className="rounded-none text-xs data-[state=active]:border-primary data-[state=active]:border-b-2 data-[state=active]:bg-transparent"
                      value="pending"
                    >
                      Pending ({notAnsweredUsers.length})
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              )}
            </div>
          )}

        <Tabs
          className="flex min-h-0 flex-1 flex-col"
          onValueChange={(value) => setMobileView(value as typeof mobileView)}
          value={mobileView}
        >
          {/* Events Tab - Fullscreen */}
          <TabsContent
            className="m-0 flex h-0 min-h-0 flex-1 flex-col"
            value="events"
          >
            <div
              className="h-full flex-1 overflow-y-auto overscroll-contain"
              style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-y" }}
            >
              <div className="p-4">
                {initialLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        className="relative w-full rounded-xl bg-card p-4"
                        key={i}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-5 w-3/4 rounded" />
                            <div className="flex items-center gap-3">
                              <Skeleton className="h-4 w-20 rounded" />
                              <Skeleton className="h-4 w-24 rounded" />
                            </div>
                          </div>
                          <Skeleton className="h-8 w-8 shrink-0 rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : events.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <IconCalendar className="mx-auto mb-4 h-12 w-12 opacity-20" />
                    <p className="text-sm">No events yet</p>
                    <Button asChild className="mt-4">
                      <Link href="/events/new">Create your first event</Link>
                    </Button>
                  </div>
                ) : mobileSortMode === "session" ? (
                  (() => {
                    // Flatten all occurrences from all events and sort by date
                    const allOccurrences = events
                      .flatMap((event) =>
                        event.occurrences
                          .filter((occ) => occ.status === "scheduled")
                          .map((occ) => ({
                            ...occ,
                            event,
                          }))
                      )
                      .sort((a, b) => {
                        const dateA = new Date(a.date).getTime();
                        const dateB = new Date(b.date).getTime();
                        return dateA - dateB;
                      });

                    const futureOccurrences = allOccurrences.filter(
                      (occ) => !isPastDate(occ.date)
                    );
                    const pastOccurrences = allOccurrences.filter((occ) =>
                      isPastDate(occ.date)
                    );
                    const displayedSessions = showPastEvents
                      ? [...futureOccurrences, ...pastOccurrences]
                      : futureOccurrences;

                    return (
                      <div className="space-y-3">
                        {displayedSessions.length === 0 ? (
                          <div className="p-8 text-center text-muted-foreground">
                            <IconCalendar className="mx-auto mb-4 h-12 w-12 opacity-20" />
                            <p className="text-sm">No upcoming sessions</p>
                          </div>
                        ) : (
                          <>
                            {displayedSessions.map((occ) => {
                              const isPast = isPastDate(occ.date);
                              const dateInfo = formatDate(occ.date);
                              const userRsvpStatus = currentUserRsvps.get(
                                occ.id
                              );
                              return (
                                <button
                                  className={`w-full rounded-xl bg-card text-left transition-all hover:bg-muted/50 ${
                                    isPast ? "opacity-60" : ""
                                  } ${occ.status === "canceled" ? "opacity-40" : ""}`}
                                  key={occ.id}
                                  onClick={() => {
                                    // Track that we came from session view (both state and ref)
                                    setCameFromSessionView(true);
                                    cameFromSessionViewRef.current = true;
                                    // Select the event first, but skip view change since we'll go directly to details
                                    selectEvent(occ.event, true);
                                    // Find and select the specific occurrence to open it
                                    const eventOccurrence =
                                      occ.event.occurrences.find(
                                        (o) => o.id === occ.id
                                      );
                                    if (eventOccurrence) {
                                      selectOccurrence(eventOccurrence);
                                    }
                                  }}
                                  type="button"
                                >
                                  <div className="flex items-center gap-6 p-4">
                                    <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl bg-black dark:bg-white">
                                      <span className="font-bold text-2xl text-white leading-none dark:text-black">
                                        {dateInfo.day}
                                      </span>
                                      <span className="mt-1 font-medium text-white text-xs opacity-70 dark:text-black">
                                        {dateInfo.month}
                                      </span>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="mb-1 flex items-center gap-2">
                                        <div
                                          className={`h-2 w-2 shrink-0 rounded-full ${getEventColor(occ.event.id)}`}
                                        />
                                        <p className="font-semibold text-base">
                                          {occ.event.title}
                                        </p>
                                      </div>
                                      <p className="mb-1 text-sm opacity-80">
                                        {dateInfo.weekday} •{" "}
                                        {formatTime(occ.event.startTime)}
                                      </p>
                                      {occ.status === "canceled" && (
                                        <Badge
                                          className="mt-1 text-xs"
                                          variant="destructive"
                                        >
                                          Canceled
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="flex shrink-0 items-center gap-2">
                                      {/* User's RSVP Status */}
                                      {occurrenceRsvpsLoading ? (
                                        <Skeleton className="h-5 w-16 shrink-0 rounded" />
                                      ) : (
                                        <>
                                          {userRsvpStatus === "going" && (
                                            <Badge
                                              className="shrink-0 border-emerald-200 bg-emerald-50 text-emerald-600 text-xs dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400"
                                              variant="outline"
                                            >
                                              Going
                                            </Badge>
                                          )}
                                          {userRsvpStatus === "not_going" && (
                                            <Badge
                                              className="shrink-0 border-red-200 bg-red-50 text-red-600 text-xs dark:border-red-800 dark:bg-red-950/50 dark:text-red-400"
                                              variant="outline"
                                            >
                                              Can't Go
                                            </Badge>
                                          )}
                                          {!userRsvpStatus && (
                                            <Badge
                                              className="shrink-0 border-amber-200 bg-amber-50 text-amber-600 text-xs dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-400"
                                              variant="outline"
                                            >
                                              Pending
                                            </Badge>
                                          )}
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </button>
                              );
                            })}
                            {pastOccurrences.length > 0 && (
                              <button
                                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl p-3 text-muted-foreground text-sm hover:text-foreground"
                                onClick={() =>
                                  setShowPastEvents(!showPastEvents)
                                }
                                type="button"
                              >
                                <IconHistory className="h-4 w-4" />
                                {showPastEvents ? "Hide" : "Show"} past sessions
                                ({pastOccurrences.length})
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })()
                ) : (
                  <div className="space-y-3">
                    {events.map((event) => (
                      <div
                        className={`relative w-full rounded-xl transition-all ${
                          selectedEvent?.id === event.id &&
                          (!isEventsMobile || mobileView !== "events")
                            ? "bg-primary text-primary-foreground"
                            : "bg-card hover:bg-muted/50"
                        }`}
                        key={event.id}
                      >
                        <div className="flex items-start gap-3">
                          <button
                            className="min-w-0 flex-1 p-4 text-left"
                            onClick={() => selectEvent(event)}
                            type="button"
                          >
                            <p className="mb-2 font-semibold text-base">
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
                                  className="h-8 w-8 shrink-0"
                                  size="icon"
                                  variant="ghost"
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
            </div>
          </TabsContent>

          {/* Occurrences Tab - Fullscreen */}
          <TabsContent
            className="m-0 flex min-h-0 flex-1 flex-col overflow-hidden"
            value="occurrences"
          >
            {selectedEvent || selectedEventForAthlete ? (
              <>
                <div className="shrink-0 p-4">
                  <h2 className="font-semibold text-lg">
                    {currentUserRole === "athlete"
                      ? selectedEventForAthlete?.title
                      : selectedEvent?.title}
                  </h2>
                  <p className="mt-1 text-muted-foreground text-sm">
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
                <div className="min-h-0 flex-1 overflow-y-auto">
                  <div className="p-4">
                    {displayedOccurrences.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground">
                        <IconCalendar className="mx-auto mb-4 h-12 w-12 opacity-20" />
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
                          const isSelected =
                            currentUserRole === "athlete"
                              ? selectedOccurrenceForAthleteDetail?.id ===
                                occ.id
                              : selectedOccurrence?.id === occ.id;
                          return (
                            <div
                              className={`w-full rounded-xl transition-all ${
                                isSelected
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-card hover:bg-muted/50"
                              } ${isPast ? "opacity-60" : ""} ${occ.status === "canceled" ? "opacity-40" : ""}`}
                              key={occ.id}
                            >
                              <div className="flex items-center gap-2 p-4">
                                <button
                                  className="flex min-w-0 flex-1 items-center gap-6 text-left"
                                  onClick={() => selectOccurrence(occ)}
                                  type="button"
                                >
                                  <div
                                    className={`flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl bg-black dark:bg-white ${
                                      isSelected ? "ring-2 ring-primary" : ""
                                    }`}
                                  >
                                    <span className="font-bold text-2xl text-white leading-none dark:text-black">
                                      {dateInfo.day}
                                    </span>
                                    <span className="mt-1 font-medium text-white text-xs opacity-70 dark:text-black">
                                      {dateInfo.month}
                                    </span>
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="mb-1 font-semibold text-base">
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
                                        className={`mt-1 flex items-center gap-2 ${
                                          isSelected ? "opacity-90" : ""
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
                                            className={`font-medium text-xs ${
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
                                            className={`font-medium text-xs ${
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
                                <div className="flex shrink-0 items-center gap-2">
                                  {/* User's RSVP Status */}
                                  {occurrenceRsvpsLoading ? (
                                    <Skeleton className="h-5 w-5 shrink-0 rounded" />
                                  ) : (
                                    (() => {
                                      const userRsvpStatus =
                                        currentUserRsvps.get(occ.id);
                                      if (userRsvpStatus === "going") {
                                        return (
                                          <div
                                            className={`flex shrink-0 items-center ${
                                              isSelected
                                                ? "text-primary-foreground"
                                                : "text-emerald-600"
                                            }`}
                                          >
                                            <IconCheck className="h-5 w-5" />
                                          </div>
                                        );
                                      }
                                      if (userRsvpStatus === "not_going") {
                                        return (
                                          <div
                                            className={`flex shrink-0 items-center ${
                                              isSelected
                                                ? "text-primary-foreground"
                                                : "text-red-600"
                                            }`}
                                          >
                                            <IconX className="h-5 w-5" />
                                          </div>
                                        );
                                      }
                                      return (
                                        <div
                                          className={`flex shrink-0 items-center ${
                                            isSelected
                                              ? "text-primary-foreground/60"
                                              : "text-amber-600"
                                          }`}
                                        >
                                          <IconBell className="h-4 w-4" />
                                        </div>
                                      );
                                    })()
                                  )}
                                  <div className="flex flex-col items-end gap-1">
                                    {occ.status === "canceled" && (
                                      <Badge
                                        className="text-xs"
                                        variant="destructive"
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
                                        className="text-xs"
                                        variant="outline"
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
                        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl p-3 text-muted-foreground text-sm hover:text-foreground"
                        onClick={() => setShowPastEvents(!showPastEvents)}
                        type="button"
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
              <div className="flex flex-1 items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <IconCalendar className="mx-auto mb-4 h-12 w-12 opacity-20" />
                  <p className="text-sm">Select an event first</p>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Details Tab - Fullscreen */}
          <TabsContent
            className="m-0 flex min-h-0 flex-1 flex-col overflow-hidden"
            value="details"
          >
            {currentUserRole === "athlete" &&
            selectedOccurrenceForAthleteDetail ? (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <div className="shrink-0 border-b p-4">
                  <div className="min-w-0 flex-1">
                    <h2 className="font-semibold text-lg">
                      {selectedEventForAthlete?.title}
                    </h2>
                    <p className="mt-1 text-muted-foreground text-sm">
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
                </div>
                <div className="min-h-0 flex-1 overflow-auto">
                  <div className="p-4 pb-40">
                    {selectedEventForAthlete?.description && (
                      <div className="mb-4">
                        <p className="whitespace-pre-wrap text-muted-foreground text-sm">
                          {selectedEventForAthlete.description}
                        </p>
                        {selectedEventForAthlete.location && (
                          <p className="mt-2 text-muted-foreground text-sm">
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
                        (r) => r.status === "going"
                      );
                      const notGoingUsers = occurrenceRsvpsForAthlete.filter(
                        (r) => r.status === "not_going"
                      );
                      const rsvpedUserIds = new Set(
                        occurrenceRsvpsForAthlete.map((r) => r.id)
                      );

                      const isCoachOrOwner = (
                        userId: string,
                        userRole?: string
                      ): boolean => {
                        if (userRole === "coach" || userRole === "owner") {
                          return true;
                        }
                        const member = gymMembers.find((m) => m.id === userId);
                        return (
                          member?.role === "coach" || member?.role === "owner"
                        );
                      };

                      const isAthlete = (
                        userId: string,
                        userRole?: string
                      ): boolean => {
                        if (userRole === "athlete") {
                          return true;
                        }
                        if (userRole === "coach" || userRole === "owner") {
                          return false;
                        }
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
                          const isCoach =
                            m.role === "coach" || m.role === "owner";
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
                          const isAthleteMember =
                            m.role === "athlete" || !m.role;
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
                        status: "going" | "not_going" | "pending"
                      ) => {
                        if (status === "going") {
                          return (
                            <div className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 font-medium text-emerald-600 text-xs dark:bg-emerald-950/50">
                              <IconCheck className="h-3 w-3" />
                              Going
                            </div>
                          );
                        }
                        if (status === "not_going") {
                          return (
                            <div className="flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 font-medium text-red-600 text-xs dark:bg-red-950/50">
                              <IconX className="h-3 w-3" />
                              Can't
                            </div>
                          );
                        }
                        return (
                          <div className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 font-medium text-amber-600 text-xs dark:bg-amber-950/50">
                            <IconBell className="h-3 w-3" />
                            Pending
                          </div>
                        );
                      };

                      const renderUserItem = (
                        user:
                          | (typeof goingCoaches)[0]
                          | (typeof goingAthletes)[0]
                          | (typeof notGoingCoaches)[0]
                          | (typeof notGoingAthletes)[0]
                          | (typeof pendingCoaches)[0]
                          | (typeof pendingAthletes)[0],
                        _isCoach: boolean,
                        displayStatusOverride?:
                          | "going"
                          | "not_going"
                          | "pending"
                      ) => {
                        const displayStatus: "going" | "not_going" | "pending" =
                          displayStatusOverride ||
                          ("displayStatus" in user &&
                          (user.displayStatus === "going" ||
                            user.displayStatus === "not_going" ||
                            user.displayStatus === "pending")
                            ? user.displayStatus
                            : user.status === "going"
                              ? "going"
                              : user.status === "not_going"
                                ? "not_going"
                                : "pending");
                        return (
                          <div
                            className="flex items-center gap-2 rounded-lg p-2 transition-colors hover:bg-muted/50"
                            key={user.id}
                          >
                            <Avatar className="h-8 w-8 shrink-0 rounded-lg">
                              <AvatarImage src={user.avatarUrl || undefined} />
                              <AvatarFallback className="rounded-lg bg-muted text-xs">
                                {getInitials(user.name, user.email)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-medium text-sm">
                                {user.name || "Unnamed"}
                              </p>
                            </div>
                            {renderStatusBadge(displayStatus)}
                          </div>
                        );
                      };

                      return (
                        <Tabs
                          className="w-full"
                          onValueChange={(value) =>
                            setAthleteFilterTab(
                              value as typeof athleteFilterTab
                            )
                          }
                          value={athleteFilterTab}
                        >
                          <TabsContent className="mt-0" value="all">
                            <div className="space-y-0.5">
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
                                        <p className="mb-2 font-medium text-muted-foreground text-xs">
                                          Coaches
                                        </p>
                                        <div className="space-y-0.5">
                                          {allCoaches.map((coach) =>
                                            renderUserItem(coach, true)
                                          )}
                                        </div>
                                      </div>
                                    )}
                                    {allAthletes.length > 0 && (
                                      <div>
                                        <p className="mb-2 font-medium text-muted-foreground text-xs">
                                          Athletes
                                        </p>
                                        <div className="space-y-0.5">
                                          {allAthletes.map((athlete) =>
                                            renderUserItem(athlete, false)
                                          )}
                                        </div>
                                      </div>
                                    )}
                                    {allCoaches.length === 0 &&
                                      allAthletes.length === 0 && (
                                        <div className="py-8 text-center text-muted-foreground text-sm">
                                          No members found
                                        </div>
                                      )}
                                  </>
                                );
                              })()}
                            </div>
                          </TabsContent>
                          <TabsContent className="mt-0" value="going">
                            <div className="space-y-0.5">
                              {goingCoaches.length > 0 && (
                                <div>
                                  <p className="mb-2 font-medium text-muted-foreground text-xs">
                                    Coaches
                                  </p>
                                  <div className="space-y-0.5">
                                    {goingCoaches.map((coach) =>
                                      renderUserItem(coach, true, "going")
                                    )}
                                  </div>
                                </div>
                              )}
                              {goingAthletes.length > 0 && (
                                <div>
                                  <p className="mb-2 font-medium text-muted-foreground text-xs">
                                    Athletes
                                  </p>
                                  <div className="space-y-0.5">
                                    {goingAthletes.map((athlete) =>
                                      renderUserItem(athlete, false, "going")
                                    )}
                                  </div>
                                </div>
                              )}
                              {goingCoaches.length === 0 &&
                                goingAthletes.length === 0 && (
                                  <div className="py-8 text-center text-muted-foreground text-sm">
                                    No one is going
                                  </div>
                                )}
                            </div>
                          </TabsContent>
                          <TabsContent className="mt-0" value="not_going">
                            <div className="space-y-0.5">
                              {notGoingCoaches.length > 0 && (
                                <div>
                                  <p className="mb-2 font-medium text-muted-foreground text-xs">
                                    Coaches
                                  </p>
                                  <div className="space-y-0.5">
                                    {notGoingCoaches.map((coach) =>
                                      renderUserItem(coach, true, "not_going")
                                    )}
                                  </div>
                                </div>
                              )}
                              {notGoingAthletes.length > 0 && (
                                <div>
                                  <p className="mb-2 font-medium text-muted-foreground text-xs">
                                    Athletes
                                  </p>
                                  <div className="space-y-0.5">
                                    {notGoingAthletes.map((athlete) =>
                                      renderUserItem(
                                        athlete,
                                        false,
                                        "not_going"
                                      )
                                    )}
                                  </div>
                                </div>
                              )}
                              {notGoingCoaches.length === 0 &&
                                notGoingAthletes.length === 0 && (
                                  <div className="py-8 text-center text-muted-foreground text-sm">
                                    No one can't make it
                                  </div>
                                )}
                            </div>
                          </TabsContent>
                          <TabsContent className="mt-0" value="pending">
                            <div className="space-y-0.5">
                              {pendingCoaches.length > 0 && (
                                <div>
                                  <p className="mb-2 font-medium text-muted-foreground text-xs">
                                    Coaches
                                  </p>
                                  <div className="space-y-0.5">
                                    {pendingCoaches.map((coach) =>
                                      renderUserItem(coach, true, "pending")
                                    )}
                                  </div>
                                </div>
                              )}
                              {pendingAthletes.length > 0 && (
                                <div>
                                  <p className="mb-2 font-medium text-muted-foreground text-xs">
                                    Athletes
                                  </p>
                                  <div className="space-y-0.5">
                                    {pendingAthletes.map((athlete) =>
                                      renderUserItem(athlete, false, "pending")
                                    )}
                                  </div>
                                </div>
                              )}
                              {pendingCoaches.length === 0 &&
                                pendingAthletes.length === 0 && (
                                  <div className="py-8 text-center text-muted-foreground text-sm">
                                    Everyone has responded
                                  </div>
                                )}
                            </div>
                          </TabsContent>
                        </Tabs>
                      );
                    })()}
                  </div>
                </div>
              </div>
            ) : selectedOccurrence ? (
              <>
                <div className="shrink-0 border-b p-4">
                  <h2 className="font-semibold text-lg">
                    {selectedEvent?.title}
                  </h2>
                  <p className="mt-1 text-muted-foreground text-sm">
                    {formatDate(selectedOccurrence.date).weekday},{" "}
                    {formatDate(selectedOccurrence.date).month}{" "}
                    {formatDate(selectedOccurrence.date).day} •{" "}
                    {formatTime(selectedEvent?.startTime)}
                  </p>
                </div>
                <div className="flex-1 overflow-hidden">
                  {rsvpLoading ? (
                    <div className="flex h-full flex-col p-4 pb-40">
                      <Skeleton className="mb-4 h-12 w-full rounded-xl" />
                      <div className="space-y-3">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <div
                            className="flex items-center gap-3 rounded-xl p-3"
                            key={i}
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
                      className="flex h-full min-h-0 flex-col"
                      onValueChange={(value) =>
                        setCoachFilterTab(value as typeof coachFilterTab)
                      }
                      value={coachFilterTab}
                    >
                      <TabsContent
                        className="mt-0 min-h-0 flex-1 overflow-auto p-4 pb-40"
                        value="all"
                      >
                        {gymMembersLoading ? (
                          <div className="space-y-3">
                            {[1, 2, 3].map((i) => (
                              <div
                                className="flex items-center gap-3 rounded-xl p-3"
                                key={i}
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
                            currentUserRole={currentUserRole}
                            getInitials={getInitials}
                            onEditRsvp={handleEditRsvp}
                            users={gymMembers.map((m) => ({
                              ...m,
                              status:
                                occurrenceRsvps.find((r) => r.id === m.id)
                                  ?.status || null,
                            }))}
                          />
                        )}
                      </TabsContent>
                      <TabsContent
                        className="mt-0 flex-1 overflow-auto p-4 pb-40"
                        value="going"
                      >
                        <UserList
                          currentUserRole={currentUserRole}
                          getInitials={getInitials}
                          onEditRsvp={handleEditRsvp}
                          users={goingUsers.map((u) => {
                            const member = gymMembers.find(
                              (m) => m.id === u.id
                            );
                            // Use role from RSVP user object first, then fall back to gymMembers
                            return {
                              ...u,
                              status: "going",
                              role: u.role || member?.role,
                            };
                          })}
                        />
                      </TabsContent>
                      <TabsContent
                        className="mt-0 flex-1 overflow-auto p-4 pb-40"
                        value="not_going"
                      >
                        <UserList
                          currentUserRole={currentUserRole}
                          getInitials={getInitials}
                          onEditRsvp={handleEditRsvp}
                          users={notGoingUsers.map((u) => {
                            const member = gymMembers.find(
                              (m) => m.id === u.id
                            );
                            // Use role from RSVP user object first, then fall back to gymMembers
                            return {
                              ...u,
                              status: "not_going",
                              role: u.role || member?.role,
                            };
                          })}
                        />
                      </TabsContent>
                      <TabsContent
                        className="mt-0 flex-1 overflow-auto p-4 pb-40"
                        value="pending"
                      >
                        <UserList
                          currentUserRole={currentUserRole}
                          getInitials={getInitials}
                          onEditRsvp={handleEditRsvp}
                          users={notAnsweredUsers.map((u) => ({
                            ...u,
                            status: null,
                          }))}
                        />
                      </TabsContent>
                    </Tabs>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <IconUsers className="mx-auto mb-4 h-12 w-12 opacity-20" />
                  <p className="text-sm">Select a session to view details</p>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Chat Tab */}
          <TabsContent
            className="m-0 flex min-h-0 flex-1 flex-col overflow-hidden"
            key={`chat-${selectedEvent?.id || selectedEventForAthlete?.id || "none"}-${mobileView}`}
            value="chat"
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

        {/* Fixed Action Buttons - Above Bottom Nav */}
        {mobileView === "details" &&
          (selectedOccurrence || selectedOccurrenceForAthleteDetail) &&
          ((currentUserRole === "athlete" &&
            selectedOccurrenceForAthleteDetail?.status !== "canceled") ||
            (currentUserRole !== "athlete" &&
              selectedOccurrence &&
              selectedOccurrence.status !== "canceled")) && (
            <div className="fixed right-0 bottom-16 left-0 z-40 border-t bg-background/95 p-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:hidden">
              <div className="grid grid-cols-2 gap-2">
                {/* Going Button */}
                <Button
                  className={`h-9 w-full gap-2 rounded-sm px-3 ${
                    currentUserRsvps.get(
                      currentUserRole === "athlete"
                        ? selectedOccurrenceForAthleteDetail?.id || ""
                        : selectedOccurrence?.id || ""
                    ) === "going"
                      ? "!bg-emerald-600 hover:!bg-emerald-700 !text-white border-emerald-600"
                      : "border-emerald-400 text-emerald-400 hover:bg-emerald-50 hover:text-emerald-500 dark:hover:bg-emerald-950"
                  }`}
                  onClick={async () => {
                    const occurrenceId =
                      currentUserRole === "athlete"
                        ? selectedOccurrenceForAthleteDetail?.id
                        : selectedOccurrence?.id;
                    if (!occurrenceId) {
                      return;
                    }
                    const response = await fetch("/api/rsvp", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        occurrenceId,
                        status: "going",
                      }),
                    });
                    if (response.ok) {
                      setCurrentUserRsvps((prev) => {
                        const newMap = new Map(prev);
                        newMap.set(occurrenceId, "going");
                        return newMap;
                      });
                      if (occurrenceId) {
                        loadOccurrenceRsvps(occurrenceId);
                      }
                    }
                  }}
                  size="sm"
                  variant="outline"
                >
                  <IconCheck className="h-4 w-4" />
                  {currentUserRsvps.get(
                    currentUserRole === "athlete"
                      ? selectedOccurrenceForAthleteDetail?.id || ""
                      : selectedOccurrence?.id || ""
                  ) === "going"
                    ? "Going!"
                    : "Going"}
                </Button>

                {/* Not Going Button */}
                <Button
                  className={`h-9 w-full gap-2 rounded-sm px-3 ${
                    currentUserRsvps.get(
                      currentUserRole === "athlete"
                        ? selectedOccurrenceForAthleteDetail?.id || ""
                        : selectedOccurrence?.id || ""
                    ) === "not_going"
                      ? "!bg-red-600 hover:!bg-red-700 !text-white border-red-600"
                      : "border-red-400 text-red-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950"
                  }`}
                  onClick={async () => {
                    const occurrenceId =
                      currentUserRole === "athlete"
                        ? selectedOccurrenceForAthleteDetail?.id
                        : selectedOccurrence?.id;
                    if (!occurrenceId) {
                      return;
                    }
                    const response = await fetch("/api/rsvp", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        occurrenceId,
                        status: "not_going",
                      }),
                    });
                    if (response.ok) {
                      setCurrentUserRsvps((prev) => {
                        const newMap = new Map(prev);
                        newMap.set(occurrenceId, "not_going");
                        return newMap;
                      });
                      if (occurrenceId) {
                        loadOccurrenceRsvps(occurrenceId);
                      }
                    }
                  }}
                  size="sm"
                  variant="outline"
                >
                  <IconX className="h-4 w-4" />
                  Not Going
                </Button>

                {/* Send Reminders Button - Only for non-athletes */}
                {currentUserRole !== "athlete" &&
                  notAnsweredUsers.length > 0 &&
                  selectedOccurrence &&
                  selectedOccurrence.status !== "canceled" && (
                    <Button
                      className="h-9 w-full gap-2 rounded-sm px-3"
                      disabled={sendingReminder}
                      onClick={handleSendReminders}
                      size="sm"
                      variant="outline"
                    >
                      <IconBell className="h-4 w-4" />
                      {sendingReminder
                        ? "Sending..."
                        : `Send Reminders (${notAnsweredUsers.length})`}
                    </Button>
                  )}

                {/* Cancel Session Button - Only for coaches/owners */}
                {currentUserRole !== "athlete" && (
                  <Button
                    className={`h-9 w-full gap-2 rounded-sm px-3 text-destructive hover:text-destructive ${
                      notAnsweredUsers.length > 0 &&
                      selectedOccurrence?.status !== "canceled"
                        ? ""
                        : "col-span-2"
                    }`}
                    onClick={() => setCancelDialogOpen(true)}
                    size="sm"
                    variant="outline"
                  >
                    <IconBan className="h-4 w-4" />
                    Cancel Session
                  </Button>
                )}
              </div>
            </div>
          )}
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
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
          )
      : [];

    // Filter RSVPs: show coaches individually, athletes as counts only
    const occurrenceRsvpsForAthlete = occurrenceRsvps || [];
    const goingUsers = occurrenceRsvpsForAthlete.filter(
      (r) => r.status === "going"
    );
    const notGoingUsers = occurrenceRsvpsForAthlete.filter(
      (r) => r.status === "not_going"
    );

    // Get IDs of users who have RSVP'd
    const rsvpedUserIds = new Set(occurrenceRsvpsForAthlete.map((r) => r.id));

    // Helper function to determine if user is coach/owner (use role from RSVP first, then gymMembers)
    const isCoachOrOwner = (userId: string, userRole?: string): boolean => {
      if (userRole === "coach" || userRole === "owner") {
        return true;
      }
      const member = gymMembers.find((m) => m.id === userId);
      return member?.role === "coach" || member?.role === "owner";
    };

    // Helper function to determine if user is athlete (use role from RSVP first, then gymMembers)
    const isAthlete = (userId: string, userRole?: string): boolean => {
      if (userRole === "athlete") {
        return true;
      }
      if (userRole === "coach" || userRole === "owner") {
        return false;
      }
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
        (r) => r.id === currentUserId
      );
      // Determine role: use RSVP role first, then gymMembers role, then assume athlete if none
      const currentUserRole = currentUserRsvp?.role || currentUserMember?.role;

      // Check if current user is already in any list
      const isInGoingCoaches = goingCoaches.some((u) => u.id === currentUserId);
      const isInGoingAthletes = goingAthletes.some(
        (u) => u.id === currentUserId
      );
      const isInNotGoingCoaches = notGoingCoaches.some(
        (u) => u.id === currentUserId
      );
      const isInNotGoingAthletes = notGoingAthletes.some(
        (u) => u.id === currentUserId
      );
      const isInPendingCoaches = pendingCoaches.some(
        (u) => u.id === currentUserId
      );
      const isInPendingAthletes = pendingAthletes.some(
        (u) => u.id === currentUserId
      );

      const isCurrentUserCoach = isCoachOrOwner(currentUserId, currentUserRole);
      const isCurrentUserAthlete = isAthlete(currentUserId, currentUserRole);

      // If current user is not in any list, add them to the appropriate pending list
      if (
        !(
          isInGoingCoaches ||
          isInGoingAthletes ||
          isInNotGoingCoaches ||
          isInNotGoingAthletes ||
          isInPendingCoaches ||
          isInPendingAthletes
        )
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
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
        <PageHeader description="View all upcoming events" title="Events" />
        <div className="flex h-0 min-h-0 flex-1 gap-4 overflow-hidden">
          {/* Events Sidebar */}
          <div className="flex h-full min-h-0 w-64 flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
            <ScrollArea className="h-full">
              <div className="p-2">
                {initialLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div className="w-full space-y-2 rounded-xl p-3" key={i}>
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
                  <div className="p-4 text-center text-muted-foreground text-sm">
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
                    if (upcomingOccs.length === 0) {
                      return null;
                    }

                    return (
                      <div className="group relative mb-1" key={event.id}>
                        <button
                          className={`w-full rounded-xl p-3 text-left transition-all ${
                            selectedEventForAthlete?.id === event.id &&
                            (!isEventsMobile || mobileView !== "events")
                              ? "bg-primary text-primary-foreground"
                              : "hover:bg-muted"
                          }`}
                          onClick={() => {
                            // If clicking the same event that's already selected, deselect it
                            if (selectedEventForAthlete?.id === event.id) {
                              setSelectedEventForAthlete(null);
                              setSelectedOccurrenceForAthleteDetail(null);
                            } else {
                              setSelectedEventForAthlete(event);
                              if (upcomingOccs.length > 0) {
                                setSelectedOccurrenceForAthleteDetail(
                                  upcomingOccs[0]
                                );
                              }
                            }
                          }}
                          type="button"
                        >
                          <p className="truncate pr-6 font-medium text-sm">
                            {event.title}
                          </p>
                          <div
                            className={`mt-1.5 flex items-center gap-2 text-xs ${
                              selectedEventForAthlete?.id === event.id &&
                              (!isEventsMobile || mobileView !== "events")
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
          <div className="flex h-full min-h-0 w-72 flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
            {selectedEventForAthlete ? (
              <ScrollArea className="h-full">
                <div className="p-2">
                  {selectedEventOccurrences.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground text-sm">
                      No upcoming sessions
                    </div>
                  ) : (
                    selectedEventOccurrences.map((occ) => {
                      const dateInfo = formatDate(occ.date);
                      return (
                        <button
                          className={`mb-1 flex w-full items-center gap-4 rounded-xl p-3 text-left transition-all ${
                            selectedOccurrenceForAthleteDetail?.id === occ.id
                              ? "bg-primary/10 ring-1 ring-primary"
                              : "hover:bg-muted"
                          } ${occ.status === "canceled" ? "opacity-40" : ""}`}
                          key={occ.id}
                          onClick={() =>
                            setSelectedOccurrenceForAthleteDetail(occ)
                          }
                          type="button"
                        >
                          <div
                            className={`flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl ${
                              selectedOccurrenceForAthleteDetail?.id === occ.id
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                            }`}
                          >
                            <span className="font-bold text-xl leading-none">
                              {dateInfo.day}
                            </span>
                            <span className="mt-0.5 font-medium text-[10px] opacity-70">
                              {dateInfo.month}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="whitespace-nowrap font-medium text-sm">
                              {dateInfo.weekday}
                            </p>
                            <p className="text-muted-foreground text-xs">
                              {formatTime(selectedEventForAthlete.startTime)}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            {/* User's RSVP Status */}
                            {occurrenceRsvpsLoading ? (
                              <Skeleton className="h-5 w-5 shrink-0 rounded" />
                            ) : (
                              (() => {
                                const userRsvpStatus = currentUserRsvps.get(
                                  occ.id
                                );
                                if (userRsvpStatus === "going") {
                                  return (
                                    <div className="flex shrink-0 items-center text-emerald-600">
                                      <IconCheck className="h-5 w-5" />
                                    </div>
                                  );
                                }
                                if (userRsvpStatus === "not_going") {
                                  return (
                                    <div className="flex shrink-0 items-center text-red-600">
                                      <IconX className="h-5 w-5" />
                                    </div>
                                  );
                                }
                                return (
                                  <div className="flex shrink-0 items-center text-amber-600">
                                    <IconBell className="h-4 w-4" />
                                  </div>
                                );
                              })()
                            )}
                            {occ.status === "canceled" && (
                              <Badge
                                className="text-[10px]"
                                variant="destructive"
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
              <div className="flex flex-1 items-center justify-center text-muted-foreground text-sm">
                Select an event
              </div>
            )}
          </div>

          {/* Event Detail */}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
            {selectedOccurrenceForAthleteDetail ? (
              <>
                <div className="flex shrink-0 items-center justify-between gap-4 border-b p-4">
                  <div>
                    <h3 className="font-semibold">
                      {selectedEventForAthlete?.title}
                    </h3>
                    <p className="text-muted-foreground text-sm">
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
                  <div className="flex shrink-0 gap-2">
                    <Button
                      className={`h-9 gap-1.5 rounded-xl px-3 ${
                        currentUserRsvpForOccurrence === "going"
                          ? "!bg-emerald-600 hover:!bg-emerald-700 !text-white border-emerald-600"
                          : "border-emerald-400 text-emerald-400 hover:bg-emerald-50 hover:text-emerald-500 dark:hover:bg-emerald-950"
                      }`}
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
                              "going"
                            );
                            return newMap;
                          });
                          loadOccurrenceRsvps(
                            selectedOccurrenceForAthleteDetail.id
                          );
                        }
                      }}
                      size="sm"
                      variant="outline"
                    >
                      <IconCheck className="h-4 w-4" />
                      {currentUserRsvpForOccurrence === "going"
                        ? "Going!"
                        : "Going"}
                    </Button>
                    <Button
                      className={`h-9 gap-1.5 rounded-xl px-3 ${
                        currentUserRsvpForOccurrence === "not_going"
                          ? "!bg-red-600 hover:!bg-red-700 !text-white border-red-600"
                          : "border-red-400 text-red-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950"
                      }`}
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
                              "not_going"
                            );
                            return newMap;
                          });
                          loadOccurrenceRsvps(
                            selectedOccurrenceForAthleteDetail.id
                          );
                        }
                      }}
                      size="sm"
                      variant="outline"
                    >
                      <IconX className="h-4 w-4" />
                      Can't
                    </Button>
                  </div>
                </div>
                <Tabs
                  className="flex min-h-0 flex-1 flex-col"
                  onValueChange={(value) =>
                    setAthleteEventDetailTab(
                      value as typeof athleteEventDetailTab
                    )
                  }
                  value={athleteEventDetailTab}
                >
                  <div className="shrink-0 border-b px-4 py-4">
                    <TabsList className="grid h-10 w-full grid-cols-2 rounded-xl">
                      <TabsTrigger
                        className="rounded-lg text-xs"
                        value="details"
                      >
                        Details
                      </TabsTrigger>
                      <TabsTrigger className="rounded-lg text-xs" value="chat">
                        Chat
                      </TabsTrigger>
                    </TabsList>
                  </div>
                  <TabsContent
                    className="mt-0 min-h-0 flex-1 overflow-hidden"
                    value="details"
                  >
                    {rsvpLoading ? (
                      <div className="flex h-full flex-col p-4">
                        <Skeleton className="mb-4 h-10 w-full rounded-xl" />
                        <div className="space-y-3">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <div
                              className="flex items-center gap-3 rounded-xl p-3"
                              key={i}
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
                      <div className="flex h-full flex-col">
                        {/* Event Description */}
                        {selectedEventForAthlete?.description && (
                          <div className="border-b p-4">
                            <p className="whitespace-pre-wrap text-muted-foreground text-sm">
                              {selectedEventForAthlete.description}
                            </p>
                            {selectedEventForAthlete.location && (
                              <p className="mt-2 text-muted-foreground text-sm">
                                📍 {selectedEventForAthlete.location}
                              </p>
                            )}
                          </div>
                        )}

                        {/* RSVP Section */}
                        <div className="flex-1 overflow-auto p-4">
                          <div className="space-y-6">
                            {/* RSVP Lists */}
                            <Tabs className="flex-1" defaultValue="all">
                              <TabsList className="mb-4 grid h-10 w-full grid-cols-4 rounded-xl">
                                <TabsTrigger
                                  className="rounded-lg text-xs"
                                  value="all"
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
                                  className="rounded-lg text-xs"
                                  value="going"
                                >
                                  Going (
                                  {goingCoaches.length + goingAthletes.length})
                                </TabsTrigger>
                                <TabsTrigger
                                  className="rounded-lg text-xs"
                                  value="not_going"
                                >
                                  Can't (
                                  {notGoingCoaches.length +
                                    notGoingAthletes.length}
                                  )
                                </TabsTrigger>
                                <TabsTrigger
                                  className="rounded-lg text-xs"
                                  value="pending"
                                >
                                  Pending (
                                  {pendingCoaches.length +
                                    pendingAthletes.length}
                                  )
                                </TabsTrigger>
                              </TabsList>
                              <TabsContent className="mt-0" value="all">
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
                                      status: "going" | "not_going" | "pending"
                                    ) => {
                                      if (status === "going") {
                                        return (
                                          <div className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 font-medium text-emerald-600 text-xs dark:bg-emerald-950/50">
                                            <IconCheck className="h-3 w-3" />
                                            Going
                                          </div>
                                        );
                                      }
                                      if (status === "not_going") {
                                        return (
                                          <div className="flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 font-medium text-red-600 text-xs dark:bg-red-950/50">
                                            <IconX className="h-3 w-3" />
                                            Can't
                                          </div>
                                        );
                                      }
                                      return (
                                        <div className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 font-medium text-amber-600 text-xs dark:bg-amber-950/50">
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
                                      isCoach: boolean
                                    ) => {
                                      const phoneNumber =
                                        user.phone || user.cellPhone;
                                      return (
                                        <div
                                          className="group flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-muted/50"
                                          key={user.id}
                                        >
                                          <Avatar className="h-10 w-10 rounded-xl">
                                            <AvatarImage
                                              src={user.avatarUrl || undefined}
                                            />
                                            <AvatarFallback className="rounded-xl bg-linear-to-br from-primary/20 to-primary/5 text-xs">
                                              {getInitials(
                                                user.name,
                                                user.email
                                              )}
                                            </AvatarFallback>
                                          </Avatar>
                                          <div className="min-w-0 flex-1">
                                            <p className="truncate font-medium text-sm">
                                              {user.name || "Unnamed"}
                                            </p>
                                            <p className="truncate text-muted-foreground text-xs">
                                              {user.email}
                                            </p>
                                          </div>
                                          {renderStatusBadge(
                                            user.displayStatus
                                          )}
                                          <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                              <Button
                                                className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                                                size="icon"
                                                variant="ghost"
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
                                                  className="flex cursor-pointer items-center gap-2"
                                                  href={`/chat?userId=${user.id}`}
                                                >
                                                  <IconMessageCircle className="h-4 w-4" />
                                                  Chat
                                                </Link>
                                              </DropdownMenuItem>
                                              {isCoach && phoneNumber && (
                                                <DropdownMenuItem asChild>
                                                  <a
                                                    className="flex cursor-pointer items-center gap-2"
                                                    href={`tel:${phoneNumber.replace(/\D/g, "")}`}
                                                  >
                                                    <IconPhone className="h-4 w-4" />
                                                    Call
                                                  </a>
                                                </DropdownMenuItem>
                                              )}
                                              {isCoach && (
                                                <DropdownMenuItem asChild>
                                                  <a
                                                    className="flex cursor-pointer items-center gap-2"
                                                    href={`mailto:${user.email}`}
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
                                            <p className="mb-2 font-medium text-muted-foreground text-xs">
                                              Coaches
                                            </p>
                                            <div className="space-y-1">
                                              {allCoaches.map((coach) =>
                                                renderUserItem(coach, true)
                                              )}
                                            </div>
                                          </div>
                                        )}
                                        {allAthletes.length > 0 && (
                                          <div>
                                            <p className="mb-2 font-medium text-muted-foreground text-xs">
                                              Athletes
                                            </p>
                                            <div className="space-y-1">
                                              {allAthletes.map((athlete) =>
                                                renderUserItem(athlete, false)
                                              )}
                                            </div>
                                          </div>
                                        )}
                                        {allCoaches.length === 0 &&
                                          allAthletes.length === 0 && (
                                            <div className="py-8 text-center text-muted-foreground text-sm">
                                              No members found
                                            </div>
                                          )}
                                      </>
                                    );
                                  })()}
                                </div>
                              </TabsContent>
                              <TabsContent className="mt-0" value="going">
                                <div className="space-y-3">
                                  {goingCoaches.length > 0 && (
                                    <div>
                                      <p className="mb-2 font-medium text-muted-foreground text-xs">
                                        Coaches
                                      </p>
                                      <div className="space-y-1">
                                        {goingCoaches.map((coach) => {
                                          const phoneNumber =
                                            coach.phone || coach.cellPhone;
                                          return (
                                            <div
                                              className="group flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-muted/50"
                                              key={coach.id}
                                            >
                                              <Avatar className="h-10 w-10 rounded-xl">
                                                <AvatarImage
                                                  src={
                                                    coach.avatarUrl || undefined
                                                  }
                                                />
                                                <AvatarFallback className="rounded-xl bg-linear-to-br from-primary/20 to-primary/5 text-xs">
                                                  {getInitials(
                                                    coach.name,
                                                    coach.email
                                                  )}
                                                </AvatarFallback>
                                              </Avatar>
                                              <div className="min-w-0 flex-1">
                                                <p className="truncate font-medium text-sm">
                                                  {coach.name || "Unnamed"}
                                                </p>
                                                <p className="truncate text-muted-foreground text-xs">
                                                  {coach.email}
                                                </p>
                                              </div>
                                              <div className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 font-medium text-emerald-600 text-xs dark:bg-emerald-950/50">
                                                <IconCheck className="h-3 w-3" />
                                                Going
                                              </div>
                                              <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                  <Button
                                                    className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                                                    size="icon"
                                                    variant="ghost"
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
                                                      className="flex cursor-pointer items-center gap-2"
                                                      href={`/chat?userId=${coach.id}`}
                                                    >
                                                      <IconMessageCircle className="h-4 w-4" />
                                                      Chat
                                                    </Link>
                                                  </DropdownMenuItem>
                                                  {phoneNumber && (
                                                    <DropdownMenuItem asChild>
                                                      <a
                                                        className="flex cursor-pointer items-center gap-2"
                                                        href={`tel:${phoneNumber.replace(/\D/g, "")}`}
                                                      >
                                                        <IconPhone className="h-4 w-4" />
                                                        Call
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
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                  {goingAthletes.length > 0 && (
                                    <div>
                                      <p className="mb-2 font-medium text-muted-foreground text-xs">
                                        Athletes
                                      </p>
                                      <div className="space-y-1">
                                        {goingAthletes.map((athlete) => (
                                          <div
                                            className="group flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-muted/50"
                                            key={athlete.id}
                                          >
                                            <Avatar className="h-10 w-10 rounded-xl">
                                              <AvatarImage
                                                src={
                                                  athlete.avatarUrl || undefined
                                                }
                                              />
                                              <AvatarFallback className="rounded-xl bg-linear-to-br from-primary/20 to-primary/5 text-xs">
                                                {getInitials(
                                                  athlete.name,
                                                  athlete.email
                                                )}
                                              </AvatarFallback>
                                            </Avatar>
                                            <div className="min-w-0 flex-1">
                                              <p className="truncate font-medium text-sm">
                                                {athlete.name || "Unnamed"}
                                              </p>
                                              <p className="truncate text-muted-foreground text-xs">
                                                {athlete.email}
                                              </p>
                                            </div>
                                            <div className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 font-medium text-emerald-600 text-xs dark:bg-emerald-950/50">
                                              <IconCheck className="h-3 w-3" />
                                              Going
                                            </div>
                                            <DropdownMenu>
                                              <DropdownMenuTrigger asChild>
                                                <Button
                                                  className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                                                  size="icon"
                                                  variant="ghost"
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
                                                    className="flex cursor-pointer items-center gap-2"
                                                    href={`/chat?userId=${athlete.id}`}
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
                                      <div className="py-8 text-center text-muted-foreground text-sm">
                                        No one going yet
                                      </div>
                                    )}
                                </div>
                              </TabsContent>
                              <TabsContent className="mt-0" value="not_going">
                                <div className="space-y-3">
                                  {notGoingCoaches.length > 0 && (
                                    <div>
                                      <p className="mb-2 font-medium text-muted-foreground text-xs">
                                        Coaches
                                      </p>
                                      <div className="space-y-1">
                                        {notGoingCoaches.map((coach) => {
                                          const phoneNumber =
                                            coach.phone || coach.cellPhone;
                                          return (
                                            <div
                                              className="group flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-muted/50"
                                              key={coach.id}
                                            >
                                              <Avatar className="h-10 w-10 rounded-xl">
                                                <AvatarImage
                                                  src={
                                                    coach.avatarUrl || undefined
                                                  }
                                                />
                                                <AvatarFallback className="rounded-xl bg-linear-to-br from-primary/20 to-primary/5 text-xs">
                                                  {getInitials(
                                                    coach.name,
                                                    coach.email
                                                  )}
                                                </AvatarFallback>
                                              </Avatar>
                                              <div className="min-w-0 flex-1">
                                                <p className="truncate font-medium text-sm">
                                                  {coach.name || "Unnamed"}
                                                </p>
                                                <p className="truncate text-muted-foreground text-xs">
                                                  {coach.email}
                                                </p>
                                              </div>
                                              <div className="flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 font-medium text-red-600 text-xs dark:bg-red-950/50">
                                                <IconX className="h-3 w-3" />
                                                Can't
                                              </div>
                                              <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                  <Button
                                                    className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                                                    size="icon"
                                                    variant="ghost"
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
                                                      className="flex cursor-pointer items-center gap-2"
                                                      href={`/chat?userId=${coach.id}`}
                                                    >
                                                      <IconMessageCircle className="h-4 w-4" />
                                                      Chat
                                                    </Link>
                                                  </DropdownMenuItem>
                                                  {phoneNumber && (
                                                    <DropdownMenuItem asChild>
                                                      <a
                                                        className="flex cursor-pointer items-center gap-2"
                                                        href={`tel:${phoneNumber.replace(/\D/g, "")}`}
                                                      >
                                                        <IconPhone className="h-4 w-4" />
                                                        Call
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
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                  {notGoingAthletes.length > 0 && (
                                    <div>
                                      <p className="mb-2 font-medium text-muted-foreground text-xs">
                                        Athletes
                                      </p>
                                      <div className="space-y-1">
                                        {notGoingAthletes.map((athlete) => (
                                          <div
                                            className="group flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-muted/50"
                                            key={athlete.id}
                                          >
                                            <Avatar className="h-10 w-10 rounded-xl">
                                              <AvatarImage
                                                src={
                                                  athlete.avatarUrl || undefined
                                                }
                                              />
                                              <AvatarFallback className="rounded-xl bg-linear-to-br from-primary/20 to-primary/5 text-xs">
                                                {getInitials(
                                                  athlete.name,
                                                  athlete.email
                                                )}
                                              </AvatarFallback>
                                            </Avatar>
                                            <div className="min-w-0 flex-1">
                                              <p className="truncate font-medium text-sm">
                                                {athlete.name || "Unnamed"}
                                              </p>
                                              <p className="truncate text-muted-foreground text-xs">
                                                {athlete.email}
                                              </p>
                                            </div>
                                            <div className="flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 font-medium text-red-600 text-xs dark:bg-red-950/50">
                                              <IconX className="h-3 w-3" />
                                              Can't
                                            </div>
                                            <DropdownMenu>
                                              <DropdownMenuTrigger asChild>
                                                <Button
                                                  className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                                                  size="icon"
                                                  variant="ghost"
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
                                                    className="flex cursor-pointer items-center gap-2"
                                                    href={`/chat?userId=${athlete.id}`}
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
                                      <div className="py-8 text-center text-muted-foreground text-sm">
                                        Everyone is going
                                      </div>
                                    )}
                                </div>
                              </TabsContent>
                              <TabsContent className="mt-0" value="pending">
                                <div className="space-y-3">
                                  {pendingCoaches.length > 0 && (
                                    <div>
                                      <p className="mb-2 font-medium text-muted-foreground text-xs">
                                        Coaches
                                      </p>
                                      <div className="space-y-1">
                                        {pendingCoaches.map((coach) => {
                                          const phoneNumber =
                                            coach.phone || coach.cellPhone;
                                          return (
                                            <div
                                              className="group flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-muted/50"
                                              key={coach.id}
                                            >
                                              <Avatar className="h-10 w-10 rounded-xl">
                                                <AvatarImage
                                                  src={
                                                    coach.avatarUrl || undefined
                                                  }
                                                />
                                                <AvatarFallback className="rounded-xl bg-linear-to-br from-primary/20 to-primary/5 text-xs">
                                                  {getInitials(
                                                    coach.name,
                                                    coach.email
                                                  )}
                                                </AvatarFallback>
                                              </Avatar>
                                              <div className="min-w-0 flex-1">
                                                <p className="truncate font-medium text-sm">
                                                  {coach.name || "Unnamed"}
                                                </p>
                                                <p className="truncate text-muted-foreground text-xs">
                                                  {coach.email}
                                                </p>
                                              </div>
                                              <div className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 font-medium text-amber-600 text-xs dark:bg-amber-950/50">
                                                <IconBell className="h-3 w-3" />
                                                Pending
                                              </div>
                                              <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                  <Button
                                                    className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                                                    size="icon"
                                                    variant="ghost"
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
                                                      className="flex cursor-pointer items-center gap-2"
                                                      href={`/chat?userId=${coach.id}`}
                                                    >
                                                      <IconMessageCircle className="h-4 w-4" />
                                                      Chat
                                                    </Link>
                                                  </DropdownMenuItem>
                                                  {phoneNumber && (
                                                    <DropdownMenuItem asChild>
                                                      <a
                                                        className="flex cursor-pointer items-center gap-2"
                                                        href={`tel:${phoneNumber.replace(/\D/g, "")}`}
                                                      >
                                                        <IconPhone className="h-4 w-4" />
                                                        Call
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
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                  {pendingAthletes.length > 0 && (
                                    <div>
                                      <p className="mb-2 font-medium text-muted-foreground text-xs">
                                        Athletes
                                      </p>
                                      <div className="space-y-1">
                                        {pendingAthletes.map((athlete) => {
                                          const phoneNumber =
                                            athlete.phone || athlete.cellPhone;
                                          return (
                                            <div
                                              className="group flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-muted/50"
                                              key={athlete.id}
                                            >
                                              <Avatar className="h-10 w-10 rounded-xl">
                                                <AvatarImage
                                                  src={
                                                    athlete.avatarUrl ||
                                                    undefined
                                                  }
                                                />
                                                <AvatarFallback className="rounded-xl bg-linear-to-br from-primary/20 to-primary/5 text-xs">
                                                  {getInitials(
                                                    athlete.name,
                                                    athlete.email
                                                  )}
                                                </AvatarFallback>
                                              </Avatar>
                                              <div className="min-w-0 flex-1">
                                                <p className="truncate font-medium text-sm">
                                                  {athlete.name || "Unnamed"}
                                                </p>
                                                <p className="truncate text-muted-foreground text-xs">
                                                  {athlete.email}
                                                </p>
                                              </div>
                                              <div className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 font-medium text-amber-600 text-xs dark:bg-amber-950/50">
                                                <IconBell className="h-3 w-3" />
                                                Pending
                                              </div>
                                              <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                  <Button
                                                    className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                                                    size="icon"
                                                    variant="ghost"
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
                                                      className="flex cursor-pointer items-center gap-2"
                                                      href={`/chat?userId=${athlete.id}`}
                                                    >
                                                      <IconMessageCircle className="h-4 w-4" />
                                                      Chat
                                                    </Link>
                                                  </DropdownMenuItem>
                                                  {phoneNumber && (
                                                    <DropdownMenuItem asChild>
                                                      <a
                                                        className="flex cursor-pointer items-center gap-2"
                                                        href={`tel:${phoneNumber.replace(/\D/g, "")}`}
                                                      >
                                                        <IconPhone className="h-4 w-4" />
                                                        Call
                                                      </a>
                                                    </DropdownMenuItem>
                                                  )}
                                                  <DropdownMenuItem asChild>
                                                    <a
                                                      className="flex cursor-pointer items-center gap-2"
                                                      href={`mailto:${athlete.email}`}
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
                                      <div className="py-8 text-center text-muted-foreground text-sm">
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
                    className="mt-0 min-h-0 flex-1 overflow-hidden"
                    value="chat"
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
              <div className="flex flex-1 items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <IconCalendar className="mx-auto mb-4 h-12 w-12 opacity-20" />
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
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <PageHeader title="Events">
        <div className="flex items-center gap-2">
          <div className="flex gap-1 rounded-xl border p-1">
            <Button
              className="h-8 w-8 rounded-lg p-0"
              onClick={() => setViewMode("list")}
              size="icon"
              variant={viewMode === "list" ? "secondary" : "ghost"}
            >
              <IconList className="!m-0 h-4 w-4" />
            </Button>
            <Button
              className="h-8 w-8 rounded-lg p-0"
              onClick={() => setViewMode("calendar")}
              size="icon"
              variant={viewMode === "calendar" ? "secondary" : "ghost"}
            >
              <IconCalendar className="!m-0 h-4 w-4" />
            </Button>
          </div>
          <Button asChild className="gap-2 rounded-xl" size="sm">
            <Link href="/events/new">
              <IconPlus className="h-4 w-4" />
              New Event
            </Link>
          </Button>
        </div>
      </PageHeader>

      <div className="flex h-0 min-h-0 flex-1 gap-4 overflow-hidden">
        {/* Events Sidebar */}
        <div className="flex h-full min-h-0 w-64 flex-col overflow-visible rounded-xl border bg-card shadow-sm lg:w-80">
          <ScrollArea className="h-full">
            <div className="p-2">
              {initialLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div className="w-full space-y-2 rounded-xl p-3" key={i}>
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
                <div className="p-4 text-center text-muted-foreground text-sm">
                  No events yet
                </div>
              ) : (
                events.map((event) => (
                  <div className="group relative" key={event.id}>
                    <button
                      className={`mb-1 w-full rounded-xl p-3 text-left transition-all ${
                        selectedEvent?.id === event.id &&
                        (!isEventsMobile || mobileView !== "events")
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted"
                      }`}
                      onClick={() => selectEvent(event)}
                      type="button"
                    >
                      <p className="truncate pr-10 font-medium text-sm">
                        {event.title}
                      </p>
                      <div
                        className={`mt-1.5 flex items-center gap-2 text-xs ${
                          selectedEvent?.id === event.id &&
                          (!isEventsMobile || mobileView !== "events")
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
                          className={`absolute top-2 right-2 h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100 lg:opacity-100 ${
                            selectedEvent?.id === event.id &&
                            (!isEventsMobile || mobileView !== "events")
                              ? "text-primary-foreground hover:bg-primary-foreground/20"
                              : ""
                          }`}
                          size="icon"
                          variant="ghost"
                        >
                          <IconDotsVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="rounded-xl"
                        side="bottom"
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
          <div className="h-full min-h-0 flex-1 overflow-auto">
            {selectedEvent ? (
              <div className="flex h-full flex-col p-4">
                <div className="mb-4 shrink-0">
                  <h2 className="font-semibold text-xl">
                    {selectedEvent.title}
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    {formatTime(selectedEvent.startTime)} -{" "}
                    {formatTime(selectedEvent.endTime)}
                  </p>
                </div>
                <div className="min-h-0 flex-1">
                  <CustomEventCalendar
                    currentUserRole={currentUserRole}
                    currentUserRsvps={currentUserRsvps}
                    eventId={selectedEvent.id}
                    eventTitle={selectedEvent.title}
                    key={`${selectedEvent.id}-${selectedEvent.occurrences.filter((o) => o.status === "canceled").length}`}
                    occurrences={selectedEvent.occurrences.map((o) => ({
                      ...o,
                      isCustom: (o as EventOccurrence & { isCustom?: boolean })
                        .isCustom,
                    }))}
                    onAddCustomDate={handleAddCustomDate}
                    onCancel={handleCancelFromCalendar}
                    onRemoveDate={handleRemoveCustomDate}
                    onRsvp={handleRsvp}
                    onToggleDate={handleToggleOccurrence}
                  />
                </div>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                Select an event to view calendar
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Occurrences List */}
            <div className="flex h-full min-h-0 w-72 flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
              {initialLoading ? (
                <ScrollArea className="h-full">
                  <div className="space-y-2 p-2">
                    {[1, 2, 3].map((i) => (
                      <div
                        className="flex w-full items-center gap-3 rounded-xl p-3"
                        key={i}
                      >
                        <Skeleton className="h-14 w-14 shrink-0 rounded-xl" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-24 rounded" />
                          <Skeleton className="h-3 w-16 rounded" />
                        </div>
                        <Skeleton className="h-5 w-5 shrink-0 rounded" />
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : selectedEvent ? (
                <ScrollArea className="h-full">
                  <div className="p-2">
                    {displayedOccurrences.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground text-sm">
                        No upcoming sessions
                      </div>
                    ) : (
                      displayedOccurrences.map((occ) => {
                        const isPast = isPastDate(occ.date);
                        const dateInfo = formatDate(occ.date);
                        return (
                          <button
                            className={`mb-1 flex w-full items-center gap-4 rounded-xl p-3 text-left transition-all ${
                              selectedOccurrence?.id === occ.id
                                ? "bg-primary/10 ring-1 ring-primary"
                                : "hover:bg-muted"
                            } ${isPast ? "opacity-50" : ""} ${occ.status === "canceled" ? "opacity-40" : ""}`}
                            key={occ.id}
                            onClick={() => selectOccurrence(occ)}
                            type="button"
                          >
                            <div
                              className={`flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl ${
                                selectedOccurrence?.id === occ.id
                                  ? "bg-primary text-primary-foreground ring-2 ring-primary"
                                  : "bg-black dark:bg-white"
                              }`}
                            >
                              <span
                                className={`font-bold text-xl leading-none ${
                                  selectedOccurrence?.id === occ.id
                                    ? ""
                                    : "text-white dark:text-black"
                                }`}
                              >
                                {dateInfo.day}
                              </span>
                              <span
                                className={`mt-0.5 font-medium text-[10px] opacity-70 ${
                                  selectedOccurrence?.id === occ.id
                                    ? ""
                                    : "text-white dark:text-black"
                                }`}
                              >
                                {dateInfo.month}
                              </span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="whitespace-nowrap font-medium text-sm">
                                {dateInfo.weekday}
                              </p>
                              <p className="text-muted-foreground text-xs">
                                {formatTime(selectedEvent.startTime)}
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              {/* User's RSVP Status */}
                              {occurrenceRsvpsLoading ? (
                                <Skeleton className="h-5 w-5 shrink-0 rounded" />
                              ) : (
                                (() => {
                                  const userRsvpStatus = currentUserRsvps.get(
                                    occ.id
                                  );
                                  if (userRsvpStatus === "going") {
                                    return (
                                      <div className="flex shrink-0 items-center text-emerald-600">
                                        <IconCheck className="h-5 w-5" />
                                      </div>
                                    );
                                  }
                                  if (userRsvpStatus === "not_going") {
                                    return (
                                      <div className="flex shrink-0 items-center text-red-600">
                                        <IconX className="h-5 w-5" />
                                      </div>
                                    );
                                  }
                                  return (
                                    <div className="flex shrink-0 items-center text-amber-600">
                                      <IconBell className="h-4 w-4" />
                                    </div>
                                  );
                                })()
                              )}
                              <div className="flex flex-col items-end gap-1">
                                {occ.status === "canceled" && (
                                  <Badge
                                    className="text-[10px]"
                                    variant="destructive"
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
                                    className="text-[10px]"
                                    variant="outline"
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
                        className="flex w-full items-center justify-center gap-2 p-3 text-muted-foreground text-xs hover:text-foreground"
                        onClick={() => setShowPastEvents(!showPastEvents)}
                        type="button"
                      >
                        <IconHistory className="h-4 w-4" />
                        {showPastEvents ? "Hide" : "Show"} past sessions
                      </button>
                    )}
                  </div>
                </ScrollArea>
              ) : (
                <div className="flex flex-1 items-center justify-center text-muted-foreground text-sm">
                  Select an event
                </div>
              )}
            </div>

            {/* Event Detail */}
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
              {selectedOccurrence ? (
                <>
                  <div className="flex shrink-0 flex-col border-b p-4">
                    {/* Title row */}
                    <h3 className="font-semibold">{selectedEvent?.title}</h3>

                    {/* Date row */}
                    <p className="mt-0.5 text-muted-foreground text-sm">
                      {formatDate(selectedOccurrence.date).weekday},{" "}
                      {formatDate(selectedOccurrence.date).month}{" "}
                      {formatDate(selectedOccurrence.date).day} •{" "}
                      {formatTime(selectedEvent?.startTime)}
                    </p>

                    {/* Buttons row */}
                    <div className="mt-3 flex items-center gap-2">
                      {/* Left side: Going/Not Going buttons */}
                      <div className="flex flex-1 items-center gap-2">
                        {(currentUserRole === "coach" ||
                          currentUserRole === "owner") &&
                          selectedOccurrence.status !== "canceled" &&
                          eventDetailTab === "details" &&
                          (() => {
                            const currentUserRsvp = occurrenceRsvps.find(
                              (r) => r.id === currentUserId
                            );
                            const currentUserRsvpStatus =
                              currentUserRsvp?.status;
                            return (
                              <>
                                <Button
                                  className={`h-9 flex-1 gap-1.5 rounded-xl px-3 ${
                                    currentUserRsvpStatus === "going"
                                      ? "!bg-emerald-600 hover:!bg-emerald-700 !text-white border-emerald-600"
                                      : "border-emerald-400 text-emerald-400 hover:bg-emerald-50 hover:text-emerald-500 dark:hover:bg-emerald-950"
                                  }`}
                                  onClick={async () => {
                                    const response = await fetch("/api/rsvp", {
                                      method: "POST",
                                      headers: {
                                        "Content-Type": "application/json",
                                      },
                                      body: JSON.stringify({
                                        occurrenceId: selectedOccurrence.id,
                                        status: "going",
                                      }),
                                    });
                                    if (response.ok) {
                                      loadOccurrenceRsvps(
                                        selectedOccurrence.id
                                      );
                                    }
                                  }}
                                  size="sm"
                                  variant="outline"
                                >
                                  <IconCheck className="h-4 w-4" />
                                  {currentUserRsvpStatus === "going"
                                    ? "Going!"
                                    : "Going"}
                                </Button>
                                <Button
                                  className={`h-9 flex-1 gap-1.5 rounded-xl px-3 ${
                                    currentUserRsvpStatus === "not_going"
                                      ? "!bg-red-600 hover:!bg-red-700 !text-white border-red-600"
                                      : "border-red-400 text-red-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950"
                                  }`}
                                  onClick={async () => {
                                    const response = await fetch("/api/rsvp", {
                                      method: "POST",
                                      headers: {
                                        "Content-Type": "application/json",
                                      },
                                      body: JSON.stringify({
                                        occurrenceId: selectedOccurrence.id,
                                        status: "not_going",
                                      }),
                                    });
                                    if (response.ok) {
                                      loadOccurrenceRsvps(
                                        selectedOccurrence.id
                                      );
                                    }
                                  }}
                                  size="sm"
                                  variant="outline"
                                >
                                  <IconX className="h-4 w-4" />
                                  Can't
                                </Button>
                              </>
                            );
                          })()}
                      </div>

                      {/* Right side: Action buttons */}
                      <div className="flex items-center gap-2">
                        {notAnsweredUsers.length > 0 &&
                          selectedOccurrence.status !== "canceled" &&
                          eventDetailTab === "details" && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  className="h-9 w-9 rounded-xl"
                                  disabled={sendingReminder}
                                  onClick={handleSendReminders}
                                  size="icon"
                                  variant="outline"
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
                              className="h-9 gap-2 rounded-xl text-destructive hover:text-destructive"
                              onClick={() => setCancelDialogOpen(true)}
                              size="sm"
                              variant="outline"
                            >
                              <IconBan className="h-4 w-4" />
                              Cancel Event
                            </Button>
                          )}
                      </div>
                    </div>
                  </div>
                  <Tabs
                    className="flex min-h-0 flex-1 flex-col"
                    onValueChange={(value) =>
                      setEventDetailTab(value as typeof eventDetailTab)
                    }
                    value={eventDetailTab}
                  >
                    <div className="shrink-0 border-b px-4 py-4">
                      <TabsList className="grid h-10 w-full grid-cols-2 rounded-xl">
                        <TabsTrigger
                          className="rounded-lg text-xs"
                          value="details"
                        >
                          Details
                        </TabsTrigger>
                        <TabsTrigger
                          className="rounded-lg text-xs"
                          value="chat"
                        >
                          Chat
                        </TabsTrigger>
                      </TabsList>
                    </div>
                    <TabsContent
                      className="mt-0 min-h-0 flex-1 overflow-hidden"
                      value="details"
                    >
                      {rsvpLoading ? (
                        <div className="flex h-full flex-col p-4">
                          <Skeleton className="mb-4 h-10 w-full rounded-xl" />
                          <div className="space-y-3">
                            {[1, 2, 3, 4, 5].map((i) => (
                              <div
                                className="flex items-center gap-3 rounded-xl p-3"
                                key={i}
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
                          className="flex h-full min-h-0 flex-col"
                          defaultValue="all"
                        >
                          <div className="shrink-0 px-4 pt-4">
                            <TabsList className="grid h-10 w-full grid-cols-4 rounded-xl">
                              <TabsTrigger
                                className="rounded-lg text-xs"
                                value="all"
                              >
                                All ({gymMembers.length})
                              </TabsTrigger>
                              <TabsTrigger
                                className="rounded-lg text-xs"
                                value="going"
                              >
                                Going ({goingUsers.length})
                              </TabsTrigger>
                              <TabsTrigger
                                className="rounded-lg text-xs"
                                value="not_going"
                              >
                                Can't ({notGoingUsers.length})
                              </TabsTrigger>
                              <TabsTrigger
                                className="rounded-lg text-xs"
                                value="pending"
                              >
                                Pending ({notAnsweredUsers.length})
                              </TabsTrigger>
                            </TabsList>
                          </div>
                          <TabsContent
                            className="mt-0 min-h-0 flex-1 overflow-auto p-4"
                            value="all"
                          >
                            {gymMembersLoading ? (
                              <div className="space-y-3">
                                {[1, 2, 3].map((i) => (
                                  <div
                                    className="flex items-center gap-3 rounded-xl p-3"
                                    key={i}
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
                                currentUserRole={currentUserRole}
                                getInitials={getInitials}
                                onEditRsvp={handleEditRsvp}
                                users={gymMembers.map((m) => ({
                                  ...m,
                                  status:
                                    occurrenceRsvps.find((r) => r.id === m.id)
                                      ?.status || null,
                                }))}
                              />
                            )}
                          </TabsContent>
                          <TabsContent
                            className="mt-0 flex-1 overflow-auto p-4"
                            value="going"
                          >
                            <UserList
                              currentUserRole={currentUserRole}
                              getInitials={getInitials}
                              onEditRsvp={handleEditRsvp}
                              users={goingUsers.map((u) => {
                                const member = gymMembers.find(
                                  (m) => m.id === u.id
                                );
                                // Use role from RSVP user object first, then fall back to gymMembers
                                return {
                                  ...u,
                                  status: "going",
                                  role: u.role || member?.role,
                                };
                              })}
                            />
                          </TabsContent>
                          <TabsContent
                            className="mt-0 flex-1 overflow-auto p-4"
                            value="not_going"
                          >
                            <UserList
                              currentUserRole={currentUserRole}
                              getInitials={getInitials}
                              onEditRsvp={handleEditRsvp}
                              users={notGoingUsers.map((u) => {
                                const member = gymMembers.find(
                                  (m) => m.id === u.id
                                );
                                // Use role from RSVP user object first, then fall back to gymMembers
                                return {
                                  ...u,
                                  status: "not_going",
                                  role: u.role || member?.role,
                                };
                              })}
                            />
                          </TabsContent>
                          <TabsContent
                            className="mt-0 flex-1 overflow-auto p-4"
                            value="pending"
                          >
                            <UserList
                              getInitials={getInitials}
                              onEditRsvp={handleEditRsvp}
                              users={notAnsweredUsers.map((u) => ({
                                ...u,
                                status: null,
                              }))}
                            />
                          </TabsContent>
                        </Tabs>
                      )}
                    </TabsContent>
                    <TabsContent
                      className="mt-0 min-h-0 flex-1 overflow-hidden"
                      value="chat"
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
                <div className="flex min-h-0 flex-1 flex-col">
                  <Tabs
                    className="flex min-h-0 flex-1 flex-col"
                    onValueChange={(value) =>
                      setEventDetailTab(value as typeof eventDetailTab)
                    }
                    value={eventDetailTab}
                  >
                    <div className="shrink-0 border-b px-4 py-4">
                      <TabsList className="grid h-10 w-full grid-cols-2 rounded-xl">
                        <TabsTrigger
                          className="rounded-lg text-xs"
                          value="details"
                        >
                          Details
                        </TabsTrigger>
                        <TabsTrigger
                          className="rounded-lg text-xs"
                          value="chat"
                        >
                          Chat
                        </TabsTrigger>
                      </TabsList>
                    </div>
                    <TabsContent
                      className="mt-0 min-h-0 flex-1 overflow-auto p-4"
                      value="details"
                    >
                      <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
                        <IconUsers className="mb-3 h-12 w-12 opacity-20" />
                        <p className="text-sm">
                          Select a session to view attendance
                        </p>
                      </div>
                    </TabsContent>
                    <TabsContent
                      className="mt-0 min-h-0 flex-1 overflow-hidden"
                      value="chat"
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
                <div className="flex flex-1 flex-col items-center justify-center text-muted-foreground">
                  <IconUsers className="mb-3 h-12 w-12 opacity-20" />
                  <p className="text-sm">Select a session to view attendance</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
      <Dialog onOpenChange={setCancelDialogOpen} open={cancelDialogOpen}>
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
            <div className="mb-4 rounded-xl bg-muted/50 p-3">
              <p className="font-medium">{selectedEvent?.title}</p>
              <p className="text-muted-foreground text-sm">
                {selectedOccurrence &&
                  formatDate(selectedOccurrence.date).weekday}
                ,{" "}
                {selectedOccurrence &&
                  formatDate(selectedOccurrence.date).month}{" "}
                {selectedOccurrence && formatDate(selectedOccurrence.date).day}
              </p>
            </div>
            <div className="flex w-full items-center space-x-3 rounded-xl bg-muted/50 p-3">
              <Checkbox
                checked={notifyOnCancel}
                id="notify-on-cancel"
                onCheckedChange={(checked) =>
                  setNotifyOnCancel(checked as boolean)
                }
              />
              <Label
                className="flex-1 cursor-pointer"
                htmlFor="notify-on-cancel"
              >
                Notify all users who RSVP'd "Going" via email
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              className="rounded-xl"
              onClick={() => setCancelDialogOpen(false)}
              variant="outline"
            >
              Keep Session
            </Button>
            <Button
              className="rounded-xl"
              disabled={canceling}
              onClick={handleCancelWithNotify}
              variant="destructive"
            >
              {canceling ? "Canceling..." : "Cancel Session"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog onOpenChange={setDeleteDialogOpen} open={deleteDialogOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] rounded-xl sm:max-w-lg">
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
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
            <Button
              className="w-full rounded-xl sm:w-auto"
              onClick={() => setDeleteDialogOpen(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              className="w-full rounded-xl sm:w-auto"
              disabled={deleting}
              onClick={handleDeleteEvent}
              variant="destructive"
            >
              {deleting ? "Deleting..." : "Delete Event"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog onOpenChange={setEventChatDialogOpen} open={eventChatDialogOpen}>
        <DialogContent className="flex h-[80vh] max-w-4xl flex-col rounded-xl">
          <DialogHeader>
            <DialogTitle>{selectedEvent?.title} Chat</DialogTitle>
            <DialogDescription>
              Chat with other members about this event
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-hidden">
            {eventChatEventId && eventChatChannelId ? (
              <EventChatContent
                channelId={eventChatChannelId}
                eventId={eventChatEventId}
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
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <p>Select an event to view chat</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog onOpenChange={setAddDateDialogOpen} open={addDateDialogOpen}>
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
              className="rounded-xl"
              onClick={() => setAddDateDialogOpen(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              className="rounded-xl"
              disabled={addingDate}
              onClick={confirmAddCustomDate}
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
  const isMobile = useIsMobile();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Filter to only include coaches/owners and athletes (exclude any other roles)
  const filteredUsers = users.filter((u) => {
    const role = u.role;
    return role === "coach" || role === "owner" || role === "athlete" || !role;
  });

  const selectedUser = selectedUserId
    ? filteredUsers.find((u) => u.id === selectedUserId)
    : null;

  if (filteredUsers.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground text-sm">
        No members in this list
      </div>
    );
  }

  // Separate coaches and athletes
  const coaches = filteredUsers.filter(
    (u) => u.role === "coach" || u.role === "owner"
  );
  const athletes = filteredUsers.filter((u) => u.role === "athlete" || !u.role);

  return (
    <div className="space-y-0.5">
      {coaches.length > 0 && (
        <>
          <div className="my-2 flex items-center gap-2">
            <span className="whitespace-nowrap font-medium text-muted-foreground text-xs">
              Coaches
            </span>
            <hr className="flex-1 border-border" />
          </div>
          {coaches.map((user) => (
            <div
              className={`group flex items-center gap-2 rounded-lg p-2 transition-colors ${
                isMobile && onEditRsvp
                  ? "cursor-pointer active:bg-muted/70"
                  : "hover:bg-muted/50"
              }`}
              key={user.id}
              onClick={
                isMobile && onEditRsvp
                  ? () => setSelectedUserId(user.id)
                  : undefined
              }
            >
              <Avatar className="h-8 w-8 shrink-0 rounded-lg">
                <AvatarImage src={user.avatarUrl || undefined} />
                <AvatarFallback className="rounded-lg bg-linear-to-br from-primary/20 to-primary/5 text-xs">
                  {getInitials(user.name, user.email)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-sm">
                  {user.name || "Unnamed"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {user.status === "going" && (
                  <div className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 font-medium text-emerald-600 text-xs dark:bg-emerald-950/50">
                    <IconCheck className="h-3 w-3" />
                    Going
                  </div>
                )}
                {user.status === "not_going" && (
                  <div className="flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 font-medium text-red-600 text-xs dark:bg-red-950/50">
                    <IconX className="h-3 w-3" />
                    Can't Go
                  </div>
                )}
                {user.status === null && (
                  <div className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 font-medium text-amber-600 text-xs dark:bg-amber-950/50">
                    <IconBell className="h-3 w-3" />
                    Pending
                  </div>
                )}
                {onEditRsvp && !isMobile && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                        size="icon"
                        variant="ghost"
                      >
                        <IconDotsVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-xl">
                      <DropdownMenuItem asChild>
                        <Link
                          className="flex cursor-pointer items-center gap-2"
                          href={`/chat?userId=${user.id}`}
                        >
                          <IconMessageCircle className="h-4 w-4" />
                          Chat
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link
                          className="flex cursor-pointer items-center gap-2"
                          href={`/roster/${user.id}`}
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
                                  className="flex cursor-pointer items-center gap-2"
                                  href={`tel:${(user.phone || user.cellPhone || "").replace(/\D/g, "")}`}
                                >
                                  <IconPhone className="h-4 w-4" />
                                  Call
                                </a>
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem asChild>
                              <a
                                className="flex cursor-pointer items-center gap-2"
                                href={`mailto:${user.email}`}
                              >
                                <IconMail className="h-4 w-4" />
                                Email
                              </a>
                            </DropdownMenuItem>
                          </>
                        )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="gap-2"
                        onClick={() => onEditRsvp(user.id, "going")}
                      >
                        <IconCheck className="h-4 w-4 text-emerald-600" />
                        Mark as Going
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="gap-2"
                        onClick={() => onEditRsvp(user.id, "not_going")}
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
        </>
      )}
      {athletes.length > 0 && (
        <>
          <div className="my-2 flex items-center gap-2">
            <span className="whitespace-nowrap font-medium text-muted-foreground text-xs">
              Athletes
            </span>
            <hr className="flex-1 border-border" />
          </div>
          <div className="divide-y divide-border">
            {athletes.map((user) => (
              <div
                className={`group flex items-center gap-2 p-2 transition-colors ${
                  isMobile && onEditRsvp
                    ? "cursor-pointer active:bg-muted/70"
                    : "hover:bg-muted/50"
                }`}
                key={user.id}
                onClick={
                  isMobile && onEditRsvp
                    ? () => setSelectedUserId(user.id)
                    : undefined
                }
              >
                <Avatar className="h-8 w-8 shrink-0 rounded-lg">
                  <AvatarImage src={user.avatarUrl || undefined} />
                  <AvatarFallback className="rounded-lg bg-linear-to-br from-primary/20 to-primary/5 text-xs">
                    {getInitials(user.name, user.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-sm">
                    {user.name || "Unnamed"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {user.status === "going" && (
                    <div className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 font-medium text-emerald-600 text-xs dark:bg-emerald-950/50">
                      <IconCheck className="h-3 w-3" />
                      Going
                    </div>
                  )}
                  {user.status === "not_going" && (
                    <div className="flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 font-medium text-red-600 text-xs dark:bg-red-950/50">
                      <IconX className="h-3 w-3" />
                      Can't Go
                    </div>
                  )}
                  {user.status === null && (
                    <div className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 font-medium text-amber-600 text-xs dark:bg-amber-950/50">
                      <IconBell className="h-3 w-3" />
                      Pending
                    </div>
                  )}
                  {onEditRsvp && !isMobile && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                          size="icon"
                          variant="ghost"
                        >
                          <IconDotsVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl">
                        <DropdownMenuItem asChild>
                          <Link
                            className="flex cursor-pointer items-center gap-2"
                            href={`/chat?userId=${user.id}`}
                          >
                            <IconMessageCircle className="h-4 w-4" />
                            Chat
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link
                            className="flex cursor-pointer items-center gap-2"
                            href={`/roster/${user.id}`}
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
                                    className="flex cursor-pointer items-center gap-2"
                                    href={`tel:${(user.phone || user.cellPhone || "").replace(/\D/g, "")}`}
                                  >
                                    <IconPhone className="h-4 w-4" />
                                    Call
                                  </a>
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem asChild>
                                <a
                                  className="flex cursor-pointer items-center gap-2"
                                  href={`mailto:${user.email}`}
                                >
                                  <IconMail className="h-4 w-4" />
                                  Email
                                </a>
                              </DropdownMenuItem>
                            </>
                          )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="gap-2"
                          onClick={() => onEditRsvp(user.id, "going")}
                        >
                          <IconCheck className="h-4 w-4 text-emerald-600" />
                          Mark as Going
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="gap-2"
                          onClick={() => onEditRsvp(user.id, "not_going")}
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
        </>
      )}

      {/* Mobile Drawer for User Actions */}
      {isMobile && selectedUser && (
        <Drawer
          onOpenChange={(open) => !open && setSelectedUserId(null)}
          open={!!selectedUser}
        >
          <DrawerContent className="max-h-[85vh]">
            <div className="border-b px-4 pt-4 pb-3">
              <div className="mb-3 flex items-center gap-3">
                <Avatar className="h-14 w-14 shrink-0 rounded-xl">
                  <AvatarImage src={selectedUser.avatarUrl || undefined} />
                  <AvatarFallback className="rounded-xl font-semibold text-base">
                    {getInitials(selectedUser.name, selectedUser.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <DrawerTitle className="truncate font-semibold text-lg">
                    {selectedUser.name || "Unnamed"}
                  </DrawerTitle>
                  <p className="truncate text-muted-foreground text-sm">
                    {selectedUser.email}
                  </p>
                </div>
              </div>
            </div>
            <div
              className="space-y-1 overflow-y-auto px-4 py-3"
              style={{
                paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0))",
              }}
            >
              <Button
                asChild
                className="h-12 w-full justify-start gap-3 px-3"
                variant="ghost"
              >
                <Link href={`/chat?userId=${selectedUser.id}`}>
                  <IconMessageCircle className="h-5 w-5" />
                  <span>Chat</span>
                </Link>
              </Button>
              <Button
                asChild
                className="h-12 w-full justify-start gap-3 px-3"
                variant="ghost"
              >
                <Link href={`/roster/${selectedUser.id}`}>
                  <IconUsers className="h-5 w-5" />
                  <span>View Profile</span>
                </Link>
              </Button>
              {(currentUserRole === "owner" || currentUserRole === "coach") &&
                selectedUser.status === null && (
                  <>
                    {(selectedUser.phone || selectedUser.cellPhone) && (
                      <Button
                        className="h-12 w-full justify-start gap-3 px-3"
                        onClick={() => {
                          window.location.href = `tel:${(selectedUser.phone || selectedUser.cellPhone || "").replace(/\D/g, "")}`;
                        }}
                        variant="ghost"
                      >
                        <IconPhone className="h-5 w-5" />
                        <span>Call</span>
                      </Button>
                    )}
                    <Button
                      className="h-12 w-full justify-start gap-3 px-3"
                      onClick={() => {
                        window.location.href = `mailto:${selectedUser.email}`;
                      }}
                      variant="ghost"
                    >
                      <IconMail className="h-5 w-5" />
                      <span>Email</span>
                    </Button>
                  </>
                )}
              {onEditRsvp && (
                <>
                  <div className="my-2 h-px bg-border" />
                  <Button
                    className="h-12 w-full justify-start gap-3 px-3"
                    onClick={() => {
                      onEditRsvp(selectedUser.id, "going");
                      setSelectedUserId(null);
                    }}
                    variant="ghost"
                  >
                    <IconCheck className="h-5 w-5 text-emerald-600" />
                    <span>Mark as Going</span>
                  </Button>
                  <Button
                    className="h-12 w-full justify-start gap-3 px-3"
                    onClick={() => {
                      onEditRsvp(selectedUser.id, "not_going");
                      setSelectedUserId(null);
                    }}
                    variant="ghost"
                  >
                    <IconX className="h-5 w-5 text-red-600" />
                    <span>Mark as Can't Go</span>
                  </Button>
                </>
              )}
            </div>
          </DrawerContent>
        </Drawer>
      )}
    </div>
  );
}
