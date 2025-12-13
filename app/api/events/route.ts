import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { users, events, eventOccurrences } from "@/drizzle/schema";
import { eq, and, gte, desc, asc, sql } from "drizzle-orm";

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

    const { title, description, location, startTime, endTime, recurrenceRule, recurrenceEndDate, recurrenceCount, startDate, reminderDays: reminderDaysRaw } = await request.json();
    
    // Parse reminderDays - handle string or array input
    let reminderDays: number[] | null = null;
    if (reminderDaysRaw) {
      if (typeof reminderDaysRaw === 'string') {
        try {
          const parsed = JSON.parse(reminderDaysRaw);
          if (Array.isArray(parsed)) {
            reminderDays = parsed.map(n => typeof n === 'number' ? Math.round(n) : parseInt(String(n), 10)).filter(n => !isNaN(n));
          }
        } catch {
          reminderDays = null;
        }
      } else if (Array.isArray(reminderDaysRaw)) {
        reminderDays = reminderDaysRaw.map(n => typeof n === 'number' ? Math.round(n) : parseInt(String(n), 10)).filter(n => !isNaN(n));
      }
    }

    if (!title || !startTime || !endTime) {
      return NextResponse.json(
        { error: "Title, start time, and end time are required" },
        { status: 400 },
      );
    }

    // Validate that recurrence end date is after start date/time
    if (recurrenceEndDate && startDate) {
      const startDateTime = new Date(startDate);
      const [hours, minutes] = startTime.split(":").map(Number);
      startDateTime.setHours(hours, minutes, 0, 0);
      
      const endDateTime = new Date(recurrenceEndDate);
      
      if (endDateTime <= startDateTime) {
        return NextResponse.json(
          { error: "The 'End on date' must be after the start date and time" },
          { status: 400 },
        );
      }
    }

    // Create event - handle reminderDays as PostgreSQL integer[] array
    const [event] = await db.insert(events).values({
      gymId: dbUser.gymId,
      title,
      description: description || null,
      location: location || null,
      startTime,
      endTime,
      recurrenceRule: recurrenceRule || null,
      recurrenceEndDate: recurrenceEndDate ? new Date(recurrenceEndDate) : null,
      recurrenceCount: recurrenceCount || null,
      reminderDays: reminderDays && reminderDays.length > 0 
        ? sql`${`{${reminderDays.join(',')}}`}::integer[]`
        : null,
    }).returning();

    // Generate occurrences
    const occurrenceStartDate = startDate ? new Date(startDate) : new Date();
    await generateEventOccurrences(
      event.id,
      recurrenceRule,
      startTime,
      occurrenceStartDate,
      recurrenceEndDate ? new Date(recurrenceEndDate) : null,
      recurrenceCount
    );

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
  startDate: Date,
  recurrenceEndDate?: Date | null,
  recurrenceCount?: number | null,
) {
  const occurrences = [];
  let endDate = new Date(startDate);
  
  // Determine end date based on recurrence settings
  if (recurrenceEndDate) {
    endDate = new Date(recurrenceEndDate);
  } else if (recurrenceCount) {
    endDate = new Date(startDate);
    endDate.setFullYear(endDate.getFullYear() + 2);
  } else {
    endDate.setFullYear(endDate.getFullYear() + 1);
  }

  // For non-recurring events, create a single occurrence
  if (!recurrenceRule) {
    const [hours, minutes] = startTime.split(":").map(Number);
    const occurrenceDate = new Date(startDate);
    occurrenceDate.setHours(hours, minutes, 0, 0);
    
    if (occurrenceDate >= new Date()) {
      await db.insert(eventOccurrences).values({
        eventId,
        date: occurrenceDate,
        status: "scheduled" as const,
      }).onConflictDoNothing();
    }
    return;
  }

  // Parse RRULE
  let frequency = "WEEKLY";

  if (recurrenceRule.includes("FREQ=DAILY")) {
    frequency = "DAILY";
  } else if (recurrenceRule.includes("FREQ=WEEKLY")) {
    frequency = "WEEKLY";
  } else if (recurrenceRule.includes("FREQ=MONTHLY")) {
    frequency = "MONTHLY";
  }

  // Always use the selected date as the first occurrence
  // This respects the user's date selection regardless of recurrence pattern
  const currentDate = new Date(startDate);

  // Generate occurrences
  let count = 0;
  const now = new Date();
  while (currentDate <= endDate) {
    if (recurrenceCount && count >= recurrenceCount) {
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
      count++;
    }
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

export async function GET(_request: Request) {
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

