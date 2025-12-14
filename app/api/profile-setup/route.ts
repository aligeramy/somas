import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { users } from "@/drizzle/schema";
import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, phone, address, avatarUrl } = await request.json();

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Update user profile
    await db
      .update(users)
      .set({
        name,
        phone: phone || null,
        address: address || null,
        avatarUrl: avatarUrl || null,
        onboarded: true,
      })
      .where(eq(users.id, user.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Profile setup error:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 },
    );
  }
}
