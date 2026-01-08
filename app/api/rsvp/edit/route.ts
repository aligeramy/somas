import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { eventOccurrences, events, rsvps, users } from "@/drizzle/schema";
import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

// Coach/Head Coach can edit someone's RSVP
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

    // Only head coaches and coaches can edit RSVPs
    if (dbUser.role !== "owner" && dbUser.role !== "coach") {
      return NextResponse.json(
        { error: "Only head coaches and coaches can edit RSVPs" },
        { status: 403 }
      );
    }

    const { userId, occurrenceId, status } = await request.json();

    if (!(userId && occurrenceId && status)) {
      return NextResponse.json(
        { error: "userId, occurrenceId, and status are required" },
        { status: 400 }
      );
    }

    // Verify occurrence exists and belongs to the same gym
    const [occurrence] = await db
      .select({
        occurrence: eventOccurrences,
        event: events,
      })
      .from(eventOccurrences)
      .innerJoin(events, eq(eventOccurrences.eventId, events.id))
      .where(eq(eventOccurrences.id, occurrenceId))
      .limit(1);

    if (!occurrence) {
      return NextResponse.json(
        { error: "Event occurrence not found" },
        { status: 404 }
      );
    }

    if (occurrence.event.gymId !== dbUser.gymId) {
      return NextResponse.json(
        { error: "Not authorized to edit RSVPs for this event" },
        { status: 403 }
      );
    }

    // Verify target user exists and belongs to the same gym
    const [targetUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!targetUser || targetUser.gymId !== dbUser.gymId) {
      return NextResponse.json(
        { error: "User not found in your gym" },
        { status: 404 }
      );
    }

    // Create or update RSVP
    const [existingRsvp] = await db
      .select()
      .from(rsvps)
      .where(
        and(eq(rsvps.userId, userId), eq(rsvps.occurrenceId, occurrenceId))
      )
      .limit(1);

    let rsvp;
    if (existingRsvp) {
      [rsvp] = await db
        .update(rsvps)
        .set({
          status: status as "going" | "not_going",
          updatedBy: user.id, // Track who made the change
          updatedAt: new Date(),
        })
        .where(eq(rsvps.id, existingRsvp.id))
        .returning();
    } else {
      [rsvp] = await db
        .insert(rsvps)
        .values({
          userId,
          occurrenceId,
          status: status as "going" | "not_going",
          updatedBy: user.id,
        })
        .returning();
    }

    return NextResponse.json({
      success: true,
      rsvp,
      editedBy: {
        id: dbUser.id,
        name: dbUser.name,
      },
    });
  } catch (error) {
    console.error("Edit RSVP error:", error);
    return NextResponse.json({ error: "Failed to edit RSVP" }, { status: 500 });
  }
}
