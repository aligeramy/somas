import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { users, gyms } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { gymName, logoUrl } = await request.json();

    if (!gymName) {
      return NextResponse.json(
        { error: "Gym name is required" },
        { status: 400 },
      );
    }

    // Check if user already has a gym
    const [existingUser] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);

    if (existingUser?.gymId) {
      const [existingGym] = await db.select().from(gyms).where(eq(gyms.id, existingUser.gymId)).limit(1);
      if (existingGym) {
        return NextResponse.json(
          { error: "User already has a gym" },
          { status: 400 },
        );
      }
    }

    // Create gym
    const [gym] = await db.insert(gyms).values({
      name: gymName,
      logoUrl: logoUrl || null,
      createdById: user.id,
    }).returning();

    // Update user
    await db.update(users).set({
      gymId: gym.id,
      role: "owner",
      onboarded: true,
    }).where(eq(users.id, user.id));

    return NextResponse.json({ success: true, gym });
  } catch (error) {
    console.error("Onboarding error:", error);
    return NextResponse.json(
      { error: "Failed to complete onboarding" },
      { status: 500 },
    );
  }
}

