import {
  IconCalendar,
  IconCheck,
  IconPlus,
  IconUsers,
} from "@tabler/icons-react";
import { and, asc, desc, eq, gte, inArray, sql } from "drizzle-orm";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { AthleteDashboard } from "@/components/athlete-dashboard";
import { CoachDashboard } from "@/components/coach-dashboard";
import { DashboardEventsList } from "@/components/dashboard-events-list";
import { PageHeader } from "@/components/page-header";
import { PWAInstallBanner } from "@/components/pwa-install-banner";
import { PWAInstallButton } from "@/components/pwa-install-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  blogPosts,
  eventOccurrences,
  events,
  gyms,
  notices,
  rsvps,
  users,
} from "@/drizzle/schema";
import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

async function getAthleteDashboardData(
  dbUser: any,
  gymLogo: string | null,
  gymName: string | null
) {
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

  // Get RSVPs for each upcoming occurrence with user data including roles
  const occurrenceIds = upcomingOccurrences.map(
    ({ occurrence }) => occurrence.id
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

  // Group RSVPs by occurrence
  const rsvpsByOccurrence = new Map<
    string,
    (typeof occurrenceRsvps)[number][]
  >();
  for (const rsvp of occurrenceRsvps) {
    if (!rsvpsByOccurrence.has(rsvp.occurrenceId)) {
      rsvpsByOccurrence.set(rsvp.occurrenceId, []);
    }
    rsvpsByOccurrence.get(rsvp.occurrenceId)?.push(rsvp);
  }

  // Combine occurrence data with RSVPs
  const occurrencesWithRsvp = upcomingOccurrences.map(
    ({ occurrence, event }) => {
      const rsvps = rsvpsByOccurrence.get(occurrence.id) || [];
      const userRsvp = rsvpMap.get(occurrence.id);

      // Separate by status
      const goingAthletes = rsvps.filter(
        (r: (typeof occurrenceRsvps)[number]) =>
          r.status === "going" && r.user.role === "athlete"
      );
      const notGoingAthletes = rsvps.filter(
        (r: (typeof occurrenceRsvps)[number]) =>
          r.status === "not_going" && r.user.role === "athlete"
      );

      return {
        id: occurrence.id,
        date: occurrence.date,
        endTime: event.endTime,
        startTime: event.startTime,
        status: occurrence.status,
        title: event.title,
        description: event.description,
        location: event.location,
        userRsvp: userRsvp || null,
        goingAthletes,
        notGoingAthletes,
        goingAthletesCount: goingAthletes.length,
        notGoingAthletesCount: notGoingAthletes.length,
      };
    }
  );

  // Get active notice
  const [activeNotice] = await db
    .select({
      id: notices.id,
      title: notices.title,
      content: notices.content,
      author: {
        name: users.name,
        avatarUrl: users.avatarUrl,
      },
    })
    .from(notices)
    .innerJoin(users, eq(notices.authorId, users.id))
    .where(and(eq(notices.gymId, dbUser.gymId), eq(notices.active, true)))
    .limit(1);

  return {
    activeNotice: activeNotice || null,
    gymLogo,
    gymName,
    isOnboarded: dbUser.onboarded,
    occurrences: occurrencesWithRsvp,
    userName: dbUser.name,
  };
}

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

  if (!dbUser?.gymId) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8">
        <p className="text-muted-foreground">
          No club associated with your account.
        </p>
      </div>
    );
  }

  // Get gym info for logo
  const [gym] = await db
    .select()
    .from(gyms)
    .where(eq(gyms.id, dbUser.gymId))
    .limit(1);

  const gymLogo = gym?.logoUrl || null;
  const gymName = gym?.name || null;

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

    // Get RSVPs for each upcoming occurrence with user data including roles
    const occurrenceIds = upcomingOccurrences.map(
      ({ occurrence }) => occurrence.id
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
        if (
          rsvp.user.role === "coach" ||
          rsvp.user.role === "owner" ||
          rsvp.user.role === "manager"
        ) {
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
      }
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
        activeNotice={activeNotice || null}
        gymLogo={gymLogo}
        gymName={gymName}
        isOnboarded={dbUser.onboarded}
        occurrences={occurrencesWithRsvp}
        userName={dbUser.name}
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
      and(eq(events.gymId, dbUser.gymId), gte(eventOccurrences.date, today))
    )
    .orderBy(asc(eventOccurrences.date))
    .limit(10);

  const recentRsvps = await db
    .select({ count: sql<number>`count(*)` })
    .from(rsvps)
    .innerJoin(eventOccurrences, eq(rsvps.occurrenceId, eventOccurrences.id))
    .innerJoin(events, eq(eventOccurrences.eventId, events.id))
    .where(
      and(eq(events.gymId, dbUser.gymId), gte(eventOccurrences.date, today))
    );

  // Get RSVPs for each upcoming occurrence with user data including roles
  const occurrenceIds = upcomingOccurrences.map(
    ({ occurrence }) => occurrence.id
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
      notGoingAthletes: Array<{
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
      notGoingAthletes: [],
    };
    if (rsvp.status === "going") {
      current.going.push(rsvp.user);
      // Separate coaches and athletes
      if (
        rsvp.user.role === "coach" ||
        rsvp.user.role === "owner" ||
        rsvp.user.role === "manager"
      ) {
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
      // Track not going athletes separately for attendance
      if (rsvp.user.role === "athlete") {
        current.notGoingAthletes.push({
          id: rsvp.user.id,
          name: rsvp.user.name,
          email: rsvp.user.email,
          avatarUrl: rsvp.user.avatarUrl,
        });
      }
    }
    rsvpsByOccurrence.set(rsvp.occurrenceId, current);

    // Track current user's RSVP status
    if (rsvp.user.id === dbUser.id) {
      currentUserRsvpMap.set(
        rsvp.occurrenceId,
        rsvp.status as "going" | "not_going"
      );
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

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return email[0].toUpperCase();
  };

  // For coaches, use the new list view dashboard
  if (
    dbUser.role === "coach" ||
    dbUser.role === "owner" ||
    dbUser.role === "manager"
  ) {
    const occurrencesWithRsvp = upcomingOccurrences.map(
      ({ occurrence, event }) => {
        const rsvpData = rsvpsByOccurrence.get(occurrence.id) || {
          goingCoaches: [],
          goingAthletes: [],
          notGoingAthletes: [],
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
          rsvpStatus: currentUserRsvpMap.get(occurrence.id) || null,
          goingCoaches: rsvpData.goingCoaches.map((c) => ({
            id: c.id,
            name: c.name,
            email: c.email,
          })),
          goingAthletes: rsvpData.goingAthletes.map((a) => ({
            id: a.id,
            name: a.name,
            email: a.email,
          })),
          goingAthletesCount: rsvpData.goingAthletes.length,
          notGoingAthletes: rsvpData.notGoingAthletes.map((a) => ({
            id: a.id,
            name: a.name,
            email: a.email,
          })),
          notGoingAthletesCount: rsvpData.notGoingAthletes.length,
        };
      }
    );

    return (
      <CoachDashboard
        activeNotice={activeNotice || null}
        gymLogo={gymLogo}
        gymName={gymName}
        isOnboarded={dbUser.onboarded}
        occurrences={occurrencesWithRsvp}
        userName={dbUser.name}
        userRole={dbUser.role}
      />
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden dark:bg-[#000000]">
      <PageHeader
        description="Here's what's happening with your team"
        title={
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={dbUser?.avatarUrl || undefined} />
              <AvatarFallback className="text-sm">
                {getInitials(dbUser?.name || null, dbUser?.email || "")}
              </AvatarFallback>
            </Avatar>
            <span className="font-semibold">
              {dbUser?.name || dbUser?.email || "User"}
            </span>
          </div>
        }
      >
        <PWAInstallButton />
        <Button asChild className="gap-2 rounded-sm" size="sm">
          <Link href="/events/new">
            <IconPlus className="h-4 w-4" />
            New Event
          </Link>
        </Button>
      </PageHeader>

      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent
          activeNotice={activeNotice || null}
          currentUserRsvpMap={currentUserRsvpMap}
          dbUser={dbUser}
          gymLogo={gymLogo}
          gymName={gymName}
          isOnboarded={dbUser.onboarded}
          latestPosts={latestPosts}
          rsvpsByOccurrence={rsvpsByOccurrence}
          stats={stats}
          upcomingOccurrences={upcomingOccurrences}
          userRole={dbUser.role}
        />
      </Suspense>

      {/* Auto-appearing PWA install banner for supported browsers */}
      {dbUser.onboarded && <PWAInstallBanner />}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <div className="space-y-6">
        {/* Stats */}
        <div className="hidden grid-cols-3 gap-2 sm:gap-4 lg:grid">
          {[1, 2, 3].map((i) => (
            <Card className="rounded-xl border-0 shadow-sm" key={i}>
              <CardContent className="p-5">
                <Skeleton className="mb-3 h-10 w-10 rounded-xl" />
                <Skeleton className="mb-2 h-8 w-16" />
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
                    className="flex items-center gap-3 rounded-xl p-3"
                    key={i}
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
                    className="flex items-center gap-3 rounded-xl p-3"
                    key={i}
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
  dbUser: _dbUser,
  stats,
  upcomingOccurrences,
  rsvpsByOccurrence,
  activeNotice,
  latestPosts,
  userRole,
  currentUserRsvpMap,
  isOnboarded: _isOnboarded,
  gymLogo,
  gymName,
}: {
  dbUser: { name: string | null; email: string };
  stats: Array<{
    label: string;
    value: number;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
  }>;
  upcomingOccurrences: Array<{
    occurrence: typeof eventOccurrences.$inferSelect;
    event: typeof events.$inferSelect;
  }>;
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
  gymLogo: string | null;
  gymName: string | null;
}) {
  return (
    <div className="min-h-0 flex-1 overflow-auto dark:bg-[#000000]">
      <div className="space-y-4 px-4 pb-4 md:space-y-6 md:px-6">
        {/* Active Notice */}
        {activeNotice && (
          <Card className="rounded-xl border border-primary/20 bg-primary/5">
            <CardContent className="px-4 py-3 md:py-2">
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-sm leading-tight md:text-sm">
                    {activeNotice.title}
                  </h3>
                  <Badge className="rounded-lg text-xs" variant="default">
                    Notice
                  </Badge>
                </div>
                <p className="line-clamp-2 text-muted-foreground text-sm">
                  {activeNotice.content}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="hidden grid-cols-3 gap-2 sm:gap-4 lg:grid">
          {stats.map((stat) => (
            <Card className="rounded-xl border shadow-sm" key={stat.label}>
              <CardContent className="p-3 sm:p-5">
                <div
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-xl sm:h-10 sm:w-10 ${stat.color} mb-2 sm:mb-3`}
                >
                  <stat.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <p className="font-semibold text-2xl tracking-tight sm:text-3xl">
                  {stat.value}
                </p>
                <p className="mt-1 text-muted-foreground text-xs sm:text-sm">
                  {stat.label}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Gym Logo - Mobile Only */}
        {gymLogo && (
          <div className="flex justify-center py-2 lg:hidden">
            <Image
              alt={gymName || "Club"}
              className="h-auto w-[150px]"
              height={150}
              src={gymLogo}
              width={150}
            />
          </div>
        )}

        {/* Content Grid */}
        <div className="grid gap-2 md:gap-4 lg:grid-cols-2 lg:gap-6">
          {/* Upcoming Events */}
          <DashboardEventsList
            currentUserRsvpMap={currentUserRsvpMap}
            rsvpsByOccurrence={rsvpsByOccurrence}
            upcomingOccurrences={upcomingOccurrences}
            userRole={userRole}
          />

          {/* Show link to blog only when there are no posts */}
          {latestPosts.length === 0 && (
            <div className="flex justify-center">
              <Button
                asChild
                className="rounded-lg md:rounded-xl"
                size="sm"
                variant="outline"
              >
                <Link href="/blog">View blog in dashboard</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
