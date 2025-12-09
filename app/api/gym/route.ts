import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { users, gyms } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

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
      return NextResponse.json({ error: "User must belong to a gym" }, { status: 400 });
    }

    // Only owners can view/edit gym
    if (dbUser.role !== "owner") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [gym] = await db.select().from(gyms).where(eq(gyms.id, dbUser.gymId)).limit(1);

    if (!gym) {
      return NextResponse.json({ error: "Gym not found" }, { status: 404 });
    }

    return NextResponse.json({ gym });
  } catch (error) {
    console.error("Gym fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch gym" },
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
      return NextResponse.json({ error: "User must belong to a gym" }, { status: 400 });
    }

    // Only owners can edit gym
    if (dbUser.role !== "owner") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { name, logoUrl, emailSettings } = body;

    const updateData: {
      name?: string;
      logoUrl?: string | null;
      emailSettings?: any;
      updatedAt: Date;
    } = {
      updatedAt: new Date(),
    };

    if (name !== undefined) {
      updateData.name = name;
    }
    if (logoUrl !== undefined) {
      updateData.logoUrl = logoUrl || null;
    }
    if (emailSettings !== undefined) {
      updateData.emailSettings = emailSettings;
    }

    const [updatedGym] = await db
      .update(gyms)
      .set(updateData)
      .where(eq(gyms.id, dbUser.gymId))
      .returning();

    return NextResponse.json({ gym: updatedGym });
  } catch (error) {
    console.error("Gym update error:", error);
    return NextResponse.json(
      { error: "Failed to update gym" },
      { status: 500 }
    );
  }
}



