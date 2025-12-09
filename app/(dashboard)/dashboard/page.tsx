import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { users, events, eventOccurrences, rsvps } from "@/drizzle/schema";
import { eq, and, gte, asc, sql } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { IconChevronRight, IconUsers, IconCalendar, IconCheck, IconClock } from "@tabler/icons-react";
import { PageHeader } from "@/components/page-header";

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

  // Get stats
  const totalMembers = await db
    .select({ count: sql<number>`count(*)` })
    .from(users)
    .where(eq(users.gymId, dbUser.gymId));

  const totalEvents = await db
    .select({ count: sql<number>`count(*)` })
    .from(events)
    .where(eq(events.gymId, dbUser.gymId));

  // Get upcoming event occurrences (next 7 days)
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

  // Get recent RSVPs count
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

  // Get recent members
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
    if (isNaN(date.getTime())) return { day: "", month: "", weekday: "" };
    return {
      day: date.getDate().toString(),
      month: date.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
      weekday: date.toLocaleDateString("en-US", { weekday: "short" }),
    };
  }

  function formatTime(time: string | null) {
    if (!time) return "";
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    if (isNaN(hour)) return time;
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
      />

      <div className="flex-1 overflow-auto">
        <div className="p-4 lg:p-6 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {stats.map((stat) => (
              <Card key={stat.label} className="rounded-2xl border-0 shadow-sm">
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
            <Card className="rounded-2xl">
              <CardHeader className="pb-3">
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
                      <Link href="/events">Create an event</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {upcomingOccurrences.map(({ occurrence, event }) => {
                      const dateInfo = formatDate(occurrence.date);
                      const isCanceled = occurrence.status === "canceled";

                      return (
                        <Link
                          key={occurrence.id}
                          href="/events"
                          className={`flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors ${
                            isCanceled ? "opacity-50" : ""
                          }`}
                        >
                          {/* Big Date */}
                          <div className="h-12 w-12 rounded-xl bg-muted flex flex-col items-center justify-center flex-shrink-0">
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
                          {isCanceled && (
                            <Badge variant="destructive" className="text-[10px] rounded-md">Canceled</Badge>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Team Members */}
            <Card className="rounded-2xl">
              <CardHeader className="pb-3">
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
                          <AvatarFallback className="rounded-xl text-xs bg-gradient-to-br from-primary/20 to-primary/5">
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
    </div>
  );
}
