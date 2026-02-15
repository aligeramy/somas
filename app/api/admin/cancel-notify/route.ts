import { and, desc, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { eventOccurrences, events, gyms, rsvps, users } from "@/drizzle/schema";
import { EventReminderEmail } from "@/emails/event-reminder";
import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

const resend = new Resend(process.env.RESEND_API_KEY);

function assertAuth() {
  return createClient().then(async (supabase) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return {
        error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      };
    }
    const [dbUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);
    if (!dbUser?.gymId) {
      return {
        error: NextResponse.json(
          { error: "User must belong to a gym" },
          { status: 400 }
        ),
      };
    }
    if (
      dbUser.role !== "owner" &&
      dbUser.role !== "manager" &&
      dbUser.role !== "coach"
    ) {
      return {
        error: NextResponse.json(
          {
            error:
              "Only owners, managers, and coaches can send cancellation emails",
          },
          { status: 403 }
        ),
      };
    }
    return { dbUser };
  });
}

// GET - List canceled occurrence(s) and recipients (people who RSVP'd going)
export async function GET(request: Request) {
  try {
    const auth = await assertAuth();
    if (auth.error) {
      return auth.error;
    }
    const { dbUser } = auth;
    const gymId = dbUser.gymId;
    if (!gymId) {
      return NextResponse.json(
        { error: "User must belong to a gym" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const occurrenceId = searchParams.get("occurrenceId");

    if (occurrenceId) {
      const [row] = await db
        .select({
          occurrence: eventOccurrences,
          event: events,
        })
        .from(eventOccurrences)
        .innerJoin(events, eq(eventOccurrences.eventId, events.id))
        .where(
          and(
            eq(eventOccurrences.id, occurrenceId),
            eq(events.gymId, gymId),
            eq(eventOccurrences.status, "canceled")
          )
        )
        .limit(1);

      if (!row) {
        return NextResponse.json(
          { error: "Canceled occurrence not found" },
          { status: 404 }
        );
      }

      const [gym] = await db
        .select()
        .from(gyms)
        .where(eq(gyms.id, gymId))
        .limit(1);

      const gymMembers = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          altEmail: users.altEmail,
        })
        .from(users)
        .where(eq(users.gymId, gymId));

      const rsvpRows = await db
        .select({ userId: rsvps.userId, status: rsvps.status })
        .from(rsvps)
        .where(eq(rsvps.occurrenceId, occurrenceId));

      const rsvpByUser = new Map(
        rsvpRows.map((r) => [r.userId, r.status as "going" | "not_going"])
      );

      const recipients = gymMembers.map((m) => ({
        ...m,
        rsvpStatus: rsvpByUser.get(m.id) ?? null,
      }));

      return NextResponse.json({
        occurrence: row.occurrence,
        event: row.event,
        gym: gym ?? null,
        recipients,
      });
    }

    const [row] = await db
      .select({
        occurrence: eventOccurrences,
        event: events,
      })
      .from(eventOccurrences)
      .innerJoin(events, eq(eventOccurrences.eventId, events.id))
      .where(
        and(eq(events.gymId, gymId), eq(eventOccurrences.status, "canceled"))
      )
      .orderBy(desc(eventOccurrences.date))
      .limit(1);

    if (!row) {
      return NextResponse.json({
        occurrence: null,
        event: null,
        gym: null,
        recipients: [],
      });
    }

    const [gym] = await db
      .select()
      .from(gyms)
      .where(eq(gyms.id, gymId))
      .limit(1);

    const gymMembers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        altEmail: users.altEmail,
      })
      .from(users)
      .where(eq(users.gymId, gymId));

    const rsvpRows = await db
      .select({ userId: rsvps.userId, status: rsvps.status })
      .from(rsvps)
      .where(eq(rsvps.occurrenceId, row.occurrence.id));

    const rsvpByUser = new Map(
      rsvpRows.map((r) => [r.userId, r.status as "going" | "not_going"])
    );

    const recipients = gymMembers.map((m) => ({
      ...m,
      rsvpStatus: rsvpByUser.get(m.id) ?? null,
    }));

    return NextResponse.json({
      occurrence: row.occurrence,
      event: row.event,
      gym: gym ?? null,
      recipients,
    });
  } catch (error) {
    console.error("Cancel notify list error:", error);
    return NextResponse.json(
      { error: "Failed to load cancellation data" },
      { status: 500 }
    );
  }
}

