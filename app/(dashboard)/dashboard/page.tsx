import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { users, events, eventOccurrences, rsvps } from "@/drizzle/schema";
import { eq, and, gte, asc, sql } from "drizzle-orm";
import { DashboardStats } from "@/components/dashboard-stats";
import { UpcomingEvents } from "@/components/upcoming-events";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { IconChevronRight } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";

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
  const totalAthletes = await db
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

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-col gap-6 py-6 px-4 lg:px-6">
        {/* Welcome */}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome back{dbUser.name ? `, ${dbUser.name.split(" ")[0]}` : ""}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Here's what's happening with your team
          </p>
        </div>

        {/* Stats */}
        <DashboardStats
          totalAthletes={Number(totalAthletes[0]?.count || 0)}
          totalEvents={Number(totalEvents[0]?.count || 0)}
          upcomingRsvps={Number(recentRsvps[0]?.count || 0)}
        />

        {/* Content Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Upcoming Events */}
          <UpcomingEvents
            occurrences={upcomingOccurrences.map(({ occurrence, event }) => ({
              ...occurrence,
              date: occurrence.date instanceof Date ? occurrence.date.toISOString() : occurrence.date,
              startTime: event.startTime,
              endTime: event.endTime,
              event,
            }))}
          />

          {/* Team Members */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">Team</CardTitle>
                <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
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
                  <p className="text-sm text-muted-foreground mb-4">No team members yet</p>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/roster">Add members</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 p-2 rounded-lg"
                    >
                      <Avatar className="h-9 w-9 border">
                        <AvatarImage src={member.avatarUrl || undefined} />
                        <AvatarFallback className="text-xs bg-gradient-to-br from-primary/20 to-primary/5">
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
                        className="text-[10px] px-1.5"
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
