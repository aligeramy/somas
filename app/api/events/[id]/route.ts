import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { eventOccurrences, events, rsvps, users } from "@/drizzle/schema";
import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

// GET - Get single event with occurrences
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
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

    const [dbUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    if (!dbUser || !dbUser.gymId) {
      return NextResponse.json(
        { error: "User must belong to a gym" },
        { status: 400 },
      );
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

// Helper function to generate occurrences
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

    // Always create an occurrence for 1-day events, regardless of date
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
  
  // Store the original day of month for monthly recurrence
  // This helps handle month-end dates correctly
  const originalDayOfMonth = startDate.getDate();

  // Generate occurrences
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

    // Always include the first occurrence (selected start date) regardless of time
    // For subsequent occurrences, only include if they're in the future
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
      // Safely add one month, handling month-end dates correctly
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();
      
      // Calculate next month and year
      let nextMonth = currentMonth + 1;
      let nextYear = currentYear;
      
      if (nextMonth > 11) {
        nextMonth = 0;
        nextYear += 1;
      }
      
      // Get the last day of the target month
      const lastDayOfNextMonth = new Date(nextYear, nextMonth + 1, 0).getDate();
      
      // Use the original day, or the last day of the month if original day doesn't exist
      const dayToUse = Math.min(originalDayOfMonth, lastDayOfNextMonth);
      
      currentDate.setFullYear(nextYear, nextMonth, dayToUse);
    }
  }

  if (occurrences.length > 0) {
    await db.insert(eventOccurrences).values(occurrences).onConflictDoNothing();
  }
}

