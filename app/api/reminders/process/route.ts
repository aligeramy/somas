import { and, eq, inArray, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import {
  eventOccurrences,
  events,
  gyms,
  reminderLogs,
  rsvps,
  users,
} from "@/drizzle/schema";
import { EventReminderEmail } from "@/emails/event-reminder";
import { db } from "@/lib/db";
import { formatOccurrenceDateShort } from "@/lib/date";

const resend = new Resend(process.env.RESEND_API_KEY);

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// This endpoint should be called by a cron job (e.g., Vercel Cron, GitHub Actions, etc.)
// It processes all events and sends reminders based on reminderDays settings
export async function GET(request: Request) {
  try {
    // Optional: Add authentication/authorization check
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const results = {
      processed: 0,
      sent: 0,
      errors: [] as string[],
    };

    // Get all events with reminderDays set
    const eventsWithReminders = await db
      .select({
        event: events,
        occurrences: eventOccurrences,
      })
      .from(events)
      .innerJoin(eventOccurrences, eq(events.id, eventOccurrences.eventId))
      .where(
        and(
          eq(eventOccurrences.status, "scheduled"),
          sql`${events.reminderDays} IS NOT NULL`,
          sql`array_length(${events.reminderDays}, 1) > 0`
        )
      );

    // Group occurrences by event
    const eventsMap = new Map<
      string,
      {
        event: typeof events.$inferSelect;
        occurrences: (typeof eventOccurrences.$inferSelect)[];
      }
    >();

    for (const row of eventsWithReminders) {
      const eventId = row.event.id;
      if (!eventsMap.has(eventId)) {
        eventsMap.set(eventId, {
          event: row.event,
          occurrences: [],
        });
      }
      const eventData = eventsMap.get(eventId);
      if (eventData) {
        eventData.occurrences.push(row.occurrences);
      }
    }

    // Process each event
    for (const [, { event, occurrences }] of eventsMap) {
      if (!event.reminderDays || event.reminderDays.length === 0) {
        continue;
      }

      // Get club info
      const [gym] = await db
        .select()
        .from(gyms)
        .where(eq(gyms.id, event.gymId))
        .limit(1);

      if (!gym) {
        continue;
      }

      // Get all club members who can RSVP (athletes, coaches, owners)
      const clubMembers = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          altEmail: users.altEmail,
          notifPreferences: users.notifPreferences,
        })
        .from(users)
        .where(
          and(
            eq(users.gymId, event.gymId),
            inArray(users.role, ["athlete", "coach", "owner", "manager"])
          )
        );

      await processEventReminders(
        event,
        occurrences,
        gym,
        clubMembers,
        now,
        results
      );
    }

    return NextResponse.json({
      success: true,
      ...results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Process reminders error:", error);
    return NextResponse.json(
      { error: "Failed to process reminders", details: String(error) },
      { status: 500 }
    );
  }
}

function getReminderSubject(type: string): string {
  switch (type) {
    case "7_day":
      return "1 Week Away!";
    case "3_day":
      return "3 Days to Go!";
    case "1_day":
      return "Tomorrow!";
    case "30_min":
      return "Starting Soon!";
    default:
      return "Reminder";
  }
}

function getReminderType(reminderValue: number): string {
  if (reminderValue === 7) {
    return "7_day";
  }
  if (reminderValue === 3) {
    return "3_day";
  }
  if (reminderValue === 1) {
    return "1_day";
  }
  return `${reminderValue}_day`;
}

function shouldSendReminderNow(
  reminderValue: number,
  reminderDateTime: Date,
  occurrenceDateTime: Date,
  now: Date
): boolean {
  const timeDiff = occurrenceDateTime.getTime() - now.getTime();
  if (reminderValue < 1) {
    const minutesUntilReminder =
      (reminderDateTime.getTime() - now.getTime()) / (1000 * 60);
    return (
      minutesUntilReminder >= -5 && minutesUntilReminder <= 5 && timeDiff > 0
    );
  }
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const reminderDay = new Date(reminderDateTime);
  reminderDay.setHours(0, 0, 0, 0);
  return reminderDay.getTime() === today.getTime() && timeDiff > 0;
}

interface ProcessResults {
  processed: number;
  sent: number;
  errors: string[];
}

function hasRemindersEnabled(prefs: unknown): boolean {
  if (
    prefs &&
    typeof prefs === "object" &&
    prefs !== null &&
    "reminders" in (prefs as object)
  ) {
    return (prefs as { reminders?: boolean }).reminders !== false;
  }
  return true;
}

async function sendReminderToMembers(
  occurrence: typeof eventOccurrences.$inferSelect,
  event: typeof events.$inferSelect,
  gym: typeof gyms.$inferSelect,
  targetMembers: {
    id: string;
    name: string | null;
    email: string | null;
    altEmail: string | null;
    notifPreferences: unknown;
  }[],
  reminderType: string,
  dateStr: string,
  timeStr: string,
  appUrl: string,
  results: ProcessResults
): Promise<void> {
  for (const member of targetMembers) {
    if (!member.email) {
      continue;
    }
    if (!hasRemindersEnabled(member.notifPreferences)) {
      continue;
    }
    try {
      const existingLog = await db
        .select()
        .from(reminderLogs)
        .where(
          and(
            eq(reminderLogs.occurrenceId, occurrence.id),
            eq(reminderLogs.userId, member.id),
            eq(reminderLogs.reminderType, reminderType)
          )
        )
        .limit(1);
      if (existingLog.length > 0) {
        continue;
      }
      const recipients = [member.email];
      if (member.altEmail) {
        recipients.push(member.altEmail);
      }
      await resend.emails.send({
        from: `${process.env.RESEND_FROM_NAME || "SOMAS"} <${process.env.RESEND_FROM_EMAIL || "noreply@mail.softx.ca"}>`,
        to: recipients,
        subject: `${event.title} - ${getReminderSubject(reminderType)}`,
        react: EventReminderEmail({
          gymName: gym.name,
          gymLogoUrl: gym.logoUrl,
          athleteName: member.name || "Member",
          eventTitle: event.title,
          eventDate: dateStr,
          eventTime: timeStr,
          eventLocation: event.location ?? undefined,
          reminderType,
          rsvpUrl: `${appUrl}/rsvp/${occurrence.id}`,
        }),
      });
      await db.insert(reminderLogs).values({
        occurrenceId: occurrence.id,
        userId: member.id,
        reminderType,
      });
      results.sent++;
      await delay(600);
    } catch (err) {
      console.error(`Failed to send reminder to ${member.email}:`, err);
      results.errors.push(member.email || "unknown");
      await delay(600);
    }
  }
}

async function processEventReminders(
  event: typeof events.$inferSelect,
  occurrences: (typeof eventOccurrences.$inferSelect)[],
  gym: typeof gyms.$inferSelect,
  clubMembers: {
    id: string;
    name: string | null;
    email: string | null;
    altEmail: string | null;
    notifPreferences: unknown;
  }[],
  now: Date,
  results: ProcessResults
): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    const hour = Number.parseInt(hours, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  for (const occurrence of occurrences) {
    const occurrenceDate = new Date(occurrence.date);
    const occurrenceDateTime = new Date(occurrenceDate);
    const [hours, minutes] = event.startTime.split(":").map(Number);
    occurrenceDateTime.setHours(hours, minutes, 0, 0);

    for (const reminderValue of event.reminderDays ?? []) {
      let reminderDateTime: Date;
      let reminderType: string;

      if (reminderValue < 1) {
        const minutes = Math.round(reminderValue * 24 * 60);
        reminderDateTime = new Date(occurrenceDateTime);
        reminderDateTime.setMinutes(reminderDateTime.getMinutes() - minutes);
        reminderType = minutes === 30 ? "30_min" : `${minutes}_min`;
      } else {
        reminderDateTime = new Date(occurrenceDate);
        reminderDateTime.setDate(reminderDateTime.getDate() - reminderValue);
        reminderDateTime.setHours(0, 0, 0, 0);
        reminderType = getReminderType(reminderValue);
      }

      if (
        !shouldSendReminderNow(
          reminderValue,
          reminderDateTime,
          occurrenceDateTime,
          now
        )
      ) {
        continue;
      }

      const existingRsvps = await db
        .select()
        .from(rsvps)
        .where(eq(rsvps.occurrenceId, occurrence.id));
      const respondedUserIds = new Set(existingRsvps.map((r) => r.userId));

      const targetMembers = clubMembers.filter((a) => {
        const hasRsvp =
          !respondedUserIds.has(a.id) ||
          existingRsvps.some((r) => r.userId === a.id && r.status === "going");
        return hasRemindersEnabled(a.notifPreferences) && hasRsvp;
      });

      const dateStr = formatOccurrenceDateShort(occurrenceDate);
      const timeStr = `${formatTime(event.startTime)} - ${formatTime(event.endTime)}`;

      await sendReminderToMembers(
        occurrence,
        event,
        gym,
        targetMembers,
        reminderType,
        dateStr,
        timeStr,
        appUrl,
        results
      );
      results.processed++;
    }
  }
}
