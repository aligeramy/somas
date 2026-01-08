"use client";

import {
  IconArrowLeft,
  IconBell,
  IconCalendar,
  IconClock,
  IconList,
  IconMapPin,
  IconTrash,
} from "@tabler/icons-react";
import { addDays, addMonths, addWeeks, format, startOfToday } from "date-fns";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useGooglePlacesAutocomplete } from "@/hooks/use-google-places-autocomplete";

const DAYS_OF_WEEK = [
  { value: "MO", label: "Monday", index: 1 },
  { value: "TU", label: "Tuesday", index: 2 },
  { value: "WE", label: "Wednesday", index: 3 },
  { value: "TH", label: "Thursday", index: 4 },
  { value: "FR", label: "Friday", index: 5 },
  { value: "SA", label: "Saturday", index: 6 },
  { value: "SU", label: "Sunday", index: 0 },
];

const REMINDER_OPTIONS = [
  { value: 7, label: "1 week before" },
  { value: 3, label: "3 days before" },
  { value: 2, label: "2 days before" },
  { value: 1, label: "1 day before" },
  { value: 0.02, label: "30 minutes before" },
];

interface Event {
  id: string;
  title: string;
  description?: string | null;
  location?: string | null;
  startTime: string;
  endTime: string;
  recurrenceRule: string | null;
  recurrenceEndDate: string | null;
  reminderDays: number[] | null;
}

