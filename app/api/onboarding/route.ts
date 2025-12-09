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

    const { gymName, logoUrl } = await request.json();

    if (!gymName) {
      return NextResponse.json(
        { error: "Gym name is required" },
        { status: 400 },
      );
    }

    // Check if user already has a gym
    const existingUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { gym: true },
    });

    if (existingUser?.gym) {
      return NextResponse.json(
        { error: "User already has a gym" },
        { status: 400 },
      );
    }

    // Create gym
    const gym = await prisma.gym.create({
      data: {
        name: gymName,
        logoUrl: logoUrl || null,
        createdById: user.id,
      },
    });

    // Update user
    await prisma.user.update({
      where: { id: user.id },
      data: {
        gymId: gym.id,
        role: "owner",
        onboarded: true,
      },
    });

    return NextResponse.json({ success: true, gym });
  } catch (error) {
    console.error("Onboarding error:", error);
    return NextResponse.json(
      { error: "Failed to complete onboarding" },
      { status: 500 },
    );
  }
}

