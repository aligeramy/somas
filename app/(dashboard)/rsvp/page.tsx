"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PageHeader } from "@/components/page-header";
import {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    if (!dateValue) return { day: "", month: "", weekday: "", relative: "" };
    const date = typeof dateValue === "string" ? new Date(dateValue) : dateValue;
    if (isNaN(date.getTime())) return { day: "", month: "", weekday: "", relative: "" };
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    let relative = "";
    if (date.toDateString() === today.toDateString()) relative = "Today";
    else if (date.toDateString() === tomorrow.toDateString()) relative = "Tomorrow";
    
    return {
      day: date.getDate().toString(),
      month: date.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
      weekday: date.toLocaleDateString("en-US", { weekday: "short" }),
      relative,
    };
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
      <div className="flex flex-1 flex-col">
        <PageHeader title={isOwnerOrCoach ? "Attendance" : "My Schedule"} />
        <div className="flex flex-1 items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col">
        <PageHeader title="Attendance" />
        <div className="p-6">
          <div className="bg-destructive/10 text-destructive rounded-xl p-4">{error}</div>
        </div>
      </div>
    );
  }

  // Owner/Coach View
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
        <PageHeader title="Attendance" description="Track who's coming to each session" />
        <ScrollArea className="flex-1">
          <div className="p-4 lg:px-6 space-y-2">
            {events.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No upcoming events</p>
              </div>
            ) : (
              events.map((occ) => {
                const occRsvps = rsvpsByOccurrence[occ.id]?.rsvps || [];
                const going = occRsvps.filter((r) => r.status === "going");
                const notGoing = occRsvps.filter((r) => r.status === "not_going");
                const isCanceled = occ.status === "canceled";
                const dateInfo = formatDate(occ.date);

                return (
                  <div
                    key={occ.id}
                    className={`flex items-center gap-4 p-4 rounded-2xl border hover:bg-muted/30 transition-colors ${
                      isCanceled ? "opacity-50" : ""
                    }`}
                  >
                    {/* Big Date */}
                    <div className="h-16 w-16 rounded-xl bg-muted flex flex-col items-center justify-center flex-shrink-0">
                      <span className="text-2xl font-bold leading-none">{dateInfo.day}</span>
                      <span className="text-[10px] font-medium text-muted-foreground mt-0.5">{dateInfo.month}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{occ.event.title}</p>
                        {dateInfo.relative && (
                          <Badge variant="secondary" className="text-[10px] rounded-md">{dateInfo.relative}</Badge>
                        )}
                        {isCanceled && <Badge variant="destructive" className="text-[10px] rounded-md">Canceled</Badge>}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                        <span>{dateInfo.weekday}</span>
                        <span className="flex items-center gap-1">
                          <IconClock className="h-3 w-3" />
                          {formatTime(occ.event.startTime)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex -space-x-2">
                        {going.slice(0, 4).map((r) => (
                          <Avatar key={r.id} className="h-8 w-8 rounded-xl border-2 border-background">
                            <AvatarImage src={r.user?.avatarUrl || undefined} />
                            <AvatarFallback className="rounded-xl text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                              {getInitials(r.user?.name || null, r.user?.email || "")}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                        {going.length > 4 && (
                          <div className="h-8 w-8 rounded-xl bg-muted flex items-center justify-center text-xs font-medium border-2 border-background">
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

  // Athlete View
  return (
    <div className="flex flex-1 flex-col h-[calc(100vh-var(--header-height))]">
      <PageHeader title="My Schedule" description="RSVP to upcoming sessions" />
      <ScrollArea className="flex-1">
        <div className="p-4 lg:px-6 space-y-2">
          {events.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No upcoming events</p>
            </div>
          ) : (
            events.map((occ) => {
              const rsvpStatus = getRSVPStatus(occ.id);
              const isCanceled = occ.status === "canceled";
              const isUpdating = updatingId === occ.id;
              const dateInfo = formatDate(occ.date);

              return (
                <div
                  key={occ.id}
                  className={`flex items-center gap-4 p-4 rounded-2xl border transition-colors ${
                    isCanceled ? "opacity-50" : "hover:bg-muted/30"
                  }`}
                >
                  {/* Big Date with Status */}
                  <div className={`h-16 w-16 rounded-xl flex flex-col items-center justify-center flex-shrink-0 ${
                    rsvpStatus === "going" 
                      ? "bg-emerald-100 dark:bg-emerald-950/50" 
                      : rsvpStatus === "not_going"
                      ? "bg-red-100 dark:bg-red-950/50"
                      : "bg-muted"
                  }`}>
                    <span className={`text-2xl font-bold leading-none ${
                      rsvpStatus === "going" 
                        ? "text-emerald-600 dark:text-emerald-400" 
                        : rsvpStatus === "not_going"
                        ? "text-red-600 dark:text-red-400"
                        : ""
                    }`}>{dateInfo.day}</span>
                    <span className="text-[10px] font-medium text-muted-foreground mt-0.5">{dateInfo.month}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{occ.event.title}</p>
                      {dateInfo.relative && (
                        <Badge variant="secondary" className="text-[10px] rounded-md">{dateInfo.relative}</Badge>
                      )}
                      {isCanceled && <Badge variant="destructive" className="text-[10px] rounded-md">Canceled</Badge>}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                      <span>{dateInfo.weekday}</span>
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
                        className={`h-9 rounded-xl ${rsvpStatus === "going" ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}
                      >
                        <IconCheck className="h-4 w-4 mr-1" />
                        Going
                      </Button>
                      <Button
                        size="sm"
                        variant={rsvpStatus === "not_going" ? "secondary" : "outline"}
                        onClick={() => handleRSVP(occ.id, "not_going")}
                        disabled={isUpdating}
                        className="h-9 rounded-xl"
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
