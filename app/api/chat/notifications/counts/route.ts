import { and, eq, isNull, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { channels, chatNotifications, messages, users } from "@/drizzle/schema";
import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
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
        { error: "User must belong to a club" },
        { status: 400 }
      );
    }

    // Get all channels for this club
    const allGymChannels = await db
      .select()
      .from(channels)
      .where(eq(channels.gymId, dbUser.gymId));

    // Owners and coaches can see all channels
    const isOwnerOrCoach = dbUser.role === "owner" || dbUser.role === "coach";

    // Get channels where the user has sent messages (for DM and group filtering)
    const userMessageChannels = await db
      .selectDistinct({ channelId: messages.channelId })
      .from(messages)
      .where(eq(messages.senderId, user.id));

    const userChannelIds = new Set(userMessageChannels.map((m) => m.channelId));

    // For DM channels, we need to check if channel has any messages
    const dmChannelsWithMessages = await db
      .selectDistinct({ channelId: messages.channelId })
      .from(messages)
      .innerJoin(channels, eq(messages.channelId, channels.id))
      .where(eq(channels.type, "dm"));

    const dmChannelsWithMessagesSet = new Set(
      dmChannelsWithMessages.map((m) => m.channelId)
    );

    // Filter channels based on type and user participation (same logic as GET /api/chat/channels)
    const accessibleChannels = allGymChannels.filter((channel) => {
      // Owners and coaches can see all channels
      if (isOwnerOrCoach) {
        return true;
      }

      // Always show global channels
      if (channel.type === "global") {
        return true;
      }

      // For DM channels: only show if user is a participant
      // User is a participant if:
      // 1. They have sent messages in this channel, OR
      // 2. Channel name matches their name/email AND channel has messages
      if (channel.type === "dm") {
        const userIsParticipant = userChannelIds.has(channel.id);
        const channelNameMatchesUser =
          channel.name === (dbUser.name || dbUser.email);
        const channelHasMessages = dmChannelsWithMessagesSet.has(channel.id);
        return (
          userIsParticipant || (channelNameMatchesUser && channelHasMessages)
        );
      }

      // Group channels should not be shown (they will be deleted)
      if (channel.type === "group") {
        return false;
      }

      // For event channels: show if user has sent messages
      if (channel.eventId) {
        return userChannelIds.has(channel.id);
      }

      // Default: don't show
      return false;
    });

    const accessibleChannelIds = new Set(accessibleChannels.map((c) => c.id));

    // Get unread counts per channel
    const unreadCounts = await db
      .select({
        channelId: chatNotifications.channelId,
        count: sql<number>`count(*)`.as("count"),
      })
      .from(chatNotifications)
      .where(
        and(
          eq(chatNotifications.userId, user.id),
          isNull(chatNotifications.readAt)
        )
      )
      .groupBy(chatNotifications.channelId);

    // Create a map of channelId -> unread count (only for accessible channels)
    const countsMap = new Map<string, number>();
    for (const item of unreadCounts) {
      if (accessibleChannelIds.has(item.channelId)) {
        countsMap.set(item.channelId, Number(item.count));
      }
    }

    // Calculate total unread chats (channels with unread messages that user can access)
    const totalUnreadChats = Array.from(countsMap.values()).filter(
      (count) => count > 0
    ).length;

    // Calculate total unread messages
    const totalUnreadMessages = Array.from(countsMap.values()).reduce(
      (sum, count) => sum + count,
      0
    );

    // Return counts per channel and totals (only for accessible channels)
    const channelCounts = accessibleChannels.map((channel) => ({
      channelId: channel.id,
      unreadCount: countsMap.get(channel.id) || 0,
    }));

    return NextResponse.json({
      channelCounts,
      totalUnreadChats,
      totalUnreadMessages,
    });
  } catch (error) {
    console.error("Get unread counts error:", error);
    return NextResponse.json(
      { error: "Failed to get unread counts" },
      { status: 500 }
    );
  }
}
