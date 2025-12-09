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

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Only athletes can RSVP
    if (dbUser.role !== "athlete") {
      return NextResponse.json(
        { error: "Only athletes can RSVP" },
        { status: 403 },
      );
    }

    const { occurrenceId, status } = await request.json();

    if (!occurrenceId) {
      return NextResponse.json(
        { error: "Occurrence ID is required" },
        { status: 400 },
      );
    }

    // Verify occurrence exists and is in the future
    const occurrence = await prisma.eventOccurrence.findUnique({
      where: { id: occurrenceId },
      include: { event: true },
    });

    if (!occurrence) {
      return NextResponse.json(
        { error: "Event occurrence not found" },
        { status: 404 },
      );
    }

    if (occurrence.date < new Date()) {
      return NextResponse.json(
        { error: "Cannot RSVP to past events" },
        { status: 400 },
      );
    }

    if (occurrence.status === "canceled") {
      return NextResponse.json(
        { error: "Event has been canceled" },
        { status: 400 },
      );
    }

    // Create or update RSVP
    const rsvp = await prisma.rSVP.upsert({
      where: {
        userId_occurrenceId: {
          userId: user.id,
          occurrenceId,
        },
      },
      create: {
        userId: user.id,
        occurrenceId,
        status: status || "going",
      },
      update: {
        status: status || "going",
      },
    });

    return NextResponse.json({ success: true, rsvp });
  } catch (error) {
    console.error("RSVP error:", error);
    return NextResponse.json({ error: "Failed to RSVP" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const occurrenceId = searchParams.get("occurrenceId");

    if (occurrenceId) {
    // Get RSVPs for a specific occurrence
    const rsvps = await prisma.rSVP.findMany({
        where: { occurrenceId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
      });

      return NextResponse.json({ rsvps });
    }

    // Get user's RSVPs
    const rsvps = await prisma.rSVP.findMany({
      where: { userId: user.id },
      include: {
        occurrence: {
          include: {
            event: true,
          },
        },
      },
      orderBy: {
        occurrence: {
          date: "asc",
        },
      },
    });

    return NextResponse.json({ rsvps });
  } catch (error) {
    console.error("RSVP fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch RSVPs" },
      { status: 500 },
    );
  }
}