export default function EditEventPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;
  const [loading, setLoading] = useState(false);
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("details");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startDate, setStartDate] = useState<Date>(startOfToday());
  const locationInputRef = useRef<HTMLInputElement>(null);

  useGooglePlacesAutocomplete(locationInputRef, (address) => {
    setLocation(address);
  });
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [recurrence, setRecurrence] = useState<
    "none" | "daily" | "weekly" | "monthly"
  >("none");
  const [dayOfWeek, setDayOfWeek] = useState("MO");
  const [reminderDays, setReminderDays] = useState<number[]>([7, 1, 0.02]);
  const [endType, setEndType] = useState<"never" | "date" | "count">("never");
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [occurrenceCount, setOccurrenceCount] = useState("12");
  const prevDayOfWeekRef = useRef<string>("MO");
  const isUpdatingFromDayChangeRef = useRef(false);
  const eventLoadedRef = useRef(false);

  // Helper to parse date input without timezone issues
  function parseDateInput(dateStr: string): Date {
    const [year, month, day] = dateStr.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  // Load event data
  useEffect(() => {
    async function loadEvent() {
      try {
        setLoadingEvent(true);
        const response = await fetch(`/api/events/${eventId}`);
        if (!response.ok) throw new Error("Failed to load event");
        const data = await response.json();
        const event: Event = data.event;
        const occurrences = data.occurrences || [];

        // Populate form with event data
        setTitle(event.title);
        setDescription(event.description || "");
        setLocation(event.location || "");
        setStartTime(event.startTime);
        setEndTime(event.endTime);
        setReminderDays(event.reminderDays || [7, 1, 0.02]);

        // Set start date from first occurrence, or use today if no occurrences
        if (occurrences.length > 0) {
          const firstOccurrence = occurrences[0];
          setStartDate(new Date(firstOccurrence.date));
        }

        // Parse recurrence rule
        if (event.recurrenceRule) {
          if (event.recurrenceRule.includes("DAILY")) {
            setRecurrence("daily");
          } else if (event.recurrenceRule.includes("WEEKLY")) {
            setRecurrence("weekly");
            const bydayMatch = event.recurrenceRule.match(/BYDAY=(\w+)/);
            if (bydayMatch) {
              setDayOfWeek(bydayMatch[1]);
              prevDayOfWeekRef.current = bydayMatch[1];
            }
          } else if (event.recurrenceRule.includes("MONTHLY")) {
            setRecurrence("monthly");
          }
        } else {
          setRecurrence("none");
        }

        // Parse recurrence end date
        if (event.recurrenceEndDate) {
          setEndType("date");
          setEndDate(new Date(event.recurrenceEndDate));
        } else {
          setEndType("never");
        }

        eventLoadedRef.current = true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load event");
      } finally {
        setLoadingEvent(false);
      }
    }

    if (eventId) {
      loadEvent();
    }
  }, [eventId]);

  // Update start date to next occurrence when day of week changes (after event is loaded)
  useEffect(() => {
    // Only update if event is loaded and dayOfWeek actually changed (user picked a different day)
    if (
      eventLoadedRef.current &&
      recurrence === "weekly" &&
      dayOfWeek !== prevDayOfWeekRef.current &&
      !isUpdatingFromDayChangeRef.current
    ) {
      const targetDay =
        DAYS_OF_WEEK.find((d) => d.value === dayOfWeek)?.index ?? 1;

      // Start from today to find the next occurrence
      const today = startOfToday();
      const currentDay = today.getDay();

      // Calculate days until next occurrence of target day
      let daysUntilTarget = targetDay - currentDay;
      if (daysUntilTarget <= 0) {
        // If the target day has passed this week, go to next week
        daysUntilTarget += 7;
      }

      const nextDate = addDays(today, daysUntilTarget);

      isUpdatingFromDayChangeRef.current = true;
      setStartDate(nextDate);
      prevDayOfWeekRef.current = dayOfWeek;
      // Reset flag after state update
      setTimeout(() => {
        isUpdatingFromDayChangeRef.current = false;
      }, 0);
    } else if (dayOfWeek !== prevDayOfWeekRef.current) {
      // Update ref even if we didn't update startDate
      prevDayOfWeekRef.current = dayOfWeek;
    }
    // Only run when dayOfWeek or recurrence changes, not when startDate changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayOfWeek, recurrence]);

  // Generate preview dates
  const previewDates = useMemo(() => {
    if (recurrence === "none") {
      return [startDate];
    }

    const dates: Date[] = [];
    let currentDate = new Date(startDate);
    const maxDates =
      endType === "count" ? Number.parseInt(occurrenceCount, 10) || 12 : 52;
    const maxEndDate =
      endType === "date" && endDate ? endDate : addMonths(startDate, 12);

    // Find the first occurrence based on day of week for weekly
    if (recurrence === "weekly") {
      const targetDay =
        DAYS_OF_WEEK.find((d) => d.value === dayOfWeek)?.index || 1;
      while (currentDate.getDay() !== targetDay) {
        currentDate = addDays(currentDate, 1);
      }
    }

    for (let i = 0; i < maxDates && currentDate <= maxEndDate; i++) {
      dates.push(new Date(currentDate));

      if (recurrence === "daily") {
        currentDate = addDays(currentDate, 1);
      } else if (recurrence === "weekly") {
        currentDate = addWeeks(currentDate, 1);
      } else if (recurrence === "monthly") {
        currentDate = addMonths(currentDate, 1);
      }
    }

    return dates;
  }, [recurrence, dayOfWeek, endType, endDate, occurrenceCount, startDate]);

  function toggleReminder(value: number) {
    setReminderDays((prev) =>
      prev.includes(value)
        ? prev.filter((d) => d !== value)
        : [...prev, value].sort((a, b) => b - a)
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let recurrenceRule = "";
      if (recurrence === "daily") {
        recurrenceRule = "FREQ=DAILY";
      } else if (recurrence === "weekly") {
        recurrenceRule = `FREQ=WEEKLY;BYDAY=${dayOfWeek}`;
      } else if (recurrence === "monthly") {
        recurrenceRule = "FREQ=MONTHLY";
      }

      const response = await fetch(`/api/events/${eventId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: description || null,
          location: location || null,
          startDate: startDate.toISOString(),
          startTime,
          endTime,
          recurrenceRule: recurrenceRule || null,
          recurrenceEndDate:
            endType === "date" && endDate ? endDate.toISOString() : null,
          recurrenceCount:
            endType === "count" ? Number.parseInt(occurrenceCount, 10) : null,
          reminderDays,
        }),
      });

      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Failed to update event");

      router.push("/events");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      const response = await fetch(`/api/events/${eventId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Failed to delete event");
      }

      setDeleteDialogOpen(false);
      router.push("/events");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete event");
    } finally {
      setDeleting(false);
    }
  }

  const modifiers = {
    scheduled: previewDates,
  };

  const modifiersStyles = {
    scheduled: {
      backgroundColor: "hsl(var(--primary))",
      color: "hsl(var(--primary-foreground))",
      borderRadius: "8px",
    },
  };

  if (loadingEvent) {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
        <PageHeader description="Update event details" title="Edit Event">
          <Button
            asChild
            className="gap-2 rounded-xl"
            size="sm"
            variant="ghost"
          >
            <Link href="/events">
              <IconArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </Button>
        </PageHeader>
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto">
          <p className="text-muted-foreground">Loading event...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <PageHeader description="Update event details" title="Edit Event">
        <Button asChild className="gap-2 rounded-xl" size="sm" variant="ghost">
          <Link href="/events">
            <IconArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </Button>
      </PageHeader>

      <div className="min-h-0 flex-1 overflow-auto">
        <div className="mx-auto max-w-4xl p-4">
          <form onSubmit={handleSubmit}>
            {error && (
              <div className="mb-6 rounded-xl bg-destructive/10 p-4 text-destructive text-sm">
                {error}
              </div>
            )}

            <Tabs
              className="space-y-6"
              onValueChange={setActiveTab}
              value={activeTab}
            >
              <TabsList className="grid h-11 w-full grid-cols-2 rounded-xl">
                <TabsTrigger className="gap-2 rounded-lg" value="details">
                  <IconList className="h-4 w-4" />
                  Details
                </TabsTrigger>
                <TabsTrigger className="gap-2 rounded-lg" value="calendar">
                  <IconCalendar className="h-4 w-4" />
                  Calendar Preview
                </TabsTrigger>
              </TabsList>

              <TabsContent className="mt-6 space-y-6" value="details">
                {/* Basic Info */}
                <Card className="rounded-xl">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <IconCalendar className="h-5 w-5" />
                      Event Details
                    </CardTitle>
                    <CardDescription>
                      Basic information about the event
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label className="font-medium text-sm" htmlFor="title">
                        Event Name *
                      </Label>
                      <Input
                        className="h-11 rounded-xl"
                        id="title"
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Morning Training Session"
                        required
                        value={title}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label
                        className="font-medium text-sm"
                        htmlFor="description"
                      >
                        Description
                      </Label>
                      <Textarea
                        className="min-h-[100px] rounded-xl"
                        id="description"
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="What athletes should know about this session..."
                        value={description}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="font-medium text-sm" htmlFor="location">
                        <span className="flex items-center gap-1.5">
                          <IconMapPin className="h-4 w-4" />
                          Location
                        </span>
                      </Label>
                      <Input
                        autoComplete="off"
                        className="h-11 rounded-xl"
                        id="location"
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="Enter location or address"
                        ref={locationInputRef}
                        value={location}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Time */}
                <Card className="rounded-xl">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <IconClock className="h-5 w-5" />
                      Schedule
                    </CardTitle>
                    <CardDescription>
                      When does this event happen?
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label
                        className="font-medium text-sm"
                        htmlFor="startDate"
                      >
                        Start Date *
                      </Label>
                      <Input
                        className="h-11 rounded-xl"
                        id="startDate"
                        onChange={(e) =>
                          e.target.value &&
                          setStartDate(parseDateInput(e.target.value))
                        }
                        required
                        type="date"
                        value={format(startDate, "yyyy-MM-dd")}
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label
                          className="font-medium text-sm"
                          htmlFor="startTime"
                        >
                          Start Time *
                        </Label>
                        <Input
                          className="h-11 rounded-xl"
                          id="startTime"
                          onChange={(e) => setStartTime(e.target.value)}
                          required
                          type="time"
                          value={startTime}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label
                          className="font-medium text-sm"
                          htmlFor="endTime"
                        >
                          End Time *
                        </Label>
                        <Input
                          className="h-11 rounded-xl"
                          id="endTime"
                          onChange={(e) => setEndTime(e.target.value)}
                          required
                          type="time"
                          value={endTime}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="font-medium text-sm">Recurrence</Label>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Select
                          onValueChange={(v) =>
                            setRecurrence(
                              v as "none" | "daily" | "weekly" | "monthly"
                            )
                          }
                          value={recurrence}
                        >
                          <SelectTrigger className="h-11 w-full rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="none">One-time event</SelectItem>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                          </SelectContent>
                        </Select>

                        {recurrence === "weekly" && (
                          <Select
                            onValueChange={setDayOfWeek}
                            value={dayOfWeek}
                          >
                            <SelectTrigger className="h-11 w-full rounded-xl">
                              <SelectValue placeholder="Select day of week" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              {DAYS_OF_WEEK.map((day) => (
                                <SelectItem key={day.value} value={day.value}>
                                  {day.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </div>

                    {recurrence !== "none" && (
                      <div className="space-y-3 border-t pt-2">
                        <Label className="font-medium text-sm">
                          End Recurrence
                        </Label>
                        <div className="space-y-2">
                          <button
                            className={`flex w-full cursor-pointer items-center space-x-3 rounded-xl p-3 text-left transition-colors ${
                              endType === "never"
                                ? "bg-primary/10 ring-1 ring-primary"
                                : "bg-muted/50 hover:bg-muted"
                            }`}
                            onClick={() => setEndType("never")}
                            type="button"
                          >
                            <div
                              className={`h-4 w-4 rounded-full border ${
                                endType === "never"
                                  ? "border-primary bg-primary"
                                  : "border-muted-foreground"
                              }`}
                            >
                              {endType === "never" && (
                                <div className="h-full w-full scale-50 rounded-full bg-primary-foreground" />
                              )}
                            </div>
                            <span className="text-sm">On Going</span>
                          </button>
                          <button
                            className={`flex w-full cursor-pointer items-center space-x-3 rounded-xl p-3 text-left transition-colors ${
                              endType === "count"
                                ? "bg-primary/10 ring-1 ring-primary"
                                : "bg-muted/50 hover:bg-muted"
                            }`}
                            onClick={() => setEndType("count")}
                            type="button"
                          >
                            <div
                              className={`h-4 w-4 rounded-full border ${
                                endType === "count"
                                  ? "border-primary bg-primary"
                                  : "border-muted-foreground"
                              }`}
                            >
                              {endType === "count" && (
                                <div className="h-full w-full scale-50 rounded-full bg-primary-foreground" />
                              )}
                            </div>
                            <span className="flex-1 text-sm">After</span>
                            <Input
                              className="h-9 w-20 rounded-lg"
                              max="100"
                              min="1"
                              onChange={(e) =>
                                setOccurrenceCount(e.target.value)
                              }
                              onClick={(e) => e.stopPropagation()}
                              type="number"
                              value={occurrenceCount}
                            />
                            <span className="text-muted-foreground text-sm">
                              occurrences
                            </span>
                          </button>
                          <button
                            className={`flex w-full cursor-pointer items-center space-x-3 rounded-xl p-3 text-left transition-colors ${
                              endType === "date"
                                ? "bg-primary/10 ring-1 ring-primary"
                                : "bg-muted/50 hover:bg-muted"
                            }`}
                            onClick={() => setEndType("date")}
                            type="button"
                          >
                            <div
                              className={`h-4 w-4 rounded-full border ${
                                endType === "date"
                                  ? "border-primary bg-primary"
                                  : "border-muted-foreground"
                              }`}
                            >
                              {endType === "date" && (
                                <div className="h-full w-full scale-50 rounded-full bg-primary-foreground" />
                              )}
                            </div>
                            <span className="flex-1 text-sm">End on date</span>
                            <Input
                              className="h-9 w-40 rounded-lg"
                              onChange={(e) =>
                                setEndDate(
                                  e.target.value
                                    ? parseDateInput(e.target.value)
                                    : undefined
                                )
                              }
                              onClick={(e) => e.stopPropagation()}
                              type="date"
                              value={
                                endDate ? format(endDate, "yyyy-MM-dd") : ""
                              }
                            />
                          </button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Reminders */}
                <Card className="rounded-xl">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <IconBell className="h-5 w-5" />
                      Reminders
                    </CardTitle>
                    <CardDescription>
                      When should athletes be reminded?
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {REMINDER_OPTIONS.map((option) => (
                        <div
                          className="flex w-full items-center space-x-3 rounded-xl bg-muted/50 p-3 transition-colors hover:bg-muted"
                          key={option.value}
                        >
                          <Checkbox
                            checked={reminderDays.includes(option.value)}
                            id={`reminder-${option.value}`}
                            onCheckedChange={() => toggleReminder(option.value)}
                          />
                          <Label
                            className="flex-1 cursor-pointer text-sm"
                            htmlFor={`reminder-${option.value}`}
                          >
                            {option.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                    <p className="mt-3 text-muted-foreground text-xs">
                      Athletes will receive email reminders at the selected
                      times before each session.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent className="mt-6" value="calendar">
                <Card className="rounded-xl">
                  <CardHeader>
                    <CardTitle className="text-base">
                      Calendar Preview
                    </CardTitle>
                    <CardDescription>
                      Preview of {previewDates.length} scheduled session
                      {previewDates.length !== 1 ? "s" : ""}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-6 lg:flex-row">
                      <Calendar
                        className="rounded-xl border p-3"
                        mode="multiple"
                        modifiers={modifiers}
                        modifiersStyles={modifiersStyles}
                        numberOfMonths={2}
                        selected={previewDates}
                      />
                      <div className="flex-1">
                        <h4 className="mb-3 font-medium text-sm">
                          Upcoming Sessions
                        </h4>
                        <div className="max-h-[300px] space-y-2 overflow-auto pr-2">
                          {previewDates.slice(0, 20).map((date) => (
                            <div
                              className="flex items-center gap-3 rounded-lg bg-muted/50 p-2"
                              key={date.toISOString()}
                            >
                              <div className="flex h-10 w-10 flex-col items-center justify-center rounded-lg bg-primary text-primary-foreground">
                                <span className="font-bold text-sm leading-none">
                                  {format(date, "d")}
                                </span>
                                <span className="text-[9px] uppercase">
                                  {format(date, "MMM")}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium text-sm">
                                  {format(date, "EEEE")}
                                </p>
                                <p className="text-muted-foreground text-xs">
                                  {startTime && endTime
                                    ? `${startTime} - ${endTime}`
                                    : "Time not set"}
                                </p>
                              </div>
                            </div>
                          ))}
                          {previewDates.length > 20 && (
                            <p className="py-2 text-center text-muted-foreground text-xs">
                              + {previewDates.length - 20} more sessions
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Submit */}
            <div className="mt-6 flex gap-3">
              <Button
                className="h-12 flex-1 rounded-xl"
                onClick={() => router.push("/events")}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                className="h-12 rounded-xl"
                disabled={loading || deleting}
                onClick={() => setDeleteDialogOpen(true)}
                type="button"
                variant="destructive"
              >
                <IconTrash className="mr-2 h-4 w-4" />
                Delete
              </Button>
              <Button
                className="h-12 flex-1 rounded-xl"
                disabled={loading || !title || !startTime || !endTime}
                type="submit"
              >
                {loading ? "Updating..." : "Update Event"}
              </Button>
            </div>
          </form>

          {/* Delete Confirmation Dialog */}
          <Dialog onOpenChange={setDeleteDialogOpen} open={deleteDialogOpen}>
            <DialogContent className="rounded-xl">
              <DialogHeader>
                <DialogTitle>Delete Event</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete this event? This will delete
                  all occurrences and RSVPs associated with this event. This
                  action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2">
                <Button
                  className="rounded-xl"
                  disabled={deleting}
                  onClick={() => setDeleteDialogOpen(false)}
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button
                  className="rounded-xl"
                  disabled={deleting}
                  onClick={handleDelete}
                  variant="destructive"
                >
                  {deleting ? "Deleting..." : "Delete Event"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
