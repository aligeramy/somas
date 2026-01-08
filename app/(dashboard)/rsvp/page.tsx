"use client";

import {
  IconCalendar,
  IconChartBar,
  IconCheck,
  IconClock,
  IconUser,
  IconX,
} from "@tabler/icons-react";
import {
  eachMonthOfInterval,
  endOfMonth,
  format,
  startOfMonth,
  subMonths,
} from "date-fns";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "@/components/page-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
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
    role?: string;
  };
}

interface UserInfo {
  id: string;
  role: string;
}

interface RosterMember {
  id: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
  role: string;
}

interface OccurrenceSummary {
  goingCount: number;
  coaches: Array<{ id: string; name: string | null; avatarUrl: string | null }>;
}

export default function RSVPPage() {
  const router = useRouter();
  const [events, setEvents] = useState<EventOccurrence[]>([]);
  const [rsvps, setRsvps] = useState<RSVP[]>([]);
  const [historicalRsvps, setHistoricalRsvps] = useState<RSVP[]>([]);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [roster, setRoster] = useState<RosterMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<"month" | "year">("month");
  const [occurrenceSummaries, setOccurrenceSummaries] = useState<
    Record<string, OccurrenceSummary>
  >({});

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [eventsRes, rsvpsRes, userRes] = await Promise.all([
        fetch("/api/events"),
        fetch("/api/rsvp"),
        fetch("/api/user-info"),
      ]);

      if (!(eventsRes.ok && rsvpsRes.ok)) {
        throw new Error("Failed to load data");
      }

      const eventsData = await eventsRes.json();
      const rsvpsData = await rsvpsRes.json();

      if (userRes.ok) {
        const userData = await userRes.json();
        setUserInfo(userData);
      }

      const allOccurrences: EventOccurrence[] = [];
      eventsData.events.forEach(
        (event: {
          id: string;
          title: string;
          startTime: string;
          endTime: string;
          occurrences: Array<{ id: string; date: string; status: string }>;
        }) => {
          event.occurrences.forEach(
            (occ: { id: string; date: string; status: string }) => {
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
            }
          );
        }
      );

      allOccurrences.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      setEvents(allOccurrences);
      setRsvps(rsvpsData.rsvps || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadHistoricalData = useCallback(async () => {
    try {
      // For coaches, allow filtering by userId. For athletes, always load their own data.
      const userIdParam = selectedUserId ? `&userId=${selectedUserId}` : "";
      const response = await fetch(`/api/rsvp?includePast=true${userIdParam}`);
      if (response.ok) {
        const data = await response.json();
        setHistoricalRsvps(data.rsvps || []);
      }
    } catch (err) {
      console.error("Failed to load historical data:", err);
    }
  }, [selectedUserId]);

  const loadRoster = useCallback(async () => {
    try {
      const response = await fetch("/api/roster");
      if (response.ok) {
        const data = await response.json();
        // Filter to only athletes
        const athletes = (data.roster || []).filter(
          (member: RosterMember) => member.role === "athlete"
        );
        setRoster(athletes);
      }
    } catch (err) {
      console.error("Failed to load roster:", err);
    }
  }, []);

  const loadOccurrenceSummaries = useCallback(
    async (occurrenceIds: string[]) => {
      if (occurrenceIds.length === 0) {
        return;
      }
      try {
        const response = await fetch(
          `/api/rsvp?summaryOccurrences=${occurrenceIds.join(",")}`
        );
        if (response.ok) {
          const data = await response.json();
          setOccurrenceSummaries(data.summary || {});
        }
      } catch (err) {
        console.error("Failed to load occurrence summaries:", err);
      }
    },
    []
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const isOwnerOrCoachLocal =
      userInfo?.role === "owner" || userInfo?.role === "coach";
    if (isOwnerOrCoachLocal) {
      loadRoster();
    }
  }, [userInfo, loadRoster]);

  useEffect(() => {
    loadHistoricalData();
  }, [loadHistoricalData]);

  // Load occurrence summaries for athletes
  useEffect(() => {
    if (userInfo?.role === "athlete" && events.length > 0) {
      const occurrenceIds = events.map((e) => e.id);
      loadOccurrenceSummaries(occurrenceIds);
    }
  }, [userInfo, events, loadOccurrenceSummaries]);

  async function handleRSVP(
    occurrenceId: string,
    status: "going" | "not_going"
  ) {
    try {
      setUpdatingId(occurrenceId);
      const response = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ occurrenceId, status }),
      });
      if (!response.ok) {
        throw new Error("Failed to RSVP");
      }
      await loadData();
      await loadHistoricalData();
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
    if (!dateValue) {
      return { day: "", month: "", weekday: "", relative: "" };
    }
    const date =
      typeof dateValue === "string" ? new Date(dateValue) : dateValue;
    if (Number.isNaN(date.getTime())) {
      return { day: "", month: "", weekday: "", relative: "" };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let relative = "";
    if (date.toDateString() === today.toDateString()) {
      relative = "Today";
    } else if (date.toDateString() === tomorrow.toDateString()) {
      relative = "Tomorrow";
    }

    return {
      day: date.getDate().toString(),
      month: date.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
      weekday: date.toLocaleDateString("en-US", { weekday: "long" }),
      relative,
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

  // Calculate attendance statistics
  const attendanceStats = useMemo(() => {
    const relevantRsvps = selectedUserId
      ? historicalRsvps.filter((r) => r.user?.id === selectedUserId)
      : historicalRsvps;

    const going = relevantRsvps.filter((r) => r.status === "going");
    const notGoing = relevantRsvps.filter((r) => r.status === "not_going");
    const total = going.length + notGoing.length;
    const attendanceRate = total > 0 ? (going.length / total) * 100 : 0;

    return {
      total,
      going: going.length,
      notGoing: notGoing.length,
      attendanceRate: Math.round(attendanceRate),
    };
  }, [historicalRsvps, selectedUserId]);

  // Prepare chart data
  const chartData = useMemo(() => {
    const relevantRsvps = selectedUserId
      ? historicalRsvps.filter((r) => r.user?.id === selectedUserId)
      : historicalRsvps;

    if (timeRange === "month") {
      // Group by month for last 6 months
      const months = eachMonthOfInterval({
        start: subMonths(new Date(), 5),
        end: new Date(),
      });

      return months.map((month) => {
        const monthStart = startOfMonth(month);
        const monthEnd = endOfMonth(month);
        const monthRsvps = relevantRsvps.filter((r) => {
          if (!r.occurrence?.date) {
            return false;
          }
          const occDate = new Date(r.occurrence.date);
          return occDate >= monthStart && occDate <= monthEnd;
        });

        const going = monthRsvps.filter((r) => r.status === "going").length;
        const notGoing = monthRsvps.filter(
          (r) => r.status === "not_going"
        ).length;

        return {
          month: format(month, "MMM yyyy"),
          going,
          notGoing,
          total: going + notGoing,
        };
      });
    }
    // Group by year
    const years = new Set<number>();
    relevantRsvps.forEach((r) => {
      if (r.occurrence?.date) {
        years.add(new Date(r.occurrence.date).getFullYear());
      }
    });

    return Array.from(years)
      .sort()
      .map((year) => {
        const yearRsvps = relevantRsvps.filter((r) => {
          if (!r.occurrence?.date) {
            return false;
          }
          return new Date(r.occurrence.date).getFullYear() === year;
        });

        const going = yearRsvps.filter((r) => r.status === "going").length;
        const notGoing = yearRsvps.filter(
          (r) => r.status === "not_going"
        ).length;

        return {
          month: year.toString(),
          going,
          notGoing,
          total: going + notGoing,
        };
      });
  }, [historicalRsvps, selectedUserId, timeRange]);

  // Group attendance by person for per-person view (always compute, but only use if coach)
  const attendanceByPerson = useMemo(() => {
    const grouped: Record<
      string,
      {
        user: RosterMember;
        going: number;
        notGoing: number;
        total: number;
        rate: number;
      }
    > = {};

    historicalRsvps.forEach((rsvp) => {
      if (!rsvp.user) {
        return;
      }
      const userId = rsvp.user.id;
      if (!grouped[userId]) {
        grouped[userId] = {
          user: rsvp.user as RosterMember,
          going: 0,
          notGoing: 0,
          total: 0,
          rate: 0,
        };
      }
      if (rsvp.status === "going") {
        grouped[userId].going++;
      } else {
        grouped[userId].notGoing++;
      }
      grouped[userId].total++;
      grouped[userId].rate = Math.round(
        (grouped[userId].going / grouped[userId].total) * 100
      );
    });

    return Object.values(grouped).sort((a, b) => b.rate - a.rate);
  }, [historicalRsvps]);

  // Compute this after all hooks but before conditional returns
  const isOwnerOrCoach =
    userInfo?.role === "owner" || userInfo?.role === "coach";

  const chartConfig = {
    going: {
      label: "Attended",
      color: "hsl(217, 91%, 60%)",
    },
    notGoing: {
      label: "Missed",
      color: "hsl(0, 84%, 60%)",
    },
  };

  if (loading) {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
        <PageHeader title={isOwnerOrCoach ? "Attendance" : "My Schedule"} />
        <ScrollArea className="h-0 flex-1">
          <div className="space-y-2 p-4">
            {[1, 2, 3, 4].map((i) => (
              <div className="space-y-3 rounded-xl border bg-card p-4" key={i}>
                <div className="flex items-center gap-3">
                  <Skeleton className="h-16 w-16 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-24 rounded-lg" />
                  <Skeleton className="h-8 w-24 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col">
        <PageHeader title="Attendance" />
        <div>
          <div className="rounded-xl bg-destructive/10 p-4 text-destructive">
            {error}
          </div>
        </div>
      </div>
    );
  }

  // Head Coach/Coach View
  if (isOwnerOrCoach) {
    const rsvpsByOccurrence = rsvps.reduce(
      (acc, rsvp) => {
        if (!rsvp.occurrence) {
          return acc;
        }
        const occId = rsvp.occurrence.id;
        if (!acc[occId]) {
          acc[occId] = { occurrence: rsvp.occurrence, rsvps: [] };
        }
        if (rsvp.user) {
          acc[occId].rsvps.push(rsvp);
        }
        return acc;
      },
      {} as Record<string, { occurrence: EventOccurrence; rsvps: RSVP[] }>
    );

    return (
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
        <PageHeader
          description="Track attendance across your gym"
          title="Attendance"
        />
        <Tabs className="flex min-h-0 flex-1 flex-col" defaultValue="upcoming">
          <div className="shrink-0 border-b px-4 py-3">
            <TabsList className="grid h-10 w-full grid-cols-3 rounded-xl">
              <TabsTrigger className="rounded-lg text-xs" value="upcoming">
                <IconCalendar className="mr-1.5 h-4 w-4" />
                Upcoming
              </TabsTrigger>
              <TabsTrigger className="rounded-lg text-xs" value="per-person">
                <IconUser className="mr-1.5 h-4 w-4" />
                Per Person
              </TabsTrigger>
              <TabsTrigger className="rounded-lg text-xs" value="overview">
                <IconChartBar className="mr-1.5 h-4 w-4" />
                Overview
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent
            className="mt-0 min-h-0 flex-1 overflow-auto"
            value="upcoming"
          >
            <ScrollArea className="h-full">
              <div className="space-y-2 p-4">
                {events.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    <p>No upcoming events</p>
                  </div>
                ) : (
                  events.map((occ) => {
                    const occRsvps = rsvpsByOccurrence[occ.id]?.rsvps || [];
                    const going = occRsvps.filter((r) => r.status === "going");
                    const notGoing = occRsvps.filter(
                      (r) => r.status === "not_going"
                    );
                    // Filter coaches from going RSVPs
                    const goingCoaches = going.filter(
                      (r) =>
                        r.user?.role === "coach" || r.user?.role === "owner"
                    );
                    // Count athletes going
                    const goingAthletes = going.filter(
                      (r) => r.user?.role === "athlete"
                    );
                    const isCanceled = occ.status === "canceled";
                    const dateInfo = formatDate(occ.date);

                    return (
                      <Link
                        className={`flex items-center gap-3 rounded-xl border p-3 transition-colors md:p-4 ${
                          isCanceled
                            ? "cursor-default opacity-50"
                            : "cursor-pointer hover:bg-muted/30"
                        }`}
                        href={
                          isCanceled
                            ? "#"
                            : `/events?eventId=${occ.event.id}&occurrenceId=${occ.id}`
                        }
                        key={occ.id}
                      >
                        <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-muted md:h-16 md:w-16 md:rounded-xl">
                          <span className="font-bold text-lg leading-none md:text-2xl">
                            {dateInfo.day}
                          </span>
                          <span className="mt-0.5 font-medium text-[9px] text-muted-foreground md:text-[10px]">
                            {dateInfo.month}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate font-medium text-sm md:text-base">
                              {occ.event.title}
                            </p>
                            {dateInfo.relative && (
                              <Badge
                                className="shrink-0 rounded-md text-[9px] md:text-[10px]"
                                variant="secondary"
                              >
                                {dateInfo.relative}
                              </Badge>
                            )}
                            {isCanceled && (
                              <Badge
                                className="shrink-0 rounded-md text-[9px] md:text-[10px]"
                                variant="destructive"
                              >
                                Canceled
                              </Badge>
                            )}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-muted-foreground text-xs md:gap-3 md:text-sm">
                            <span className="whitespace-nowrap">
                              {dateInfo.weekday}
                            </span>
                            <span className="flex items-center gap-1">
                              <IconClock className="h-3 w-3" />
                              {formatTime(occ.event.startTime)}
                            </span>
                          </div>
                          {/* Coaches and athletes */}
                          {(goingCoaches.length > 0 ||
                            goingAthletes.length > 0) && (
                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                              {goingCoaches.slice(0, 2).map((r) => (
                                <Badge
                                  className="flex shrink-0 items-center gap-1 rounded-md text-[9px] md:text-[10px]"
                                  key={r.id}
                                  variant="secondary"
                                >
                                  <IconCheck className="h-3 w-3" />
                                  <span className="hidden sm:inline">
                                    {r.user?.name || r.user?.email}
                                  </span>
                                  <span className="sm:hidden">
                                    {r.user?.name?.split(" ")[0] ||
                                      r.user?.email?.split("@")[0]}
                                  </span>
                                </Badge>
                              ))}
                              {goingCoaches.length > 2 && (
                                <Badge
                                  className="shrink-0 rounded-md text-[9px] md:text-[10px]"
                                  variant="secondary"
                                >
                                  +{goingCoaches.length - 2}
                                </Badge>
                              )}
                              {goingCoaches.length > 0 &&
                                goingAthletes.length > 0 && (
                                  <span className="hidden text-muted-foreground sm:inline">
                                    •
                                  </span>
                                )}
                              {goingAthletes.length > 0 && (
                                <span className="font-medium text-emerald-600 text-xs md:text-sm">
                                  {goingAthletes.length} Going
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        {notGoing.length > 0 && (
                          <div className="flex shrink-0 items-center gap-1 text-muted-foreground text-xs md:text-sm">
                            <IconX className="h-3 w-3 md:h-4 md:w-4" />
                            <span className="hidden sm:inline">
                              {notGoing.length}
                            </span>
                          </div>
                        )}
                      </Link>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent
            className="mt-0 min-h-0 flex-1 overflow-auto"
            value="per-person"
          >
            <ScrollArea className="h-full">
              <div className="space-y-4 px-4">
                <div className="flex items-center gap-3 pt-4">
                  <Select
                    onValueChange={(value) =>
                      setSelectedUserId(value === "all" ? null : value)
                    }
                    value={selectedUserId || "all"}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select person" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Athletes</SelectItem>
                      {roster.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name || member.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedUserId && (
                  <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardDescription>Total Sessions</CardDescription>
                        <CardTitle className="text-3xl">
                          {attendanceStats.total}
                        </CardTitle>
                      </CardHeader>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardDescription>Attended</CardDescription>
                        <CardTitle className="text-3xl text-emerald-600">
                          {attendanceStats.going}
                        </CardTitle>
                      </CardHeader>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardDescription>Attendance Rate</CardDescription>
                        <CardTitle className="text-3xl">
                          {attendanceStats.attendanceRate}%
                        </CardTitle>
                      </CardHeader>
                    </Card>
                  </div>
                )}

                {selectedUserId ? (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>Attendance History</CardTitle>
                          <CardDescription>
                            {roster.find((r) => r.id === selectedUserId)
                              ?.name || "Athlete"}
                            's attendance over time
                          </CardDescription>
                        </div>
                        <Select
                          onValueChange={(value: "month" | "year") =>
                            setTimeRange(value)
                          }
                          value={timeRange}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="month">By Month</SelectItem>
                            <SelectItem value="year">By Year</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer config={chartConfig}>
                        <BarChart data={chartData}>
                          <CartesianGrid vertical={false} />
                          <XAxis
                            axisLine={false}
                            dataKey="month"
                            tickLine={false}
                            tickMargin={8}
                          />
                          <YAxis axisLine={false} tickLine={false} />
                          <ChartTooltip
                            content={<ChartTooltipContent />}
                            cursor={false}
                          />
                          <Bar dataKey="going" fill="var(--color-going)" />
                          <Bar
                            dataKey="notGoing"
                            fill="var(--color-notGoing)"
                          />
                        </BarChart>
                      </ChartContainer>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="p-0">
                      {attendanceByPerson.length === 0 ? (
                        <div className="py-12 text-center text-muted-foreground">
                          <p>No attendance data available</p>
                        </div>
                      ) : (
                        <div className="divide-y">
                          {attendanceByPerson.map((item) => (
                            <div
                              className="flex cursor-pointer items-center gap-4 p-3 transition-colors hover:bg-muted/30 md:p-4"
                              key={item.user.id}
                              onClick={() =>
                                router.push(`/rsvp/${item.user.id}`)
                              }
                            >
                              <Avatar className="h-8 w-8 shrink-0 md:h-10 md:w-10">
                                <AvatarImage
                                  src={item.user.avatarUrl || undefined}
                                />
                                <AvatarFallback>
                                  {getInitials(item.user.name, item.user.email)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-medium text-sm md:text-base">
                                  {item.user.name || item.user.email}
                                </p>
                              </div>
                              <div className="shrink-0 text-right text-muted-foreground text-xs md:text-sm">
                                <span className="font-medium text-emerald-600">
                                  {item.going}
                                </span>
                                <span className="mx-1">/</span>
                                <span>{item.total}</span>
                              </div>
                              <div className="w-16 shrink-0 text-right md:w-20">
                                <p className="font-semibold text-sm md:text-base">
                                  {item.rate}%
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent
            className="mt-0 min-h-0 flex-1 overflow-auto"
            value="overview"
          >
            <ScrollArea className="h-full">
              <div className="space-y-4 p-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Total Sessions</CardDescription>
                      <CardTitle className="text-3xl">
                        {attendanceStats.total}
                      </CardTitle>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Total Attendance</CardDescription>
                      <CardTitle className="text-3xl text-emerald-600">
                        {attendanceStats.going}
                      </CardTitle>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Overall Rate</CardDescription>
                      <CardTitle className="text-3xl">
                        {attendanceStats.attendanceRate}%
                      </CardTitle>
                    </CardHeader>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Group Attendance Overview</CardTitle>
                        <CardDescription>
                          Overall attendance trends for all athletes
                        </CardDescription>
                      </div>
                      <Select
                        onValueChange={(value: "month" | "year") =>
                          setTimeRange(value)
                        }
                        value={timeRange}
                      >
                        <SelectTrigger className="w-[120px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="month">By Month</SelectItem>
                          <SelectItem value="year">By Year</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer
                      className="aspect-[4/1]"
                      config={chartConfig}
                    >
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient
                            id="fillGoing"
                            x1="0"
                            x2="0"
                            y1="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="var(--color-going)"
                              stopOpacity={0.8}
                            />
                            <stop
                              offset="95%"
                              stopColor="var(--color-going)"
                              stopOpacity={0.1}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid vertical={false} />
                        <XAxis
                          axisLine={false}
                          dataKey="month"
                          tickLine={false}
                          tickMargin={8}
                        />
                        <YAxis axisLine={false} tickLine={false} />
                        <ChartTooltip
                          content={<ChartTooltipContent />}
                          cursor={false}
                        />
                        <Area
                          dataKey="going"
                          fill="url(#fillGoing)"
                          stroke="var(--color-going)"
                          type="natural"
                        />
                      </AreaChart>
                    </ChartContainer>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // Athlete View
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <PageHeader description="RSVP to upcoming sessions" title="My Schedule" />
      <Tabs className="flex min-h-0 flex-1 flex-col" defaultValue="upcoming">
        <div className="shrink-0 border-b px-4 py-3">
          <TabsList className="grid h-10 w-full grid-cols-3 rounded-xl">
            <TabsTrigger className="rounded-lg text-xs" value="upcoming">
              <IconCalendar className="mr-1.5 h-4 w-4" />
              Upcoming
            </TabsTrigger>
            <TabsTrigger className="rounded-lg text-xs" value="history">
              <IconClock className="mr-1.5 h-4 w-4" />
              History
            </TabsTrigger>
            <TabsTrigger className="rounded-lg text-xs" value="summary">
              <IconChartBar className="mr-1.5 h-4 w-4" />
              Summary
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent
          className="mt-0 min-h-0 flex-1 overflow-auto"
          value="upcoming"
        >
          <ScrollArea className="h-full">
            <div className="space-y-2 p-4">
              {events.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
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
                      className={`flex items-center gap-3 rounded-xl border p-3 transition-colors md:p-4 ${
                        isCanceled ? "opacity-50" : "hover:bg-muted/30"
                      }`}
                      key={occ.id}
                    >
                      <Link
                        className="flex min-w-0 flex-1 items-center gap-3"
                        href={
                          isCanceled
                            ? "#"
                            : `/events?eventId=${occ.event.id}&occurrenceId=${occ.id}`
                        }
                        onClick={(e) => {
                          // Prevent navigation if clicking on buttons or badges
                          const target = e.target as HTMLElement;
                          if (
                            target.closest("button") ||
                            target.closest('[role="button"]')
                          ) {
                            e.preventDefault();
                          }
                        }}
                      >
                        <div
                          className={`flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg md:h-16 md:w-16 md:rounded-xl ${
                            rsvpStatus === "going"
                              ? "bg-emerald-100 dark:bg-emerald-950/50"
                              : rsvpStatus === "not_going"
                                ? "bg-red-100 dark:bg-red-950/50"
                                : "bg-muted"
                          }`}
                        >
                          <span
                            className={`font-bold text-lg leading-none md:text-2xl ${
                              rsvpStatus === "going"
                                ? "text-emerald-600 dark:text-emerald-400"
                                : rsvpStatus === "not_going"
                                  ? "text-red-600 dark:text-red-400"
                                  : ""
                            }`}
                          >
                            {dateInfo.day}
                          </span>
                          <span className="mt-0.5 font-medium text-[9px] text-muted-foreground md:text-[10px]">
                            {dateInfo.month}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate font-medium text-sm md:text-base">
                              {occ.event.title}
                            </p>
                            {dateInfo.relative && (
                              <Badge
                                className="shrink-0 rounded-md text-[9px] md:text-[10px]"
                                variant="secondary"
                              >
                                {dateInfo.relative}
                              </Badge>
                            )}
                            {isCanceled && (
                              <Badge
                                className="shrink-0 rounded-md text-[9px] md:text-[10px]"
                                variant="destructive"
                              >
                                Canceled
                              </Badge>
                            )}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-muted-foreground text-xs md:gap-3 md:text-sm">
                            <span className="whitespace-nowrap">
                              {dateInfo.weekday}
                            </span>
                            <span className="flex items-center gap-1">
                              <IconClock className="h-3 w-3" />
                              {formatTime(occ.event.startTime)}
                              <span className="hidden sm:inline">
                                {" "}
                                - {formatTime(occ.event.endTime)}
                              </span>
                            </span>
                          </div>
                          {/* Attendance summary - count and coach badges */}
                          {occurrenceSummaries[occ.id] && (
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <span className="font-medium text-[10px] text-emerald-600 md:text-xs">
                                {occurrenceSummaries[occ.id].goingCount} going
                              </span>
                              {occurrenceSummaries[occ.id].coaches.length >
                                0 && (
                                <>
                                  <span className="hidden text-[10px] text-muted-foreground sm:inline md:text-xs">
                                    •
                                  </span>
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    {occurrenceSummaries[occ.id].coaches
                                      .slice(0, 2)
                                      .map((coach) => (
                                        <Badge
                                          className="flex shrink-0 items-center gap-1 rounded-md text-[9px] md:text-[10px]"
                                          key={coach.id}
                                          onClick={(e) => e.stopPropagation()}
                                          variant="secondary"
                                        >
                                          <IconCheck className="h-3 w-3" />
                                          <span className="hidden sm:inline">
                                            {coach.name || "Coach"}
                                          </span>
                                          <span className="sm:hidden">
                                            {coach.name?.split(" ")[0] || "C"}
                                          </span>
                                        </Badge>
                                      ))}
                                    {occurrenceSummaries[occ.id].coaches
                                      .length > 2 && (
                                      <Badge
                                        className="shrink-0 rounded-md text-[9px] md:text-[10px]"
                                        variant="secondary"
                                      >
                                        +
                                        {occurrenceSummaries[occ.id].coaches
                                          .length - 2}
                                      </Badge>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </Link>
                      {!isCanceled && (
                        <div className="flex shrink-0 items-center gap-1.5 md:gap-2">
                          <Button
                            className={`h-8 rounded-xl px-2 text-xs md:h-9 md:px-3 md:text-sm ${
                              rsvpStatus === "going"
                                ? "bg-emerald-600 hover:bg-emerald-700"
                                : ""
                            }`}
                            disabled={isUpdating}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRSVP(occ.id, "going");
                            }}
                            size="sm"
                            variant={
                              rsvpStatus === "going" ? "default" : "outline"
                            }
                          >
                            <IconCheck className="h-3 w-3 md:mr-1 md:h-4 md:w-4" />
                            <span className="hidden sm:inline">Going</span>
                          </Button>
                          <Button
                            className={`h-8 rounded-xl px-2 text-xs md:h-9 md:px-3 md:text-sm ${
                              rsvpStatus === "not_going"
                                ? "bg-red-600 text-white hover:bg-red-700"
                                : ""
                            }`}
                            disabled={isUpdating}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRSVP(occ.id, "not_going");
                            }}
                            size="sm"
                            variant={
                              rsvpStatus === "not_going"
                                ? "secondary"
                                : "outline"
                            }
                          >
                            <IconX className="h-3 w-3 md:mr-1 md:h-4 md:w-4" />
                            <span className="hidden sm:inline">Can't Go</span>
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent
          className="mt-0 min-h-0 flex-1 overflow-auto"
          value="history"
        >
          <ScrollArea className="h-full">
            <div className="space-y-2 p-4">
              {historicalRsvps.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <p>No past attendance records</p>
                </div>
              ) : (
                historicalRsvps
                  .filter((r) => {
                    if (!r.occurrence?.date) {
                      return false;
                    }
                    return new Date(r.occurrence.date) < new Date();
                  })
                  .map((rsvp) => {
                    if (!rsvp.occurrence) {
                      return null;
                    }
                    const occ = rsvp.occurrence;
                    const dateInfo = formatDate(occ.date);
                    const isGoing = rsvp.status === "going";

                    return (
                      <div
                        className="flex items-center gap-3 rounded-xl border p-3 transition-colors hover:bg-muted/30 md:p-4"
                        key={rsvp.id}
                      >
                        <div
                          className={`flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg md:h-16 md:w-16 md:rounded-xl ${
                            isGoing
                              ? "bg-emerald-100 dark:bg-emerald-950/50"
                              : "bg-red-100 dark:bg-red-950/50"
                          }`}
                        >
                          <span
                            className={`font-bold text-lg leading-none md:text-2xl ${
                              isGoing
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-red-600 dark:text-red-400"
                            }`}
                          >
                            {dateInfo.day}
                          </span>
                          <span className="mt-0.5 font-medium text-[9px] text-muted-foreground md:text-[10px]">
                            {dateInfo.month}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate font-medium text-sm md:text-base">
                              {occ.event.title}
                            </p>
                            <Badge
                              className={`shrink-0 rounded-md text-[9px] md:text-[10px] ${
                                isGoing
                                  ? "bg-emerald-600"
                                  : "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300"
                              }`}
                              variant={isGoing ? "default" : "secondary"}
                            >
                              {isGoing ? "Attended" : "Missed"}
                            </Badge>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-muted-foreground text-xs md:gap-3 md:text-sm">
                            <span className="whitespace-nowrap">
                              {dateInfo.weekday}
                            </span>
                            <span className="flex items-center gap-1">
                              <IconClock className="h-3 w-3" />
                              {formatTime(occ.event.startTime)}
                              <span className="hidden sm:inline">
                                {" "}
                                - {formatTime(occ.event.endTime)}
                              </span>
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                  .filter((item) => item !== null)
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent
          className="mt-0 min-h-0 flex-1 overflow-auto"
          value="summary"
        >
          <ScrollArea className="h-full">
            <div className="space-y-4 p-4">
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Total Sessions</CardDescription>
                    <CardTitle className="text-3xl">
                      {attendanceStats.total}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Attended</CardDescription>
                    <CardTitle className="text-3xl text-emerald-600">
                      {attendanceStats.going}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Attendance Rate</CardDescription>
                    <CardTitle className="text-3xl">
                      {attendanceStats.attendanceRate}%
                    </CardTitle>
                  </CardHeader>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>My Attendance History</CardTitle>
                      <CardDescription>
                        Your attendance trends over time
                      </CardDescription>
                    </div>
                    <Select
                      onValueChange={(value: "month" | "year") =>
                        setTimeRange(value)
                      }
                      value={timeRange}
                    >
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="month">By Month</SelectItem>
                        <SelectItem value="year">By Year</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig}>
                    <BarChart data={chartData}>
                      <CartesianGrid vertical={false} />
                      <XAxis
                        axisLine={false}
                        dataKey="month"
                        tickLine={false}
                        tickMargin={8}
                      />
                      <YAxis axisLine={false} tickLine={false} />
                      <ChartTooltip
                        content={<ChartTooltipContent />}
                        cursor={false}
                      />
                      <Bar dataKey="going" fill="var(--color-going)" />
                      <Bar dataKey="notGoing" fill="var(--color-notGoing)" />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
