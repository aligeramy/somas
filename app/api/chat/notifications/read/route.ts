import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { channels, chatNotifications, messages, users } from "@/drizzle/schema";
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

    const { channelId } = await request.json();

    if (!channelId) {
      return NextResponse.json(
        { error: "Channel ID is required" },
        { status: 400 }
      );
    }

    // Verify channel exists and user has access
    const [channel] = await db
      .select()
      .from(channels)
      .where(eq(channels.id, channelId))
      .limit(1);

    if (!channel || channel.gymId !== dbUser.gymId) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    // Additional security check: verify user has access to this channel type
    if (channel.type === "global") {
      // Global channels are accessible to all gym members - already verified above
    } else if (channel.type === "dm") {
      // For DM channels: check if user has sent messages OR channel name matches user's name/email
      const userHasMessages = await db
        .select()
        .from(messages)
        .where(
          and(eq(messages.channelId, channelId), eq(messages.senderId, user.id))
        )
        .limit(1);

      const channelNameMatchesUser =
        channel.name === (dbUser.name || dbUser.email);

      if (userHasMessages.length === 0 && !channelNameMatchesUser) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
    } else if (channel.type === "group") {
      // For group channels: check if user has sent messages
      const userHasMessages = await db
        .select()
        .from(messages)
        .where(
          and(eq(messages.channelId, channelId), eq(messages.senderId, user.id))
        )
        .limit(1);

      if (userHasMessages.length === 0) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
    }

    // Mark all unread notifications for this user in this channel as read
    await db
      .update(chatNotifications)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(chatNotifications.userId, user.id),
          eq(chatNotifications.channelId, channelId),
          isNull(chatNotifications.readAt)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Mark as read error:", error);
    return NextResponse.json(
      { error: "Failed to mark messages as read" },
      { status: 500 }
    );
  }
}
