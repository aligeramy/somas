"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const [activeTab, setActiveTab] = useState("events");

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

      if (!eventsRes.ok || !rsvpsRes.ok) {
        throw new Error("Failed to load data");
      }

      const eventsData = await eventsRes.json();
      const rsvpsData = await rsvpsRes.json();
      
      if (userRes.ok) {
        const userData = await userRes.json();
        setUserInfo(userData);
      }

      // Flatten occurrences from all events
      const allOccurrences: EventOccurrence[] = [];
      eventsData.events.forEach((event: any) => {
        event.occurrences.forEach((occ: any) => {
          allOccurrences.push({
            ...occ,
            event: {
              id: event.id,
              title: event.title,
              startTime: event.startTime,
              endTime: event.endTime,
            },
          });
        });
      });

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
      const response = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          occurrenceId,
          status,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to RSVP");
      }

      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  }

  function getRSVPStatus(occurrenceId: string): "going" | "not_going" | null {
    if (userInfo?.role === "owner" || userInfo?.role === "coach") {
      return null; // Owners/coaches don't RSVP
    }
    const rsvp = rsvps.find((r) => r.occurrence?.id === occurrenceId);
    return rsvp ? (rsvp.status as "going" | "not_going") : null;
  }

  function formatDate(dateValue: string | Date | undefined | null) {
    if (!dateValue) return "Invalid date";
    const date = typeof dateValue === "string" ? new Date(dateValue) : dateValue;
    if (isNaN(date.getTime())) return String(dateValue);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  function formatTime(timeString: string | undefined | null) {
    if (!timeString) return "TBD";
    const [hours, minutes] = timeString.split(":");
    const hour = parseInt(hours);
    if (isNaN(hour)) return timeString;
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
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

  // Group RSVPs by occurrence for owner/coach view
  const rsvpsByOccurrence = rsvps.reduce((acc, rsvp) => {
    if (!rsvp.occurrence) return acc;
    const occId = rsvp.occurrence.id;
    if (!acc[occId]) {
      acc[occId] = {
        occurrence: rsvp.occurrence,
        rsvps: [],
      };
    }
    if (rsvp.user) {
      acc[occId].rsvps.push(rsvp);
    }
    return acc;
  }, {} as Record<string, { occurrence: EventOccurrence; rsvps: RSVP[] }>);

  const isOwnerOrCoach = userInfo?.role === "owner" || userInfo?.role === "coach";

  if (loading) {
    return (
      <div className="flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
          <div className="bg-destructive/10 text-destructive rounded-md p-3">
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">
            {isOwnerOrCoach ? "RSVP Management" : "RSVP to Events"}
          </h1>
          <p className="text-muted-foreground">
            {isOwnerOrCoach
              ? "View all RSVPs for your gym events"
              : "View upcoming events and RSVP"}
          </p>
        </div>

        {isOwnerOrCoach ? (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="events">Upcoming Events</TabsTrigger>
              <TabsTrigger value="rsvps">All RSVPs</TabsTrigger>
            </TabsList>
            <TabsContent value="events" className="space-y-4">
              {events.length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-center text-muted-foreground">
                      No upcoming events available.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {events.map((occurrence) => {
                    const isCanceled = occurrence.status === "canceled";
                    const occurrenceRsvps = rsvpsByOccurrence[occurrence.id]?.rsvps || [];
                    const goingCount = occurrenceRsvps.filter((r) => r.status === "going").length;
                    const notGoingCount = occurrenceRsvps.filter((r) => r.status === "not_going").length;

                    return (
                      <Card key={occurrence.id}>
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle>{occurrence.event.title}</CardTitle>
                              <CardDescription>
                                {formatDate(occurrence.date)} •{" "}
                                {formatTime(occurrence.event.startTime)} -{" "}
                                {formatTime(occurrence.event.endTime)}
                              </CardDescription>
                            </div>
                            {isCanceled && (
                              <Badge variant="destructive">Canceled</Badge>
                            )}
                          </div>
                        </CardHeader>
                        {!isCanceled && (
                          <CardContent>
                            <div className="flex items-center gap-4 text-sm">
                              <Badge variant="default">
                                {goingCount} Going
                              </Badge>
                              <Badge variant="secondary">
                                {notGoingCount} Not Going
                              </Badge>
                            </div>
                          </CardContent>
                        )}
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
            <TabsContent value="rsvps" className="space-y-4">
              {Object.keys(rsvpsByOccurrence).length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-center text-muted-foreground">
                      No RSVPs yet.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {Object.values(rsvpsByOccurrence).map(({ occurrence, rsvps: occRsvps }) => (
                    <Card key={occurrence.id}>
                      <CardHeader>
                        <CardTitle>{occurrence.event.title}</CardTitle>
                        <CardDescription>
                          {formatDate(occurrence.date)} •{" "}
                          {formatTime(occurrence.event.startTime)} -{" "}
                          {formatTime(occurrence.event.endTime)}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {occRsvps.map((rsvp) => (
                            <div
                              key={rsvp.id}
                              className="flex items-center justify-between p-2 rounded-lg border"
                            >
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={rsvp.user?.avatarUrl || undefined} />
                                  <AvatarFallback>
                                    {getInitials(rsvp.user?.name || null, rsvp.user?.email || "")}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium text-sm">
                                    {rsvp.user?.name || "No name"}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {rsvp.user?.email}
                                  </p>
                                </div>
                              </div>
                              <Badge
                                variant={rsvp.status === "going" ? "default" : "secondary"}
                              >
                                {rsvp.status === "going" ? "Going" : "Not Going"}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        ) : (
          <>
            {events.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">
                    No upcoming events available.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {events.map((occurrence) => {
                  const rsvpStatus = getRSVPStatus(occurrence.id);
                  const isCanceled = occurrence.status === "canceled";

                  return (
                    <Card key={occurrence.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle>{occurrence.event.title}</CardTitle>
                            <CardDescription>
                              {formatDate(occurrence.date)} •{" "}
                              {formatTime(occurrence.event.startTime)} -{" "}
                              {formatTime(occurrence.event.endTime)}
                            </CardDescription>
                          </div>
                          {isCanceled && (
                            <Badge variant="destructive">Canceled</Badge>
                          )}
                          {rsvpStatus && !isCanceled && (
                            <Badge
                              variant={rsvpStatus === "going" ? "default" : "secondary"}
                            >
                              {rsvpStatus === "going" ? "Going" : "Not Going"}
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      {!isCanceled && (
                        <CardContent>
                          <div className="flex gap-2">
                            <Button
                              variant={rsvpStatus === "going" ? "default" : "outline"}
                              onClick={() => handleRSVP(occurrence.id, "going")}
                            >
                              Going
                            </Button>
                            <Button
                              variant={
                                rsvpStatus === "not_going" ? "default" : "outline"
                              }
                              onClick={() => handleRSVP(occurrence.id, "not_going")}
                            >
                              Not Going
                            </Button>
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
