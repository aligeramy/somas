import { and, eq, inArray } from "drizzle-orm";
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

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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

async function sendManualReminderEmails(
  targetUsers: {
    id: string;
    name: string | null;
    email: string | null;
    altEmail: string | null;
    notifPreferences: unknown;
  }[],
  occurrenceId: string,
  eventTitle: string,
  gym: { name: string; logoUrl: string | null },
  dateStr: string,
  timeStr: string,
  appUrl: string
): Promise<{ sent: number; errors: string[] }> {
  let sent = 0;
  const errors: string[] = [];
  for (const targetUser of targetUsers) {
    try {
      if (!hasRemindersEnabled(targetUser.notifPreferences)) {
        continue;
      }
      const recipients = [targetUser.email];
      if (targetUser.altEmail) {
        recipients.push(targetUser.altEmail);
      }
      await resend.emails.send({
        from: `${process.env.RESEND_FROM_NAME || "SOMAS"} <${process.env.RESEND_FROM_EMAIL || "noreply@mail.softx.ca"}>`,
        to: recipients,
        subject: `RSVP needed for ${eventTitle}`,
        react: RsvpReminderEmail({
          gymName: gym.name,
          gymLogoUrl: gym.logoUrl,
          athleteName: targetUser.name || "Athlete",
          eventTitle,
          eventDate: dateStr,
          eventTime: timeStr,
          rsvpUrl: `${appUrl}/rsvp`,
        }),
      });
      await db
        .insert(reminderLogs)
        .values({
          occurrenceId,
          userId: targetUser.id,
          reminderType: "manual",
        })
        .onConflictDoNothing();
      sent++;
      await delay(600);
    } catch (err) {
      console.error(`Failed to send reminder to ${targetUser.email}:`, err);
      errors.push(targetUser.email);
      await delay(600);
    }
  }
  return { sent, errors };
}

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

    // Only head coaches, coaches, and managers can send reminders
    if (
      dbUser.role !== "owner" &&
      dbUser.role !== "coach" &&
      dbUser.role !== "manager"
    ) {
      return NextResponse.json(
        {
          error: "Only head coaches, coaches, and managers can send reminders",
        },
        { status: 403 }
      );
    }

    const { occurrenceId, userIds } = await request.json();

    if (!occurrenceId) {
      return NextResponse.json(
        { error: "occurrenceId is required" },
        { status: 400 }
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
        { status: 404 }
      );
    }

    if (occurrenceData.event.gymId !== dbUser.gymId) {
      return NextResponse.json(
        { error: "Not authorized to send reminders for this event" },
        { status: 403 }
      );
    }

    // Get gym details
    const [gym] = await db
      .select()
      .from(gyms)
      // biome-ignore lint/style/noNonNullAssertion: gymId is required for coaches
      .where(eq(gyms.id, dbUser.gymId!))
      .limit(1);

    if (!gym) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    // Get all club members who can RSVP (athletes, coaches, owners)
    const allMembers = await db
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
          // biome-ignore lint/style/noNonNullAssertion: gymId is required for coaches
          eq(users.gymId, dbUser.gymId!),
          inArray(users.role, ["athlete", "coach", "owner", "manager"])
        )
      );

    // Get existing RSVPs for this occurrence
    const existingRsvps = await db
      .select()
      .from(rsvps)
      .where(eq(rsvps.occurrenceId, occurrenceId));

    const respondedUserIds = new Set(existingRsvps.map((r) => r.userId));

    // Filter to pending users (or specific userIds if provided) and check reminders preference
    let targetUsers = allMembers.filter(
      (a) =>
        !respondedUserIds.has(a.id) && hasRemindersEnabled(a.notifPreferences)
    );

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

    // Format date for email - use UTC methods to avoid timezone issues
    const eventDate = new Date(occurrenceData.occurrence.date);
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const dateStr = `${eventDate.getUTCDate()} ${monthNames[eventDate.getUTCMonth()]}`;

    const formatTime = (time: string) => {
      const [hours, minutes] = time.split(":");
      const hour = Number.parseInt(hours, 10);
      const ampm = hour >= 12 ? "PM" : "AM";
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    };

    const timeStr = `${formatTime(occurrenceData.event.startTime)} - ${formatTime(occurrenceData.event.endTime)}`;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const { sent, errors } = await sendManualReminderEmails(
      targetUsers,
      occurrenceId,
      occurrenceData.event.title,
      gym,
      dateStr,
      timeStr,
      appUrl
    );

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
      { status: 500 }
    );
  }
}
