"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function EventsPage() {
  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [recurrence, setRecurrence] = useState<"daily" | "weekly" | "monthly">("weekly");
  const [dayOfWeek, setDayOfWeek] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      // Build recurrence rule (simplified RRULE format)
      let recurrenceRule = "";
      if (recurrence === "daily") {
        recurrenceRule = "FREQ=DAILY";
      } else if (recurrence === "weekly") {
        recurrenceRule = `FREQ=WEEKLY;BYDAY=${dayOfWeek || "MO"}`;
      } else if (recurrence === "monthly") {
        recurrenceRule = "FREQ=MONTHLY";
      }

      const response = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          startTime,
          endTime,
          recurrenceRule,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to create event");
      }

      setSuccess("Event created successfully!");
      setTitle("");
      setStartTime("");
      setEndTime("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Event Management</h1>
        <p className="text-muted-foreground">
          Create recurring events for your gym
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create Recurring Event</CardTitle>
          <CardDescription>
            Set up a recurring event that athletes can RSVP to
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-green-500/10 text-green-600 rounded-md p-3 text-sm">
                {success}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="title">Event Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Morning Training Session"
                required
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time *</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">End Time *</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="recurrence">Recurrence *</Label>
              <Select
                value={recurrence}
                onValueChange={(value) =>
                  setRecurrence(value as "daily" | "weekly" | "monthly")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {recurrence === "weekly" && (
              <div className="space-y-2">
                <Label htmlFor="dayOfWeek">Day of Week *</Label>
                <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select day" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MO">Monday</SelectItem>
                    <SelectItem value="TU">Tuesday</SelectItem>
                    <SelectItem value="WE">Wednesday</SelectItem>
                    <SelectItem value="TH">Thursday</SelectItem>
                    <SelectItem value="FR">Friday</SelectItem>
                    <SelectItem value="SA">Saturday</SelectItem>
                    <SelectItem value="SU">Sunday</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button type="submit" disabled={loading || !title || !startTime || !endTime}>
              {loading ? "Creating..." : "Create Event"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

