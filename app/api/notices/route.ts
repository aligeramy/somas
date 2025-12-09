import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { users, notices } from "@/drizzle/schema";
import { eq, and } from "drizzle-orm";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [dbUser] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);

    if (!dbUser || !dbUser.gymId) {
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

    const [dbUser] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);

    if (!dbUser || !dbUser.gymId) {
      return NextResponse.json(
        { error: "User must belong to a gym" },
        { status: 400 }
      );
    }

    // Only owners and coaches can create notices
    if (dbUser.role !== "owner" && dbUser.role !== "coach") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { title, content, sendEmail } = await request.json();

    if (!title || !content) {
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
        sendEmail: sendEmail || false,
      })
      .returning();

    // Send email if requested
    if (sendEmail) {
      // Get all gym members
      const gymMembers = await db
        .select({ email: users.email, name: users.name })
        .from(users)
        .where(eq(users.gymId, dbUser.gymId));

      // Get gym info
      const { gyms } = await import("@/drizzle/schema");
      const [gym] = await db
        .select()
        .from(gyms)
        .where(eq(gyms.id, dbUser.gymId))
        .limit(1);

      // Send emails
      for (const member of gymMembers) {
        if (member.email) {
          await resend.emails.send({
            from: `${process.env.RESEND_FROM_NAME} <${process.env.RESEND_FROM_EMAIL}>`,
            to: member.email,
            subject: `Notice: ${title}`,
            html: `
              <h2>${title}</h2>
              <p>${content.replace(/\n/g, "<br>")}</p>
              <p><small>From ${gym?.name || "your gym"}</small></p>
            `,
          });
        }
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

    const [dbUser] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);

    if (!dbUser || !dbUser.gymId) {
      return NextResponse.json(
        { error: "User must belong to a gym" },
        { status: 400 }
      );
    }

    // Only owners and coaches can update notices
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