function formatTime(time: string) {
  const [hours, minutes] = time.split(":");
  const hour = Number.parseInt(hours, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
}

interface CancelEmailContext {
  from: string;
  subject: string;
  dateStr: string;
  fullDateStr: string;
  timeStr: string;
  eventTitle: string;
  gymName: string;
  gymLogoUrl: string | null;
  rsvpUrl: string;
}

function sendOneCancellationEmail(
  ctx: CancelEmailContext,
  to: string[],
  athleteName: string
) {
  return resend.emails.send({
    from: ctx.from,
    to,
    subject: ctx.subject,
    react: EventReminderEmail({
      gymName: ctx.gymName,
      gymLogoUrl: ctx.gymLogoUrl,
      athleteName,
      eventTitle: ctx.eventTitle,
      eventDate: ctx.dateStr,
      eventTime: ctx.timeStr,
      fullDate: ctx.fullDateStr,
      reminderType: "canceled",
      rsvpUrl: ctx.rsvpUrl,
    }),
  });
}

// POST - Send cancellation emails to selected users or a test email
export async function POST(request: Request) {
  try {
    const auth = await assertAuth();
    if (auth.error) {
      return auth.error;
    }
    const { dbUser } = auth;
    const gymId = dbUser.gymId;
    if (!gymId) {
      return NextResponse.json(
        { error: "User must belong to a gym" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      occurrenceId,
      userIds,
      testEmail,
    }: {
      occurrenceId: string;
      userIds?: string[];
      testEmail?: string;
    } = body;

    if (!occurrenceId) {
      return NextResponse.json(
        { error: "Occurrence ID is required" },
        { status: 400 }
      );
    }

    const [occurrenceData] = await db
      .select({
        occurrence: eventOccurrences,
        event: events,
      })
      .from(eventOccurrences)
      .innerJoin(events, eq(eventOccurrences.eventId, events.id))
      .where(
        and(
          eq(eventOccurrences.id, occurrenceId),
          eq(events.gymId, gymId),
          eq(eventOccurrences.status, "canceled")
        )
      )
      .limit(1);

    if (!occurrenceData) {
      return NextResponse.json(
        { error: "Canceled occurrence not found" },
        { status: 404 }
      );
    }

    const [gym] = await db
      .select()
      .from(gyms)
      .where(eq(gyms.id, gymId))
      .limit(1);

    if (!gym) {
      return NextResponse.json({ error: "Gym not found" }, { status: 404 });
    }

    const eventDate = new Date(occurrenceData.occurrence.date);
    const dateStr = `${eventDate.getDate()} ${eventDate.toLocaleDateString("en-US", { month: "short" })}`;
    const fullDateStr = eventDate.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    const timeStr = `${formatTime(occurrenceData.event.startTime)} - ${formatTime(occurrenceData.event.endTime)}`;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const from = `${process.env.RESEND_FROM_NAME || "SOMAS"} <${process.env.RESEND_FROM_EMAIL || "noreply@mail.softx.ca"}>`;
    const subject = `${occurrenceData.event.title} has been canceled`;

    const ctx: CancelEmailContext = {
      from,
      subject,
      dateStr,
      fullDateStr,
      timeStr,
      eventTitle: `${occurrenceData.event.title} - CANCELED`,
      gymName: gym.name,
      gymLogoUrl: gym.logoUrl,
      rsvpUrl: `${appUrl}/dashboard`,
    };

    const testEmailTrimmed =
      typeof testEmail === "string" ? testEmail.trim() : "";
    if (testEmailTrimmed) {
      await sendOneCancellationEmail(ctx, [testEmailTrimmed], "Test Recipient");
      return NextResponse.json({ success: true, notified: 1, test: true });
    }

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ success: true, notified: 0 });
    }

    const toSend = await db
      .select()
      .from(users)
      .where(and(eq(users.gymId, gymId), inArray(users.id, userIds)));

    let notified = 0;
    for (const targetUser of toSend) {
      try {
        const recipients = [targetUser.email];
        if (targetUser.altEmail) {
          recipients.push(targetUser.altEmail);
        }
        await sendOneCancellationEmail(
          ctx,
          recipients,
          targetUser.name || "Athlete"
        );
        notified++;
      } catch (err) {
        console.error(`Failed to notify ${targetUser.email}:`, err);
      }
    }

    return NextResponse.json({ success: true, notified });
  } catch (error) {
    console.error("Cancel notify send error:", error);
    return NextResponse.json(
      { error: "Failed to send cancellation emails" },
      { status: 500 }
    );
  }
}