// PUT - Update event
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
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

    const [dbUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    if (!dbUser || !dbUser.gymId) {
      return NextResponse.json(
        { error: "User must belong to a gym" },
        { status: 400 },
      );
    }

    if (dbUser.role !== "owner" && dbUser.role !== "coach") {
      return NextResponse.json(
        { error: "Only head coaches and coaches can edit events" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const {
      title,
      description,
      location,
      startTime,
      endTime,
      recurrenceRule,
      recurrenceEndDate,
      recurrenceCount,
      reminderDays: reminderDaysRaw,
      startDate,
    } = body;

    // Parse reminderDays - handle string, array, or null/undefined
    let reminderDays: number[] | null = null;
    if (reminderDaysRaw !== undefined && reminderDaysRaw !== null) {
      if (typeof reminderDaysRaw === "string") {
        // Handle JSON stringified arrays (could be "[7,1]" or double-encoded)
        let parsed: any = null;
        try {
          parsed = JSON.parse(reminderDaysRaw);
          // If JSON.parse returns a string, it might be double-encoded, try parsing again
          if (typeof parsed === "string") {
            try {
              parsed = JSON.parse(parsed);
            } catch {
              // If second parse fails, use the string as-is for manual parsing
            }
          }
          if (Array.isArray(parsed)) {
            reminderDays = parsed
              .map((n) => (typeof n === "number" ? n : parseFloat(String(n))))
              .filter((n) => !Number.isNaN(n));
          }
        } catch (_parseError) {
          // If JSON.parse fails, try to parse as array literal string like "[7,1]"
          const trimmed = reminderDaysRaw.trim();
          if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
            try {
              const innerContent = trimmed.slice(1, -1).trim();
              const values = innerContent
                ? innerContent.split(",").map((s) => s.trim())
                : [];
              reminderDays = values
                .map((s) => {
                  const num = parseFloat(s);
                  return Number.isNaN(num) ? null : num;
                })
                .filter((n) => n !== null) as number[];
            } catch (splitError) {
              console.error(
                "Failed to parse reminderDays string:",
                reminderDaysRaw,
                splitError,
              );
              reminderDays = null;
            }
          } else {
            console.warn(
              "reminderDays is a string but not in array format:",
              reminderDaysRaw,
            );
            reminderDays = null;
          }
        }
      } else if (Array.isArray(reminderDaysRaw)) {
        // Ensure all elements are numbers
        reminderDays = reminderDaysRaw
          .map((n) => (typeof n === "number" ? n : parseFloat(String(n))))
          .filter((n) => !Number.isNaN(n));
      } else {
        console.warn(
          "reminderDays has unexpected type:",
          typeof reminderDaysRaw,
          reminderDaysRaw,
        );
        reminderDays = null;
      }
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

    // Get the existing event to check for changes
    const [existingEvent] = await db
      .select()
      .from(events)
      .where(and(eq(events.id, id), eq(events.gymId, dbUser.gymId)))
      .limit(1);

    if (!existingEvent) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Check if recurrence-related fields changed
    const recurrenceChanged =
      existingEvent.recurrenceRule !== recurrenceRule ||
      existingEvent.startTime !== startTime ||
      (recurrenceEndDate &&
        existingEvent.recurrenceEndDate?.toISOString() !==
          new Date(recurrenceEndDate).toISOString()) ||
      (!recurrenceEndDate && existingEvent.recurrenceEndDate);

    // Build update object - include reminderDays conditionally
    const updateData: Record<string, any> = {
      title,
      description,
      location,
      startTime,
      endTime,
      recurrenceRule,
      recurrenceEndDate: recurrenceEndDate ? new Date(recurrenceEndDate) : null,
      recurrenceCount: recurrenceCount || null,
      updatedAt: new Date(),
    };

    // Handle reminderDays - database column is integer[] (PostgreSQL array), NOT jsonb
    // PostgreSQL arrays use {1,2,3} format, not [1,2,3]
    if (reminderDaysRaw !== undefined) {
      if (Array.isArray(reminderDays) && reminderDays.length > 0) {
        // Ensure all values are integers (reminderDays should be whole numbers)
        const validIntegers = reminderDays
          .map((n) =>
            typeof n === "number" ? Math.round(n) : parseInt(String(n), 10),
          )
          .filter((n) => !Number.isNaN(n));
        if (validIntegers.length > 0) {
          // Use PostgreSQL array literal format: {1,2,3}
          const pgArrayLiteral = `{${validIntegers.join(",")}}`;
          updateData.reminderDays = sql`${pgArrayLiteral}::integer[]`;
        } else {
          updateData.reminderDays = null;
        }
      } else if (
        reminderDays === null ||
        (Array.isArray(reminderDays) && reminderDays.length === 0)
      ) {
        updateData.reminderDays = null;
      } else {
        console.warn(
          "reminderDays parsing failed, preserving existing value. Raw:",
          reminderDaysRaw,
        );
      }
    }

    // Update the event
    const [updatedEvent] = await db
      .update(events)
      .set(updateData)
      .where(and(eq(events.id, id), eq(events.gymId, dbUser.gymId)))
      .returning();

    if (!updatedEvent) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // If recurrence changed, regenerate future occurrences
    if (recurrenceChanged) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get all future occurrences
      const futureOccurrences = await db
        .select({ id: eventOccurrences.id })
        .from(eventOccurrences)
        .where(
          and(
            eq(eventOccurrences.eventId, id),
            gte(eventOccurrences.date, today),
          ),
        );

      const futureOccurrenceIds = futureOccurrences.map((o) => o.id);

      if (futureOccurrenceIds.length > 0) {
        // Delete RSVPs for future occurrences
        for (const occId of futureOccurrenceIds) {
          await db.delete(rsvps).where(eq(rsvps.occurrenceId, occId));
        }

        // Delete future occurrences
        await db
          .delete(eventOccurrences)
          .where(
            and(
              eq(eventOccurrences.eventId, id),
              gte(eventOccurrences.date, today),
            ),
          );
      }

      // Generate new occurrences based on updated recurrence
      const occurrenceStartDate = startDate ? new Date(startDate) : today;
      await generateEventOccurrences(
        id,
        recurrenceRule,
        startTime,
        occurrenceStartDate,
        recurrenceEndDate ? new Date(recurrenceEndDate) : null,
        recurrenceCount,
      );
    }

    return NextResponse.json({ event: updatedEvent });
  } catch (error) {
    console.error("Update event error:", error);
    return NextResponse.json(
      { error: "Failed to update event" },
      { status: 500 },
    );
  }
}

// DELETE - Delete event and all occurrences
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
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

    const [dbUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    if (!dbUser || !dbUser.gymId) {
      return NextResponse.json(
        { error: "User must belong to a gym" },
        { status: 400 },
      );
    }

    if (dbUser.role !== "owner" && dbUser.role !== "coach") {
      return NextResponse.json(
        { error: "Only head coaches and coaches can delete events" },
        { status: 403 },
      );
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

    // Get all occurrences for this event
    const allOccurrences = await db
      .select({ id: eventOccurrences.id })
      .from(eventOccurrences)
      .where(eq(eventOccurrences.eventId, id));

    const occurrenceIds = allOccurrences.map((occ) => occ.id);

    // Delete all RSVPs associated with these occurrences first
    if (occurrenceIds.length > 0) {
      await db.delete(rsvps).where(inArray(rsvps.occurrenceId, occurrenceIds));
    }

    // Delete all occurrences
    await db.delete(eventOccurrences).where(eq(eventOccurrences.eventId, id));

    // Delete event
    await db.delete(events).where(eq(events.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete event error:", error);
    return NextResponse.json(
      { error: "Failed to delete event" },
      { status: 500 },
    );
  }
}
