import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { blogPosts, users } from "@/drizzle/schema";
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

    const [post] = await db
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
      .where(and(eq(blogPosts.id, id), eq(blogPosts.gymId, dbUser.gymId)))
      .limit(1);

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    return NextResponse.json({ post });
  } catch (error) {
    console.error("Blog post fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch blog post" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
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

    // Retry logic for database connection
    let dbUser;
    let retries = 3;
    while (retries > 0) {
      try {
        const result = await db
          .select()
          .from(users)
          .where(eq(users.id, user.id))
          .limit(1);
        dbUser = result[0];
        break;
      } catch (error: any) {
        retries--;
        if (
          retries === 0 ||
          (error?.code !== "ECONNRESET" && error?.code !== "ETIMEDOUT")
        ) {
          throw error;
        }
        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    if (!dbUser?.gymId) {
      return NextResponse.json(
        { error: "User must belong to a gym" },
        { status: 400 }
      );
    }

    // Only head coaches and coaches can update posts
    if (
      dbUser.role !== "owner" &&
      dbUser.role !== "manager" &&
      dbUser.role !== "coach"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { title, content, type, eventId, imageUrl } = await request.json();

    // Verify post belongs to user's gym with retry
    let post;
    retries = 3;
    while (retries > 0) {
      try {
        const result = await db
          .select()
          .from(blogPosts)
          .where(eq(blogPosts.id, id))
          .limit(1);
        post = result[0];
        break;
      } catch (error: any) {
        retries--;
        if (
          retries === 0 ||
          (error?.code !== "ECONNRESET" && error?.code !== "ETIMEDOUT")
        ) {
          throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    if (!post || post.gymId !== dbUser.gymId) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Update post with retry
    let updatedPost;
    retries = 3;
    while (retries > 0) {
      try {
        const result = await db
          .update(blogPosts)
          .set({
            title,
            content,
            type: type as "about" | "schedule" | "event" | "general",
            eventId: eventId || null,
            imageUrl: imageUrl || null,
            updatedAt: new Date(),
          })
          .where(eq(blogPosts.id, id))
          .returning();
        updatedPost = result[0];
        break;
      } catch (error: any) {
        retries--;
        if (
          retries === 0 ||
          (error?.code !== "ECONNRESET" && error?.code !== "ETIMEDOUT")
        ) {
          throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return NextResponse.json({ post: updatedPost });
  } catch (error: any) {
    console.error("Blog post update error:", error);
    const errorMessage =
      error?.code === "ECONNRESET" || error?.code === "ETIMEDOUT"
        ? "Database connection error. Please try again."
        : "Failed to update blog post";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function DELETE(
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

    // Retry logic for database connection
    let dbUser;
    let retries = 3;
    while (retries > 0) {
      try {
        const result = await db
          .select()
          .from(users)
          .where(eq(users.id, user.id))
          .limit(1);
        dbUser = result[0];
        break;
      } catch (error: any) {
        retries--;
        if (
          retries === 0 ||
          (error?.code !== "ECONNRESET" && error?.code !== "ETIMEDOUT")
        ) {
          throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    if (!dbUser?.gymId) {
      return NextResponse.json(
        { error: "User must belong to a gym" },
        { status: 400 }
      );
    }

    // Only head coaches and coaches can delete posts
    if (
      dbUser.role !== "owner" &&
      dbUser.role !== "manager" &&
      dbUser.role !== "coach"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Verify post belongs to user's gym with retry
    let post;
    retries = 3;
    while (retries > 0) {
      try {
        const result = await db
          .select()
          .from(blogPosts)
          .where(eq(blogPosts.id, id))
          .limit(1);
        post = result[0];
        break;
      } catch (error: any) {
        retries--;
        if (
          retries === 0 ||
          (error?.code !== "ECONNRESET" && error?.code !== "ETIMEDOUT")
        ) {
          throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    if (!post || post.gymId !== dbUser.gymId) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Delete post with retry
    retries = 3;
    while (retries > 0) {
      try {
        await db.delete(blogPosts).where(eq(blogPosts.id, id));
        break;
      } catch (error: any) {
        retries--;
        if (
          retries === 0 ||
          (error?.code !== "ECONNRESET" && error?.code !== "ETIMEDOUT")
        ) {
          throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Blog post deletion error:", error);
    const errorMessage =
      error?.code === "ECONNRESET" || error?.code === "ETIMEDOUT"
        ? "Database connection error. Please try again."
        : "Failed to delete blog post";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
