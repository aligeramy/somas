import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { users, events, eventOccurrences, gyms } from "@/drizzle/schema";
import { eq, and, gte, desc, asc } from "drizzle-orm";

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

    if (!dbUser || !dbUser.gymId) {
      return NextResponse.json(
        { error: "User must belong to a gym" },
        { status: 400 },
      );
    }

    // Only head coaches and coaches can create events
    if (dbUser.role !== "owner" && dbUser.role !== "coach") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { title, startTime, endTime, recurrenceRule, recurrenceEndDate, recurrenceCount } = await request.json();

    if (!title || !startTime || !endTime) {
      return NextResponse.json(
        { error: "Title, start time, and end time are required" },
        { status: 400 },
      );
    }

    // Create event
    const [event] = await db.insert(events).values({
      gymId: dbUser.gymId,
      title,
      startTime,
      endTime,
      recurrenceRule: recurrenceRule || null,
    }).returning();

    // Generate occurrences
    await generateEventOccurrences(event.id, recurrenceRule, startTime, recurrenceEndDate, recurrenceCount);

    return NextResponse.json({ success: true, event });
  } catch (error) {
    console.error("Event creation error:", error);
    return NextResponse.json(
      { error: "Failed to create event" },
      { status: 500 },
    );
  }
}

async function generateEventOccurrences(
  eventId: string,
  recurrenceRule: string | null,
  startTime: string,
  recurrenceEndDate?: string | null,
  recurrenceCount?: number | null,
) {
  const occurrences = [];
  const now = new Date();
  let endDate = new Date();
  
  // Determine end date based on recurrence settings
  if (recurrenceEndDate) {
    // Specific end date provided
    endDate = new Date(recurrenceEndDate);
  } else if (recurrenceCount) {
    // Count-based: will be handled in the loop
    endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 2); // Set a far future date, loop will stop at count
  } else {
    // Forever: generate at least 1 year
    endDate.setFullYear(endDate.getFullYear() + 1);
  }

  if (!recurrenceRule) {
    return; // No recurrence, no occurrences
  }

  // Parse RRULE (simplified)
  let frequency = "WEEKLY";
  let byDay = "MO";

  if (recurrenceRule.includes("FREQ=DAILY")) {
    frequency = "DAILY";
  } else if (recurrenceRule.includes("FREQ=WEEKLY")) {
    frequency = "WEEKLY";
    const byDayMatch = recurrenceRule.match(/BYDAY=(\w+)/);
    if (byDayMatch) {
      byDay = byDayMatch[1];
    }
  } else if (recurrenceRule.includes("FREQ=MONTHLY")) {
    frequency = "MONTHLY";
  }

  const dayMap: Record<string, number> = {
    MO: 1,
    TU: 2,
    WE: 3,
    TH: 4,
    FR: 5,
    SA: 6,
    SU: 0,
  };

  let currentDate = new Date(now);

  // Find next occurrence date
  if (frequency === "WEEKLY") {
    const targetDay = dayMap[byDay];
    const currentDay = currentDate.getDay();
    let daysUntil = (targetDay - currentDay + 7) % 7;
    if (daysUntil === 0) daysUntil = 7;
    currentDate.setDate(currentDate.getDate() + daysUntil);
  } else if (frequency === "DAILY") {
    currentDate.setDate(currentDate.getDate() + 1);
  } else if (frequency === "MONTHLY") {
    currentDate.setMonth(currentDate.getMonth() + 1);
  }

  // Generate occurrences
  let occurrenceCount = 0;
  while (currentDate <= endDate) {
    // Stop if we've reached the count limit
    if (recurrenceCount && occurrenceCount >= recurrenceCount) {
      break;
    }

    const [hours, minutes] = startTime.split(":").map(Number);
    const occurrenceDate = new Date(currentDate);
    occurrenceDate.setHours(hours, minutes, 0, 0);

    if (occurrenceDate >= now) {
      occurrences.push({
        eventId,
        date: occurrenceDate,
        status: "scheduled" as const,
      });
      occurrenceCount++;
    }

    // Move to next occurrence
    if (frequency === "DAILY") {
      currentDate.setDate(currentDate.getDate() + 1);
    } else if (frequency === "WEEKLY") {
      currentDate.setDate(currentDate.getDate() + 7);
    } else if (frequency === "MONTHLY") {
      currentDate.setMonth(currentDate.getMonth() + 1);
    }
  }

  // Bulk create occurrences
  if (occurrences.length > 0) {
    await db.insert(eventOccurrences).values(occurrences).onConflictDoNothing();
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

    if (!dbUser || !dbUser.gymId) {
      return NextResponse.json({ error: "User must belong to a gym" }, { status: 400 });
    }

    const eventsList = await db.select({
      id: events.id,
      gymId: events.gymId,
      title: events.title,
      recurrenceRule: events.recurrenceRule,
      startTime: events.startTime,
      endTime: events.endTime,
      createdAt: events.createdAt,
      updatedAt: events.updatedAt,
    }).from(events)
      .where(eq(events.gymId, dbUser.gymId))
      .orderBy(desc(events.createdAt));

    // Get occurrences for each event
    const eventsWithOccurrences = await Promise.all(
      eventsList.map(async (event) => {
        const occurrencesList = await db.select()
          .from(eventOccurrences)
          .where(
            and(
              eq(eventOccurrences.eventId, event.id),
              gte(eventOccurrences.date, new Date())
            )
          )
          .orderBy(asc(eventOccurrences.date))
          .limit(10);
        return { ...event, occurrences: occurrencesList };
      })
    );

    return NextResponse.json({ events: eventsWithOccurrences });
  } catch (error) {
    console.error("Event fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 },
    );
  }
}

