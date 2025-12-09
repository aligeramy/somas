import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { users, events, eventOccurrences, rsvps, gyms } from "@/drizzle/schema";
import { eq, and } from "drizzle-orm";
import { Resend } from "resend";
import { EventReminderEmail } from "@/emails/event-reminder";

const resend = new Resend(process.env.RESEND_API_KEY);

// POST - Cancel occurrence and notify all going users
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params;
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
      return NextResponse.json({ error: "Only owners and coaches can cancel events" }, { status: 403 });
    }

    const { occurrenceId, notifyUsers = true } = await request.json();

    if (!occurrenceId) {
      return NextResponse.json({ error: "Occurrence ID is required" }, { status: 400 });
    }

    // Get occurrence with event details
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
          eq(events.gymId, dbUser.gymId)
        )
      )
      .limit(1);

    if (!occurrenceData) {
      return NextResponse.json({ error: "Occurrence not found" }, { status: 404 });
    }

    if (occurrenceData.occurrence.status === "canceled") {
      return NextResponse.json({ error: "Already canceled" }, { status: 400 });
    }

    // Update occurrence status
    await db
      .update(eventOccurrences)
      .set({ status: "canceled", updatedAt: new Date() })
      .where(eq(eventOccurrences.id, occurrenceId));

    let notified = 0;

    // Notify users if requested
    if (notifyUsers) {
      // Get gym info
      const [gym] = await db
        .select()
        .from(gyms)
        .where(eq(gyms.id, dbUser.gymId))
        .limit(1);

      if (gym) {
        // Get all users who RSVP'd going
        const goingRsvps = await db
          .select({
            rsvp: rsvps,
            user: users,
          })
          .from(rsvps)
          .innerJoin(users, eq(rsvps.userId, users.id))
          .where(
            and(
              eq(rsvps.occurrenceId, occurrenceId),
              eq(rsvps.status, "going")
            )
          );

        // Format date for email
        const eventDate = new Date(occurrenceData.occurrence.date);
        const dateStr = `${eventDate.getDate()} ${eventDate.toLocaleDateString("en-US", { month: "short" })}`;

        const formatTime = (time: string) => {
          const [hours, minutes] = time.split(":");
          const hour = parseInt(hours);
          const ampm = hour >= 12 ? "PM" : "AM";
          const displayHour = hour % 12 || 12;
          return `${displayHour}:${minutes} ${ampm}`;
        };

        const timeStr = `${formatTime(occurrenceData.event.startTime)} - ${formatTime(occurrenceData.event.endTime)}`;
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

        // Send cancellation emails
        for (const { user: targetUser } of goingRsvps) {
          try {
            await resend.emails.send({
              from: `${process.env.RESEND_FROM_NAME || "TOM"} <${process.env.RESEND_FROM_EMAIL || "noreply@mail.titansofmississauga.ca"}>`,
              to: targetUser.email,
              subject: `${occurrenceData.event.title} has been canceled`,
              react: EventReminderEmail({
                gymName: gym.name,
                gymLogoUrl: gym.logoUrl,
                athleteName: targetUser.name || "Athlete",
                eventTitle: `${occurrenceData.event.title} - CANCELED`,
                eventDate: dateStr,
                eventTime: timeStr,
                reminderType: "canceled",
                rsvpUrl: `${appUrl}/dashboard`,
              }),
            });
            notified++;
          } catch (err) {
            console.error(`Failed to notify ${targetUser.email}:`, err);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      notified,
    });
  } catch (error) {
    console.error("Cancel and notify error:", error);
    return NextResponse.json({ error: "Failed to cancel event" }, { status: 500 });
  }
}

