import { and, asc, desc, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { channels, eventOccurrences, events, users } from "@/drizzle/schema";
import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

/** Normalize recurrence end date to end-of-day UTC so "end by Nov 15" includes Nov 15. */
function recurrenceEndDateToEndOfDay(value: string): Date {
  const d = new Date(value);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const day = d.getUTCDate();
  return new Date(Date.UTC(y, m, day, 23, 59, 59, 999));
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

    if (!dbUser?.gymId) {
      return NextResponse.json(
        { error: "User must belong to a club" },
        { status: 400 }
      );
    }

    // Only head coaches and coaches can create events
    if (dbUser.role !== "owner" && dbUser.role !== "coach") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const {
      title,
      description,
      location,
      startTime,
      endTime,
      recurrenceRule,
      recurrenceEndDate,
      recurrenceCount,
      startDate,
      reminderDays: reminderDaysRaw,
    } = await request.json();

    // Parse reminderDays - handle string or array input
    let reminderDays: number[] | null = null;
    if (reminderDaysRaw) {
      if (typeof reminderDaysRaw === "string") {
        try {
          const parsed = JSON.parse(reminderDaysRaw);
          if (Array.isArray(parsed)) {
            reminderDays = parsed
              .map((n) =>
                typeof n === "number"
                  ? Math.round(n)
                  : Number.parseInt(String(n), 10)
              )
              .filter((n) => !Number.isNaN(n));
          }
        } catch {
          reminderDays = null;
        }
      } else if (Array.isArray(reminderDaysRaw)) {
        reminderDays = reminderDaysRaw
          .map((n) =>
            typeof n === "number"
              ? Math.round(n)
              : Number.parseInt(String(n), 10)
          )
          .filter((n) => !Number.isNaN(n));
      }
    }

    if (!(title && startTime && endTime)) {
      return NextResponse.json(
        { error: "Title, start time, and end time are required" },
        { status: 400 }
      );
    }

    // Validate that recurrence end date is after start date/time
    if (recurrenceEndDate && startDate) {
      const startDateTime = new Date(startDate);
      const [hours, minutes] = startTime.split(":").map(Number);
      startDateTime.setHours(hours, minutes, 0, 0);

      const endDateTime = recurrenceEndDateToEndOfDay(recurrenceEndDate);

      if (endDateTime <= startDateTime) {
        return NextResponse.json(
          { error: "The 'End on date' must be after the start date and time" },
          { status: 400 }
        );
      }
    }

    // Normalize recurrenceRule (empty string becomes null)
    const normalizedRecurrenceRule = recurrenceRule || null;

    // Create event - handle reminderDays as PostgreSQL integer[] array
    const [event] = await db
      .insert(events)
      .values({
        gymId: dbUser.gymId,
        title,
        description: description || null,
        location: location || null,
        startTime,
        endTime,
        recurrenceRule: normalizedRecurrenceRule,
        recurrenceEndDate: recurrenceEndDate
          ? new Date(recurrenceEndDate)
          : null,
        recurrenceCount: recurrenceCount || null,
        reminderDays:
          reminderDays && reminderDays.length > 0
            ? sql`${`{${reminderDays.join(",")}}`}::integer[]`
            : null,
      })
      .returning();

    // Generate occurrences
    const occurrenceStartDate = startDate ? new Date(startDate) : new Date();
    await generateEventOccurrences(
      event.id,
      normalizedRecurrenceRule,
      startTime,
      occurrenceStartDate,
      recurrenceEndDate ? recurrenceEndDateToEndOfDay(recurrenceEndDate) : null,
      recurrenceCount
    );

    // Create group chat channel for this event
    try {
      // Check if channel already exists (shouldn't happen, but be safe)
      const [existingChannel] = await db
        .select()
        .from(channels)
        .where(
          and(
            eq(channels.gymId, dbUser.gymId),
            eq(channels.eventId, event.id),
            eq(channels.type, "group")
          )
        )
        .limit(1);

      if (existingChannel) {
        console.log("Event chat channel already exists:", existingChannel.id);
      } else {
        const [newChannel] = await db
          .insert(channels)
          .values({
            gymId: dbUser.gymId,
            name: `${title} Chat`,
            type: "group",
            eventId: event.id,
          })
          .returning();
        console.log("Created event chat channel:", newChannel.id);
      }
    } catch (channelError) {
      console.error("Failed to create event chat channel:", channelError);
    }

    return NextResponse.json({ success: true, event });
  } catch (error) {
    console.error("Event creation error:", error);
    return NextResponse.json(
      { error: "Failed to create event" },
      { status: 500 }
    );
  }
}

