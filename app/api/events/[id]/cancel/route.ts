import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { eventOccurrences, events, users } from "@/drizzle/schema";
import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    if (!dbUser?.gymId) {
      return NextResponse.json(
        { error: "User must belong to a gym" },
        { status: 400 }
      );
    }

    // Only head coaches and coaches can cancel events
    if (
      dbUser.role !== "owner" &&
      dbUser.role !== "manager" &&
      dbUser.role !== "coach"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: eventId } = await params;
    const body = await request.json();
    const { occurrenceId, restore = false } = body;

    if (!occurrenceId) {
      return NextResponse.json(
        { error: "Occurrence ID is required" },
        { status: 400 }
      );
    }

    // Verify occurrence belongs to user's gym
    const [occurrence] = await db
      .select({
        id: eventOccurrences.id,
        eventId: eventOccurrences.eventId,
        date: eventOccurrences.date,
        status: eventOccurrences.status,
        gymId: events.gymId,
      })
      .from(eventOccurrences)
      .innerJoin(events, eq(eventOccurrences.eventId, events.id))
      .where(and(eq(eventOccurrences.id, occurrenceId), eq(events.id, eventId)))
      .limit(1);

    if (!occurrence) {
      return NextResponse.json(
        { error: "Event occurrence not found" },
        { status: 404 }
      );
    }

    if (occurrence.gymId !== dbUser.gymId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Toggle status based on restore flag
    const newStatus = restore ? "scheduled" : "canceled";

    await db
      .update(eventOccurrences)
      .set({
        status: newStatus,
        updatedAt: new Date(),
      })
      .where(eq(eventOccurrences.id, occurrenceId));

    return NextResponse.json({
      success: true,
      status: newStatus,
    });
  } catch (error) {
    console.error("Event cancellation error:", error);
    return NextResponse.json(
      { error: "Failed to update event" },
      { status: 500 }
    );
  }
}
