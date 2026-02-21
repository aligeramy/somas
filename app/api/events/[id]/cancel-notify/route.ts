import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { eventOccurrences, events, gyms, users } from "@/drizzle/schema";
import { EventCancellationEmail } from "@/emails/event-cancellation";
import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

const resend = new Resend(process.env.RESEND_API_KEY);

// Helper function to add delay for rate limiting
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// POST - Cancel occurrence and notify all gym members
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: _eventId } = await params;
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

    if (dbUser.role !== "owner" && dbUser.role !== "coach") {
      return NextResponse.json(
        { error: "Only head coaches and coaches can cancel events" },
        { status: 403 }
      );
    }

    const { occurrenceId, notifyUsers = true } = await request.json();

    if (!occurrenceId) {
      return NextResponse.json(
        { error: "Occurrence ID is required" },
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
      .where(
        and(
          eq(eventOccurrences.id, occurrenceId),
          eq(events.gymId, dbUser.gymId)
        )
      )
      .limit(1);

    if (!occurrenceData) {
      return NextResponse.json(
        { error: "Occurrence not found" },
        { status: 404 }
      );
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
      // Get club info
      const [gym] = await db
        .select()
        .from(gyms)
        .where(eq(gyms.id, dbUser.gymId))
        .limit(1);

      if (gym) {
        // Get ALL gym members (not just those who RSVP'd going)
        const gymMembers = await db
          .select()
          .from(users)
          .where(eq(users.gymId, dbUser.gymId));

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
        const appUrl =
          process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        const dashboardUrl = `${appUrl}/dashboard`;

        // Send cancellation emails to all gym members
        for (let i = 0; i < gymMembers.length; i++) {
          const targetUser = gymMembers[i];

          // Skip users without email
          if (!targetUser.email) {
            continue;
          }

          try {
            // Build recipient list including altEmail
            const recipients = [targetUser.email];
            if (targetUser.altEmail) {
              recipients.push(targetUser.altEmail);
            }

            await resend.emails.send({
              from: `${process.env.RESEND_FROM_NAME || "SOMAS"} <${process.env.RESEND_FROM_EMAIL || "noreply@mail.softx.ca"}>`,
              to: recipients,
              subject: `${occurrenceData.event.title} has been canceled`,
              react: EventCancellationEmail({
                gymName: gym.name,
                gymLogoUrl: gym.logoUrl,
                athleteName: targetUser.name || "Athlete",
                eventTitle: occurrenceData.event.title,
                eventDate: dateStr,
                eventTime: timeStr,
                eventLocation: occurrenceData.event.location || undefined,
                dashboardUrl,
              }),
            });
            notified++;
          } catch (err) {
            console.error(`Failed to notify ${targetUser.email}:`, err);
          }

          // Rate limit: wait 600ms between requests (allows max 1.67 req/sec, safely under 2/sec limit)
          // Skip delay on last iteration
          if (i < gymMembers.length - 1) {
            await delay(600);
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
    return NextResponse.json(
      { error: "Failed to cancel event" },
      { status: 500 }
    );
  }
}
