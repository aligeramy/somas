import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { users, rsvps, eventOccurrences, events } from "@/drizzle/schema";
import { eq, and, asc } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [dbUser] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Only athletes can RSVP
    if (dbUser.role !== "athlete") {
      return NextResponse.json(
        { error: "Only athletes can RSVP" },
        { status: 403 },
      );
    }

    const { occurrenceId, status } = await request.json();

    if (!occurrenceId) {
      return NextResponse.json(
        { error: "Occurrence ID is required" },
        { status: 400 },
      );
    }

    // Verify occurrence exists and is in the future
    const [occurrence] = await db.select()
      .from(eventOccurrences)
      .where(eq(eventOccurrences.id, occurrenceId))
      .limit(1);

    if (!occurrence) {
      return NextResponse.json(
        { error: "Event occurrence not found" },
        { status: 404 },
      );
    }

    if (occurrence.date < new Date()) {
      return NextResponse.json(
        { error: "Cannot RSVP to past events" },
        { status: 400 },
      );
    }

    if (occurrence.status === "canceled") {
      return NextResponse.json(
        { error: "Event has been canceled" },
        { status: 400 },
      );
    }

    // Create or update RSVP
    const [existingRsvp] = await db.select()
      .from(rsvps)
      .where(
        and(
          eq(rsvps.userId, user.id),
          eq(rsvps.occurrenceId, occurrenceId)
        )
      )
      .limit(1);

    let rsvp;
    if (existingRsvp) {
      [rsvp] = await db.update(rsvps)
        .set({ status: (status || "going") as "going" | "not_going" })
        .where(eq(rsvps.id, existingRsvp.id))
        .returning();
    } else {
      [rsvp] = await db.insert(rsvps).values({
        userId: user.id,
        occurrenceId,
        status: (status || "going") as "going" | "not_going",
      }).returning();
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

    const [dbUser] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const occurrenceId = searchParams.get("occurrenceId");

    if (occurrenceId) {
      // Get RSVPs for a specific occurrence
      const rsvpsList = await db.select({
        rsvp: rsvps,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
          avatarUrl: users.avatarUrl,
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

    // If owner or coach, get all RSVPs for their gym
    // Otherwise, get only user's RSVPs
    if (dbUser.role === "owner" || dbUser.role === "coach") {
      if (!dbUser.gymId) {
        return NextResponse.json({ error: "User must belong to a gym" }, { status: 400 });
      }

      // Get all RSVPs for events in this gym
      const rsvpsList = await db.select({
        rsvp: rsvps,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
          avatarUrl: users.avatarUrl,
        },
        occurrence: eventOccurrences,
        event: events,
      })
        .from(rsvps)
        .innerJoin(users, eq(rsvps.userId, users.id))
        .innerJoin(eventOccurrences, eq(rsvps.occurrenceId, eventOccurrences.id))
        .innerJoin(events, eq(eventOccurrences.eventId, events.id))
        .where(eq(events.gymId, dbUser.gymId))
        .orderBy(asc(eventOccurrences.date));

      const formattedRsvps = rsvpsList.map(({ rsvp, user, occurrence, event }) => ({
        ...rsvp,
        user,
        occurrence: {
          ...occurrence,
          event,
        },
      }));

      return NextResponse.json({ rsvps: formattedRsvps });
    }

    // Get user's RSVPs (for athletes)
    const rsvpsList = await db.select({
      rsvp: rsvps,
      occurrence: eventOccurrences,
      event: events,
    })
      .from(rsvps)
      .innerJoin(eventOccurrences, eq(rsvps.occurrenceId, eventOccurrences.id))
      .innerJoin(events, eq(eventOccurrences.eventId, events.id))
      .where(eq(rsvps.userId, user.id))
      .orderBy(asc(eventOccurrences.date));

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
      { status: 500 },
    );
  }
}

