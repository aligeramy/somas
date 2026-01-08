import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { messages, users } from "@/drizzle/schema";
import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
      .where(eq(messages.id, id))
      .limit(1);

    if (!messageWithSender) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    return NextResponse.json({ message: messageWithSender });
  } catch (error) {
    console.error("Message fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch message" },
      { status: 500 }
    );
  }
}
