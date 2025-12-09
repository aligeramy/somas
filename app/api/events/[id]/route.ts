import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { users, events, eventOccurrences } from "@/drizzle/schema";
import { eq, and } from "drizzle-orm";

// GET - Get single event with occurrences
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const [event] = await db
      .select()
      .from(events)
      .where(and(eq(events.id, id), eq(events.gymId, dbUser.gymId)))
      .limit(1);

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const occurrences = await db
      .select()
      .from(eventOccurrences)
      .where(eq(eventOccurrences.eventId, id))
      .orderBy(eventOccurrences.date);

    return NextResponse.json({ event, occurrences });
  } catch (error) {
    console.error("Get event error:", error);
    return NextResponse.json({ error: "Failed to get event" }, { status: 500 });
  }
}

// PUT - Update event
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
      return NextResponse.json({ error: "Only owners and coaches can edit events" }, { status: 403 });
    }

    const body = await request.json();
    const { title, description, location, startTime, endTime, recurrenceRule, recurrenceEndDate, reminderDays } = body;

    const [updatedEvent] = await db
      .update(events)
      .set({
        title,
        description,
        location,
        startTime,
        endTime,
        recurrenceRule,
        recurrenceEndDate: recurrenceEndDate ? new Date(recurrenceEndDate) : null,
        reminderDays,
        updatedAt: new Date(),
      })
      .where(and(eq(events.id, id), eq(events.gymId, dbUser.gymId)))
      .returning();

    if (!updatedEvent) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    return NextResponse.json({ event: updatedEvent });
  } catch (error) {
    console.error("Update event error:", error);
    return NextResponse.json({ error: "Failed to update event" }, { status: 500 });
  }
}

// DELETE - Delete event and all occurrences
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
      return NextResponse.json({ error: "Only owners and coaches can delete events" }, { status: 403 });
    }

    // Verify event belongs to user's gym
    const [event] = await db
      .select()
      .from(events)
      .where(and(eq(events.id, id), eq(events.gymId, dbUser.gymId)))
      .limit(1);

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Delete all occurrences first (cascade should handle this, but being explicit)
    await db.delete(eventOccurrences).where(eq(eventOccurrences.eventId, id));

    // Delete event
    await db.delete(events).where(eq(events.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete event error:", error);
    return NextResponse.json({ error: "Failed to delete event" }, { status: 500 });
  }
}


