import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { users, notices } from "@/drizzle/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
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

    // Only owners and coaches can view all notices
    if (dbUser.role !== "owner" && dbUser.role !== "coach") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const noticesList = await db
      .select({
        id: notices.id,
        title: notices.title,
        content: notices.content,
        active: notices.active,
        sendEmail: notices.sendEmail,
        createdAt: notices.createdAt,
        author: {
          id: users.id,
          name: users.name,
        },
      })
      .from(notices)
      .innerJoin(users, eq(notices.authorId, users.id))
      .where(eq(notices.gymId, dbUser.gymId))
      .orderBy(desc(notices.createdAt));

    return NextResponse.json({ notices: noticesList });
  } catch (error) {
    console.error("Notices fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch notices" },
      { status: 500 }
    );
  }
}



