import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { blogPosts, users } from "@/drizzle/schema";
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

    if (!(dbUser && dbUser.gymId)) {
      return NextResponse.json(
        { error: "User must belong to a gym" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = Number.parseInt(searchParams.get("limit") || "10", 10);
    const type = searchParams.get("type");

    const posts = await db
      .select({
        id: blogPosts.id,
        title: blogPosts.title,
        content: blogPosts.content,
        type: blogPosts.type,
        eventId: blogPosts.eventId,
        imageUrl: blogPosts.imageUrl,
        createdAt: blogPosts.createdAt,
        author: {
          id: users.id,
          name: users.name,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(blogPosts)
      .innerJoin(users, eq(blogPosts.authorId, users.id))
      .where(
        type
          ? and(eq(blogPosts.gymId, dbUser.gymId), eq(blogPosts.type, type))
          : eq(blogPosts.gymId, dbUser.gymId)
      )
      .orderBy(desc(blogPosts.createdAt))
      .limit(limit);

    return NextResponse.json({ posts });
  } catch (error) {
    console.error("Blog posts fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch blog posts" },
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

    if (!(dbUser && dbUser.gymId)) {
      return NextResponse.json(
        { error: "User must belong to a gym" },
        { status: 400 }
      );
    }

    // Only head coaches and coaches can create posts
    if (dbUser.role !== "owner" && dbUser.role !== "coach") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { title, content, type, eventId, imageUrl } = await request.json();

    if (!(title && content && type)) {
      return NextResponse.json(
        { error: "Title, content, and type are required" },
        { status: 400 }
      );
    }

    const [newPost] = await db
      .insert(blogPosts)
      .values({
        gymId: dbUser.gymId,
        authorId: user.id,
        title,
        content,
        type: type as "about" | "schedule" | "event" | "general",
        eventId: eventId || null,
        imageUrl: imageUrl || null,
      })
      .returning();

    return NextResponse.json({ post: newPost });
  } catch (error) {
    console.error("Blog post creation error:", error);
    return NextResponse.json(
      { error: "Failed to create blog post" },
      { status: 500 }
    );
  }
}
