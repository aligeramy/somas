import {
  IconCalendar,
  IconCheck,
  IconChevronRight,
  IconPlus,
  IconUsers,
} from "@tabler/icons-react";
import { and, asc, desc, eq, gte, inArray, sql } from "drizzle-orm";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { AthleteDashboard } from "@/components/athlete-dashboard";
import { DashboardEventsList } from "@/components/dashboard-events-list";
import { PageHeader } from "@/components/page-header";
import { PWAInstallBanner } from "@/components/pwa-install-banner";
import { PWAInstallButton } from "@/components/pwa-install-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
        gymLogo={gymLogo}
        gymName={gymName}
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
      currentUserRsvpMap.set(
        rsvp.occurrenceId,
        rsvp.status as "going" | "not_going",
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

  return (
    <div className="flex flex-1 flex-col min-h-0 h-full overflow-hidden dark:bg-[#000000]">
      <PageHeader
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
        description="Here's what's happening with your team"
      >
        <PWAInstallButton />
        <Button size="sm" className="gap-2 rounded-sm" asChild>
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
          activeNotice={activeNotice || null}
          latestPosts={latestPosts}
          userRole={dbUser.role}
          currentUserRsvpMap={currentUserRsvpMap}
          isOnboarded={dbUser.onboarded}
          gymLogo={gymLogo}
          gymName={gymName}
        />
      </Suspense>

      {/* Auto-appearing PWA install banner for supported browsers */}
      {dbUser.onboarded && <PWAInstallBanner />}
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
    <div className="flex-1 overflow-auto min-h-0 dark:bg-[#000000]">
      <div className="space-y-4 md:space-y-6 px-4 md:px-6 pb-4">
        {/* Active Notice */}
        {activeNotice && (
          <Card className="rounded-xl border border-primary/20 bg-primary/5">
            <CardContent className="px-4 py-3 md:py-2">
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-sm md:text-sm leading-tight">
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

        {/* Gym Logo - Mobile Only */}
        {gymLogo && (
          <div className="lg:hidden flex justify-center py-2">
            <Image
              src={gymLogo}
              alt={gymName || "Club"}
              width={150}
              height={150}
              className="w-[150px] h-auto"
            />
          </div>
        )}

        {/* Content Grid */}
        <div className="grid gap-2 md:gap-4 lg:gap-6 lg:grid-cols-2">
          {/* Upcoming Events */}
          <DashboardEventsList
            upcomingOccurrences={upcomingOccurrences}
            rsvpsByOccurrence={rsvpsByOccurrence}
            userRole={userRole}
            currentUserRsvpMap={currentUserRsvpMap}
          />

          {/* Latest Posts */}
          <Card className="rounded-xl md:rounded-xl border-0 md:border shadow-none md:shadow-sm bg-transparent md:bg-card">
            <CardHeader className="pb-2 px-0 md:px-6 pt-0 md:pt-6">
              <div className="flex items-center justify-between">
                <CardTitle className="font-semibold text-lg md:text-base">
                  Latest Posts
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="text-muted-foreground rounded-lg md:rounded-xl text-sm"
                >
                  <Link href="/blog">
                    <span className="md:hidden">All</span>
                    <span className="hidden md:inline">View all</span>
                    <IconChevronRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0 px-0 md:px-6">
              {latestPosts.length === 0 ? (
                <div className="text-center py-12 md:py-8">
                  <IconCalendar className="mx-auto mb-3 text-muted-foreground/30 h-12 w-12 md:h-10 md:w-10" />
                  <p className="text-muted-foreground mb-4 text-base md:text-sm">
                    No blog posts yet
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="rounded-lg md:rounded-xl"
                  >
                    <Link href="/blog">View blog</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 md:space-y-2">
                  {latestPosts.map((post) => (
                    <Link
                      key={post.id}
                      href={`/blog/${post.id}`}
                      className="block transition-all bg-card border border-border rounded-2xl shadow-sm p-4 active:scale-[0.98] hover:bg-muted/30 md:bg-transparent md:border-0 md:shadow-none md:p-3 md:rounded-xl md:hover:bg-muted/50 md:active:scale-100"
                    >
                      <div className="flex gap-3">
                        {post.imageUrl && (
                          <Image
                            src={post.imageUrl}
                            alt={post.title}
                            width={80}
                            height={80}
                            className="rounded-lg object-cover w-20 h-20 md:w-16 md:h-16"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge
                              variant="outline"
                              className="rounded-md md:rounded-lg text-xs"
                            >
                              {post.type}
                            </Badge>
                            <span className="text-muted-foreground text-xs">
                              {post.author.name}
                            </span>
                          </div>
                          <h3 className="font-semibold truncate text-base mb-1 md:text-sm md:mb-0">
                            {post.title}
                          </h3>
                          <p className="text-muted-foreground line-clamp-2 text-sm mt-1 md:text-xs">
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
