import { and, eq } from "drizzle-orm";
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
import { RsvpReminderEmail } from "@/emails/rsvp-reminder";
import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

const resend = new Resend(process.env.RESEND_API_KEY);

// Send reminder to pending RSVPs for a specific occurrence
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

    // Only head coaches and coaches can send reminders
    if (dbUser.role !== "owner" && dbUser.role !== "coach") {
      return NextResponse.json(
        { error: "Only head coaches and coaches can send reminders" },
        { status: 403 },
      );
    }

    const { occurrenceId, userIds } = await request.json();

    if (!occurrenceId) {
      return NextResponse.json(
        { error: "occurrenceId is required" },
        { status: 400 },
      );
    }

    // Get occurrence with event details
    const [occurrenceData] = await db
      .select({
        occurrence: eventOccurrences,
        event: events,
      })
      .from(eventOccurrences)
      .innerJoin(events, eq(eventOccurrences.eventId, events.id))
      .where(eq(eventOccurrences.id, occurrenceId))
      .limit(1);

    if (!occurrenceData) {
      return NextResponse.json(
        { error: "Event occurrence not found" },
        { status: 404 },
      );
    }

    if (occurrenceData.event.gymId !== dbUser.gymId) {
      return NextResponse.json(
        { error: "Not authorized to send reminders for this event" },
        { status: 403 },
      );
    }

    // Get gym details
    const [gym] = await db
      .select()
      .from(gyms)
      .where(eq(gyms.id, dbUser.gymId!))
      .limit(1);

    if (!gym) {
      return NextResponse.json({ error: "Gym not found" }, { status: 404 });
    }

    // Get all athletes in the gym who haven't RSVP'd (including altEmail)
    const allAthletes = await db
      .select()
      .from(users)
      .where(and(eq(users.gymId, dbUser.gymId!), eq(users.role, "athlete")));

    // Get existing RSVPs for this occurrence
    const existingRsvps = await db
      .select()
      .from(rsvps)
      .where(eq(rsvps.occurrenceId, occurrenceId));

    const respondedUserIds = new Set(existingRsvps.map((r) => r.userId));

    // Filter to pending users (or specific userIds if provided)
    let targetUsers = allAthletes.filter((a) => !respondedUserIds.has(a.id));

    if (userIds && userIds.length > 0) {
      targetUsers = targetUsers.filter((u) => userIds.includes(u.id));
    }

    if (targetUsers.length === 0) {
      return NextResponse.json({
        success: true,
        sent: 0,
        message: "No pending RSVPs to remind",
      });
    }

    // Format date for email
    const eventDate = new Date(occurrenceData.occurrence.date);
    const dateStr = `${eventDate.getDate()} ${eventDate.toLocaleDateString("en-US", { month: "short" })}`;

    const formatTime = (time: string) => {
      const [hours, minutes] = time.split(":");
      const hour = parseInt(hours, 10);
      const ampm = hour >= 12 ? "PM" : "AM";
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    };

    const timeStr = `${formatTime(occurrenceData.event.startTime)} - ${formatTime(occurrenceData.event.endTime)}`;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // Send emails
    let sent = 0;
    const errors: string[] = [];

    for (const targetUser of targetUsers) {
      try {
        // Check if we already sent a manual reminder today
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Build recipient list including altEmail
        const recipients = [targetUser.email];
        if (targetUser.altEmail) {
          recipients.push(targetUser.altEmail);
        }

        await resend.emails.send({
          from: `${process.env.RESEND_FROM_NAME || "Titans of Mississauga"} <${process.env.RESEND_FROM_EMAIL || "noreply@mail.titansofmississauga.ca"}>`,
          to: recipients,
          subject: `RSVP needed for ${occurrenceData.event.title}`,
          react: RsvpReminderEmail({
            gymName: gym.name,
            gymLogoUrl: gym.logoUrl,
            athleteName: targetUser.name || "Athlete",
            eventTitle: occurrenceData.event.title,
            eventDate: dateStr,
            eventTime: timeStr,
            rsvpUrl: `${appUrl}/rsvp`,
          }),
        });

        // Log the reminder
        await db
          .insert(reminderLogs)
          .values({
            occurrenceId,
            userId: targetUser.id,
            reminderType: "manual",
          })
          .onConflictDoNothing();

        sent++;
      } catch (err) {
        console.error(`Failed to send reminder to ${targetUser.email}:`, err);
        errors.push(targetUser.email);
      }
    }

    return NextResponse.json({
      success: true,
      sent,
      total: targetUsers.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Send reminder error:", error);
    return NextResponse.json(
      { error: "Failed to send reminders" },
      { status: 500 },
    );
  }
}
