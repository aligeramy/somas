"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  IconCalendar,
  IconCheck,
  IconX,
  IconClock,
} from "@tabler/icons-react";

interface EventOccurrence {
  id: string;
  date: string | Date;
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
  occurrence?: EventOccurrence;
  user?: {
    id: string;
    name: string | null;
    email: string;
    avatarUrl: string | null;
  };
}

interface UserInfo {
  id: string;
  role: string;
}

export default function RSVPPage() {
  const [events, setEvents] = useState<EventOccurrence[]>([]);
  const [rsvps, setRsvps] = useState<RSVP[]>([]);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
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

      const allOccurrences: EventOccurrence[] = [];
      eventsData.events.forEach((event: any) => {
        event.occurrences.forEach((occ: any) => {
          // Only show future events
          const occDate = new Date(occ.date);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
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
        });
      });

      // Sort by date
      allOccurrences.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      setEvents(allOccurrences);
      setRsvps(rsvpsData.rsvps || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function handleRSVP(occurrenceId: string, status: "going" | "not_going") {
    try {
      setUpdatingId(occurrenceId);
      const response = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ occurrenceId, status }),
      });
      if (!response.ok) throw new Error("Failed to RSVP");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setUpdatingId(null);
    }
  }

  function getRSVPStatus(occurrenceId: string): "going" | "not_going" | null {
    const rsvp = rsvps.find((r) => r.occurrence?.id === occurrenceId);
    return rsvp ? (rsvp.status as "going" | "not_going") : null;
  }

  function formatDate(dateValue: string | Date | undefined | null) {
    if (!dateValue) return "";
    const date = typeof dateValue === "string" ? new Date(dateValue) : dateValue;
    if (isNaN(date.getTime())) return String(dateValue);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";
    
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }

  function formatTime(time: string | undefined | null) {
    if (!time) return "";
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    if (isNaN(hour)) return time;
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  }

  function getInitials(name: string | null, email: string) {
    if (name) return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
    return email[0].toUpperCase();
  }

  const isOwnerOrCoach = userInfo?.role === "owner" || userInfo?.role === "coach";

  if (loading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col p-6">
        <div className="bg-destructive/10 text-destructive rounded-lg p-4">{error}</div>
      </div>
    );
  }

  // For owners/coaches, show all RSVPs grouped by occurrence
  if (isOwnerOrCoach) {
    const rsvpsByOccurrence = rsvps.reduce((acc, rsvp) => {
      if (!rsvp.occurrence) return acc;
      const occId = rsvp.occurrence.id;
      if (!acc[occId]) acc[occId] = { occurrence: rsvp.occurrence, rsvps: [] };
      if (rsvp.user) acc[occId].rsvps.push(rsvp);
      return acc;
    }, {} as Record<string, { occurrence: EventOccurrence; rsvps: RSVP[] }>);

    return (
      <div className="flex flex-1 flex-col h-[calc(100vh-var(--header-height))]">
        <div className="p-4 lg:p-6 border-b">
          <h1 className="text-2xl font-semibold tracking-tight">Attendance Overview</h1>
          <p className="text-sm text-muted-foreground mt-1">See who's coming to each session</p>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-4 lg:p-6 space-y-2">
            {events.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <IconCalendar className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>No upcoming events</p>
              </div>
            ) : (
              events.map((occ) => {
                const occRsvps = rsvpsByOccurrence[occ.id]?.rsvps || [];
                const going = occRsvps.filter((r) => r.status === "going");
                const notGoing = occRsvps.filter((r) => r.status === "not_going");
                const isCanceled = occ.status === "canceled";

                return (
                  <div
                    key={occ.id}
                    className={`flex items-center gap-4 p-4 rounded-xl border hover:bg-muted/30 transition-colors ${
                      isCanceled ? "opacity-50" : ""
                    }`}
                  >
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <IconCalendar className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{occ.event.title}</p>
                        {isCanceled && <Badge variant="destructive" className="text-[10px]">Canceled</Badge>}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                        <span>{formatDate(occ.date)}</span>
                        <span className="flex items-center gap-1">
                          <IconClock className="h-3 w-3" />
                          {formatTime(occ.event.startTime)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {/* Avatars of going users */}
                      <div className="flex -space-x-2">
                        {going.slice(0, 4).map((r) => (
                          <Avatar key={r.id} className="h-8 w-8 border-2 border-background">
                            <AvatarImage src={r.user?.avatarUrl || undefined} />
                            <AvatarFallback className="text-[10px] bg-emerald-100 text-emerald-700">
                              {getInitials(r.user?.name || null, r.user?.email || "")}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                        {going.length > 4 && (
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium border-2 border-background">
                            +{going.length - 4}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="flex items-center gap-1 text-emerald-600">
                          <IconCheck className="h-4 w-4" />
                          {going.length}
                        </span>
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <IconX className="h-4 w-4" />
                          {notGoing.length}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </div>
    );
  }

  // For athletes, show their personal RSVP list
  return (
    <div className="flex flex-1 flex-col h-[calc(100vh-var(--header-height))]">
      <div className="p-4 lg:p-6 border-b">
        <h1 className="text-2xl font-semibold tracking-tight">My Schedule</h1>
        <p className="text-sm text-muted-foreground mt-1">RSVP to upcoming sessions</p>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4 lg:p-6 space-y-2">
          {events.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <IconCalendar className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>No upcoming events</p>
            </div>
          ) : (
            events.map((occ) => {
              const rsvpStatus = getRSVPStatus(occ.id);
              const isCanceled = occ.status === "canceled";
              const isUpdating = updatingId === occ.id;

              return (
                <div
                  key={occ.id}
                  className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${
                    isCanceled ? "opacity-50" : "hover:bg-muted/30"
                  }`}
                >
                  <div className={`h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    rsvpStatus === "going" 
                      ? "bg-emerald-100 dark:bg-emerald-950/50" 
                      : rsvpStatus === "not_going"
                      ? "bg-red-100 dark:bg-red-950/50"
                      : "bg-muted"
                  }`}>
                    {rsvpStatus === "going" ? (
                      <IconCheck className="h-6 w-6 text-emerald-600" />
                    ) : rsvpStatus === "not_going" ? (
                      <IconX className="h-6 w-6 text-red-500" />
                    ) : (
                      <IconCalendar className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{occ.event.title}</p>
                      {isCanceled && <Badge variant="destructive" className="text-[10px]">Canceled</Badge>}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                      <span className={formatDate(occ.date) === "Today" ? "text-primary font-medium" : ""}>
                        {formatDate(occ.date)}
                      </span>
                      <span className="flex items-center gap-1">
                        <IconClock className="h-3 w-3" />
                        {formatTime(occ.event.startTime)} - {formatTime(occ.event.endTime)}
                      </span>
                    </div>
                  </div>
                  {!isCanceled && (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant={rsvpStatus === "going" ? "default" : "outline"}
                        onClick={() => handleRSVP(occ.id, "going")}
                        disabled={isUpdating}
                        className={`h-9 ${rsvpStatus === "going" ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}
                      >
                        <IconCheck className="h-4 w-4 mr-1" />
                        Going
                      </Button>
                      <Button
                        size="sm"
                        variant={rsvpStatus === "not_going" ? "secondary" : "outline"}
                        onClick={() => handleRSVP(occ.id, "not_going")}
                        disabled={isUpdating}
                      >
                        <IconX className="h-4 w-4 mr-1" />
                        Can't Go
                      </Button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
