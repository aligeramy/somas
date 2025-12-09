import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { gym: true },
    });

    if (!dbUser || !dbUser.gym) {
      return NextResponse.json(
        { error: "User must belong to a gym" },
        { status: 400 },
      );
    }

    // Only owners and coaches can cancel events
    if (dbUser.role !== "owner" && dbUser.role !== "coach") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const occurrenceId = params.id;

    // Verify occurrence belongs to user's gym
    const occurrence = await prisma.eventOccurrence.findUnique({
      where: { id: occurrenceId },
      include: {
        event: true,
      },
    });

    if (!occurrence) {
      return NextResponse.json(
        { error: "Event occurrence not found" },
        { status: 404 },
      );
    }

    if (occurrence.event.gymId !== dbUser.gymId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Cancel occurrence
    await prisma.eventOccurrence.update({
      where: { id: occurrenceId },
      data: { status: "canceled" },
    });

    // TODO: Send notifications to RSVP'd users

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Event cancellation error:", error);
    return NextResponse.json(
      { error: "Failed to cancel event" },
      { status: 500 },
    );
  }
}

