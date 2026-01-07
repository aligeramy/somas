import { eq, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { users } from "@/drizzle/schema";
import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const emailParam = searchParams.get("email");

    // If email parameter provided, look up user by email (including altEmail)
    if (emailParam) {
      const [dbUser] = await db
        .select({
          id: users.id,
          email: users.email,
          altEmail: users.altEmail,
          role: users.role,
          gymId: users.gymId,
        })
        .from(users)
        .where(or(eq(users.email, emailParam), eq(users.altEmail, emailParam)))
        .limit(1);

      if (!dbUser) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      // Return primary email if the provided email was an altEmail
      return NextResponse.json({
        id: dbUser.id,
        email: dbUser.email,
        primaryEmail:
          dbUser.altEmail === emailParam ? dbUser.email : emailParam,
        role: dbUser.role,
        gymId: dbUser.gymId,
      });
    }

    // Otherwise, get current authenticated user
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [dbUser] = await db
      .select({
        id: users.id,
        role: users.role,
        gymId: users.gymId,
      })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: dbUser.id,
      role: dbUser.role,
      gymId: dbUser.gymId,
    });
  } catch (error) {
    console.error("User info fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch user info" },
      { status: 500 },
    );
  }
}
