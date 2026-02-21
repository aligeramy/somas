import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { eventOccurrences, events, gyms, users } from "@/drizzle/schema";
import { EventCancellationEmail } from "@/emails/event-cancellation";
import { EventReminderEmail } from "@/emails/event-reminder";
import { InvitationEmail } from "@/emails/invitation";
import { LoginCredentialsEmail } from "@/emails/login-credentials";
import { NoticeEmail } from "@/emails/notice";
import { RsvpReminderEmail } from "@/emails/rsvp-reminder";
import { WelcomeEmail } from "@/emails/welcome";
import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get current user from database
    const [dbUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    if (!dbUser || dbUser.role !== "owner") {
      return NextResponse.json(
        { error: "Forbidden - Admin only" },
        { status: 403 }
      );
    }

    if (!dbUser.gymId) {
      return NextResponse.json(
        { error: "User must belong to a club" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      userId,
      emailType,
      // Template-specific parameters
      eventId,
      occurrenceId,
      noticeTitle,
      noticeContent,
      password,
      role,
      inviterName,
    } = body;

    if (!(userId && emailType)) {
      return NextResponse.json(
        { error: "User ID and email type are required" },
        { status: 400 }
      );
    }

    // Get target user
    const [targetUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify user belongs to same gym
    if (targetUser.gymId !== dbUser.gymId) {
      return NextResponse.json(
        { error: "User must belong to same club" },
        { status: 403 }
      );
    }

    // Get club info
    const [gym] = await db
      .select()
      .from(gyms)
      .where(eq(gyms.id, dbUser.gymId))
      .limit(1);

    if (!gym) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // Build recipient list including altEmail
    const recipients = [targetUser.email];
    if (targetUser.altEmail) {
      recipients.push(targetUser.altEmail);
    }

    let emailSubject = "";
    let emailComponent: React.ReactElement;

    // Generate email based on type
    switch (emailType) {
      case "welcome": {
        const setupUrl = `${appUrl}/setup-password?token=test-token&email=${targetUser.email}`;
        emailSubject = `Get Started with ${gym.name} - Account Setup`;
        emailComponent = WelcomeEmail({
          gymName: gym.name,
          gymLogoUrl: gym.logoUrl,
          userName: targetUser.name || targetUser.email,
          setupUrl,
        });
        break;
      }

      case "login-credentials": {
        if (!password) {
          return NextResponse.json(
            { error: "Password is required for login credentials email" },
            { status: 400 }
          );
        }
        const loginUrl = `${appUrl}/login`;
        emailSubject = `Welcome to ${gym.name}! Your login credentials`;
        emailComponent = LoginCredentialsEmail({
          gymName: gym.name,
          gymLogoUrl: gym.logoUrl,
          userName: targetUser.name || targetUser.email,
          email: targetUser.email,
          password: password || "test-password-123",
          loginUrl,
        });
        break;
      }

      case "invitation": {
        if (!(role && inviterName)) {
          return NextResponse.json(
            {
              error: "Role and inviter name are required for invitation email",
            },
            { status: 400 }
          );
        }
        const inviteUrl = `${appUrl}/invite?token=test-token`;
        emailSubject = `You're invited to join ${gym.name}`;
        emailComponent = InvitationEmail({
          gymName: gym.name,
          gymLogoUrl: gym.logoUrl,
          inviterName: inviterName || dbUser.name || "Coach",
          role: role === "coach" ? "coach" : "athlete",
          inviteUrl,
        });
        break;
      }

      case "event-reminder": {
        if (!(eventId && occurrenceId)) {
          return NextResponse.json(
            {
              error:
                "Event ID and occurrence ID are required for event reminder",
            },
            { status: 400 }
          );
        }

        // Get event and occurrence data
        const [eventData] = await db
          .select({
            occurrence: eventOccurrences,
            event: events,
          })
          .from(eventOccurrences)
          .innerJoin(events, eq(eventOccurrences.eventId, events.id))
          .where(eq(eventOccurrences.id, occurrenceId))
          .limit(1);

        if (!eventData) {
          return NextResponse.json(
            { error: "Event occurrence not found" },
            { status: 404 }
          );
        }

        // Format date for email - use UTC methods to avoid timezone issues
        const eventDate = new Date(eventData.occurrence.date);
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

        const timeStr = `${formatTime(eventData.event.startTime)} - ${formatTime(eventData.event.endTime)}`;
        const rsvpUrl = `${appUrl}/rsvp/${occurrenceId}`;

        emailSubject = `${eventData.event.title} - Reminder`;
        emailComponent = EventReminderEmail({
          gymName: gym.name,
          gymLogoUrl: gym.logoUrl,
          athleteName: targetUser.name || "Athlete",
          eventTitle: eventData.event.title,
          eventDate: dateStr,
          eventTime: timeStr,
          eventLocation: eventData.event.location || undefined,
          reminderType: "7_day",
          rsvpUrl,
        });
        break;
      }

      case "event-cancellation": {
        if (!(eventId && occurrenceId)) {
          return NextResponse.json(
            {
              error:
                "Event ID and occurrence ID are required for event cancellation",
            },
            { status: 400 }
          );
        }

        // Get event and occurrence data
        const [eventData] = await db
          .select({
            occurrence: eventOccurrences,
            event: events,
          })
          .from(eventOccurrences)
          .innerJoin(events, eq(eventOccurrences.eventId, events.id))
          .where(eq(eventOccurrences.id, occurrenceId))
          .limit(1);

        if (!eventData) {
          return NextResponse.json(
            { error: "Event occurrence not found" },
            { status: 404 }
          );
        }

        // Format date for email - use UTC methods to avoid timezone issues
        const eventDate = new Date(eventData.occurrence.date);
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

        const timeStr = `${formatTime(eventData.event.startTime)} - ${formatTime(eventData.event.endTime)}`;
        const dashboardUrl = `${appUrl}/dashboard`;

        emailSubject = `${eventData.event.title} has been canceled`;
        emailComponent = EventCancellationEmail({
          gymName: gym.name,
          gymLogoUrl: gym.logoUrl,
          athleteName: targetUser.name || "Athlete",
          eventTitle: eventData.event.title,
          eventDate: dateStr,
          eventTime: timeStr,
          eventLocation: eventData.event.location || undefined,
          dashboardUrl,
        });
        break;
      }

      case "rsvp-reminder": {
        if (!(eventId && occurrenceId)) {
          return NextResponse.json(
            {
              error:
                "Event ID and occurrence ID are required for RSVP reminder",
            },
            { status: 400 }
          );
        }

        // Get event and occurrence data
        const [eventData] = await db
          .select({
            occurrence: eventOccurrences,
            event: events,
          })
          .from(eventOccurrences)
          .innerJoin(events, eq(eventOccurrences.eventId, events.id))
          .where(eq(eventOccurrences.id, occurrenceId))
          .limit(1);

        if (!eventData) {
          return NextResponse.json(
            { error: "Event occurrence not found" },
            { status: 404 }
          );
        }

        // Format date for email - use UTC methods to avoid timezone issues
        const eventDate = new Date(eventData.occurrence.date);
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

        const timeStr = `${formatTime(eventData.event.startTime)} - ${formatTime(eventData.event.endTime)}`;
        const rsvpUrl = `${appUrl}/rsvp/${occurrenceId}`;

        emailSubject = `RSVP needed for ${eventData.event.title}`;
        emailComponent = RsvpReminderEmail({
          gymName: gym.name,
          gymLogoUrl: gym.logoUrl,
          athleteName: targetUser.name || "Athlete",
          eventTitle: eventData.event.title,
          eventDate: dateStr,
          eventTime: timeStr,
          rsvpUrl,
        });
        break;
      }

      case "notice": {
        if (!(noticeTitle && noticeContent)) {
          return NextResponse.json(
            { error: "Notice title and content are required" },
            { status: 400 }
          );
        }
        emailSubject = `Notice: ${noticeTitle}`;
        emailComponent = NoticeEmail({
          gymName: gym.name,
          gymLogoUrl: gym.logoUrl,
          userName: targetUser.name || "Team Member",
          noticeTitle,
          noticeContent,
          authorName: dbUser.name,
        });
        break;
      }

      default:
        return NextResponse.json(
          { error: "Invalid email type" },
          { status: 400 }
        );
    }

    // Send email
    const emailResult = await resend.emails.send({
      from: `${process.env.RESEND_FROM_NAME || "SOMAS"} <${process.env.RESEND_FROM_EMAIL || "noreply@mail.softx.ca"}>`,
      to: recipients,
      subject: emailSubject,
      react: emailComponent,
    });

    if (emailResult.error) {
      return NextResponse.json(
        { error: emailResult.error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Test email sent to ${targetUser.email}`,
      recipients,
    });
  } catch (error) {
    console.error("Error sending test email:", error);
    return NextResponse.json(
      { error: "Failed to send test email" },
      { status: 500 }
    );
  }
}
