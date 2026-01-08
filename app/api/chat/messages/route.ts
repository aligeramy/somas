import { and, eq, ne } from "drizzle-orm";
import { NextResponse } from "next/server";
import { channels, chatNotifications, messages, users } from "@/drizzle/schema";
import { db } from "@/lib/db";
import { sendPushNotification } from "@/lib/push-notifications";
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

    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get("channelId");

    if (!channelId) {
      return NextResponse.json(
        { error: "Channel ID is required" },
        { status: 400 }
      );
    }

    // Verify user has access to this channel
    const [dbUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);
    if (!dbUser?.gymId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [channel] = await db
      .select()
      .from(channels)
      .where(eq(channels.id, channelId))
      .limit(1);

    if (!channel || channel.gymId !== dbUser.gymId) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    // Additional security check: verify user has access to this channel type
    // Owners and coaches have access to all channels in their gym
    const isOwnerOrCoach =
      dbUser.role === "owner" ||
      dbUser.role === "manager" ||
      dbUser.role === "coach";

    if (channel.type === "global") {
      // Global channels are accessible to all gym members - already verified above
    } else if (channel.type === "dm") {
      // Owners and coaches can access all DM channels
      if (!isOwnerOrCoach) {
        // For athletes: check if user has sent messages OR channel name matches user's name/email
        const userHasMessages = await db
          .select()
          .from(messages)
          .where(
            and(
              eq(messages.channelId, channelId),
              eq(messages.senderId, user.id)
            )
          )
          .limit(1);

        const channelNameMatchesUser =
          channel.name === (dbUser.name || dbUser.email);

        if (userHasMessages.length === 0 && !channelNameMatchesUser) {
          return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }
      }
    } else if (channel.type === "group") {
      // Owners and coaches can access all group channels
      if (!isOwnerOrCoach) {
        // For athletes: check if user has sent messages
        const userHasMessages = await db
          .select()
          .from(messages)
          .where(
            and(
              eq(messages.channelId, channelId),
              eq(messages.senderId, user.id)
            )
          )
          .limit(1);

        if (userHasMessages.length === 0) {
          return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }
      }
    }

    // Get messages with sender info
    const messagesList = await db
      .select({
        id: messages.id,
        content: messages.content,
        attachmentUrl: messages.attachmentUrl,
        attachmentType: messages.attachmentType,
        createdAt: messages.createdAt,
        sender: {
          id: users.id,
          name: users.name,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(messages)
      .innerJoin(users, eq(messages.senderId, users.id))
      .where(eq(messages.channelId, channelId))
      .orderBy(messages.createdAt);

    return NextResponse.json({ messages: messagesList });
  } catch (error) {
    console.error("Messages fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    console.log("[POST /api/chat/messages] Starting message creation");

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.log("[POST /api/chat/messages] No user found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[POST /api/chat/messages] User authenticated:", user.id);

    const [dbUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    if (!dbUser?.gymId) {
      console.log("[POST /api/chat/messages] User has no gym:", {
        dbUser: !!dbUser,
        gymId: dbUser?.gymId,
      });
      return NextResponse.json(
        { error: "User must belong to a gym" },
        { status: 400 }
      );
    }

    console.log("[POST /api/chat/messages] User gym:", dbUser.gymId);

    const { channelId, content, attachmentUrl, attachmentType } =
      await request.json();
    console.log("[POST /api/chat/messages] Request body:", {
      channelId,
      contentLength: content?.length,
      hasAttachment: !!attachmentUrl,
    });

    if (!(channelId && content)) {
      console.log("[POST /api/chat/messages] Missing required fields:", {
        channelId: !!channelId,
        content: !!content,
      });
      return NextResponse.json(
        { error: "Channel ID and content are required" },
        { status: 400 }
      );
    }

    // Verify channel exists and user has access
    console.log("[POST /api/chat/messages] Fetching channel:", channelId);
    const [channel] = await db
      .select()
      .from(channels)
      .where(eq(channels.id, channelId))
      .limit(1);

    if (!channel || channel.gymId !== dbUser.gymId) {
      console.log(
        "[POST /api/chat/messages] Channel not found or access denied:",
        {
          channel: !!channel,
          channelGymId: channel?.gymId,
          userGymId: dbUser.gymId,
        }
      );
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    // Additional security check: verify user has access to this channel type
    // Owners and coaches have access to all channels in their gym
    const isOwnerOrCoach =
      dbUser.role === "owner" ||
      dbUser.role === "manager" ||
      dbUser.role === "coach";

    if (channel.type === "global") {
      // Global channels are accessible to all gym members - already verified above
    } else if (channel.type === "dm") {
      // Owners and coaches can access all DM channels
      if (!isOwnerOrCoach) {
        // For athletes: check if user has sent messages OR channel name matches user's name/email
        const userHasMessages = await db
          .select()
          .from(messages)
          .where(
            and(
              eq(messages.channelId, channelId),
              eq(messages.senderId, user.id)
            )
          )
          .limit(1);

        const channelNameMatchesUser =
          channel.name === (dbUser.name || dbUser.email);

        if (userHasMessages.length === 0 && !channelNameMatchesUser) {
          console.log(
            "[POST /api/chat/messages] Access denied to DM channel:",
            {
              channelId,
              channelName: channel.name,
              userName: dbUser.name,
              userEmail: dbUser.email,
            }
          );
          return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }
      }
    } else if (channel.type === "group") {
      // Owners and coaches can access all group channels
      // For POST requests: allow all gym members to send messages (sending is how you join a group)
      // The GET handler will still restrict reading messages until they've participated
      if (!isOwnerOrCoach) {
        // Allow sending - this is how users join group channels
        // No need to check for previous messages since sending the first message grants access
      }
    }

    console.log("[POST /api/chat/messages] Channel found:", {
      id: channel.id,
      type: channel.type,
      name: channel.name,
    });

    console.log("[POST /api/chat/messages] Inserting message into database");
    const [newMessage] = await db
      .insert(messages)
      .values({
        channelId,
        senderId: user.id,
        gymId: dbUser.gymId,
        content,
        attachmentUrl: attachmentUrl || null,
        attachmentType: attachmentType || null,
      })
      .returning();

    console.log("[POST /api/chat/messages] Message inserted:", {
      id: newMessage.id,
      channelId: newMessage.channelId,
    });

    // Fetch with sender info
    console.log("[POST /api/chat/messages] Fetching message with sender info");
    const [messageWithSender] = await db
      .select({
        id: messages.id,
        content: messages.content,
        attachmentUrl: messages.attachmentUrl,
        attachmentType: messages.attachmentType,
        createdAt: messages.createdAt,
        sender: {
          id: users.id,
          name: users.name,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(messages)
      .innerJoin(users, eq(messages.senderId, users.id))
      .where(eq(messages.id, newMessage.id))
      .limit(1);

    if (!messageWithSender) {
      console.error(
        "[POST /api/chat/messages] Failed to fetch created message"
      );
      return NextResponse.json(
        { error: "Failed to fetch created message" },
        { status: 500 }
      );
    }

    console.log(
      "[POST /api/chat/messages] Message with sender fetched successfully"
    );

    // Get all users who should receive notifications for this channel
    // For DM channels, get the other participant
    // For group/global channels, get all gym members except the sender
    console.log(
      "[POST /api/chat/messages] Fetching target users for notifications"
    );
    // Select users without notifPreferences to avoid Drizzle's Object.entries issue with null JSONB
    // Note: pushEnabled doesn't exist in schema, so we only check pushToken
    let targetUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        pushToken: users.pushToken,
      })
      .from(users)
      .where(
        and(
          eq(users.gymId, dbUser.gymId),
          ne(users.id, user.id) // Exclude sender
        )
      );

    console.log(
      "[POST /api/chat/messages] Found target users (before filtering):",
      targetUsers.length
    );

    // For DM channels, filter to only the other participant
    // (DM channel name is the other user's name or email)
    if (channel.type === "dm") {
      console.log(
        "[POST /api/chat/messages] Filtering for DM channel, channel name:",
        channel.name
      );
      const beforeFilter = targetUsers.length;
      targetUsers = targetUsers.filter(
        (u) => (u.name && u.name === channel.name) || u.email === channel.name
      );
      console.log("[POST /api/chat/messages] Filtered DM users:", {
        before: beforeFilter,
        after: targetUsers.length,
      });
    }

    // Create notification records for all target users
    console.log(
      "[POST /api/chat/messages] Creating notification records for",
      targetUsers.length,
      "users"
    );
    const notificationRecords = targetUsers.map((targetUser) => ({
      userId: targetUser.id,
      channelId: channel.id,
      messageId: newMessage.id,
      readAt: null,
    }));

    if (notificationRecords.length > 0) {
      try {
        console.log("[POST /api/chat/messages] Inserting notification records");
        await db.insert(chatNotifications).values(notificationRecords);
        console.log(
          "[POST /api/chat/messages] Notification records inserted successfully"
        );
      } catch (notifError) {
        console.error(
          "[POST /api/chat/messages] Error inserting notification records:",
          notifError
        );
        // Don't fail the whole request if notifications fail
      }
    } else {
      console.log(
        "[POST /api/chat/messages] No notification records to insert"
      );
    }

    // Send push notifications (but not email) to users with push tokens enabled
    // Note: We're not checking notifPreferences here to avoid Drizzle's null JSONB issue
    // Default behavior is to allow push notifications unless explicitly disabled
    console.log(
      "[POST /api/chat/messages] Filtering users for push notifications"
    );
    const pushTokens = targetUsers
      .filter((u) => {
        // Only filter by pushToken - pushEnabled field doesn't exist in schema
        return !!u.pushToken;
      })
      .map((u) => u.pushToken as string);

    console.log(
      "[POST /api/chat/messages] Push tokens found:",
      pushTokens.length
    );

    if (pushTokens.length > 0 && channel.id && newMessage.id) {
      const senderName = dbUser.name || "Someone";
      const channelName =
        channel.type === "dm" ? senderName : channel.name || "Chat";
      const messagePreview =
        content.length > 50 ? `${content.substring(0, 50)}...` : content;

      console.log("[POST /api/chat/messages] Sending push notifications:", {
        tokens: pushTokens.length,
        title:
          channel.type === "dm"
            ? senderName
            : `${senderName} in ${channelName}`,
        preview: `${messagePreview.substring(0, 20)}...`,
      });

      // Send push notification asynchronously (don't wait for it)
      sendPushNotification(
        pushTokens,
        channel.type === "dm" ? senderName : `${senderName} in ${channelName}`,
        messagePreview,
        {
          type: "chat",
          channelId: String(channel.id),
          messageId: String(newMessage.id),
        }
      ).catch((error) => {
        console.error(
          "[POST /api/chat/messages] Error sending push notifications:",
          error
        );
      });
    } else {
      console.log("[POST /api/chat/messages] Skipping push notifications:", {
        hasTokens: pushTokens.length > 0,
        hasChannelId: !!channel.id,
        hasMessageId: !!newMessage.id,
      });
    }

    console.log(
      "[POST /api/chat/messages] Message created successfully, returning response"
    );
    return NextResponse.json({ message: messageWithSender });
  } catch (error) {
    console.error("[POST /api/chat/messages] Message creation error:", error);
    console.error(
      "[POST /api/chat/messages] Error stack:",
      error instanceof Error ? error.stack : "No stack trace"
    );
    console.error("[POST /api/chat/messages] Error details:", {
      name: error instanceof Error ? error.name : "Unknown",
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
