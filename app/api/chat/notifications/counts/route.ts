import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { chatNotifications, channels, users } from "@/drizzle/schema";
import { eq, and, isNull, sql } from "drizzle-orm";

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
      return NextResponse.json(
        { error: "User must belong to a gym" },
        { status: 400 }
      );
    }

    // Get all channels for this gym
    const gymChannels = await db
      .select()
      .from(channels)
      .where(eq(channels.gymId, dbUser.gymId));

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

    // Create a map of channelId -> unread count
    const countsMap = new Map<string, number>();
    for (const item of unreadCounts) {
      countsMap.set(item.channelId, Number(item.count));
    }

    // Calculate total unread chats (channels with unread messages)
    const totalUnreadChats = unreadCounts.length;

    // Calculate total unread messages
    const totalUnreadMessages = unreadCounts.reduce(
      (sum, item) => sum + Number(item.count),
      0
    );

    // Return counts per channel and totals
    const channelCounts = gymChannels.map((channel) => ({
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
