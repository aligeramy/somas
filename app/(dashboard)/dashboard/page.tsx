import React, { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { users, events, eventOccurrences, rsvps } from "@/drizzle/schema";
import { eq, and, gte, asc, sql, inArray } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import Link from "next/link";
import { IconChevronRight, IconUsers, IconCalendar, IconCheck, IconClock, IconPlus, IconX } from "@tabler/icons-react";
import { PageHeader } from "@/components/page-header";
import { AthleteDashboard } from "@/components/athlete-dashboard";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return null;
  }

  const [dbUser] = await db.select().from(users).where(eq(users.id, authUser.id)).limit(1);

  if (!dbUser || !dbUser.gymId) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8">
        <p className="text-muted-foreground">No gym associated with your account.</p>
      </div>
    );
  }

  // Athletes get a focused dashboard
  if (dbUser.role === "athlete") {
    // Get upcoming events for athlete
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcomingOccurrences = await db
      .select({
        occurrence: eventOccurrences,
        event: events,
      })
      .from(eventOccurrences)
      .innerJoin(events, eq(eventOccurrences.eventId, events.id))
      .where(
        and(
          eq(events.gymId, dbUser.gymId),
          gte(eventOccurrences.date, today),
          eq(eventOccurrences.status, "scheduled")
        )
      )
      .orderBy(asc(eventOccurrences.date))
      .limit(10);

    // Get user's RSVPs
    const userRsvps = await db
      .select()
      .from(rsvps)
      .where(eq(rsvps.userId, dbUser.id));

    const rsvpMap = new Map(userRsvps.map((r) => [r.occurrenceId, r.status]));

    const occurrencesWithRsvp = upcomingOccurrences.map(({ occurrence, event }) => ({
      id: occurrence.id,
      date: occurrence.date instanceof Date ? occurrence.date.toISOString() : occurrence.date,
      status: occurrence.status,
      eventId: event.id,
      eventTitle: event.title,
      startTime: event.startTime,
      endTime: event.endTime,
      rsvpStatus: rsvpMap.get(occurrence.id) || null,
    }));

    return (
      <AthleteDashboard
        userName={dbUser.name}
        occurrences={occurrencesWithRsvp}
      />
    );
  }

  // Owner/Coach dashboard
  const totalMembers = await db
    .select({ count: sql<number>`count(*)` })
    .from(users)
    .where(eq(users.gymId, dbUser.gymId));

  const totalEvents = await db
    .select({ count: sql<number>`count(*)` })
    .from(events)
    .where(eq(events.gymId, dbUser.gymId));

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const nextWeek = new Date();
  nextWeek.setDate(today.getDate() + 7);
  nextWeek.setHours(23, 59, 59, 999);

  const upcomingOccurrences = await db
    .select({
      occurrence: eventOccurrences,
      event: events,
    })
    .from(eventOccurrences)
    .innerJoin(events, eq(eventOccurrences.eventId, events.id))
    .where(
      and(
        eq(events.gymId, dbUser.gymId),
        gte(eventOccurrences.date, today),
        sql`${eventOccurrences.date} <= ${nextWeek.toISOString()}`
      )
    )
    .orderBy(asc(eventOccurrences.date))
    .limit(5);

  const recentRsvps = await db
    .select({ count: sql<number>`count(*)` })
    .from(rsvps)
    .innerJoin(eventOccurrences, eq(rsvps.occurrenceId, eventOccurrences.id))
    .innerJoin(events, eq(eventOccurrences.eventId, events.id))
    .where(
      and(
        eq(events.gymId, dbUser.gymId),
        gte(eventOccurrences.date, today)
      )
    );

  // Get RSVPs for each upcoming occurrence with user data
  const occurrenceIds = upcomingOccurrences.map(({ occurrence }) => occurrence.id);
  const occurrenceRsvps = occurrenceIds.length > 0
    ? await db
        .select({
          occurrenceId: rsvps.occurrenceId,
          status: rsvps.status,
          user: {
            id: users.id,
            name: users.name,
            email: users.email,
            avatarUrl: users.avatarUrl,
          },
        })
        .from(rsvps)
        .innerJoin(users, eq(rsvps.userId, users.id))
        .where(inArray(rsvps.occurrenceId, occurrenceIds))
    : [];

  // Group RSVPs by occurrence with user data
  const rsvpsByOccurrence = new Map<string, {
    going: Array<{ id: string; name: string | null; email: string; avatarUrl: string | null }>;
    notGoing: Array<{ id: string; name: string | null; email: string; avatarUrl: string | null }>;
  }>();
  
  occurrenceRsvps.forEach((rsvp) => {
    const current = rsvpsByOccurrence.get(rsvp.occurrenceId) || { going: [], notGoing: [] };
    if (rsvp.status === "going") {
      current.going.push(rsvp.user);
    } else if (rsvp.status === "not_going") {
      current.notGoing.push(rsvp.user);
    }
    rsvpsByOccurrence.set(rsvp.occurrenceId, current);
  });

  const recentMembers = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      avatarUrl: users.avatarUrl,
    })
    .from(users)
    .where(eq(users.gymId, dbUser.gymId))
    .orderBy(asc(users.createdAt))
    .limit(5);

  function getInitials(name: string | null, email: string) {
    if (name) {
      return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
    }
    return email[0].toUpperCase();
  }

  function formatDate(dateValue: Date | string | null) {
    if (!dateValue) return { day: "", month: "", weekday: "" };
    const date = typeof dateValue === "string" ? new Date(dateValue) : dateValue;
    if (Number.isNaN(date.getTime())) return { day: "", month: "", weekday: "" };
    return {
      day: date.getDate().toString(),
      month: date.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
      weekday: date.toLocaleDateString("en-US", { weekday: "long" }),
    };
  }

  function formatTime(time: string | null) {
    if (!time) return "";
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    if (Number.isNaN(hour)) return time;
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  }

  const stats = [
    {
      label: "Team Members",
      value: Number(totalMembers[0]?.count || 0),
      icon: IconUsers,
      color: "bg-blue-100 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400",
    },
    {
      label: "Active Events",
      value: Number(totalEvents[0]?.count || 0),
      icon: IconCalendar,
      color: "bg-violet-100 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400",
    },
    {
      label: "Upcoming RSVPs",
      value: Number(recentRsvps[0]?.count || 0),
      icon: IconCheck,
      color: "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400",
    },
  ];

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader 
        title={`Welcome back${dbUser.name ? `, ${dbUser.name.split(" ")[0]}` : ""}`} 
        description="Here's what's happening with your team"
      >
        <Button size="sm" className="gap-2 rounded-xl" asChild>
          <Link href="/events/new">
            <IconPlus className="h-4 w-4" />
            New Event
          </Link>
        </Button>
      </PageHeader>

      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent
          dbUser={dbUser}
          stats={stats}
          upcomingOccurrences={upcomingOccurrences}
          recentMembers={recentMembers}
          rsvpsByOccurrence={rsvpsByOccurrence}
          formatDate={formatDate}
          formatTime={formatTime}
          getInitials={getInitials}
        />
      </Suspense>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex-1 overflow-auto">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="rounded-xl border-0 shadow-sm">
              <CardContent className="p-5">
                <Skeleton className="h-10 w-10 rounded-xl mb-3" />
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Content Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Upcoming Events Skeleton */}
          <Card className="rounded-xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-8 w-20 rounded-xl" />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl">
                    <Skeleton className="h-12 w-12 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Team Members Skeleton */}
          <Card className="rounded-xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-8 w-20 rounded-xl" />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-xl">
                    <Skeleton className="h-10 w-10 rounded-xl" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-3 w-40" />
                    </div>
                    <Skeleton className="h-5 w-16 rounded-md" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function DashboardContent({
  dbUser,
  stats,
  upcomingOccurrences,
  recentMembers,
  rsvpsByOccurrence,
  formatDate,
  formatTime,
  getInitials,
}: {
  dbUser: { name: string | null; email: string };
  stats: Array<{ label: string; value: number; icon: React.ComponentType<{ className?: string }>; color: string }>;
  upcomingOccurrences: Array<{ occurrence: any; event: any }>;
  recentMembers: Array<{ id: string; name: string | null; email: string; role: string; avatarUrl: string | null }>;
  rsvpsByOccurrence: Map<string, {
    going: Array<{ id: string; name: string | null; email: string; avatarUrl: string | null }>;
    notGoing: Array<{ id: string; name: string | null; email: string; avatarUrl: string | null }>;
  }>;
  formatDate: (date: Date | string | null) => { day: string; month: string; weekday: string };
  formatTime: (time: string | null) => string;
  getInitials: (name: string | null, email: string) => string;
}) {
  return (
    <div className="flex-1 overflow-auto">
      <div className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {stats.map((stat) => (
            <Card key={stat.label} className="rounded-xl border shadow-sm">
              <CardContent className="p-5">
                <div className={`inline-flex items-center justify-center h-10 w-10 rounded-xl ${stat.color} mb-3`}>
                  <stat.icon className="h-5 w-5" />
                </div>
                <p className="text-3xl font-semibold tracking-tight">{stat.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Content Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Upcoming Events */}
          <Card className="rounded-xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">This Week</CardTitle>
                <Button variant="ghost" size="sm" asChild className="text-muted-foreground rounded-xl">
                  <Link href="/events">
                    View all
                    <IconChevronRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {upcomingOccurrences.length === 0 ? (
                <div className="py-8 text-center">
                  <IconCalendar className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground mb-4">No upcoming events this week</p>
                  <Button variant="outline" size="sm" asChild className="rounded-xl">
                    <Link href="/events/new">Create an event</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {upcomingOccurrences.map(({ occurrence, event }) => {
                    const dateInfo = formatDate(occurrence.date);
                    const isCanceled = occurrence.status === "canceled";
                    const rsvpData = rsvpsByOccurrence.get(occurrence.id) || { going: [], notGoing: [] };

                    return (
                      <Link
                        key={occurrence.id}
                        href={`/events?eventId=${event.id}&occurrenceId=${occurrence.id}`}
                        className={`flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors ${
                          isCanceled ? "opacity-50" : ""
                        }`}
                      >
                        <div className="h-12 w-12 rounded-xl bg-muted flex flex-col items-center justify-center shrink-0">
                          <span className="text-lg font-bold leading-none">{dateInfo.day}</span>
                          <span className="text-[9px] font-medium text-muted-foreground">{dateInfo.month}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{event.title}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <IconClock className="h-3 w-3" />
                            {formatTime(event.startTime)} - {formatTime(event.endTime)}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          {(rsvpData.going.length > 0 || rsvpData.notGoing.length > 0) && (
                            <div className="flex items-center gap-3">
                              {rsvpData.going.length > 0 && (
                                <div className="flex items-center gap-1.5">
                                  <StackedAvatars
                                    users={rsvpData.going}
                                    getInitials={getInitials}
                                    variant="going"
                                  />
                                  <span className="text-xs text-emerald-600 font-medium">{rsvpData.going.length}</span>
                                </div>
                              )}
                              {rsvpData.notGoing.length > 0 && (
                                <div className="flex items-center gap-1.5">
                                  <StackedAvatars
                                    users={rsvpData.notGoing}
                                    getInitials={getInitials}
                                    variant="notGoing"
                                  />
                                  <span className="text-xs text-red-600 font-medium">{rsvpData.notGoing.length}</span>
                                </div>
                              )}
                            </div>
                          )}
                          {isCanceled && (
                            <Badge variant="destructive" className="text-[10px] rounded-md">Canceled</Badge>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Team Members */}
          <Card className="rounded-xl">
            <CardHeader className="pb">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Team</CardTitle>
                <Button variant="ghost" size="sm" asChild className="text-muted-foreground rounded-xl">
                  <Link href="/roster">
                    View all
                    <IconChevronRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {recentMembers.length === 0 ? (
                <div className="py-8 text-center">
                  <IconUsers className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground mb-4">No team members yet</p>
                  <Button variant="outline" size="sm" asChild className="rounded-xl">
                    <Link href="/roster">Add members</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 p-2 rounded-xl"
                    >
                      <Avatar className="h-10 w-10 rounded-xl border">
                        <AvatarImage src={member.avatarUrl || undefined} />
                        <AvatarFallback className="rounded-xl text-xs bg-linear-to-br from-primary/20 to-primary/5">
                          {getInitials(member.name, member.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {member.name || "Unnamed"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {member.email}
                        </p>
                      </div>
                      <Badge
                        variant={
                          member.role === "owner"
                            ? "default"
                            : member.role === "coach"
                            ? "secondary"
                            : "outline"
                        }
                        className="text-[10px] px-1.5 rounded-md"
                      >
                        {member.role}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StackedAvatars({
  users,
  getInitials,
  variant,
}: {
  users: Array<{ id: string; name: string | null; email: string; avatarUrl: string | null }>;
  getInitials: (name: string | null, email: string) => string;
  variant: "going" | "notGoing";
}) {
  const MAX_VISIBLE = 3;
  const visibleUsers = users.slice(0, MAX_VISIBLE);
  const remainingCount = users.length - MAX_VISIBLE;
  const Icon = variant === "going" ? IconCheck : IconX;
  const iconColor = variant === "going" ? "text-emerald-600" : "text-red-600";

  const borderColor = variant === "going" ? "border-emerald-500" : "border-red-500";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center -space-x-2">
            {visibleUsers.map((user, index) => (
              <Avatar
                key={user.id}
                className={`h-7 w-7 rounded-full border-2 ${borderColor} ring-2 ring-background`}
                style={{ zIndex: MAX_VISIBLE - index }}
              >
                <AvatarImage src={user.avatarUrl || undefined} />
                <AvatarFallback className="rounded-full text-[10px] bg-muted">
                  {getInitials(user.name, user.email)}
                </AvatarFallback>
              </Avatar>
            ))}
            {remainingCount > 0 && (
              <div
                className={`h-7 w-7 rounded-full border-2 ${borderColor} ring-2 ring-background bg-muted flex items-center justify-center text-[10px] font-medium`}
                style={{ zIndex: 0 }}
              >
                +{remainingCount}
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Icon className={`h-4 w-4 ${iconColor}`} />
              <span className="font-medium">
                {variant === "going" ? "Going" : "Not Coming"} ({users.length})
              </span>
            </div>
            <div className="space-y-1">
              {users.map((user) => (
                <div key={user.id} className="text-xs">
                  {user.name || user.email}
                </div>
              ))}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
