import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { users } from "@/drizzle/schema";
import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
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

    if (!dbUser || !dbUser.gymId) {
      return NextResponse.json(
        { error: "User must belong to a gym" },
        { status: 400 },
      );
    }

    // Check if this is for events (allows athletes to see other athletes)
    const { searchParams } = new URL(request.url);
    const forEvents = searchParams.get("forEvents") === "true";

    // Get users in the gym
    // Athletes can only see coaches/owners, not other athletes (unless forEvents=true)
    const roster = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        phone: users.phone,
        address: users.address,
        altEmail: users.altEmail,
        homePhone: users.homePhone,
        workPhone: users.workPhone,
        cellPhone: users.cellPhone,
        emergencyContactName: users.emergencyContactName,
        emergencyContactPhone: users.emergencyContactPhone,
        emergencyContactRelationship: users.emergencyContactRelationship,
        emergencyContactEmail: users.emergencyContactEmail,
        role: users.role,
        avatarUrl: users.avatarUrl,
        onboarded: users.onboarded,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(
        dbUser.role === "athlete"
          ? eq(users.gymId, dbUser.gymId) // Will filter in code below
          : eq(users.gymId, dbUser.gymId),
      )
      .orderBy(asc(users.createdAt));

    // Filter: Athletes can only see coaches/owners (unless forEvents=true)
    const filteredRoster =
      dbUser.role === "athlete" && !forEvents
        ? roster.filter(
            (user) => user.role === "coach" || user.role === "owner",
          )
        : roster;

    return NextResponse.json({ roster: filteredRoster });
  } catch (error) {
    console.error("Roster fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch roster" },
      { status: 500 },
    );
  }
}
