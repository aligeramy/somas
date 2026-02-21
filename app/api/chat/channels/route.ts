import { and, eq, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { channels, events, messages, users } from "@/drizzle/schema";
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

    if (!dbUser?.gymId) {
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
      .where(and(eq(channels.gymId, gymId), eq(channels.type, "global")))
      .limit(1);

    if (!existingGlobal) {
      await db.insert(channels).values({
        gymId,
        name: "Club Chat",
        type: "global",
        eventId: null,
      });
    }

    // Auto-create event channel if it doesn't exist and eventId is provided
    if (eventId) {
      const [existingEventChannel] = await db
        .select()
        .from(channels)
        .where(
          and(
            eq(channels.gymId, gymId),
            eq(channels.eventId, eventId),
            eq(channels.type, "group")
          )
        )
        .limit(1);

      if (!existingEventChannel) {
        // Try to get event title for better channel name
        const [event] = await db
          .select({ title: events.title })
          .from(events)
          .where(eq(events.id, eventId))
          .limit(1);

        const channelName = event ? `${event.title} Chat` : "Event Chat";

        try {
          await db.insert(channels).values({
            gymId,
            name: channelName,
            type: "group",
            eventId,
          });
        } catch (insertError) {
          // Channel might have been created by another request, ignore error
          console.log("Channel may already exist:", insertError);
        }
      }
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

    // Owners and coaches can see all channels in their gym
    const isOwnerOrCoach = dbUser.role === "owner" || dbUser.role === "coach";

    // Get channels where the user has sent messages (for DM and group filtering)
    const userMessageChannels = await db
      .selectDistinct({ channelId: messages.channelId })
      .from(messages)
      .where(eq(messages.senderId, user.id));

    const userChannelIds = new Set(userMessageChannels.map((m) => m.channelId));

    // Filter channels based on type and user participation
    const filteredChannels = allChannels.filter((channel) => {
      // Owners and coaches can see all channels
      if (isOwnerOrCoach) {
        return true;
      }

      // Always show global channels
      if (channel.type === "global") {
        return true;
      }

      // For DM channels: show if user is a participant
      // User is a participant if:
      // 1. They have sent messages in this channel (they're the sender), OR
      // 2. Channel name matches their name/email (they're the recipient)
      // This ensures both parties in a DM can see it:
      // - When user A creates DM with user B: channel name = B's name
      //   - User A sees it because they send messages (userIsParticipant = true)
      //   - User B sees it because channel name matches (channelNameMatchesUser = true)
      if (channel.type === "dm") {
        const userIsParticipant = userChannelIds.has(channel.id);
        const channelNameMatchesUser =
          channel.name === (dbUser.name || dbUser.email);

        // Show DM if user has sent messages OR if channel name matches user
        return userIsParticipant || channelNameMatchesUser;
      }

      // For event channels (group type with eventId): show to all gym members
      if (channel.type === "group" && channel.eventId) {
        return true; // All gym members can see event channels
      }

      // Other group channels should not be shown
      if (channel.type === "group") {
        return false;
      }

      // Default: don't show
      return false;
    });

    // Sort channels: global first, then others
    const sortedChannels = [...filteredChannels].sort((a, b) => {
      if (a.type === "global") {
        return -1;
      }
      if (b.type === "global") {
        return 1;
      }
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

    const [dbUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    if (!dbUser?.gymId) {
      return NextResponse.json(
        { error: "User must belong to a gym" },
        { status: 400 }
      );
    }

    const { type, userId, eventId, name } = await request.json();

    if (!type) {
      return NextResponse.json({ error: "Type is required" }, { status: 400 });
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

    // Handle event channel creation (group type with eventId)
    if (type === "group" && eventId) {
      // Check if event channel already exists
      const [existingEventChannel] = await db
        .select()
        .from(channels)
        .where(
          and(
            eq(channels.gymId, dbUser.gymId),
            eq(channels.eventId, eventId),
            eq(channels.type, "group")
          )
        )
        .limit(1);

      if (existingEventChannel) {
        // Return existing channel instead of error
        return NextResponse.json({ channel: existingEventChannel });
      }

      // Create new event channel
      const [newChannel] = await db
        .insert(channels)
        .values({
          gymId: dbUser.gymId,
          name: name || "Event Chat",
          type: "group",
          eventId,
        })
        .returning();

      return NextResponse.json({ channel: newChannel });
    }

    // Handle DM creation
    if (type === "dm") {
      if (!userId) {
        return NextResponse.json(
          { error: "User ID is required for DM" },
          { status: 400 }
        );
      }

      // Prevent self-DMs
      if (userId === user.id) {
        return NextResponse.json(
          { error: "Cannot create a direct message with yourself" },
          { status: 400 }
        );
      }

      // Prevent self-DMs
      if (userId === user.id) {
        return NextResponse.json(
          { error: "Cannot create a direct message with yourself" },
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
      const currentUserName = dbUser.name || dbUser.email;

      // Check if DM channel already exists between these two users
      // Look for existing DM channels where:
      // 1. Channel name matches other user's name (current user created it), OR
      // 2. Channel name matches current user's name (other user created it)
      // Note: Self-DM is already prevented above, so dmName !== currentUserName at this point
      const existingDMs = await db
        .select()
        .from(channels)
        .where(
          and(
            eq(channels.gymId, dbUser.gymId),
            eq(channels.type, "dm"),
            or(eq(channels.name, dmName), eq(channels.name, currentUserName))
          )
        );

      if (existingDMs.length > 0) {
        // Find the channel that's actually between these two users
        // Prefer channels with messages from either user, otherwise use name match
        for (const channel of existingDMs) {
          // Check if this channel has messages from either of these users
          const channelMessages = await db
            .select({ senderId: messages.senderId })
            .from(messages)
            .where(eq(messages.channelId, channel.id))
            .limit(1);

          if (channelMessages.length > 0) {
            // Channel has messages - verify it's between these users
            const senderId = channelMessages[0].senderId;
            if (senderId === user.id || senderId === userId) {
              return NextResponse.json({ channel });
            }
          } else {
            // Empty channel - verify by name matching
            // Channel name should match the other user's name (current user would create it)
            // or current user's name (other user would create it)
            if (channel.name === dmName || channel.name === currentUserName) {
              return NextResponse.json({ channel });
            }
          }
        }

        // Fallback: return first channel if name matches (for edge cases)
        const nameMatchChannel = existingDMs.find(
          (ch) => ch.name === dmName || ch.name === currentUserName
        );
        if (nameMatchChannel) {
          return NextResponse.json({ channel: nameMatchChannel });
        }
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

    // Handle other group chat creation - disabled (only event group chats are allowed)
    if (type === "group") {
      return NextResponse.json(
        { error: "Group chats are only available for events" },
        { status: 400 }
      );
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
