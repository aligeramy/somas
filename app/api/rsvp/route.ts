import { and, asc, desc, eq, gte, inArray, lte, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { eventOccurrences, events, rsvps, users } from "@/drizzle/schema";
import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

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

    // Athletes, coaches, and owners can RSVP
    if (
      dbUser.role !== "athlete" &&
      dbUser.role !== "coach" &&
      dbUser.role !== "owner"
    ) {
      return NextResponse.json(
        { error: "Only athletes, coaches, and owners can RSVP" },
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

    let rsvp;
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
    const eventId = searchParams.get("eventId"); // Filter by event
    const userId = searchParams.get("userId"); // For coaches to filter by person
    const includePast = searchParams.get("includePast") === "true"; // Include historical data
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (occurrenceId) {
      // Get RSVPs for a specific occurrence
      const rsvpsList = await db
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

      const formattedRsvps = rsvpsList.map(({ rsvp, user }) => ({
        ...rsvp,
        user,
      }));

      return NextResponse.json({ rsvps: formattedRsvps });
    }

    // Get summary counts for multiple occurrences (for athlete view or owner/coach view)
    const summaryOccurrences = searchParams.get("summaryOccurrences");
    if (summaryOccurrences) {
      const occurrenceIds = summaryOccurrences.split(",");

      // For owner/coach, filter by gymId for security
      let rsvpsList;
      if (dbUser.role === "owner" || dbUser.role === "coach") {
        if (!dbUser.gymId) {
          return NextResponse.json(
            { error: "User must belong to a gym" },
            { status: 400 }
          );
        }
        // Get all RSVPs for these occurrences, filtered by gymId
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
          .innerJoin(
            eventOccurrences,
            eq(rsvps.occurrenceId, eventOccurrences.id)
          )
          .innerJoin(events, eq(eventOccurrences.eventId, events.id))
          .where(
            and(
              inArray(rsvps.occurrenceId, occurrenceIds),
              eq(events.gymId, dbUser.gymId),
              or(eq(rsvps.status, "going"), eq(rsvps.status, "not_going"))
            )
          );
      } else {
        // For athletes, just filter by occurrenceIds
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

      // Group by occurrence
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

      for (const rsvp of rsvpsList) {
        if (summaryMap[rsvp.occurrenceId]) {
          // Count athletes separately for going and not going
          if (rsvp.userRole === "athlete") {
            if (rsvp.status === "going") {
              summaryMap[rsvp.occurrenceId].goingCount++;
            } else if (rsvp.status === "not_going") {
              summaryMap[rsvp.occurrenceId].notGoingCount++;
            }
          }
          // For athlete view, include coaches
          if (
            dbUser.role === "athlete" &&
            (rsvp.userRole === "coach" || rsvp.userRole === "owner") &&
            rsvp.status === "going"
          ) {
            summaryMap[rsvp.occurrenceId].coaches.push({
              id: rsvp.userId,
              name: rsvp.userName,
              avatarUrl: rsvp.userAvatarUrl,
            });
          }
        }
      }

      return NextResponse.json({ summary: summaryMap });
    }

    // If owner or coach, get all RSVPs for their gym
    // Otherwise, get only user's RSVPs
    if (dbUser.role === "owner" || dbUser.role === "coach") {
      if (!dbUser.gymId) {
        return NextResponse.json(
          { error: "User must belong to a gym" },
          { status: 400 }
        );
      }

      // Build where conditions
      const conditions = [eq(events.gymId, dbUser.gymId)];

      // Filter by eventId if provided
      if (eventId) {
        conditions.push(eq(events.id, eventId));
      }

      // Filter by userId if provided
      if (userId) {
        conditions.push(eq(rsvps.userId, userId));
      }

      // Filter by date range if provided
      if (startDate) {
        conditions.push(gte(eventOccurrences.date, new Date(startDate)));
      }
      if (endDate) {
        conditions.push(lte(eventOccurrences.date, new Date(endDate)));
      }

      // If not including past, only get future events
      if (!(includePast || startDate || endDate || eventId)) {
        conditions.push(gte(eventOccurrences.date, new Date()));
      }

      // Get all RSVPs for events in this gym
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
        .innerJoin(
          eventOccurrences,
          eq(rsvps.occurrenceId, eventOccurrences.id)
        )
        .innerJoin(events, eq(eventOccurrences.eventId, events.id))
        .where(and(...conditions))
        .orderBy(
          includePast ? desc(eventOccurrences.date) : asc(eventOccurrences.date)
        );

      const formattedRsvps = rsvpsList.map(
        ({ rsvp, user, occurrence, event }) => ({
          ...rsvp,
          user,
          occurrence: {
            ...occurrence,
            event,
          },
        })
      );

      return NextResponse.json({ rsvps: formattedRsvps });
    }

    // Get user's RSVPs (for athletes)
    const conditions = [eq(rsvps.userId, user.id)];

    // Filter by eventId if provided
    if (eventId) {
      conditions.push(eq(events.id, eventId));
    }

    // Filter by date range if provided
    if (startDate) {
      conditions.push(gte(eventOccurrences.date, new Date(startDate)));
    }
    if (endDate) {
      conditions.push(lte(eventOccurrences.date, new Date(endDate)));
    }

    // If not including past, only get future events
    if (!(includePast || startDate || endDate || eventId)) {
      conditions.push(gte(eventOccurrences.date, new Date()));
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
        includePast ? desc(eventOccurrences.date) : asc(eventOccurrences.date)
      );

    const formattedRsvps = rsvpsList.map(({ rsvp, occurrence, event }) => ({
      ...rsvp,
      occurrence: {
        ...occurrence,
        event,
      },
    }));

    return NextResponse.json({ rsvps: formattedRsvps });
  } catch (error) {
    console.error("RSVP fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch RSVPs" },
      { status: 500 }
    );
  }
}
