import { and, eq, gte, ne } from "drizzle-orm";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import {
  channels,
  chatEmailLogs,
  chatNotifications,
  gyms,
  messages,
  users,
} from "@/drizzle/schema";
import { ChatNotificationEmail } from "@/emails/chat-notification";
import { db } from "@/lib/db";
import { sendPushNotification } from "@/lib/push-notifications";
import { createClient } from "@/lib/supabase/server";

const resend = new Resend(process.env.RESEND_API_KEY);

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function verifyPostChannelAccess(
  channel: { id: string; type: string; name: string | null; gymId: string },
  channelId: string,
  dbUser: {
    id: string;
    name: string | null;
    email: string | null;
    role: string | null;
  },
  userId: string
): Promise<NextResponse | null> {
  const isOwnerOrCoach = dbUser.role === "owner" || dbUser.role === "coach";
  if (channel.type === "global") {
    return null;
  }
  if (channel.type === "group") {
    return null;
  }
  if (channel.type === "dm") {
    if (isOwnerOrCoach) {
      return null;
    }
    const userHasMessages = await db
      .select()
      .from(messages)
      .where(
        and(eq(messages.channelId, channelId), eq(messages.senderId, userId))
      )
      .limit(1);
    const channelNameMatchesUser =
      channel.name === (dbUser.name || dbUser.email);
    if (userHasMessages.length > 0 || channelNameMatchesUser) {
      return null;
    }
    console.log("[POST /api/chat/messages] Access denied to DM channel:", {
      channelId,
      channelName: channel.name,
      userName: dbUser.name,
      userEmail: dbUser.email,
    });
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }
  return null;
}

async function sendChatNotificationEmails(params: {
  usersToEmail: {
    id: string;
    name: string | null;
    email: string | null;
    altEmail: string | null;
  }[];
  channel: { id: string; type: string; name: string | null };
  gym: { name: string; logoUrl: string | null };
  dbUser: { name: string | null };
  content: string;
}): Promise<void> {
  const { usersToEmail: list, channel, gym, dbUser, content } = params;
  const senderName = dbUser.name || "Someone";
  const channelName =
    channel.type === "dm" ? senderName : channel.name || "Chat";
  const messagePreview =
    content.length > 100 ? `${content.substring(0, 100)}...` : content;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const chatUrl = `${appUrl}/chat?channel=${channel.id}`;

  for (const targetUser of list) {
    try {
      if (!targetUser.email) {
        continue;
      }
      const recipients = [targetUser.email];
      if (targetUser.altEmail) {
        recipients.push(targetUser.altEmail);
      }
      await resend.emails.send({
        from: `${process.env.RESEND_FROM_NAME || "SOMAS"} <${process.env.RESEND_FROM_EMAIL || "noreply@mail.softx.ca"}>`,
        to: recipients,
        subject:
          channel.type === "dm"
            ? `${senderName} sent you a message`
            : `${senderName} sent a message in ${channelName}`,
        react: ChatNotificationEmail({
          gymName: gym.name,
          gymLogoUrl: gym.logoUrl,
          recipientName: targetUser.name || targetUser.email,
          senderName,
          channelName,
          channelType: channel.type as "dm" | "group" | "global",
          messagePreview,
          chatUrl,
        }),
      });

      const existingLog = await db
        .select()
        .from(chatEmailLogs)
        .where(
          and(
            eq(chatEmailLogs.userId, targetUser.id),
            eq(chatEmailLogs.channelId, channel.id)
          )
        )
        .limit(1);

      if (existingLog.length > 0) {
        await db
          .update(chatEmailLogs)
          .set({ sentAt: new Date() })
          .where(
            and(
              eq(chatEmailLogs.userId, targetUser.id),
              eq(chatEmailLogs.channelId, channel.id)
            )
          );
      } else {
        await db.insert(chatEmailLogs).values({
          userId: targetUser.id,
          channelId: channel.id,
        });
      }

      console.log(
        `[POST /api/chat/messages] Email sent to ${targetUser.email}`
      );
      await delay(600);
    } catch (error) {
      console.error(
        `[POST /api/chat/messages] Error sending email to ${targetUser.email}:`,
        error
      );
      await delay(600);
    }
  }
}

