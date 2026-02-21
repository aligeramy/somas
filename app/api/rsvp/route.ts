import { and, asc, desc, eq, gte, inArray, lte, or, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { eventOccurrences, events, rsvps, users } from "@/drizzle/schema";
import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

type DbUser = typeof users.$inferSelect;

interface SummaryRow {
  occurrenceId: string;
  status: string;
  userId: string;
  userName: string | null;
  userAvatarUrl: string | null;
  userRole: string;
}

function buildSummaryMap(
  occurrenceIds: string[],
  rsvpsList: SummaryRow[],
  dbUser: DbUser
): Record<
  string,
  {
    goingCount: number;
    notGoingCount: number;
    coaches: Array<{
      id: string;
      name: string | null;
      avatarUrl: string | null;
    }>;
  }
> {
  const summaryMap: Record<
    string,
    {
      goingCount: number;
      notGoingCount: number;
      coaches: Array<{
        id: string;
        name: string | null;
        avatarUrl: string | null;
      }>;
    }
  > = {};
  for (const occId of occurrenceIds) {
    summaryMap[occId] = { goingCount: 0, notGoingCount: 0, coaches: [] };
  }
  for (const r of rsvpsList) {
    if (!summaryMap[r.occurrenceId]) {
      continue;
    }
    if (r.userRole === "athlete") {
      if (r.status === "going") {
        summaryMap[r.occurrenceId].goingCount++;
      } else if (r.status === "not_going") {
        summaryMap[r.occurrenceId].notGoingCount++;
      }
    }
    const isCoachRole =
      r.userRole === "coach" ||
      r.userRole === "owner" ||
      r.userRole === "manager";
    if (dbUser.role === "athlete" && isCoachRole && r.status === "going") {
      summaryMap[r.occurrenceId].coaches.push({
        id: r.userId,
        name: r.userName,
        avatarUrl: r.userAvatarUrl,
      });
    }
  }
  return summaryMap;
}

function getRsvpsByOccurrenceId(occurrenceId: string) {
  return db
    .select({
      rsvp: rsvps,
      user: {
        id: users.id,
        name: users.name,
        email: users.email,
        avatarUrl: users.avatarUrl,
        role: users.role,
        phone: users.phone,
        cellPhone: users.cellPhone,
      },
    })
    .from(rsvps)
    .innerJoin(users, eq(rsvps.userId, users.id))
    .where(eq(rsvps.occurrenceId, occurrenceId));
}

async function getSummaryRsvps(
  occurrenceIds: string[],
  dbUser: DbUser
): Promise<NextResponse> {
  const isStaff =
    dbUser.role === "owner" ||
    dbUser.role === "coach" ||
    dbUser.role === "manager";
  if (isStaff && !dbUser.gymId) {
    return NextResponse.json(
      { error: "User must belong to a club" },
      { status: 400 }
    );
  }

  let rsvpsList: SummaryRow[];
  if (isStaff) {
    const gymId = dbUser.gymId;
    if (!gymId) {
      return NextResponse.json(
        { error: "User must belong to a club" },
        { status: 400 }
      );
    }
    rsvpsList = await db
      .select({
        occurrenceId: rsvps.occurrenceId,
        status: rsvps.status,
        userId: users.id,
        userName: users.name,
        userAvatarUrl: users.avatarUrl,
        userRole: users.role,
      })
      .from(rsvps)
      .innerJoin(users, eq(rsvps.userId, users.id))
      .innerJoin(eventOccurrences, eq(rsvps.occurrenceId, eventOccurrences.id))
      .innerJoin(events, eq(eventOccurrences.eventId, events.id))
      .where(
        and(
          inArray(rsvps.occurrenceId, occurrenceIds),
          eq(events.gymId, gymId),
          or(eq(rsvps.status, "going"), eq(rsvps.status, "not_going"))
        )
      );
  } else {
    rsvpsList = await db
      .select({
        occurrenceId: rsvps.occurrenceId,
        status: rsvps.status,
        userId: users.id,
        userName: users.name,
        userAvatarUrl: users.avatarUrl,
        userRole: users.role,
      })
      .from(rsvps)
      .innerJoin(users, eq(rsvps.userId, users.id))
      .where(
        and(
          inArray(rsvps.occurrenceId, occurrenceIds),
          or(eq(rsvps.status, "going"), eq(rsvps.status, "not_going"))
        )
      );
  }

  const summaryMap = buildSummaryMap(occurrenceIds, rsvpsList, dbUser);
  return NextResponse.json({ summary: summaryMap });
}

function buildDateCondition(
  includePast: boolean,
  startDate: string | null,
  endDate: string | null,
  eventId: string | null
) {
  if (includePast || startDate || endDate || eventId) {
    return null;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return sql`DATE(${eventOccurrences.date}) >= DATE(${sql.raw(`'${today.toISOString().split("T")[0]}'`)}::date)`;
}

async function getRsvpsForStaff(
  dbUser: DbUser,
  params: {
    eventId: string | null;
    userId: string | null;
    includePast: boolean;
    startDate: string | null;
    endDate: string | null;
  }
): Promise<NextResponse> {
  if (!dbUser.gymId) {
    return NextResponse.json(
      { error: "User must belong to a club" },
      { status: 400 }
    );
  }
  const conditions = [eq(events.gymId, dbUser.gymId)];
  if (params.eventId) {
    conditions.push(eq(events.id, params.eventId));
  }
  if (params.userId) {
    conditions.push(eq(rsvps.userId, params.userId));
  }
  if (params.startDate) {
    conditions.push(gte(eventOccurrences.date, new Date(params.startDate)));
  }
  if (params.endDate) {
    conditions.push(lte(eventOccurrences.date, new Date(params.endDate)));
  }
  const dateCond = buildDateCondition(
    params.includePast,
    params.startDate,
    params.endDate,
    params.eventId
  );
  if (dateCond) {
    conditions.push(dateCond);
  }

  const rsvpsList = await db
    .select({
      rsvp: rsvps,
      user: {
        id: users.id,
        name: users.name,
        email: users.email,
        avatarUrl: users.avatarUrl,
        role: users.role,
      },
      occurrence: eventOccurrences,
      event: events,
    })
    .from(rsvps)
    .innerJoin(users, eq(rsvps.userId, users.id))
    .innerJoin(eventOccurrences, eq(rsvps.occurrenceId, eventOccurrences.id))
    .innerJoin(events, eq(eventOccurrences.eventId, events.id))
    .where(and(...conditions))
    .orderBy(
      params.includePast
        ? desc(eventOccurrences.date)
        : asc(eventOccurrences.date)
    );

  const formattedRsvps = rsvpsList.map(({ rsvp, user, occurrence, event }) => ({
    ...rsvp,
    user,
    occurrence: { ...occurrence, event },
  }));
  return NextResponse.json({ rsvps: formattedRsvps });
}

async function getRsvpsForAthlete(
  authUserId: string,
  params: {
    eventId: string | null;
    includePast: boolean;
    startDate: string | null;
    endDate: string | null;
  }
): Promise<NextResponse> {
  const conditions = [eq(rsvps.userId, authUserId)];
  if (params.eventId) {
    conditions.push(eq(events.id, params.eventId));
  }
  if (params.startDate) {
    conditions.push(gte(eventOccurrences.date, new Date(params.startDate)));
  }
  if (params.endDate) {
    conditions.push(lte(eventOccurrences.date, new Date(params.endDate)));
  }
  const dateCond = buildDateCondition(
    params.includePast,
    params.startDate,
    params.endDate,
    params.eventId
  );
  if (dateCond) {
    conditions.push(dateCond);
  }

  const rsvpsList = await db
    .select({
      rsvp: rsvps,
      occurrence: eventOccurrences,
      event: events,
    })
    .from(rsvps)
    .innerJoin(eventOccurrences, eq(rsvps.occurrenceId, eventOccurrences.id))
    .innerJoin(events, eq(eventOccurrences.eventId, events.id))
    .where(and(...conditions))
    .orderBy(
      params.includePast
        ? desc(eventOccurrences.date)
        : asc(eventOccurrences.date)
    );

  const formattedRsvps = rsvpsList.map(({ rsvp, occurrence, event }) => ({
    ...rsvp,
    occurrence: { ...occurrence, event },
  }));
  return NextResponse.json({ rsvps: formattedRsvps });
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [dbUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Athletes, coaches, owners, and managers can RSVP
    if (
      dbUser.role !== "athlete" &&
      dbUser.role !== "coach" &&
      dbUser.role !== "owner" &&
      dbUser.role !== "manager"
    ) {
      return NextResponse.json(
        { error: "Only athletes, coaches, owners, and managers can RSVP" },
        { status: 403 }
      );
    }

    const { occurrenceId, status } = await request.json();

    if (!occurrenceId) {
      return NextResponse.json(
        { error: "Occurrence ID is required" },
        { status: 400 }
      );
    }

    // Verify occurrence exists and is in the future
    const [occurrence] = await db
      .select()
      .from(eventOccurrences)
      .where(eq(eventOccurrences.id, occurrenceId))
      .limit(1);

    if (!occurrence) {
      return NextResponse.json(
        { error: "Event occurrence not found" },
        { status: 404 }
      );
    }

    // Compare dates at midnight to avoid timezone/time-of-day issues
    const occurrenceDate = new Date(occurrence.date);
    occurrenceDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (occurrenceDate < today) {
      return NextResponse.json(
        { error: "Cannot RSVP to past events" },
        { status: 400 }
      );
    }

    if (occurrence.status === "canceled") {
      return NextResponse.json(
        { error: "Event has been canceled" },
        { status: 400 }
      );
    }

    // Create or update RSVP
    const [existingRsvp] = await db
      .select()
      .from(rsvps)
      .where(
        and(eq(rsvps.userId, user.id), eq(rsvps.occurrenceId, occurrenceId))
      )
      .limit(1);

    let rsvp: typeof rsvps.$inferSelect;
    if (existingRsvp) {
      const updated = await db
        .update(rsvps)
        .set({ status: (status || "going") as "going" | "not_going" })
        .where(eq(rsvps.id, existingRsvp.id))
        .returning();
      rsvp = updated[0];
    } else {
      const inserted = await db
        .insert(rsvps)
        .values({
          userId: user.id,
          occurrenceId,
          status: (status || "going") as "going" | "not_going",
        })
        .returning();
      rsvp = inserted[0];
    }

    if (!rsvp) {
      return NextResponse.json(
        { error: "Failed to create RSVP" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, rsvp });
  } catch (error) {
    console.error("RSVP error:", error);
    return NextResponse.json({ error: "Failed to RSVP" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [dbUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const occurrenceId = searchParams.get("occurrenceId");
    const eventId = searchParams.get("eventId");
    const userId = searchParams.get("userId");
    const includePast = searchParams.get("includePast") === "true";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (occurrenceId) {
      const rsvpsList = await getRsvpsByOccurrenceId(occurrenceId);
      const formattedRsvps = rsvpsList.map(({ rsvp, user: u }) => ({
        ...rsvp,
        user: u,
      }));
      return NextResponse.json({ rsvps: formattedRsvps });
    }

    const summaryOccurrences = searchParams.get("summaryOccurrences");
    if (summaryOccurrences) {
      return getSummaryRsvps(summaryOccurrences.split(","), dbUser);
    }

    const isStaff =
      dbUser.role === "owner" ||
      dbUser.role === "coach" ||
      dbUser.role === "manager";
    if (isStaff) {
      return getRsvpsForStaff(dbUser, {
        eventId,
        userId,
        includePast,
        startDate,
        endDate,
      });
    }

    return getRsvpsForAthlete(user.id, {
      eventId,
      includePast,
      startDate,
      endDate,
    });
  } catch (error) {
    console.error("RSVP fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch RSVPs" },
      { status: 500 }
    );
  }
}
