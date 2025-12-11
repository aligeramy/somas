import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { users, channels, messages } from "@/drizzle/schema";
import { eq, and, or, inArray } from "drizzle-orm";

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
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const gymId = searchParams.get("gymId") || dbUser.gymId;
    const eventId = searchParams.get("eventId");

    // Ensure global channel exists for this gym
    const [existingGlobal] = await db
      .select()
      .from(channels)
      .where(
        and(eq(channels.gymId, gymId), eq(channels.type, "global"))
      )
      .limit(1);

    if (!existingGlobal) {
      await db.insert(channels).values({
        gymId: gymId,
        name: "Gym Chat",
        type: "global",
        eventId: null,
      });
    }

    // Get all channels for the gym
    const allChannels = await db
      .select()
      .from(channels)
      .where(
        eventId
          ? and(eq(channels.gymId, gymId), eq(channels.eventId, eventId))
          : eq(channels.gymId, gymId)
      )
      .orderBy(channels.createdAt);

    // Get channels where the user has sent messages (for DM and group filtering)
    const userMessageChannels = await db
      .selectDistinct({ channelId: messages.channelId })
      .from(messages)
      .where(eq(messages.senderId, user.id));

    const userChannelIds = new Set(
      userMessageChannels.map((m) => m.channelId)
    );

    // Filter channels based on type and user participation
    const filteredChannels = allChannels.filter((channel) => {
      // Always show global channels
      if (channel.type === "global") {
        return true;
      }

      // For DM channels: only show if user has sent messages OR channel name matches user's name/email
      // (meaning someone created a DM with them)
      if (channel.type === "dm") {
        const userIsParticipant = userChannelIds.has(channel.id);
        const channelNameMatchesUser = 
          channel.name === (dbUser.name || dbUser.email);
        return userIsParticipant || channelNameMatchesUser;
      }

      // For group channels: only show if user has sent messages
      // (assuming group chats require participation)
      if (channel.type === "group") {
        return userChannelIds.has(channel.id);
      }

      // For event channels: show if user has sent messages
      if (channel.eventId) {
        return userChannelIds.has(channel.id);
      }

      // Default: don't show
      return false;
    });

    // Sort channels: global first, then others
    const sortedChannels = [...filteredChannels].sort((a, b) => {
      if (a.type === "global") return -1;
      if (b.type === "global") return 1;
      return 0;
    });

    return NextResponse.json({ channels: sortedChannels });
  } catch (error) {
    console.error("Channels fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch channels" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
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
        { status: 400 }
      );
    }

    const { name, type, eventId, userId } = await request.json();

    if (!type) {
      return NextResponse.json(
        { error: "Type is required" },
        { status: 400 }
      );
    }

    // Check if global channel already exists
    if (type === "global") {
      const [existing] = await db
        .select()
        .from(channels)
        .where(
          and(eq(channels.gymId, dbUser.gymId), eq(channels.type, "global"))
        )
        .limit(1);

      if (existing) {
        return NextResponse.json(
          { error: "Global channel already exists" },
          { status: 400 }
        );
      }
    }

    // Handle DM creation
    if (type === "dm") {
      if (!userId) {
        return NextResponse.json(
          { error: "User ID is required for DM" },
          { status: 400 }
        );
      }

      // Get the other user's info
      const [otherUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!otherUser || otherUser.gymId !== dbUser.gymId) {
        return NextResponse.json(
          { error: "User not found or not in same gym" },
          { status: 400 }
        );
      }

      const dmName = otherUser.name || otherUser.email;

      // Check if DM channel already exists between these two users
      // Look for existing DM channels with this name
      const existingDMs = await db
        .select()
        .from(channels)
        .where(
          and(
            eq(channels.gymId, dbUser.gymId),
            eq(channels.type, "dm"),
            eq(channels.name, dmName)
          )
        );

      // Check if any of these DMs have messages from both users
      // For simplicity, if a DM with this name exists, return it
      // (In a production system, you'd want a participants table)
      if (existingDMs.length > 0) {
        // Return the first existing DM
        return NextResponse.json({ channel: existingDMs[0] });
      }

      // Create new DM channel
      const [newChannel] = await db
        .insert(channels)
        .values({
          gymId: dbUser.gymId,
          name: dmName,
          type: "dm",
          eventId: null,
        })
        .returning();

      return NextResponse.json({ channel: newChannel });
    }

    // Handle group chat creation
    if (type === "group") {
      if (!name || !name.trim()) {
        return NextResponse.json(
          { error: "Group name is required" },
          { status: 400 }
        );
      }

      const [newChannel] = await db
        .insert(channels)
        .values({
          gymId: dbUser.gymId,
          name: name.trim(),
          type: "group",
          eventId: eventId || null,
        })
        .returning();

      return NextResponse.json({ channel: newChannel });
    }

    return NextResponse.json(
      { error: "Invalid channel type" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Channel creation error:", error);
    return NextResponse.json(
      { error: "Failed to create channel" },
      { status: 500 }
    );
  }
}

