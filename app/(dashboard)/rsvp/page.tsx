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
  occurrence: EventOccurrence;
}

export default function RSVPPage() {
  const [events, setEvents] = useState<EventOccurrence[]>([]);
  const [rsvps, setRsvps] = useState<RSVP[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [eventsRes, rsvpsRes] = await Promise.all([
        fetch("/api/events"),
        fetch("/api/rsvp"),
      ]);

      if (!eventsRes.ok || !rsvpsRes.ok) {
        throw new Error("Failed to load data");
      }

      const eventsData = await eventsRes.json();
      const rsvpsData = await rsvpsRes.json();

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

      // Reload data
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  }

  function getRSVPStatus(occurrenceId: string): "going" | "not_going" | null {
    const rsvp = rsvps.find((r) => r.occurrence.id === occurrenceId);
    return rsvp ? (rsvp.status as "going" | "not_going") : null;
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  function formatTime(timeString: string) {
    const [hours, minutes] = timeString.split(":");
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-destructive/10 text-destructive rounded-md p-3">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">RSVP to Events</h1>
        <p className="text-muted-foreground">
          View upcoming events and RSVP
        </p>
      </div>

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
    </div>
  );
}