async function createNotificationsAndSendEmails(params: {
  channel: { id: string; type: string; name: string | null };
  newMessage: { id: string };
  targetUsers: {
    id: string;
    name: string | null;
    email: string | null;
    altEmail: string | null;
    pushToken: string | null;
    notifPreferences: unknown;
  }[];
  dbUser: { gymId: string | null; name: string | null };
  content: string;
  userId: string;
}): Promise<void> {
  const { channel, newMessage, targetUsers, dbUser, content, userId } = params;

  const notificationRecords = targetUsers.map((targetUser) => ({
    userId: targetUser.id,
    channelId: channel.id,
    messageId: newMessage.id,
    readAt: null,
  }));

  if (notificationRecords.length > 0) {
    try {
      await db.insert(chatNotifications).values(notificationRecords);
    } catch (notifError) {
      console.error(
        "[POST /api/chat/messages] Error inserting notification records:",
        notifError
      );
    }
  }

  const pushTokens = targetUsers
    .filter((u) => !!u.pushToken)
    .map((u) => u.pushToken as string);

  if (pushTokens.length > 0 && channel.id && newMessage.id) {
    const senderName = dbUser.name || "Someone";
    const channelName =
      channel.type === "dm" ? senderName : channel.name || "Chat";
    const messagePreview =
      content.length > 50 ? `${content.substring(0, 50)}...` : content;
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
  }

  if (targetUsers.length === 0 || !channel.id || !dbUser.gymId) {
    return;
  }

  const [gym] = await db
    .select()
    .from(gyms)
    .where(eq(gyms.id, dbUser.gymId))
    .limit(1);

  if (!(gym && resend)) {
    return;
  }

  const twentyFourHoursAgo = new Date();
  twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
  const emailLogs = await db
    .select()
    .from(chatEmailLogs)
    .where(
      and(
        eq(chatEmailLogs.channelId, channel.id),
        gte(chatEmailLogs.sentAt, twentyFourHoursAgo)
      )
    );
  const recentEmailRecipients = new Set(emailLogs.map((log) => log.userId));

  const usersToEmail = targetUsers.filter((u) => {
    let emailNotifEnabled = true;
    if (
      u.notifPreferences &&
      typeof u.notifPreferences === "object" &&
      u.notifPreferences !== null &&
      "email" in u.notifPreferences
    ) {
      emailNotifEnabled =
        (u.notifPreferences as { email?: boolean }).email !== false;
    }
    return (
      !!u.email &&
      emailNotifEnabled &&
      !recentEmailRecipients.has(u.id) &&
      u.id !== userId
    );
  });

  if (usersToEmail.length > 0) {
    sendChatNotificationEmails({
      usersToEmail,
      channel,
      gym,
      dbUser,
      content,
    }).catch((error) => {
      console.error(
        "[POST /api/chat/messages] Error in email sending batch:",
        error
      );
    });
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
    // Owners and coaches have access to all channels in their club
    const isOwnerOrCoach = dbUser.role === "owner" || dbUser.role === "coach";

    if (channel.type === "global") {
      // Global channels are accessible to all club members - already verified above
    } else if (channel.type === "dm") {
      // Owners and coaches can access all DM channels
      if (!isOwnerOrCoach) {
        // For athletes: check if user is a participant
        // User is a participant if:
        // 1. They have sent messages in this channel, OR
        // 2. Channel name matches their name/email AND channel has messages
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

        // Check if channel has any messages (to verify it's an active conversation)
        const channelHasMessages = await db
          .select()
          .from(messages)
          .where(eq(messages.channelId, channelId))
          .limit(1);

        if (
          userHasMessages.length === 0 &&
          (!channelNameMatchesUser || channelHasMessages.length === 0)
        ) {
          return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }
      }
    } else if (channel.type === "group") {
      // Group channels (especially event group channels) are accessible to all club members
      // Owners and coaches have full access, athletes can access if they're club members
      // The gymId check above already ensures they're in the same club
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
        { error: "User must belong to a club" },
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

    const accessError = await verifyPostChannelAccess(
      channel,
      channelId,
      dbUser,
      user.id
    );
    if (accessError) {
      return accessError;
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
    // For group/global channels, get all club members except the sender
    console.log(
      "[POST /api/chat/messages] Fetching target users for notifications"
    );
    // Select users including notifPreferences to check email notification preferences
    // Note: pushEnabled doesn't exist in schema, so we only check pushToken
    let targetUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        altEmail: users.altEmail,
        pushToken: users.pushToken,
        notifPreferences: users.notifPreferences,
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

    createNotificationsAndSendEmails({
      channel,
      newMessage,
      targetUsers,
      dbUser,
      content,
      userId: user.id,
    }).catch((error) => {
      console.error(
        "[POST /api/chat/messages] Error in notifications/emails:",
        error
      );
    });

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
