import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { notices, users } from "@/drizzle/schema";
import { NoticeEmail } from "@/emails/notice";
import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const { title, content, sendEmail } = await request.json();

    // Verify notice belongs to user's gym
    const [notice] = await db
      .select()
      .from(notices)
      .where(eq(notices.id, id))
      .limit(1);

    if (!notice || notice.gymId !== dbUser.gymId) {
      return NextResponse.json({ error: "Notice not found" }, { status: 404 });
    }

    const [updatedNotice] = await db
      .update(notices)
      .set({
        title,
        content,
        sendEmail,
        updatedAt: new Date(),
      })
      .where(eq(notices.id, id))
      .returning();

    // Send email if requested and notice wasn't already sent
    if (sendEmail && !notice.sendEmail) {
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
        // Don't fail the notice update if email sending fails
      }
    }

    return NextResponse.json({ notice: updatedNotice });
  } catch (error) {
    console.error("Notice update error:", error);
    return NextResponse.json(
      { error: "Failed to update notice" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Only head coaches and coaches can delete notices
    if (dbUser.role !== "owner" && dbUser.role !== "coach") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Verify notice belongs to user's gym
    const [notice] = await db
      .select()
      .from(notices)
      .where(eq(notices.id, id))
      .limit(1);

    if (!notice || notice.gymId !== dbUser.gymId) {
      return NextResponse.json({ error: "Notice not found" }, { status: 404 });
    }

    await db.delete(notices).where(eq(notices.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Notice deletion error:", error);
    return NextResponse.json(
      { error: "Failed to delete notice" },
      { status: 500 }
    );
  }
}