async function generateEventOccurrences(
  eventId: string,
  recurrenceRule: string | null,
  startTime: string,
  startDate: Date,
  recurrenceEndDate?: Date | null,
  recurrenceCount?: number | null
) {
  const occurrences: { eventId: string; date: Date; status: "scheduled" }[] =
    [];
  let endDate = new Date(startDate);

  if (recurrenceEndDate) {
    endDate = new Date(recurrenceEndDate);
  } else if (recurrenceCount) {
    endDate = new Date(startDate);
    endDate.setFullYear(endDate.getFullYear() + 2);
  } else {
    endDate.setFullYear(endDate.getFullYear() + 1);
  }

  if (!recurrenceRule) {
    const [hours, minutes] = startTime.split(":").map(Number);
    const occurrenceDate = new Date(startDate);
    occurrenceDate.setHours(hours, minutes, 0, 0);
    await db
      .insert(eventOccurrences)
      .values({
        eventId,
        date: occurrenceDate,
        status: "scheduled" as const,
      })
      .onConflictDoNothing();
    return;
  }

  let frequency = "WEEKLY";
  if (recurrenceRule.includes("FREQ=DAILY")) {
    frequency = "DAILY";
  } else if (recurrenceRule.includes("FREQ=WEEKLY")) {
    frequency = "WEEKLY";
  } else if (recurrenceRule.includes("FREQ=MONTHLY")) {
    frequency = "MONTHLY";
  }

  const currentDate = new Date(startDate);
  const originalDayOfMonth = startDate.getDate();
  let count = 0;
  const now = new Date();
  let isFirstOccurrence = true;

  while (currentDate <= endDate) {
    if (recurrenceCount && count >= recurrenceCount) {
      break;
    }
    const [hours, minutes] = startTime.split(":").map(Number);
    const occurrenceDate = new Date(currentDate);
    occurrenceDate.setHours(hours, minutes, 0, 0);
    if (isFirstOccurrence || occurrenceDate >= now) {
      occurrences.push({
        eventId,
        date: occurrenceDate,
        status: "scheduled" as const,
      });
      count++;
      isFirstOccurrence = false;
    }
    if (frequency === "DAILY") {
      currentDate.setDate(currentDate.getDate() + 1);
    } else if (frequency === "WEEKLY") {
      currentDate.setDate(currentDate.getDate() + 7);
    } else if (frequency === "MONTHLY") {
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();
      let nextMonth = currentMonth + 1;
      let nextYear = currentYear;
      if (nextMonth > 11) {
        nextMonth = 0;
        nextYear += 1;
      }
      const lastDayOfNextMonth = new Date(nextYear, nextMonth + 1, 0).getDate();
      const dayToUse = Math.min(originalDayOfMonth, lastDayOfNextMonth);
      currentDate.setFullYear(nextYear, nextMonth, dayToUse);
    }
  }

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

    const [dbUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    if (!dbUser?.gymId) {
      return NextResponse.json(
        { error: "User must belong to a club" },
        { status: 400 }
      );
    }

    const eventsList = await db
      .select({
        id: events.id,
        gymId: events.gymId,
        title: events.title,
        recurrenceRule: events.recurrenceRule,
        startTime: events.startTime,
        endTime: events.endTime,
        createdAt: events.createdAt,
        updatedAt: events.updatedAt,
      })
      .from(events)
      .where(eq(events.gymId, dbUser.gymId))
      .orderBy(desc(events.createdAt));

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const eventsWithOccurrences = await Promise.all(
      eventsList.map(async (event) => {
        const occurrencesList = await db
          .select()
          .from(eventOccurrences)
          .where(
            and(
              eq(eventOccurrences.eventId, event.id),
              sql`DATE(${eventOccurrences.date}) >= DATE(${sql.raw(`'${today.toISOString().split("T")[0]}'`)}::date)`
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
      { status: 500 }
    );
  }
}
