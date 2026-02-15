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

const resend = new Resend(process.env.RESEND_API_KEY);

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
          sql`array_length(${events.reminderDays}, 1) > 0`,
        ),
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
      if (!event.reminderDays || event.reminderDays.length === 0) continue;

      // Get club info
      const [gym] = await db
        .select()
        .from(gyms)
        .where(eq(gyms.id, event.gymId))
        .limit(1);

      if (!gym) continue;

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
            inArray(users.role, ["athlete", "coach", "owner"]),
          ),
        );

      // Process each occurrence
      for (const occurrence of occurrences) {
        const occurrenceDate = new Date(occurrence.date);
        const occurrenceDateTime = new Date(occurrenceDate);
        const [hours, minutes] = event.startTime.split(":").map(Number);
        occurrenceDateTime.setHours(hours, minutes, 0, 0);

        // Check each reminder day setting
        for (const reminderValue of event.reminderDays) {
          // Handle reminders - fractional values represent minutes, whole numbers represent days
          let reminderDateTime: Date;
          let reminderType: string;

          if (reminderValue < 1) {
            // Fractional values represent minutes (0.02 = 30 minutes)
            const minutes = Math.round(reminderValue * 24 * 60); // Convert to minutes
            reminderDateTime = new Date(occurrenceDateTime);
            reminderDateTime.setMinutes(
              reminderDateTime.getMinutes() - minutes,
            );
            reminderType = minutes === 30 ? "30_min" : `${minutes}_min`;
          } else {
            // For day-based reminders, send at start of day
            reminderDateTime = new Date(occurrenceDate);
            reminderDateTime.setDate(
              reminderDateTime.getDate() - reminderValue,
            );
            reminderDateTime.setHours(0, 0, 0, 0);

            // Determine reminder type
            if (reminderValue === 7) reminderType = "7_day";
            else if (reminderValue === 3) reminderType = "3_day";
            else if (reminderValue === 1) reminderType = "1_day";
            else reminderType = `${reminderValue}_day`;
          }

          // Check if we should send this reminder now
          const timeDiff = occurrenceDateTime.getTime() - now.getTime();
          let shouldSend = false;

          if (reminderValue < 1) {
            // Minute-based reminder: send if we're within a 10-minute window before the reminder time
            const minutesUntilReminder =
              (reminderDateTime.getTime() - now.getTime()) / (1000 * 60);
            shouldSend =
              minutesUntilReminder >= -5 &&
              minutesUntilReminder <= 5 &&
              timeDiff > 0;
          } else {
            // Day-based reminder: send if today matches the reminder day
            const today = new Date(now);
            today.setHours(0, 0, 0, 0);
            const reminderDay = new Date(reminderDateTime);
            reminderDay.setHours(0, 0, 0, 0);
            shouldSend =
              reminderDay.getTime() === today.getTime() && timeDiff > 0;
          }

          if (!shouldSend) continue;

          // Get existing RSVPs for this occurrence
          const existingRsvps = await db
            .select()
            .from(rsvps)
            .where(eq(rsvps.occurrenceId, occurrence.id));

          const respondedUserIds = new Set(existingRsvps.map((r) => r.userId));

          // Send reminders to all club members (or only those who RSVP'd going)
          // Filter by RSVP status and check if reminders are enabled
          const targetMembers = clubMembers.filter((a) => {
            // Check if user has reminders enabled
            // Default to true if notifPreferences is null/undefined or reminders preference is not set
            let remindersEnabled = true;
            if (
              a.notifPreferences &&
              typeof a.notifPreferences === "object" &&
              a.notifPreferences !== null &&
              "reminders" in a.notifPreferences
            ) {
              remindersEnabled = a.notifPreferences.reminders !== false;
            }

            // Filter by RSVP status
            const hasRsvp =
              !respondedUserIds.has(a.id) ||
              existingRsvps.find(
                (r) => r.userId === a.id && r.status === "going",
              );

            return remindersEnabled && hasRsvp;
          });

          // Format date and time - use UTC methods to avoid timezone issues
          const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          const dateStr = `${occurrenceDate.getUTCDate()} ${monthNames[occurrenceDate.getUTCMonth()]}`;

          const formatTime = (time: string) => {
            const [hours, minutes] = time.split(":");
            const hour = parseInt(hours, 10);
            const ampm = hour >= 12 ? "PM" : "AM";
            const displayHour = hour % 12 || 12;
            return `${displayHour}:${minutes} ${ampm}`;
          };

          const timeStr = `${formatTime(event.startTime)} - ${formatTime(event.endTime)}`;
          const appUrl =
            process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

          // Send emails (only to members with reminders enabled)
          for (const member of targetMembers) {
            if (!member.email) continue;

            // Double-check reminders preference (should already be filtered above, but extra safety)
            let remindersEnabled = true;
            if (
              member.notifPreferences &&
              typeof member.notifPreferences === "object" &&
              member.notifPreferences !== null &&
              "reminders" in member.notifPreferences
            ) {
              remindersEnabled = member.notifPreferences.reminders !== false;
            }

            if (!remindersEnabled) continue;

            try {
              // Check if we already sent this reminder
              const existingLog = await db
                .select()
                .from(reminderLogs)
                .where(
                  and(
                    eq(reminderLogs.occurrenceId, occurrence.id),
                    eq(reminderLogs.userId, member.id),
                    eq(reminderLogs.reminderType, reminderType),
                  ),
                )
                .limit(1);

              if (existingLog.length > 0) {
                continue; // Already sent
              }

              // Build recipient list including altEmail
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
                  eventLocation: event.location || undefined,
                  reminderType,
                  rsvpUrl: `${appUrl}/rsvp/${occurrence.id}`,
                }),
              });

              // Log the reminder
              await db.insert(reminderLogs).values({
                occurrenceId: occurrence.id,
                userId: member.id,
                reminderType,
              });

              results.sent++;
            } catch (err) {
              console.error(
                `Failed to send reminder to ${member.email}:`,
                err,
              );
              results.errors.push(member.email || "unknown");
            }
          }

          results.processed++;
        }
      }
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
      { status: 500 },
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
