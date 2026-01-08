import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { notices, users } from "@/drizzle/schema";
import { NoticeEmail } from "@/emails/notice";
import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET(_request: Request) {
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

    if (!(dbUser && dbUser.gymId)) {
      return NextResponse.json(
        { error: "User must belong to a gym" },
        { status: 400 }
      );
    }

    // Get active notice
    const [activeNotice] = await db
      .select({
        id: notices.id,
        title: notices.title,
        content: notices.content,
        createdAt: notices.createdAt,
        author: {
          id: users.id,
          name: users.name,
        },
      })
      .from(notices)
      .innerJoin(users, eq(notices.authorId, users.id))
      .where(and(eq(notices.gymId, dbUser.gymId), eq(notices.active, true)))
      .limit(1);

    return NextResponse.json({ notice: activeNotice || null });
  } catch (error) {
    console.error("Notice fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch notice" },
      { status: 500 }
    );
  }
}

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

    if (!(dbUser && dbUser.gymId)) {
      return NextResponse.json(
        { error: "User must belong to a gym" },
        { status: 400 }
      );
    }

    // Only head coaches and coaches can create notices
    if (dbUser.role !== "owner" && dbUser.role !== "coach") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { title, content, sendEmail } = await request.json();

    if (!(title && content)) {
      return NextResponse.json(
        { error: "Title and content are required" },
        { status: 400 }
      );
    }

    // Deactivate all existing notices
    await db
      .update(notices)
      .set({ active: false })
      .where(eq(notices.gymId, dbUser.gymId));

    // Create new active notice
    const [newNotice] = await db
      .insert(notices)
      .values({
        gymId: dbUser.gymId,
        authorId: user.id,
        title,
        content,
        active: true,
        sendEmail,
      })
      .returning();

    // Send email if requested
    if (sendEmail) {
      try {
        // Get all gym members (including altEmail)
        const gymMembers = await db
          .select({
            email: users.email,
            altEmail: users.altEmail,
            name: users.name,
          })
          .from(users)
          .where(eq(users.gymId, dbUser.gymId));

        // Get gym info
        const { gyms } = await import("@/drizzle/schema");
        const [gym] = await db
          .select()
          .from(gyms)
          .where(eq(gyms.id, dbUser.gymId))
          .limit(1);

        // Get author name
        const authorName = dbUser.name;

        // Send emails to all members
        const emailPromises = gymMembers
          .filter((member) => member.email)
          .map((member) => {
            if (!member.email) return Promise.resolve({ error: "No email" });
            // Build recipient list including altEmail
            const recipients = [member.email];
            if (member.altEmail) {
              recipients.push(member.altEmail);
            }
            return resend.emails
              .send({
                from: `${process.env.RESEND_FROM_NAME || "SOMAS"} <${process.env.RESEND_FROM_EMAIL || "noreply@mail.titansofmississauga.ca"}>`,
                to: recipients,
                subject: `Notice: ${title}`,
                react: NoticeEmail({
                  gymName: gym?.name || null,
                  gymLogoUrl: gym?.logoUrl || null,
                  userName: member.name || "Team Member",
                  noticeTitle: title,
                  noticeContent: content,
                  authorName,
                }),
              })
              .catch((error) => {
                console.error(
                  `Failed to send notice email to ${member.email}:`,
                  error
                );
                return { error: member.email };
              });
          });

        // Wait for all emails to be sent (or fail)
        await Promise.all(emailPromises);
      } catch (error) {
        console.error("Error sending notice emails:", error);
        // Don't fail the notice creation if email sending fails
      }
    }

    return NextResponse.json({ notice: newNotice });
  } catch (error) {
    console.error("Notice creation error:", error);
    return NextResponse.json(
      { error: "Failed to create notice" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
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

    if (!(dbUser && dbUser.gymId)) {
      return NextResponse.json(
        { error: "User must belong to a gym" },
        { status: 400 }
      );
    }

    // Only head coaches and coaches can update notices
    if (dbUser.role !== "owner" && dbUser.role !== "coach") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id, active } = await request.json();

    if (id === undefined || active === undefined) {
      return NextResponse.json(
        { error: "ID and active status are required" },
        { status: 400 }
      );
    }

    // If activating, deactivate all others first
    if (active) {
      await db
        .update(notices)
        .set({ active: false })
        .where(eq(notices.gymId, dbUser.gymId));
    }

    const [updatedNotice] = await db
      .update(notices)
      .set({ active })
      .where(eq(notices.id, id))
      .returning();

    return NextResponse.json({ notice: updatedNotice });
  } catch (error) {
    console.error("Notice update error:", error);
    return NextResponse.json(
      { error: "Failed to update notice" },
      { status: 500 }
    );
  }
}
