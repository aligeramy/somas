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

      if (!eventsRes.ok || !rsvpsRes.ok) throw new Error("Failed to load data");

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
            },
          );
        },
      );

      allOccurrences.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
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
          (member: RosterMember) => member.role === "athlete",
        );
        setRoster(athletes);
      }
    } catch (err) {
      console.error("Failed to load roster:", err);
    }
  }, []);

  const loadOccurrenceSummaries = useCallback(
    async (occurrenceIds: string[]) => {
      if (occurrenceIds.length === 0) return;
      try {
        const response = await fetch(
          `/api/rsvp?summaryOccurrences=${occurrenceIds.join(",")}`,
        );
        if (response.ok) {
          const data = await response.json();
          setOccurrenceSummaries(data.summary || {});
        }
      } catch (err) {
        console.error("Failed to load occurrence summaries:", err);
      }
    },
    [],
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
    status: "going" | "not_going",
  ) {
    try {
      setUpdatingId(occurrenceId);
      const response = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ occurrenceId, status }),
      });
      if (!response.ok) throw new Error("Failed to RSVP");
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
    if (!dateValue) return { day: "", month: "", weekday: "", relative: "" };
    const date =
      typeof dateValue === "string" ? new Date(dateValue) : dateValue;
    if (Number.isNaN(date.getTime()))
      return { day: "", month: "", weekday: "", relative: "" };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let relative = "";
    if (date.toDateString() === today.toDateString()) relative = "Today";
    else if (date.toDateString() === tomorrow.toDateString())
      relative = "Tomorrow";

    return {
      day: date.getDate().toString(),
      month: date.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
      weekday: date.toLocaleDateString("en-US", { weekday: "long" }),
      relative,
    };
  }

  function formatTime(time: string | undefined | null) {
    if (!time) return "";
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours, 10);
    if (Number.isNaN(hour)) return time;
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  }

  function getInitials(name: string | null, email: string) {
    if (name)
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
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
          if (!r.occurrence?.date) return false;
          const occDate = new Date(r.occurrence.date);
          return occDate >= monthStart && occDate <= monthEnd;
        });

        const going = monthRsvps.filter((r) => r.status === "going").length;
        const notGoing = monthRsvps.filter(
          (r) => r.status === "not_going",
        ).length;

        return {
          month: format(month, "MMM yyyy"),
          going,
          notGoing,
          total: going + notGoing,
        };
      });
    } else {
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
            if (!r.occurrence?.date) return false;
            return new Date(r.occurrence.date).getFullYear() === year;
          });

          const going = yearRsvps.filter((r) => r.status === "going").length;
          const notGoing = yearRsvps.filter(
            (r) => r.status === "not_going",
          ).length;

          return {
            month: year.toString(),
            going,
            notGoing,
            total: going + notGoing,
          };
        });
    }
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
      if (!rsvp.user) return;
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
        (grouped[userId].going / grouped[userId].total) * 100,
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
      color: "hsl(var(--chart-1))",
    },
    notGoing: {
      label: "Missed",
      color: "hsl(var(--chart-2))",
    },
  };

  if (loading) {
    return (
      <div className="flex flex-1 flex-col min-h-0 h-full overflow-hidden">
        <PageHeader title={isOwnerOrCoach ? "Attendance" : "My Schedule"} />
        <ScrollArea className="flex-1 h-0">
          <div className="space-y-2 p-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-4 rounded-xl border bg-card space-y-3">
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
          <div className="bg-destructive/10 text-destructive rounded-xl p-4">
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
        if (!rsvp.occurrence) return acc;
        const occId = rsvp.occurrence.id;
        if (!acc[occId])
          acc[occId] = { occurrence: rsvp.occurrence, rsvps: [] };
        if (rsvp.user) acc[occId].rsvps.push(rsvp);
        return acc;
      },
      {} as Record<string, { occurrence: EventOccurrence; rsvps: RSVP[] }>,
    );

    return (
      <div className="flex flex-1 flex-col min-h-0 h-full overflow-hidden">
        <PageHeader
          title="Attendance"
          description="Track attendance across your gym"
        />
        <Tabs defaultValue="upcoming" className="flex-1 flex flex-col min-h-0">
          <div className="px-4 py-3 shrink-0 border-b">
            <TabsList className="w-full grid grid-cols-3 h-10 rounded-xl">
              <TabsTrigger value="upcoming" className="text-xs rounded-lg">
                <IconCalendar className="h-4 w-4 mr-1.5" />
                Upcoming
              </TabsTrigger>
              <TabsTrigger value="per-person" className="text-xs rounded-lg">
                <IconUser className="h-4 w-4 mr-1.5" />
                Per Person
              </TabsTrigger>
              <TabsTrigger value="overview" className="text-xs rounded-lg">
                <IconChartBar className="h-4 w-4 mr-1.5" />
                Overview
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent
            value="upcoming"
            className="flex-1 overflow-auto mt-0 min-h-0"
          >
            <ScrollArea className="h-full">
              <div className="space-y-2 p-4">
                {events.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <p>No upcoming events</p>
                  </div>
                ) : (
                  events.map((occ) => {
                    const occRsvps = rsvpsByOccurrence[occ.id]?.rsvps || [];
                    const going = occRsvps.filter((r) => r.status === "going");
                    const notGoing = occRsvps.filter(
                      (r) => r.status === "not_going",
                    );
                    // Filter coaches from going RSVPs
                    const goingCoaches = going.filter(
                      (r) =>
                        r.user?.role === "coach" || r.user?.role === "owner",
                    );
                    // Count athletes going
                    const goingAthletes = going.filter(
                      (r) => r.user?.role === "athlete",
                    );
                    const isCanceled = occ.status === "canceled";
                    const dateInfo = formatDate(occ.date);

                    return (
                      <Link
                        key={occ.id}
                        href={
                          isCanceled
                            ? "#"
                            : `/events?eventId=${occ.event.id}&occurrenceId=${occ.id}`
                        }
                        className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${
                          isCanceled
                            ? "opacity-50 cursor-default"
                            : "hover:bg-muted/30 cursor-pointer"
                        }`}
                      >
                        <div className="h-16 w-16 rounded-xl bg-muted flex flex-col items-center justify-center shrink-0">
                          <span className="text-2xl font-bold leading-none">
                            {dateInfo.day}
                          </span>
                          <span className="text-[10px] font-medium text-muted-foreground mt-0.5">
                            {dateInfo.month}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{occ.event.title}</p>
                            {dateInfo.relative && (
                              <Badge
                                variant="secondary"
                                className="text-[10px] rounded-md"
                              >
                                {dateInfo.relative}
                              </Badge>
                            )}
                            {isCanceled && (
                              <Badge
                                variant="destructive"
                                className="text-[10px] rounded-md"
                              >
                                Canceled
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
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
                            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                              {goingCoaches.map((r) => (
                                <Badge
                                  key={r.id}
                                  variant="secondary"
                                  className="text-[10px] rounded-md flex items-center gap-1"
                                >
                                  <IconCheck className="h-3 w-3" />
                                  {r.user?.name || r.user?.email}
                                </Badge>
                              ))}
                              {goingCoaches.length > 0 &&
                                goingAthletes.length > 0 && (
                                  <span className="text-muted-foreground">
                                    •
                                  </span>
                                )}
                              {goingAthletes.length > 0 && (
                                <span className="text-sm text-emerald-600 font-medium">
                                  {goingAthletes.length} GOING
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          {notGoing.length > 0 && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <IconX className="h-4 w-4" />
                              {notGoing.length}
                            </div>
                          )}
                        </div>
                      </Link>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent
            value="per-person"
            className="flex-1 overflow-auto mt-0 min-h-0"
          >
            <ScrollArea className="h-full">
              <div className="p-4 space-y-4">
                <div className="flex items-center gap-3">
                  <Select
                    value={selectedUserId || "all"}
                    onValueChange={(value) =>
                      setSelectedUserId(value === "all" ? null : value)
                    }
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
                          value={timeRange}
                          onValueChange={(value: "month" | "year") =>
                            setTimeRange(value)
                          }
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
                            dataKey="month"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                          />
                          <YAxis tickLine={false} axisLine={false} />
                          <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent />}
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
                  <div className="space-y-2">
                    {attendanceByPerson.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <p>No attendance data available</p>
                      </div>
                    ) : (
                      attendanceByPerson.map((item) => (
                        <Card
                          key={item.user.id}
                          className="hover:bg-muted/30 transition-colors cursor-pointer"
                          onClick={() => router.push(`/rsvp/${item.user.id}`)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10">
                                  <AvatarImage
                                    src={item.user.avatarUrl || undefined}
                                  />
                                  <AvatarFallback>
                                    {getInitials(
                                      item.user.name,
                                      item.user.email,
                                    )}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">
                                    {item.user.name || item.user.email}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {item.going} attended, {item.notGoing}{" "}
                                    missed
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-2xl font-bold">
                                  {item.rate}%
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Attendance
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent
            value="overview"
            className="flex-1 overflow-auto mt-0 min-h-0"
          >
            <ScrollArea className="h-full">
              <div className="p-4 space-y-4">
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
                        value={timeRange}
                        onValueChange={(value: "month" | "year") =>
                          setTimeRange(value)
                        }
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
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient
                            id="fillGoing"
                            x1="0"
                            y1="0"
                            x2="0"
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
                          dataKey="month"
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                        />
                        <YAxis tickLine={false} axisLine={false} />
                        <ChartTooltip
                          cursor={false}
                          content={<ChartTooltipContent />}
                        />
                        <Area
                          dataKey="going"
                          type="natural"
                          fill="url(#fillGoing)"
                          stroke="var(--color-going)"
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
    <div className="flex flex-1 flex-col min-h-0 h-full overflow-hidden">
      <PageHeader title="My Schedule" description="RSVP to upcoming sessions" />
      <Tabs defaultValue="upcoming" className="flex-1 flex flex-col min-h-0">
        <div className="px-4 py-3 shrink-0 border-b">
          <TabsList className="w-full grid grid-cols-3 h-10 rounded-xl">
            <TabsTrigger value="upcoming" className="text-xs rounded-lg">
              <IconCalendar className="h-4 w-4 mr-1.5" />
              Upcoming
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs rounded-lg">
              <IconClock className="h-4 w-4 mr-1.5" />
              History
            </TabsTrigger>
            <TabsTrigger value="summary" className="text-xs rounded-lg">
              <IconChartBar className="h-4 w-4 mr-1.5" />
              Summary
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent
          value="upcoming"
          className="flex-1 overflow-auto mt-0 min-h-0"
        >
          <ScrollArea className="h-full">
            <div className="space-y-2 p-4">
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
                      className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${
                        isCanceled ? "opacity-50" : "hover:bg-muted/30"
                      }`}
                    >
                      <Link
                        href={
                          isCanceled
                            ? "#"
                            : `/events?eventId=${occ.event.id}&occurrenceId=${occ.id}`
                        }
                        className="flex items-center gap-4 flex-1 min-w-0"
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
                          className={`h-16 w-16 rounded-xl flex flex-col items-center justify-center shrink-0 ${
                            rsvpStatus === "going"
                              ? "bg-emerald-100 dark:bg-emerald-950/50"
                              : rsvpStatus === "not_going"
                                ? "bg-red-100 dark:bg-red-950/50"
                                : "bg-muted"
                          }`}
                        >
                          <span
                            className={`text-2xl font-bold leading-none ${
                              rsvpStatus === "going"
                                ? "text-emerald-600 dark:text-emerald-400"
                                : rsvpStatus === "not_going"
                                  ? "text-red-600 dark:text-red-400"
                                  : ""
                            }`}
                          >
                            {dateInfo.day}
                          </span>
                          <span className="text-[10px] font-medium text-muted-foreground mt-0.5">
                            {dateInfo.month}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{occ.event.title}</p>
                            {dateInfo.relative && (
                              <Badge
                                variant="secondary"
                                className="text-[10px] rounded-md"
                              >
                                {dateInfo.relative}
                              </Badge>
                            )}
                            {isCanceled && (
                              <Badge
                                variant="destructive"
                                className="text-[10px] rounded-md"
                              >
                                Canceled
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                            <span className="whitespace-nowrap">
                              {dateInfo.weekday}
                            </span>
                            <span className="flex items-center gap-1">
                              <IconClock className="h-3 w-3" />
                              {formatTime(occ.event.startTime)} -{" "}
                              {formatTime(occ.event.endTime)}
                            </span>
                          </div>
                          {/* Attendance summary - count and coach badges */}
                          {occurrenceSummaries[occ.id] && (
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              <span className="text-xs text-emerald-600 font-medium">
                                {occurrenceSummaries[occ.id].goingCount} going
                              </span>
                              {occurrenceSummaries[occ.id].coaches.length >
                                0 && (
                                <>
                                  <span className="text-xs text-muted-foreground">
                                    •
                                  </span>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {occurrenceSummaries[occ.id].coaches.map(
                                      (coach) => (
                                        <Badge
                                          key={coach.id}
                                          variant="secondary"
                                          className="text-[10px] rounded-md flex items-center gap-1"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <IconCheck className="h-3 w-3" />
                                          {coach.name || "Coach"}
                                        </Badge>
                                      ),
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </Link>
                      {!isCanceled && (
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            size="sm"
                            variant={
                              rsvpStatus === "going" ? "default" : "outline"
                            }
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRSVP(occ.id, "going");
                            }}
                            disabled={isUpdating}
                            className={`h-9 rounded-xl ${
                              rsvpStatus === "going"
                                ? "bg-emerald-600 hover:bg-emerald-700"
                                : ""
                            }`}
                          >
                            <IconCheck className="h-4 w-4 mr-1" />
                            Going
                          </Button>
                          <Button
                            size="sm"
                            variant={
                              rsvpStatus === "not_going"
                                ? "secondary"
                                : "outline"
                            }
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRSVP(occ.id, "not_going");
                            }}
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
        </TabsContent>

        <TabsContent
          value="history"
          className="flex-1 overflow-auto mt-0 min-h-0"
        >
          <ScrollArea className="h-full">
            <div className="space-y-2 p-4">
              {historicalRsvps.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No past attendance records</p>
                </div>
              ) : (
                historicalRsvps
                  .filter((r) => {
                    if (!r.occurrence?.date) return false;
                    return new Date(r.occurrence.date) < new Date();
                  })
                  .map((rsvp) => {
                    if (!rsvp.occurrence) return null;
                    const occ = rsvp.occurrence;
                    const dateInfo = formatDate(occ.date);
                    const isGoing = rsvp.status === "going";

                    return (
                      <div
                        key={rsvp.id}
                        className="flex items-center gap-4 p-4 rounded-xl border hover:bg-muted/30 transition-colors"
                      >
                        <div
                          className={`h-16 w-16 rounded-xl flex flex-col items-center justify-center shrink-0 ${
                            isGoing
                              ? "bg-emerald-100 dark:bg-emerald-950/50"
                              : "bg-red-100 dark:bg-red-950/50"
                          }`}
                        >
                          <span
                            className={`text-2xl font-bold leading-none ${
                              isGoing
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-red-600 dark:text-red-400"
                            }`}
                          >
                            {dateInfo.day}
                          </span>
                          <span className="text-[10px] font-medium text-muted-foreground mt-0.5">
                            {dateInfo.month}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{occ.event.title}</p>
                            <Badge
                              variant={isGoing ? "default" : "secondary"}
                              className={`text-[10px] rounded-md ${
                                isGoing
                                  ? "bg-emerald-600"
                                  : "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300"
                              }`}
                            >
                              {isGoing ? "Attended" : "Missed"}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                            <span className="whitespace-nowrap">
                              {dateInfo.weekday}
                            </span>
                            <span className="flex items-center gap-1">
                              <IconClock className="h-3 w-3" />
                              {formatTime(occ.event.startTime)} -{" "}
                              {formatTime(occ.event.endTime)}
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
          value="summary"
          className="flex-1 overflow-auto mt-0 min-h-0"
        >
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
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
                      value={timeRange}
                      onValueChange={(value: "month" | "year") =>
                        setTimeRange(value)
                      }
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
                        dataKey="month"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                      />
                      <YAxis tickLine={false} axisLine={false} />
                      <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent />}
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
