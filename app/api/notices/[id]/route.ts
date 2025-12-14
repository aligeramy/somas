import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { notices, users } from "@/drizzle/schema";
import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
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

    if (!dbUser || !dbUser.gymId) {
      return NextResponse.json(
        { error: "User must belong to a gym" },
        { status: 400 },
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
        sendEmail: sendEmail || false,
        updatedAt: new Date(),
      })
      .where(eq(notices.id, id))
      .returning();

    return NextResponse.json({ notice: updatedNotice });
  } catch (error) {
    console.error("Notice update error:", error);
    return NextResponse.json(
      { error: "Failed to update notice" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
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

    if (!dbUser || !dbUser.gymId) {
      return NextResponse.json(
        { error: "User must belong to a gym" },
        { status: 400 },
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
      { status: 500 },
    );
  }
}
