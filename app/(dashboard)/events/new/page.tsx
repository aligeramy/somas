"use client";

import {
  IconArrowLeft,
  IconBell,
  IconCalendar,
  IconClock,
  IconList,
  IconMapPin,
} from "@tabler/icons-react";
import { addDays, addMonths, addWeeks, format, startOfToday } from "date-fns";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
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

export default function NewEventPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("details");

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startDate, setStartDate] = useState<Date>(startOfToday());
  const [startTime, setStartTime] = useState("18:00");
  const [endTime, setEndTime] = useState("21:00");
  const [recurrence, setRecurrence] = useState<
    "none" | "daily" | "weekly" | "monthly"
  >("none");
  const [dayOfWeek, setDayOfWeek] = useState("MO");
  const [reminderDays, setReminderDays] = useState<number[]>([7, 1, 0.02]);
  const [endType, setEndType] = useState<"never" | "date" | "count">("never");
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [occurrenceCount, setOccurrenceCount] = useState("12");

  // Helper to parse date input without timezone issues
  function parseDateInput(dateStr: string): Date {
    // Parse as local date by adding time component
    const [year, month, day] = dateStr.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  // Generate preview dates
  const previewDates = useMemo(() => {
    if (recurrence === "none") {
      return [startDate];
    }

    const dates: Date[] = [];
    let currentDate = new Date(startDate);
    const maxDates =
      endType === "count" ? parseInt(occurrenceCount, 10) || 12 : 52;
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
        : [...prev, value].sort((a, b) => b - a),
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

      const response = await fetch("/api/events", {
        method: "POST",
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
            endType === "count" ? parseInt(occurrenceCount, 10) : null,
          reminderDays,
        }),
      });

      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Failed to create event");

      router.push("/events");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
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

  return (
    <div className="flex flex-1 flex-col min-h-0 h-full overflow-hidden">
      <PageHeader
        title="Create Event"
        description="Set up a new training session"
      >
        <Button variant="ghost" size="sm" asChild className="gap-2 rounded-xl">
          <Link href="/events">
            <IconArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </Button>
      </PageHeader>

      <div className="flex-1 overflow-auto min-h-0">
        <div className="max-w-4xl mx-auto p-4">
          <form onSubmit={handleSubmit}>
            {error && (
              <div className="bg-destructive/10 text-destructive rounded-xl p-4 text-sm mb-6">
                {error}
              </div>
            )}

            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="space-y-6"
            >
              <TabsList className="grid w-full grid-cols-2 h-11 rounded-xl">
                <TabsTrigger value="details" className="gap-2 rounded-lg">
                  <IconList className="h-4 w-4" />
                  Details
                </TabsTrigger>
                <TabsTrigger value="calendar" className="gap-2 rounded-lg">
                  <IconCalendar className="h-4 w-4" />
                  Calendar Preview
                </TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-6 mt-6">
                {/* Basic Info */}
                <Card className="rounded-xl">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <IconCalendar className="h-5 w-5" />
                      Event Details
                    </CardTitle>
                    <CardDescription>
                      Basic information about the event
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="title" className="text-sm font-medium">
                        Event Name *
                      </Label>
                      <Input
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Morning Training Session"
                        className="h-11 rounded-xl"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="description"
                        className="text-sm font-medium"
                      >
                        Description
                      </Label>
                      <Textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="What athletes should know about this session..."
                        className="rounded-xl min-h-[100px]"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="location" className="text-sm font-medium">
                        <span className="flex items-center gap-1.5">
                          <IconMapPin className="h-4 w-4" />
                          Location
                        </span>
                      </Label>
                      <Input
                        id="location"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="Main Gym, Field B, etc."
                        className="h-11 rounded-xl"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Time */}
                <Card className="rounded-xl">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
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
                        htmlFor="startDate"
                        className="text-sm font-medium"
                      >
                        Start Date *
                      </Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={format(startDate, "yyyy-MM-dd")}
                        onChange={(e) =>
                          e.target.value &&
                          setStartDate(parseDateInput(e.target.value))
                        }
                        className="h-11 rounded-xl"
                        required
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label
                          htmlFor="startTime"
                          className="text-sm font-medium"
                        >
                          Start Time *
                        </Label>
                        <Input
                          id="startTime"
                          type="time"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          className="h-11 rounded-xl"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label
                          htmlFor="endTime"
                          className="text-sm font-medium"
                        >
                          End Time *
                        </Label>
                        <Input
                          id="endTime"
                          type="time"
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                          className="h-11 rounded-xl"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Recurrence</Label>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Select
                          value={recurrence}
                          onValueChange={(v) => setRecurrence(v as any)}
                        >
                          <SelectTrigger className="h-11 rounded-xl w-full">
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
                            value={dayOfWeek}
                            onValueChange={setDayOfWeek}
                          >
                            <SelectTrigger className="h-11 rounded-xl w-full">
                              <SelectValue />
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
                      <div className="space-y-3 pt-2 border-t">
                        <Label className="text-sm font-medium">
                          End Recurrence
                        </Label>
                        <div className="space-y-2">
                          <div
                            className={`flex items-center space-x-3 p-3 rounded-xl cursor-pointer transition-colors ${
                              endType === "never"
                                ? "bg-primary/10 ring-1 ring-primary"
                                : "bg-muted/50 hover:bg-muted"
                            }`}
                            onClick={() => setEndType("never")}
                          >
                            <div
                              className={`h-4 w-4 rounded-full border ${
                                endType === "never"
                                  ? "border-primary bg-primary"
                                  : "border-muted-foreground"
                              }`}
                            >
                              {endType === "never" && (
                                <div className="h-full w-full rounded-full bg-primary-foreground scale-50" />
                              )}
                            </div>
                            <span className="text-sm">Never (ongoing)</span>
                          </div>
                          <div
                            className={`flex items-center space-x-3 p-3 rounded-xl cursor-pointer transition-colors ${
                              endType === "count"
                                ? "bg-primary/10 ring-1 ring-primary"
                                : "bg-muted/50 hover:bg-muted"
                            }`}
                            onClick={() => setEndType("count")}
                          >
                            <div
                              className={`h-4 w-4 rounded-full border ${
                                endType === "count"
                                  ? "border-primary bg-primary"
                                  : "border-muted-foreground"
                              }`}
                            >
                              {endType === "count" && (
                                <div className="h-full w-full rounded-full bg-primary-foreground scale-50" />
                              )}
                            </div>
                            <span className="text-sm flex-1">After</span>
                            <Input
                              type="number"
                              min="1"
                              max="100"
                              value={occurrenceCount}
                              onChange={(e) =>
                                setOccurrenceCount(e.target.value)
                              }
                              className="h-9 w-20 rounded-lg"
                              onClick={(e) => e.stopPropagation()}
                            />
                            <span className="text-sm text-muted-foreground">
                              occurrences
                            </span>
                          </div>
                          <div
                            className={`flex items-center space-x-3 p-3 rounded-xl cursor-pointer transition-colors ${
                              endType === "date"
                                ? "bg-primary/10 ring-1 ring-primary"
                                : "bg-muted/50 hover:bg-muted"
                            }`}
                            onClick={() => setEndType("date")}
                          >
                            <div
                              className={`h-4 w-4 rounded-full border ${
                                endType === "date"
                                  ? "border-primary bg-primary"
                                  : "border-muted-foreground"
                              }`}
                            >
                              {endType === "date" && (
                                <div className="h-full w-full rounded-full bg-primary-foreground scale-50" />
                              )}
                            </div>
                            <span className="text-sm flex-1">End on date</span>
                            <Input
                              type="date"
                              value={
                                endDate ? format(endDate, "yyyy-MM-dd") : ""
                              }
                              onChange={(e) =>
                                setEndDate(
                                  e.target.value
                                    ? parseDateInput(e.target.value)
                                    : undefined,
                                )
                              }
                              className="h-9 w-40 rounded-lg"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Reminders */}
                <Card className="rounded-xl">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
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
                          key={option.value}
                          className="flex items-center space-x-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                          onClick={() => toggleReminder(option.value)}
                        >
                          <Checkbox
                            id={`reminder-${option.value}`}
                            checked={reminderDays.includes(option.value)}
                            onCheckedChange={() => toggleReminder(option.value)}
                          />
                          <Label
                            htmlFor={`reminder-${option.value}`}
                            className="flex-1 cursor-pointer text-sm"
                          >
                            {option.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-3">
                      Athletes will receive email reminders at the selected
                      times before each session.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="calendar" className="mt-6">
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
                    <div className="flex flex-col lg:flex-row gap-6">
                      <Calendar
                        mode="multiple"
                        selected={previewDates}
                        className="rounded-xl border p-3"
                        modifiers={modifiers}
                        modifiersStyles={modifiersStyles}
                        numberOfMonths={2}
                      />
                      <div className="flex-1">
                        <h4 className="font-medium text-sm mb-3">
                          Upcoming Sessions
                        </h4>
                        <div className="space-y-2 max-h-[300px] overflow-auto pr-2">
                          {previewDates.slice(0, 20).map((date, i) => (
                            <div
                              key={i}
                              className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
                            >
                              <div className="h-10 w-10 rounded-lg bg-primary flex flex-col items-center justify-center text-primary-foreground">
                                <span className="text-sm font-bold leading-none">
                                  {format(date, "d")}
                                </span>
                                <span className="text-[9px] uppercase">
                                  {format(date, "MMM")}
                                </span>
                              </div>
                              <div>
                                <p className="text-sm font-medium">
                                  {format(date, "EEEE")}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {startTime && endTime
                                    ? `${startTime} - ${endTime}`
                                    : "Time not set"}
                                </p>
                              </div>
                            </div>
                          ))}
                          {previewDates.length > 20 && (
                            <p className="text-xs text-muted-foreground text-center py-2">
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
            <div className="flex gap-3 mt-6">
              <Button
                type="button"
                variant="outline"
                className="flex-1 h-12 rounded-xl"
                onClick={() => router.push("/events")}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 h-12 rounded-xl"
                disabled={loading || !title || !startTime || !endTime}
              >
                {loading ? "Creating..." : "Create Event"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
