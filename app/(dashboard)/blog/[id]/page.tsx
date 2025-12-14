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
  params: { id: string };
}) {
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

  if (!dbUser || !dbUser.gymId) {
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
    .where(and(eq(blogPosts.id, params.id), eq(blogPosts.gymId, dbUser.gymId)))
    .limit(1);

  if (!post) {
    return notFound();
  }

  function getInitials(name: string | null) {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  return (
    <div className="flex flex-1 flex-col min-h-0 h-full overflow-hidden">
      <PageHeader title="Blog Post" description="">
        <Button variant="ghost" size="sm" asChild className="rounded-xl">
          <Link href="/blog">
            <IconArrowLeft className="h-4 w-4 mr-2" />
            Back to Blog
          </Link>
        </Button>
      </PageHeader>

      <div className="flex-1 overflow-auto min-h-0">
        <div className="max-w-4xl mx-auto space-y-6 p-4">
          <Card className="rounded-xl">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="rounded-lg">
                      {post.type}
                    </Badge>
                    {post.eventId && (
                      <Badge variant="secondary" className="rounded-lg">
                        Event Post
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-2xl mb-2">{post.title}</CardTitle>
                  <div className="flex items-center gap-3 mt-3">
                    <Avatar className="h-8 w-8 rounded-xl">
                      <AvatarImage src={post.author.avatarUrl || undefined} />
                      <AvatarFallback className="rounded-xl text-xs">
                        {getInitials(post.author.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium">
                        {post.author.name || "Unknown"}
                      </span>
                      {" • "}
                      {format(
                        new Date(post.createdAt),
                        "MMM d, yyyy 'at' h:mm a",
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
                  src={post.imageUrl}
                  alt={post.title}
                  className="w-full max-h-96 object-cover rounded-xl mb-6"
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
