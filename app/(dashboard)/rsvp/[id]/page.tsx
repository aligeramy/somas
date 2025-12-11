"use client";

import {
  IconCheck,
  IconClock,
  IconX,
  IconChartBar,
  IconArrowLeft,
} from "@tabler/icons-react";
import { useCallback, useEffect, useState, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from "date-fns";

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

interface RosterMember {
  id: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
  role: string;
}

export default function AthleteAttendancePage() {
  const router = useRouter();
  const params = useParams();
  const athleteId = params.id as string;

  const [historicalRsvps, setHistoricalRsvps] = useState<RSVP[]>([]);
  const [athlete, setAthlete] = useState<RosterMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<"month" | "year">("month");

  const loadAthleteData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Load roster to get athlete info
      const rosterRes = await fetch("/api/roster");
      if (rosterRes.ok) {
        const rosterData = await rosterRes.json();
        const foundAthlete = (rosterData.roster || []).find(
          (member: RosterMember) => member.id === athleteId
        );
        if (foundAthlete) {
          setAthlete(foundAthlete);
        } else {
          setError("Athlete not found");
          return;
        }
      }

      // Load historical RSVPs for this athlete
      const rsvpsRes = await fetch(`/api/rsvp?includePast=true&userId=${athleteId}`);
      if (rsvpsRes.ok) {
        const rsvpsData = await rsvpsRes.json();
        setHistoricalRsvps(rsvpsData.rsvps || []);
      } else {
        setError("Failed to load attendance data");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [athleteId]);

  useEffect(() => {
    if (athleteId) {
      loadAthleteData();
    }
  }, [athleteId, loadAthleteData]);

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
    const going = historicalRsvps.filter((r) => r.status === "going");
    const notGoing = historicalRsvps.filter((r) => r.status === "not_going");
    const total = going.length + notGoing.length;
    const attendanceRate = total > 0 ? (going.length / total) * 100 : 0;

    return {
      total,
      going: going.length,
      notGoing: notGoing.length,
      attendanceRate: Math.round(attendanceRate),
    };
  }, [historicalRsvps]);

  // Prepare chart data
  const chartData = useMemo(() => {
    if (timeRange === "month") {
      // Group by month for last 6 months
      const months = eachMonthOfInterval({
        start: subMonths(new Date(), 5),
        end: new Date(),
      });

      return months.map((month) => {
        const monthStart = startOfMonth(month);
        const monthEnd = endOfMonth(month);
        const monthRsvps = historicalRsvps.filter((r) => {
          if (!r.occurrence?.date) return false;
          const occDate = new Date(r.occurrence.date);
          return occDate >= monthStart && occDate <= monthEnd;
        });

        const going = monthRsvps.filter((r) => r.status === "going").length;
        const notGoing = monthRsvps.filter((r) => r.status === "not_going")
          .length;

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
      historicalRsvps.forEach((r) => {
        if (r.occurrence?.date) {
          years.add(new Date(r.occurrence.date).getFullYear());
        }
      });

      return Array.from(years)
        .sort()
        .map((year) => {
          const yearRsvps = historicalRsvps.filter((r) => {
            if (!r.occurrence?.date) return false;
            return new Date(r.occurrence.date).getFullYear() === year;
          });

          const going = yearRsvps.filter((r) => r.status === "going").length;
          const notGoing = yearRsvps.filter((r) => r.status === "not_going")
            .length;

          return {
            month: year.toString(),
            going,
            notGoing,
            total: going + notGoing,
          };
        });
    }
  }, [historicalRsvps, timeRange]);

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
        <PageHeader title="Athlete Attendance" />
        <ScrollArea className="flex-1 h-0">
          <div className="space-y-4 p-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-16 w-16 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-16 mt-2" />
                  </CardHeader>
                </Card>
              ))}
            </div>
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </div>
    );
  }

  if (error || !athlete) {
    return (
      <div className="flex flex-1 flex-col">
        <PageHeader title="Athlete Attendance" />
        <div className="p-4">
          <div className="bg-destructive/10 text-destructive rounded-xl p-4">
            {error || "Athlete not found"}
          </div>
        </div>
      </div>
    );
  }

  // Sort RSVPs by date (most recent first)
  const sortedRsvps = [...historicalRsvps].sort((a, b) => {
    if (!a.occurrence?.date || !b.occurrence?.date) return 0;
    return new Date(b.occurrence.date).getTime() - new Date(a.occurrence.date).getTime();
  });

  return (
    <div className="flex flex-1 flex-col min-h-0 h-full overflow-hidden">
      <PageHeader title="Athlete Attendance">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="rounded-xl">
          <IconArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </PageHeader>

      <ScrollArea className="flex-1 h-0">
        <div className="p-4 space-y-4">
          {/* Athlete Info Card */}
          <Card className="rounded-xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={athlete.avatarUrl || undefined} />
                  <AvatarFallback className="text-lg">
                    {getInitials(athlete.name, athlete.email)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-xl font-semibold">
                    {athlete.name || athlete.email}
                  </h2>
                  <p className="text-sm text-muted-foreground">{athlete.email}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Cards */}
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

          {/* Chart */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Attendance History</CardTitle>
                  <CardDescription>
                    {athlete.name || "Athlete"}'s attendance over time
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

          {/* Attendance List */}
          <Card>
            <CardHeader>
              <CardTitle>Attendance Records</CardTitle>
              <CardDescription>
                Complete history of all sessions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sortedRsvps.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No attendance records</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {sortedRsvps.map((rsvp) => {
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
                              {isGoing ? (
                                <>
                                  <IconCheck className="h-3 w-3 mr-1" />
                                  Attended
                                </>
                              ) : (
                                <>
                                  <IconX className="h-3 w-3 mr-1" />
                                  Missed
                                </>
                              )}
                            </Badge>
                            {occ.status === "canceled" && (
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
                            {dateInfo.relative && (
                              <Badge variant="secondary" className="text-[10px]">
                                {dateInfo.relative}
                              </Badge>
                            )}
                            <span className="flex items-center gap-1">
                              <IconClock className="h-3 w-3" />
                              {formatTime(occ.event.startTime)} -{" "}
                              {formatTime(occ.event.endTime)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}
