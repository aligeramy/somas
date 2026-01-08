"use client";

import {
  IconArrowLeft,
  IconCheck,
  IconClock,
  IconX,
} from "@tabler/icons-react";
import {
  eachMonthOfInterval,
  endOfMonth,
  format,
  startOfMonth,
  subMonths,
} from "date-fns";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
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
      const rsvpsRes = await fetch(
        `/api/rsvp?includePast=true&userId=${athleteId}`
      );
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
    const hour = Number.parseInt(hours, 10);
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
  }, [historicalRsvps, timeRange]);

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
        <PageHeader title="Athlete Attendance" />
        <ScrollArea className="h-0 flex-1">
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
                    <Skeleton className="mt-2 h-8 w-16" />
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
          <div className="rounded-xl bg-destructive/10 p-4 text-destructive">
            {error || "Athlete not found"}
          </div>
        </div>
      </div>
    );
  }

  // Sort RSVPs by date (most recent first)
  const sortedRsvps = [...historicalRsvps].sort((a, b) => {
    if (!(a.occurrence?.date && b.occurrence?.date)) return 0;
    return (
      new Date(b.occurrence.date).getTime() -
      new Date(a.occurrence.date).getTime()
    );
  });

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <PageHeader title="Athlete Attendance">
        <Button
          className="rounded-xl"
          onClick={() => router.back()}
          size="sm"
          variant="ghost"
        >
          <IconArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </PageHeader>

      <ScrollArea className="h-0 flex-1">
        <div className="space-y-4 p-4">
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
                  <h2 className="font-semibold text-xl">
                    {athlete.name || athlete.email}
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    {athlete.email}
                  </p>
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
                <div className="py-12 text-center text-muted-foreground">
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
                              {isGoing ? (
                                <>
                                  <IconCheck className="mr-1 h-3 w-3" />
                                  Attended
                                </>
                              ) : (
                                <>
                                  <IconX className="mr-1 h-3 w-3" />
                                  Missed
                                </>
                              )}
                            </Badge>
                            {occ.status === "canceled" && (
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
                            {dateInfo.relative && (
                              <Badge
                                className="shrink-0 text-[9px] md:text-[10px]"
                                variant="secondary"
                              >
                                {dateInfo.relative}
                              </Badge>
                            )}
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
