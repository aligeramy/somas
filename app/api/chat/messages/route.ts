import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { users, messages, channels } from "@/drizzle/schema";
import { eq, and } from "drizzle-orm";

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
    const [dbUser] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
    if (!dbUser || !dbUser.gymId) {
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

    const { channelId, content, attachmentUrl, attachmentType } = await request.json();

    if (!channelId || !content) {
      return NextResponse.json(
        { error: "Channel ID and content are required" },
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

    // Fetch with sender info
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

    return NextResponse.json({ message: messageWithSender });
  } catch (error) {
    console.error("Message creation error:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}


