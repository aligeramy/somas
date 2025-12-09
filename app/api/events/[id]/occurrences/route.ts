import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { users, events, eventOccurrences } from "@/drizzle/schema";
import { eq, and } from "drizzle-orm";

// POST - Add custom occurrence
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [dbUser] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);

    if (!dbUser || !dbUser.gymId) {
      return NextResponse.json({ error: "User must belong to a gym" }, { status: 400 });
    }

    if (dbUser.role !== "owner" && dbUser.role !== "coach") {
      return NextResponse.json({ error: "Only owners and coaches can add occurrences" }, { status: 403 });
    }

    // Verify event belongs to user's gym
    const [event] = await db
      .select()
      .from(events)
      .where(and(eq(events.id, eventId), eq(events.gymId, dbUser.gymId)))
      .limit(1);

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const { date, note } = await request.json();

    if (!date) {
      return NextResponse.json({ error: "Date is required" }, { status: 400 });
    }

    // Check if occurrence already exists
    const existingOccurrences = await db
      .select()
      .from(eventOccurrences)
      .where(eq(eventOccurrences.eventId, eventId));

    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    const exists = existingOccurrences.some((occ) => {
      const occDate = new Date(occ.date);
      occDate.setHours(0, 0, 0, 0);
      return occDate.getTime() === targetDate.getTime();
    });

    if (exists) {
      return NextResponse.json({ error: "Occurrence already exists for this date" }, { status: 400 });
    }

    // Create custom occurrence
    const [occurrence] = await db
      .insert(eventOccurrences)
      .values({
        eventId,
        date: new Date(date),
        status: "scheduled",
        isCustom: true,
        note: note || null,
      })
      .returning();

    return NextResponse.json({ occurrence });
  } catch (error) {
    console.error("Add occurrence error:", error);
    return NextResponse.json({ error: "Failed to add occurrence" }, { status: 500 });
  }
}

// DELETE - Remove custom occurrence
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [dbUser] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);

    if (!dbUser || !dbUser.gymId) {
      return NextResponse.json({ error: "User must belong to a gym" }, { status: 400 });
    }

    if (dbUser.role !== "owner" && dbUser.role !== "coach") {
      return NextResponse.json({ error: "Only owners and coaches can remove occurrences" }, { status: 403 });
    }

    const { occurrenceId } = await request.json();

    if (!occurrenceId) {
      return NextResponse.json({ error: "Occurrence ID is required" }, { status: 400 });
    }

    // Verify occurrence belongs to event in user's gym
    const [occurrence] = await db
      .select({
        occurrence: eventOccurrences,
        event: events,
      })
      .from(eventOccurrences)
      .innerJoin(events, eq(eventOccurrences.eventId, events.id))
      .where(
        and(
          eq(eventOccurrences.id, occurrenceId),
          eq(events.gymId, dbUser.gymId)
        )
      )
      .limit(1);

    if (!occurrence) {
      return NextResponse.json({ error: "Occurrence not found" }, { status: 404 });
    }

    // Only allow deletion of custom occurrences
    if (!occurrence.occurrence.isCustom) {
      return NextResponse.json(
        { error: "Only custom occurrences can be deleted. Use cancel for recurring ones." },
        { status: 400 }
      );
    }

    await db.delete(eventOccurrences).where(eq(eventOccurrences.id, occurrenceId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Remove occurrence error:", error);
    return NextResponse.json({ error: "Failed to remove occurrence" }, { status: 500 });
  }
}


