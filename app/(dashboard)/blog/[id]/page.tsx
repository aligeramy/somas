import { IconArrowLeft } from "@tabler/icons-react";
import { format } from "date-fns";
import { and, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { blogPosts, users } from "@/drizzle/schema";
import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return notFound();
  }

  const [dbUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, authUser.id))
    .limit(1);

  if (!dbUser?.gymId) {
    return notFound();
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
    return notFound();
  }

  function getInitials(name: string | null) {
    if (!name) {
      return "?";
    }
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <PageHeader description="" title="Blog Post">
        <Button asChild className="rounded-xl" size="sm" variant="ghost">
          <Link href="/blog">
            <IconArrowLeft className="mr-2 h-4 w-4" />
            Back to Blog
          </Link>
        </Button>
      </PageHeader>

      <div className="min-h-0 flex-1 overflow-auto">
        <div className="mx-auto max-w-4xl space-y-6 p-4">
          <Card className="rounded-xl">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="mb-2 flex items-center gap-2">
                    <Badge className="rounded-lg" variant="outline">
                      {post.type}
                    </Badge>
                    {post.eventId && (
                      <Badge className="rounded-lg" variant="secondary">
                        Event Post
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="mb-2 text-2xl">{post.title}</CardTitle>
                  <div className="mt-3 flex items-center gap-3">
                    <Avatar className="h-8 w-8 rounded-xl">
                      <AvatarImage src={post.author.avatarUrl || undefined} />
                      <AvatarFallback className="rounded-xl text-xs">
                        {getInitials(post.author.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-muted-foreground text-sm">
                      <span className="font-medium">
                        {post.author.name || "Unknown"}
                      </span>
                      {" • "}
                      {format(
                        new Date(post.createdAt),
                        "MMM d, yyyy 'at' h:mm a"
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {post.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt={post.title}
                  className="mb-6 max-h-96 w-full rounded-xl object-cover"
                  src={post.imageUrl}
                />
              )}
              {/* biome-ignore lint/security/noDangerouslySetInnerHtml: Rich text content from editor */}
              <div
                className="prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: post.content }}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
