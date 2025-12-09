import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { users } from "@/drizzle/schema";
import { eq, asc } from "drizzle-orm";

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
        { status: 400 },
      );
    }

    // Get all users in the gym
    const roster = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        phone: users.phone,
        role: users.role,
        avatarUrl: users.avatarUrl,
        onboarded: users.onboarded,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.gymId, dbUser.gymId))
      .orderBy(asc(users.createdAt));

    return NextResponse.json({ roster });
  } catch (error) {
    console.error("Roster fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch roster" },
      { status: 500 },
    );
  }
}

