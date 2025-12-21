import {
  IconCalendar,
  IconCheck,
  IconChevronRight,
  IconPlus,
  IconUsers,
  IconX,
} from "@tabler/icons-react";
import { and, asc, desc, eq, gte, inArray, sql } from "drizzle-orm";
import Link from "next/link";
import { Suspense } from "react";
import { AthleteDashboard } from "@/components/athlete-dashboard";
import { EventActionsDropdown } from "@/components/event-actions-dropdown";
import { PageHeader } from "@/components/page-header";
import { PWAInstallButton } from "@/components/pwa-install-button";
import { PWAInstallPrompt } from "@/components/pwa-install-prompt";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  blogPosts,
  eventOccurrences,
  events,
  notices,
  rsvps,
  users,
} from "@/drizzle/schema";
import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return null;
  }

  const [dbUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, authUser.id))
    .limit(1);

  if (!dbUser || !dbUser.gymId) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8">
        <p className="text-muted-foreground">
          No club associated with your account.
        </p>
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
          eq(eventOccurrences.status, "scheduled"),
        ),
      )
      .orderBy(asc(eventOccurrences.date))
      .limit(10);

    // Get user's RSVPs
    const userRsvps = await db
      .select()
      .from(rsvps)
      .where(eq(rsvps.userId, dbUser.id));

    const rsvpMap = new Map(userRsvps.map((r) => [r.occurrenceId, r.status]));

    // Get RSVPs for each upcoming occurrence with user data including roles
    const occurrenceIds = upcomingOccurrences.map(
      ({ occurrence }) => occurrence.id,
    );
    const occurrenceRsvps =
      occurrenceIds.length > 0
        ? await db
            .select({
              occurrenceId: rsvps.occurrenceId,
              status: rsvps.status,
              user: {
                id: users.id,
                name: users.name,
                email: users.email,
                avatarUrl: users.avatarUrl,
                role: users.role,
              },
            })
            .from(rsvps)
            .innerJoin(users, eq(rsvps.userId, users.id))
            .where(inArray(rsvps.occurrenceId, occurrenceIds))
        : [];

    // Group RSVPs by occurrence, separating coaches and athletes
    const rsvpsByOccurrence = new Map<
      string,
      {
        goingCoaches: Array<{ id: string; name: string | null; email: string }>;
        goingAthletes: Array<{
          id: string;
          name: string | null;
          email: string;
        }>;
      }
    >();

    occurrenceRsvps.forEach((rsvp) => {
      if (rsvp.status === "going") {
        const current = rsvpsByOccurrence.get(rsvp.occurrenceId) || {
          goingCoaches: [],
          goingAthletes: [],
        };
        // Separate coaches and athletes
        if (rsvp.user.role === "coach" || rsvp.user.role === "owner") {
          current.goingCoaches.push({
            id: rsvp.user.id,
            name: rsvp.user.name,
            email: rsvp.user.email,
          });
        } else if (rsvp.user.role === "athlete") {
          current.goingAthletes.push({
            id: rsvp.user.id,
            name: rsvp.user.name,
            email: rsvp.user.email,
          });
        }
        rsvpsByOccurrence.set(rsvp.occurrenceId, current);
      }
    });

    const occurrencesWithRsvp = upcomingOccurrences.map(
      ({ occurrence, event }) => {
        const rsvpData = rsvpsByOccurrence.get(occurrence.id) || {
          goingCoaches: [],
          goingAthletes: [],
        };
        return {
          id: occurrence.id,
          date:
            occurrence.date instanceof Date
              ? occurrence.date.toISOString()
              : occurrence.date,
          status: occurrence.status,
          eventId: event.id,
          eventTitle: event.title,
          startTime: event.startTime,
          endTime: event.endTime,
          rsvpStatus: rsvpMap.get(occurrence.id) || null,
          goingCoaches: rsvpData.goingCoaches,
          goingAthletesCount: rsvpData.goingAthletes.length,
        };
      },
    );

    // Get active notice for athletes
    const [activeNotice] = await db
      .select({
        id: notices.id,
        title: notices.title,
        content: notices.content,
        createdAt: notices.createdAt,
        author: {
          id: users.id,
          name: users.name,
        },
      })
      .from(notices)
      .innerJoin(users, eq(notices.authorId, users.id))
      .where(and(eq(notices.gymId, dbUser.gymId), eq(notices.active, true)))
      .limit(1);

    return (
      <AthleteDashboard
        userName={dbUser.name}
        occurrences={occurrencesWithRsvp}
        activeNotice={activeNotice || null}
        isOnboarded={dbUser.onboarded}
      />
    );
  }

  // Head Coach/Coach dashboard
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

  const upcomingOccurrences = await db
    .select({
      occurrence: eventOccurrences,
      event: events,
    })
    .from(eventOccurrences)
    .innerJoin(events, eq(eventOccurrences.eventId, events.id))
    .where(
      and(eq(events.gymId, dbUser.gymId), gte(eventOccurrences.date, today)),
    )
    .orderBy(asc(eventOccurrences.date))
    .limit(5);

  const recentRsvps = await db
    .select({ count: sql<number>`count(*)` })
    .from(rsvps)
    .innerJoin(eventOccurrences, eq(rsvps.occurrenceId, eventOccurrences.id))
    .innerJoin(events, eq(eventOccurrences.eventId, events.id))
    .where(
      and(eq(events.gymId, dbUser.gymId), gte(eventOccurrences.date, today)),
    );

  // Get RSVPs for each upcoming occurrence with user data including roles
  const occurrenceIds = upcomingOccurrences.map(
    ({ occurrence }) => occurrence.id,
  );
  const occurrenceRsvps =
    occurrenceIds.length > 0
      ? await db
          .select({
            occurrenceId: rsvps.occurrenceId,
            status: rsvps.status,
            user: {
              id: users.id,
              name: users.name,
              email: users.email,
              avatarUrl: users.avatarUrl,
              role: users.role,
            },
          })
          .from(rsvps)
          .innerJoin(users, eq(rsvps.userId, users.id))
          .where(inArray(rsvps.occurrenceId, occurrenceIds))
      : [];

  // Group RSVPs by occurrence with user data, separating coaches and athletes
  const rsvpsByOccurrence = new Map<
    string,
    {
      going: Array<{
        id: string;
        name: string | null;
        email: string;
        avatarUrl: string | null;
        role: string;
      }>;
      notGoing: Array<{
        id: string;
        name: string | null;
        email: string;
        avatarUrl: string | null;
        role: string;
      }>;
      goingCoaches: Array<{
        id: string;
        name: string | null;
        email: string;
        avatarUrl: string | null;
      }>;
      goingAthletes: Array<{
        id: string;
        name: string | null;
        email: string;
        avatarUrl: string | null;
      }>;
    }
  >();

  // Track current user's RSVP status for each occurrence
  const currentUserRsvpMap = new Map<string, "going" | "not_going">();

  occurrenceRsvps.forEach((rsvp) => {
    const current = rsvpsByOccurrence.get(rsvp.occurrenceId) || {
      going: [],
      notGoing: [],
      goingCoaches: [],
      goingAthletes: [],
    };
    if (rsvp.status === "going") {
      current.going.push(rsvp.user);
      // Separate coaches and athletes
      if (rsvp.user.role === "coach" || rsvp.user.role === "owner") {
        current.goingCoaches.push({
          id: rsvp.user.id,
          name: rsvp.user.name,
          email: rsvp.user.email,
          avatarUrl: rsvp.user.avatarUrl,
        });
      } else if (rsvp.user.role === "athlete") {
        current.goingAthletes.push({
          id: rsvp.user.id,
          name: rsvp.user.name,
          email: rsvp.user.email,
          avatarUrl: rsvp.user.avatarUrl,
        });
      }
    } else if (rsvp.status === "not_going") {
      current.notGoing.push(rsvp.user);
    }
    rsvpsByOccurrence.set(rsvp.occurrenceId, current);

    // Track current user's RSVP status
    if (rsvp.user.id === dbUser.id) {
      currentUserRsvpMap.set(rsvp.occurrenceId, rsvp.status as "going" | "not_going");
    }
  });

  // Get active notice
  const [activeNotice] = await db
    .select({
      id: notices.id,
      title: notices.title,
      content: notices.content,
      createdAt: notices.createdAt,
      author: {
        id: users.id,
        name: users.name,
      },
    })
    .from(notices)
    .innerJoin(users, eq(notices.authorId, users.id))
    .where(and(eq(notices.gymId, dbUser.gymId), eq(notices.active, true)))
    .limit(1);

  // Get latest blog posts
  const latestPosts = await db
    .select({
      id: blogPosts.id,
      title: blogPosts.title,
      content: blogPosts.content,
      type: blogPosts.type,
      imageUrl: blogPosts.imageUrl,
      createdAt: blogPosts.createdAt,
      author: {
        id: users.id,
        name: users.name,
        avatarUrl: users.avatarUrl,
      },
    })
    .from(blogPosts)
    .innerJoin(users, eq(blogPosts.authorId, users.id))
    .where(eq(blogPosts.gymId, dbUser.gymId))
    .orderBy(desc(blogPosts.createdAt))
    .limit(3);

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

  function formatDate(dateValue: Date | string | null) {
    if (!dateValue) return { day: "", month: "", weekday: "" };
    const date =
      typeof dateValue === "string" ? new Date(dateValue) : dateValue;
    if (Number.isNaN(date.getTime()))
      return { day: "", month: "", weekday: "" };
    return {
      day: date.getDate().toString(),
      month: date.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
      weekday: date.toLocaleDateString("en-US", { weekday: "long" }),
    };
  }

  function formatTime(time: string | null) {
    if (!time) return "";
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours, 10);
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
      color:
        "bg-violet-100 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400",
    },
    {
      label: "Upcoming RSVPs",
      value: Number(recentRsvps[0]?.count || 0),
      icon: IconCheck,
      color:
        "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400",
    },
  ];

  return (
    <div className="flex flex-1 flex-col min-h-0 h-full overflow-hidden">
      <PageHeader
        title={`Welcome back${dbUser.name ? `, ${dbUser.name.split(" ")[0]}` : ""}`}
        description="Here's what's happening with your team"
      >
        <PWAInstallButton />
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
          rsvpsByOccurrence={rsvpsByOccurrence}
          formatDate={formatDate}
          formatTime={formatTime}
          getInitials={getInitials}
          activeNotice={activeNotice || null}
          latestPosts={latestPosts}
          userRole={dbUser.role}
          currentUserRsvpMap={currentUserRsvpMap}
          isOnboarded={dbUser.onboarded}
        />
      </Suspense>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex-1 overflow-auto min-h-0">
      <div className="space-y-6">
        {/* Stats */}
        <div className="hidden lg:grid grid-cols-3 gap-2 sm:gap-4">
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
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 rounded-xl"
                  >
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

          {/* Latest Posts Skeleton */}
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
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 rounded-xl"
                  >
                    <Skeleton className="h-16 w-16 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-4 w-16 rounded-md" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-3/4" />
                    </div>
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
  rsvpsByOccurrence,
  formatDate,
  formatTime,
  getInitials,
  activeNotice,
  latestPosts,
  userRole,
  currentUserRsvpMap,
  isOnboarded,
}: {
  dbUser: { name: string | null; email: string };
  stats: Array<{
    label: string;
    value: number;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
  }>;
  upcomingOccurrences: Array<{ occurrence: any; event: any }>;
  rsvpsByOccurrence: Map<
    string,
    {
      going: Array<{
        id: string;
        name: string | null;
        email: string;
        avatarUrl: string | null;
        role: string;
      }>;
      notGoing: Array<{
        id: string;
        name: string | null;
        email: string;
        avatarUrl: string | null;
        role: string;
      }>;
      goingCoaches: Array<{
        id: string;
        name: string | null;
        email: string;
        avatarUrl: string | null;
      }>;
      goingAthletes: Array<{
        id: string;
        name: string | null;
        email: string;
        avatarUrl: string | null;
      }>;
    }
  >;
  formatDate: (date: Date | string | null) => {
    day: string;
    month: string;
    weekday: string;
  };
  formatTime: (time: string | null) => string;
  getInitials: (name: string | null, email: string) => string;
  activeNotice: {
    id: string;
    title: string;
    content: string;
    createdAt: Date | string;
    author: { id: string; name: string | null };
  } | null;
  latestPosts: Array<{
    id: string;
    title: string;
    content: string;
    type: string;
    imageUrl: string | null;
    createdAt: Date | string;
    author: { id: string; name: string | null; avatarUrl: string | null };
  }>;
  userRole: string;
  currentUserRsvpMap: Map<string, "going" | "not_going">;
  isOnboarded: boolean;
}) {
  return (
    <div className="flex-1 overflow-auto min-h-0">
      <div className="space-y-4">
        {/* PWA Install Prompt - Only show after onboarding */}
        {isOnboarded && <PWAInstallPrompt />}

        {/* Active Notice */}
        {activeNotice && (
          <Card className="rounded-xl border border-primary/20 bg-primary/5">
            <CardContent className="px-4 py-2">
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-sm leading-tight">
                    {activeNotice.title}
                  </h3>
                  <Badge variant="default" className="rounded-lg text-xs">
                    Notice
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {activeNotice.content}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="hidden lg:grid grid-cols-3 gap-2 sm:gap-4">
          {stats.map((stat) => (
            <Card key={stat.label} className="rounded-xl border shadow-sm">
              <CardContent className="p-3 sm:p-5">
                <div
                  className={`inline-flex items-center justify-center h-8 w-8 sm:h-10 sm:w-10 rounded-xl ${stat.color} mb-2 sm:mb-3`}
                >
                  <stat.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <p className="text-2xl sm:text-3xl font-semibold tracking-tight">
                  {stat.value}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  {stat.label}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Content Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Upcoming Events */}
          <Card className="rounded-xl">
            <CardHeader className="pb-2 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">
                  Upcoming Events
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="text-muted-foreground rounded-xl"
                >
                  <Link href="/events">
                    View all
                    <IconChevronRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0 px-4">
              {upcomingOccurrences.length === 0 ? (
                <div className="py-8 text-center">
                  <IconCalendar className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground mb-4">
                    No upcoming events
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="rounded-xl"
                  >
                    <Link href="/events/new">Create an event</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {upcomingOccurrences.map(({ occurrence, event }) => {
                    const dateInfo = formatDate(occurrence.date);
                    const isCanceled = occurrence.status === "canceled";
                    const rsvpData = rsvpsByOccurrence.get(occurrence.id) || {
                      going: [],
                      notGoing: [],
                      goingCoaches: [],
                      goingAthletes: [],
                    };
                    const isCoachOrOwner =
                      userRole === "owner" || userRole === "coach";
                    const goingCoaches = rsvpData.goingCoaches || [];
                    const goingAthletes = rsvpData.goingAthletes || [];

                    return (
                      <div
                        key={occurrence.id}
                        className={`group relative flex items-start gap-3 py-2 px-2 rounded-xl hover:bg-muted/50 transition-colors ${
                          isCanceled ? "opacity-50" : ""
                        }`}
                      >
                        <Link
                          href={`/events?eventId=${event.id}&occurrenceId=${occurrence.id}`}
                          className="flex items-start gap-3 flex-1 min-w-0"
                        >
                          <div className="h-12 w-12 rounded-xl bg-muted flex flex-col items-center justify-center shrink-0">
                            <span className="text-sm font-bold leading-none">
                              {dateInfo.day}
                            </span>
                            <span 
                              className="text-[9px]! font-medium text-muted-foreground mt-0.5"
                              style={{ 
                                fontSize: '9px',
                                WebkitTextSizeAdjust: 'none',
                                display: 'inline-block'
                              }}
                            >
                              {dateInfo.month}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {event.title}
                            </p>
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {formatTime(event.startTime)} -{" "}
                              {formatTime(event.endTime)}
                            </p>
                            {/* Coaches and athletes */}
                            {(goingCoaches.length > 0 ||
                              goingAthletes.length > 0 ||
                              rsvpData.notGoing.length > 0) && (
                              <div className="flex items-center gap-1.5 mt-2 overflow-hidden">
                                {/* Coaches badges */}
                                {goingCoaches.map((coach) => (
                                  <Badge
                                    key={coach.id}
                                    variant="secondary"
                                    className="text-[10px] rounded-md flex items-center gap-1 shrink-0"
                                  >
                                    <IconCheck className="h-3 w-3" />
                                    <span className="truncate max-w-[80px]">
                                      {coach.name || coach.email}
                                    </span>
                                  </Badge>
                                ))}
                                {rsvpData.notGoing
                                  .filter(
                                    (user) =>
                                      user.role === "coach" ||
                                      user.role === "owner",
                                  )
                                  .map((coach) => (
                                    <Badge
                                      key={coach.id}
                                      variant="secondary"
                                      className="text-[10px] rounded-md flex items-center gap-1 shrink-0"
                                    >
                                      <IconX className="h-3 w-3" />
                                      <span className="truncate max-w-[80px]">
                                        {coach.name || coach.email}
                                      </span>
                                    </Badge>
                                  ))}
                                {/* Athletes avatars */}
                                {(goingAthletes.length > 0 ||
                                  rsvpData.notGoing.filter(
                                    (user) => user.role === "athlete",
                                  ).length > 0) && (
                                  <>
                                    {(goingCoaches.length > 0 ||
                                      rsvpData.notGoing.filter(
                                        (user) =>
                                          user.role === "coach" ||
                                          user.role === "owner",
                                      ).length > 0) && (
                                      <span className="text-muted-foreground shrink-0">
                                        •
                                      </span>
                                    )}
                                    {/* Going athletes */}
                                    {goingAthletes.map((athlete) => (
                                      <Avatar
                                        key={athlete.id}
                                        className="h-6 w-6 border border-emerald-500 shrink-0"
                                      >
                                        <AvatarImage
                                          src={athlete.avatarUrl || undefined}
                                        />
                                        <AvatarFallback className="text-[9px] bg-muted">
                                          {getInitials(athlete.name, athlete.email)}
                                        </AvatarFallback>
                                      </Avatar>
                                    ))}
                                    {/* Middle dot between going and not going athletes */}
                                    {goingAthletes.length > 0 &&
                                      rsvpData.notGoing.filter(
                                        (user) => user.role === "athlete",
                                      ).length > 0 && (
                                        <span className="text-muted-foreground shrink-0">
                                          •
                                        </span>
                                      )}
                                    {/* Not going athletes */}
                                    {rsvpData.notGoing
                                      .filter((user) => user.role === "athlete")
                                      .map((athlete) => (
                                        <Avatar
                                          key={athlete.id}
                                          className="h-6 w-6 border border-red-500 shrink-0"
                                        >
                                          <AvatarImage
                                            src={athlete.avatarUrl || undefined}
                                          />
                                          <AvatarFallback className="text-[9px] bg-muted">
                                            {getInitials(
                                              athlete.name,
                                              athlete.email,
                                            )}
                                          </AvatarFallback>
                                        </Avatar>
                                      ))}
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-2 shrink-0">
                            {isCanceled && (
                              <Badge
                                variant="destructive"
                                className="text-[10px] rounded-md"
                              >
                                Canceled
                              </Badge>
                            )}
                          </div>
                        </Link>
                        {isCoachOrOwner && (
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <EventActionsDropdown
                              eventId={event.id}
                              occurrenceId={occurrence.id}
                              isCanceled={isCanceled}
                              userRole={userRole}
                              currentRsvpStatus={currentUserRsvpMap.get(occurrence.id) || null}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Latest Posts */}
          <Card className="rounded-xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">
                  Latest Posts
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="text-muted-foreground rounded-xl"
                >
                  <Link href="/blog">
                    View all
                    <IconChevronRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {latestPosts.length === 0 ? (
                <div className="py-8 text-center">
                  <IconCalendar className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground mb-4">
                    No blog posts yet
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="rounded-xl"
                  >
                    <Link href="/blog">View blog</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {latestPosts.map((post) => (
                    <Link
                      key={post.id}
                      href={`/blog/${post.id}`}
                      className="block p-3 rounded-xl hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex gap-3">
                        {post.imageUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={post.imageUrl}
                            alt={post.title}
                            className="w-16 h-16 rounded-lg object-cover"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge
                              variant="outline"
                              className="rounded-lg text-xs"
                            >
                              {post.type}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {post.author.name}
                            </span>
                          </div>
                          <h3 className="font-semibold text-sm truncate">
                            {post.title}
                          </h3>
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                            {post.content}
                          </p>
                        </div>
                      </div>
                    </Link>
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

function _StackedAvatars({
  users,
  getInitials,
  variant,
}: {
  users: Array<{
    id: string;
    name: string | null;
    email: string;
    avatarUrl: string | null;
  }>;
  getInitials: (name: string | null, email: string) => string;
  variant: "going" | "notGoing";
}) {
  const MAX_VISIBLE = 3;
  const visibleUsers = users.slice(0, MAX_VISIBLE);
  const remainingCount = users.length - MAX_VISIBLE;
  const Icon = variant === "going" ? IconCheck : IconX;
  const iconColor = variant === "going" ? "text-emerald-600" : "text-red-600";

  const borderColor =
    variant === "going" ? "border-emerald-500" : "border-red-500";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center -space-x-2">
            {visibleUsers.map((user, index) => (
              <Avatar
                key={user.id}
                className={`h-7 w-7 rounded-full border ${borderColor} ring-2 ring-background`}
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
                className={`h-7 w-7 rounded-full border ${borderColor} ring-2 ring-background bg-muted flex items-center justify-center text-[10px] font-medium`}
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
