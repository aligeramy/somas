import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { notices, users } from "@/drizzle/schema";
import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
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

    // All authenticated users can view notices
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
