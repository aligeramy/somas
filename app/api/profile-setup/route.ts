import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

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
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 },
      );
    }

    // Update user profile
    await prisma.user.update({
      where: { id: user.id },
      data: {
        name,
        phone: phone || null,
        address: address || null,
        avatarUrl: avatarUrl || null,
        onboarded: true,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Profile setup error:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 },
    );
  }
}

