import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { eventOccurrences, events, gyms, users } from "@/drizzle/schema";
import { EventCancellationEmail } from "@/emails/event-cancellation";
import { db } from "@/lib/db";
import { formatOccurrenceDateLong, formatOccurrenceDateShort } from "@/lib/date";
import { createClient } from "@/lib/supabase/server";

const resend = new Resend(process.env.RESEND_API_KEY);

// Helper function to add delay for rate limiting
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // Only head coaches and coaches can cancel events
    if (dbUser.role !== "owner" && dbUser.role !== "coach") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: eventId } = await params;
    const body = await request.json();
    const { occurrenceId, restore = false } = body;

    if (!occurrenceId) {
      return NextResponse.json(
        { error: "Occurrence ID is required" },
        { status: 400 }
      );
    }

    // Verify occurrence belongs to user's club
    const [occurrence] = await db
      .select({
        id: eventOccurrences.id,
        eventId: eventOccurrences.eventId,
        date: eventOccurrences.date,
        status: eventOccurrences.status,
        gymId: events.gymId,
      })
      .from(eventOccurrences)
      .innerJoin(events, eq(eventOccurrences.eventId, events.id))
      .where(and(eq(eventOccurrences.id, occurrenceId), eq(events.id, eventId)))
      .limit(1);

    if (!occurrence) {
      return NextResponse.json(
        { error: "Event occurrence not found" },
        { status: 404 }
      );
    }

    if (occurrence.gymId !== dbUser.gymId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Toggle status based on restore flag
    const newStatus = restore ? "scheduled" : "canceled";

    await db
      .update(eventOccurrences)
      .set({
        status: newStatus,
        updatedAt: new Date(),
      })
      .where(eq(eventOccurrences.id, occurrenceId));

    let notified = 0;

    // If canceling (not restoring), send cancellation emails to all gym members
    if (newStatus === "canceled") {
      // Get event details for email
      const [eventData] = await db
        .select({
          occurrence: eventOccurrences,
          event: events,
        })
        .from(eventOccurrences)
        .innerJoin(events, eq(eventOccurrences.eventId, events.id))
        .where(eq(eventOccurrences.id, occurrenceId))
        .limit(1);

      if (eventData) {
        // Get club info
        const [gym] = await db
          .select()
          .from(gyms)
          .where(eq(gyms.id, dbUser.gymId))
          .limit(1);

        if (gym) {
          // Get ALL gym members
          const gymMembers = await db
            .select()
            .from(users)
            .where(eq(users.gymId, dbUser.gymId));

          const eventDate = new Date(eventData.occurrence.date);
          const dateStr = formatOccurrenceDateShort(eventDate);
          const fullDateStr = formatOccurrenceDateLong(eventDate);

          const formatTime = (time: string) => {
            const [hours, minutes] = time.split(":");
            const hour = Number.parseInt(hours, 10);
            const ampm = hour >= 12 ? "PM" : "AM";
            const displayHour = hour % 12 || 12;
            return `${displayHour}:${minutes} ${ampm}`;
          };

          const timeStr = `${formatTime(eventData.event.startTime)} - ${formatTime(eventData.event.endTime)}`;
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
                subject: `${eventData.event.title} has been canceled`,
                react: EventCancellationEmail({
                  gymName: gym.name,
                  gymLogoUrl: gym.logoUrl,
                  athleteName: targetUser.name || "Athlete",
                  eventTitle: eventData.event.title,
                  eventDate: dateStr,
                  fullDate: fullDateStr,
                  eventTime: timeStr,
                  eventLocation: eventData.event.location || undefined,
                  dashboardUrl,
                }),
              });
              notified++;
            } catch (err) {
              console.error(`Failed to notify ${targetUser.email}:`, err);
            }

            // Rate limit: wait 600ms between requests
            if (i < gymMembers.length - 1) {
              await delay(600);
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      status: newStatus,
      notified,
    });
  } catch (error) {
    console.error("Event cancellation error:", error);
    return NextResponse.json(
      { error: "Failed to update event" },
      { status: 500 }
    );
  }
}
