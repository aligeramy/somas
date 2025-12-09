import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { users, events, eventOccurrences, rsvps } from "@/drizzle/schema";
import { eq, and, gte, asc, sql } from "drizzle-orm";
import { DashboardStats } from "@/components/dashboard-stats";
import { UpcomingEvents } from "@/components/upcoming-events";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return null;
  }

  // Get user from database
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

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
        <DashboardStats
          totalAthletes={Number(totalAthletes[0]?.count || 0)}
          totalEvents={Number(totalEvents[0]?.count || 0)}
          upcomingRsvps={Number(recentRsvps[0]?.count || 0)}
        />
        <UpcomingEvents occurrences={upcomingOccurrences.map(({ occurrence, event }) => ({
          ...occurrence,
          date: occurrence.date instanceof Date ? occurrence.date.toISOString() : occurrence.date,
          event,
        }))} />
      </div>
    </div>
  );
}

