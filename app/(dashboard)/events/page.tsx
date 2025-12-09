"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PageHeader } from "@/components/page-header";
import {
  IconPlus,
  IconClock,
  IconUsers,
  IconX,
  IconRepeat,
  IconCheck,
  IconHistory,
} from "@tabler/icons-react";

interface EventOccurrence {
  id: string;
  date: string;
  status: string;
}

interface Event {
  id: string;
  title: string;
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

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [gymMembers, setGymMembers] = useState<GymMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [selectedOccurrence, setSelectedOccurrence] = useState<EventOccurrence | null>(null);
  const [occurrenceRsvps, setOccurrenceRsvps] = useState<RSVPUser[]>([]);
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [showPastEvents, setShowPastEvents] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create event form
  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [recurrence, setRecurrence] = useState<"daily" | "weekly" | "monthly">("weekly");
  const [dayOfWeek, setDayOfWeek] = useState("");
  const [createLoading, setCreateLoading] = useState(false);

  useEffect(() => {
    loadEvents();
    loadGymMembers();
  }, []);

  async function loadEvents() {
    try {
      setLoading(true);
      const response = await fetch("/api/events");
      if (!response.ok) throw new Error("Failed to load events");
      const data = await response.json();
      setEvents(data.events || []);
      if (data.events?.length > 0 && !selectedEvent) {
        setSelectedEvent(data.events[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load events");
    } finally {
      setLoading(false);
    }
  }

  async function loadGymMembers() {
    try {
      const response = await fetch("/api/roster");
      if (!response.ok) return;
      const data = await response.json();
      setGymMembers((data.roster || []).filter((m: GymMember) => m.role === "athlete"));
    } catch (err) {
      console.error(err);
    }
  }

  async function loadOccurrenceRsvps(occurrenceId: string) {
    try {
      setRsvpLoading(true);
      const response = await fetch(`/api/rsvp?occurrenceId=${occurrenceId}`);
      if (!response.ok) throw new Error("Failed to load RSVPs");
      const data = await response.json();
      setOccurrenceRsvps(
        (data.rsvps || []).map((r: any) => ({
          id: r.user.id,
          name: r.user.name,
          email: r.user.email,
          avatarUrl: r.user.avatarUrl,
          status: r.status,
        }))
      );
    } catch (err) {
      console.error(err);
    } finally {
      setRsvpLoading(false);
    }
  }

  async function handleCreateEvent(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCreateLoading(true);

    try {
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
        body: JSON.stringify({ title, startTime, endTime, recurrenceRule }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to create event");

      setTitle("");
      setStartTime("");
      setEndTime("");
      setCreateDialogOpen(false);
      await loadEvents();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleCancelOccurrence(occurrenceId: string) {
    try {
      const occurrence = selectedEvent?.occurrences.find((o) => o.id === occurrenceId);
      if (!occurrence) return;

      const response = await fetch(`/api/events/${selectedEvent?.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ occurrenceId, date: occurrence.date }),
      });

      if (!response.ok) throw new Error("Failed to cancel occurrence");
      await loadEvents();
      setSelectedOccurrence(null);
    } catch (err) {
      console.error(err);
    }
  }

  function selectEvent(event: Event) {
    setSelectedEvent(event);
    setSelectedOccurrence(null);
    setOccurrenceRsvps([]);
  }

  function selectOccurrence(occurrence: EventOccurrence) {
    setSelectedOccurrence(occurrence);
    loadOccurrenceRsvps(occurrence.id);
  }

  function formatDate(dateValue: string | Date | undefined | null) {
    if (!dateValue) return { day: "", month: "", weekday: "" };
    const date = typeof dateValue === "string" ? new Date(dateValue) : dateValue;
    if (isNaN(date.getTime())) return { day: "", month: "", weekday: "" };
    return {
      day: date.getDate().toString(),
      month: date.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
      weekday: date.toLocaleDateString("en-US", { weekday: "short" }),
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

  function getRecurrenceLabel(rule: string | null) {
    if (!rule) return "One-time";
    if (rule.includes("DAILY")) return "Daily";
    if (rule.includes("WEEKLY")) return "Weekly";
    if (rule.includes("MONTHLY")) return "Monthly";
    return "Recurring";
  }

  function getInitials(name: string | null, email: string) {
    if (name) return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
    return email[0].toUpperCase();
  }

  function isPastDate(dateStr: string) {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  }

  const futureOccurrences = selectedEvent?.occurrences.filter((o) => !isPastDate(o.date)) || [];
  const pastOccurrences = selectedEvent?.occurrences.filter((o) => isPastDate(o.date)) || [];
  const displayedOccurrences = showPastEvents ? [...futureOccurrences, ...pastOccurrences] : futureOccurrences;

  const goingUsers = occurrenceRsvps.filter((r) => r.status === "going");
  const notGoingUsers = occurrenceRsvps.filter((r) => r.status === "not_going");
  const respondedIds = new Set(occurrenceRsvps.map((r) => r.id));
  const notAnsweredUsers = gymMembers.filter((m) => !respondedIds.has(m.id));

  if (loading) {
    return (
      <div className="flex flex-1 flex-col">
        <PageHeader title="Events" />
        <div className="flex flex-1 items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col h-[calc(100vh-var(--header-height))]">
      <PageHeader title="Events" description="Manage training sessions">
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2 rounded-xl">
              <IconPlus className="h-4 w-4" />
              New Event
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle>Create Event</DialogTitle>
              <DialogDescription>Set up a recurring training session</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateEvent} className="space-y-4 pt-4">
              {error && (
                <div className="bg-destructive/10 text-destructive rounded-xl p-3 text-sm">{error}</div>
              )}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Event Name</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Morning Practice" className="h-11 rounded-xl" required />
              </div>
              <div className="grid gap-4 grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Start</Label>
                  <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="h-11 rounded-xl" required />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">End</Label>
                  <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="h-11 rounded-xl" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Frequency</Label>
                <Select value={recurrence} onValueChange={(v) => setRecurrence(v as any)}>
                  <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="daily">Every Day</SelectItem>
                    <SelectItem value="weekly">Every Week</SelectItem>
                    <SelectItem value="monthly">Every Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {recurrence === "weekly" && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Day</Label>
                  <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
                    <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Select day" /></SelectTrigger>
                    <SelectContent className="rounded-xl">
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
              <Button type="submit" className="w-full h-11 rounded-xl" disabled={createLoading || !title || !startTime || !endTime}>
                {createLoading ? "Creating..." : "Create Event"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="flex flex-1 overflow-hidden">
        {/* Events Sidebar */}
        <div className="w-64 border-r flex flex-col bg-muted/30">
          <ScrollArea className="flex-1">
            <div className="p-2">
              {events.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No events yet
                </div>
              ) : (
                events.map((event) => {
                  const nextOcc = event.occurrences.find((o) => !isPastDate(o.date));
                  const nextDate = nextOcc ? formatDate(nextOcc.date) : null;
                  return (
                    <button
                      key={event.id}
                      onClick={() => selectEvent(event)}
                      className={`w-full text-left p-3 rounded-xl mb-1 transition-all ${
                        selectedEvent?.id === event.id
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted"
                      }`}
                    >
                      <p className="font-medium truncate text-sm">{event.title}</p>
                      <div className={`flex items-center gap-2 mt-1.5 text-xs ${
                        selectedEvent?.id === event.id ? "text-primary-foreground/70" : "text-muted-foreground"
                      }`}>
                        <IconClock className="h-3 w-3" />
                        {formatTime(event.startTime)}
                        <span className="opacity-50">•</span>
                        <IconRepeat className="h-3 w-3" />
                        {getRecurrenceLabel(event.recurrenceRule)}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Occurrences List */}
        <div className="w-72 border-r flex flex-col">
          {selectedEvent ? (
            <>
              <div className="p-4 border-b">
                <h3 className="font-semibold text-sm">{selectedEvent.title}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatTime(selectedEvent.startTime)} - {formatTime(selectedEvent.endTime)}
                </p>
              </div>
              <ScrollArea className="flex-1">
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
                          onClick={() => selectOccurrence(occ)}
                          className={`w-full text-left p-3 rounded-xl mb-1 transition-all flex items-center gap-3 ${
                            selectedOccurrence?.id === occ.id
                              ? "bg-primary/10 ring-1 ring-primary"
                              : "hover:bg-muted"
                          } ${isPast ? "opacity-50" : ""} ${occ.status === "canceled" ? "opacity-40" : ""}`}
                        >
                          {/* Big Date Display */}
                          <div className={`h-14 w-14 rounded-xl flex flex-col items-center justify-center flex-shrink-0 ${
                            selectedOccurrence?.id === occ.id 
                              ? "bg-primary text-primary-foreground" 
                              : "bg-muted"
                          }`}>
                            <span className="text-xl font-bold leading-none">{dateInfo.day}</span>
                            <span className="text-[10px] font-medium opacity-70 mt-0.5">{dateInfo.month}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{dateInfo.weekday}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatTime(selectedEvent.startTime)}
                            </p>
                          </div>
                          {occ.status === "canceled" && (
                            <Badge variant="destructive" className="text-[10px]">Canceled</Badge>
                          )}
                        </button>
                      );
                    })
                  )}
                  {pastOccurrences.length > 0 && (
                    <button
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
        <div className="flex-1 flex flex-col">
          {selectedOccurrence ? (
            <>
              <div className="p-4 border-b flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{selectedEvent?.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(selectedOccurrence.date).weekday}, {formatDate(selectedOccurrence.date).month} {formatDate(selectedOccurrence.date).day} • {formatTime(selectedEvent?.startTime)}
                  </p>
                </div>
                {selectedOccurrence.status !== "canceled" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCancelOccurrence(selectedOccurrence.id)}
                    className="text-destructive hover:text-destructive rounded-xl"
                  >
                    <IconX className="h-4 w-4 mr-1" />
                    Cancel
                  </Button>
                )}
              </div>
              <div className="flex-1 overflow-hidden">
                {rsvpLoading ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    Loading...
                  </div>
                ) : (
                  <Tabs defaultValue="all" className="h-full flex flex-col">
                    <div className="px-4 pt-4">
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
                    <TabsContent value="all" className="flex-1 overflow-auto mt-0 p-4">
                      <UserList users={gymMembers.map((m) => ({
                        ...m,
                        status: occurrenceRsvps.find((r) => r.id === m.id)?.status || null,
                      }))} getInitials={getInitials} />
                    </TabsContent>
                    <TabsContent value="going" className="flex-1 overflow-auto mt-0 p-4">
                      <UserList users={goingUsers.map((u) => ({ ...u, status: "going" }))} getInitials={getInitials} />
                    </TabsContent>
                    <TabsContent value="not_going" className="flex-1 overflow-auto mt-0 p-4">
                      <UserList users={notGoingUsers.map((u) => ({ ...u, status: "not_going" }))} getInitials={getInitials} />
                    </TabsContent>
                    <TabsContent value="pending" className="flex-1 overflow-auto mt-0 p-4">
                      <UserList users={notAnsweredUsers.map((u) => ({ ...u, status: null }))} getInitials={getInitials} />
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
      </div>
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
}

function UserList({ users, getInitials }: UserListProps) {
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
          className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors"
        >
          <Avatar className="h-10 w-10 rounded-xl">
            <AvatarImage src={user.avatarUrl || undefined} />
            <AvatarFallback className="rounded-xl text-xs bg-gradient-to-br from-primary/20 to-primary/5">
              {getInitials(user.name, user.email)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{user.name || "Unnamed"}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
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
            <div className="flex items-center gap-1 text-muted-foreground bg-muted px-2.5 py-1 rounded-full text-xs font-medium">
              Pending
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
