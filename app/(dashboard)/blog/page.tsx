"use client";

import { IconEdit, IconPhoto, IconPlus, IconTrash } from "@tabler/icons-react";
import { format } from "date-fns";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { PageHeader } from "@/components/page-header";
import { RichTextEditor } from "@/components/rich-text-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";

interface BlogPost {
  id: string;
  title: string;
  content: string;
  type: "about" | "schedule" | "event" | "general";
  eventId?: string;
  imageUrl?: string;
  createdAt: string;
  author: {
    id: string;
    name: string | null;
    avatarUrl: string | null;
  };
}

interface Event {
  id: string;
  title: string;
}

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState<"about" | "schedule" | "event" | "general">(
    "general",
  );
  const [eventId, setEventId] = useState<string>("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const supabase = createClient();

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"],
    },
    maxFiles: 1,
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        setImageFile(file);
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    },
  });

  const loadPosts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/blog");
      if (!response.ok) throw new Error("Failed to load posts");
      const data = await response.json();
      setPosts(data.posts || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load posts");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadEvents = useCallback(async () => {
    try {
      const response = await fetch("/api/events");
      if (response.ok) {
        const data = await response.json();
        setEvents(data.events || []);
      }
    } catch (err) {
      console.error("Failed to load events:", err);
    }
  }, []);

  useEffect(() => {
    loadPosts();
    loadEvents();
  }, [loadPosts, loadEvents]);

  useEffect(() => {
    const handleOpenCreatePost = () => {
      setEditingPost(null);
      setTitle("");
      setContent("");
      setType("general");
      setEventId("");
      setImageFile(null);
      setImagePreview(null);
      setIsCreateDialogOpen(true);
    };

    window.addEventListener('blog-open-create-post', handleOpenCreatePost);
    return () => {
      window.removeEventListener('blog-open-create-post', handleOpenCreatePost);
    };
  }, []);

  function openCreateDialog() {
    setEditingPost(null);
    setTitle("");
    setContent("");
    setType("general");
    setEventId("");
    setImageFile(null);
    setImagePreview(null);
    setIsCreateDialogOpen(true);
  }

  function openEditDialog(post: BlogPost) {
    setEditingPost(post);
    setTitle(post.title);
    setContent(post.content);
    setType(post.type);
    setEventId(post.eventId || "");
    setImagePreview(post.imageUrl || null);
    setImageFile(null);
    setIsCreateDialogOpen(true);
  }

  async function handleSave() {
    if (!title.trim() || !content.trim()) {
      setError("Title and content are required");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      let imageUrl = editingPost?.imageUrl || null;

      // Upload image if provided
      if (imageFile) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        const fileExt = imageFile.name.split(".").pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const filePath = `blog/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("blog-images")
          .upload(filePath, imageFile, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          throw new Error(`Failed to upload image: ${uploadError.message}`);
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("blog-images").getPublicUrl(filePath);
        imageUrl = publicUrl;
      }

      const url = editingPost ? `/api/blog/${editingPost.id}` : "/api/blog";
      const method = editingPost ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          type,
          eventId: eventId || null,
          imageUrl,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save post");
      }

      setIsCreateDialogOpen(false);
      await loadPosts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save post");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(postId: string) {
    if (!confirm("Are you sure you want to delete this post?")) return;

    try {
      const response = await fetch(`/api/blog/${postId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete post");
      await loadPosts();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete post");
    }
  }

  return (
    <div className="flex flex-1 flex-col min-h-0 h-full overflow-hidden">
      <PageHeader
        title="Blog Posts"
        description="Share information with your team"
      >
        <Button onClick={openCreateDialog} className="rounded-sm" data-show-text-mobile>
          <IconPlus className="mr-2 h-4 w-4" />
          New Post
        </Button>
      </PageHeader>

      <div className="flex-1 overflow-auto min-h-0">
        <div className="max-w-4xl mx-auto space-y-6 p-4">
          {error && (
            <div className="bg-destructive/10 text-destructive rounded-xl p-4 text-sm">
              {error}
            </div>
          )}

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="rounded-xl">
                  <CardContent className="p-6">
                    <div className="animate-pulse space-y-3">
                      <div className="h-6 w-3/4 bg-muted rounded" />
                      <div className="h-4 w-full bg-muted rounded" />
                      <div className="h-4 w-2/3 bg-muted rounded" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <Card className="rounded-xl">
              <CardContent className="pt-6 text-center text-muted-foreground">
                <p>No posts yet</p>
                <p className="text-sm mt-1">
                  Create your first post to share information with your team
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <Card key={post.id} className="rounded-xl">
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
                        <CardTitle className="text-xl">
                          <Link
                            href={`/blog/${post.id}`}
                            className="hover:underline"
                          >
                            {post.title}
                          </Link>
                        </CardTitle>
                        <CardDescription className="mt-1">
                          by {post.author.name || "Unknown"} •{" "}
                          {format(new Date(post.createdAt), "MMM d, yyyy")}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(post)}
                          className="h-8 w-8"
                        >
                          <IconEdit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(post.id)}
                          className="h-8 w-8 text-destructive"
                        >
                          <IconTrash className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {post.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={post.imageUrl}
                        alt={post.title}
                        className="w-full max-h-64 object-cover rounded-xl mb-4"
                      />
                    )}
                    <div
                      className="prose prose-sm dark:prose-invert max-w-none line-clamp-3"
                      dangerouslySetInnerHTML={{ __html: post.content }}
                    />
                    <Link
                      href={`/blog/${post.id}`}
                      className="text-sm text-primary hover:underline mt-2 inline-block"
                    >
                      Read more →
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="rounded-xl max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPost ? "Edit Post" : "Create New Post"}
            </DialogTitle>
            <DialogDescription>
              Share information with your team members
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {error && (
              <div className="bg-destructive/10 text-destructive rounded-xl p-3 text-sm">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Post title"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type *</Label>
              <Select
                value={type}
                onValueChange={(v) =>
                  setType(v as "about" | "schedule" | "event" | "general")
                }
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="about">About</SelectItem>
                  <SelectItem value="schedule">Schedule</SelectItem>
                  <SelectItem value="event">Event</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {type === "event" && (
              <div className="space-y-2">
                <Label htmlFor="eventId">Link to Event (Optional)</Label>
                <Select value={eventId} onValueChange={setEventId}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Select an event" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {events.map((event) => (
                      <SelectItem key={event.id} value={event.id}>
                        {event.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="content">Content *</Label>
              <RichTextEditor
                value={content}
                onChange={setContent}
                placeholder="Write your post content here..."
              />
            </div>
            <div className="space-y-2">
              <Label>Image (Optional)</Label>
              <div
                {...getRootProps()}
                className={`border border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                  isDragActive
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25 hover:border-muted-foreground/50"
                }`}
              >
                <input {...getInputProps()} />
                {imagePreview ? (
                  <div className="space-y-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="mx-auto max-h-48 rounded-lg"
                    />
                    <p className="text-sm text-muted-foreground">
                      Click or drag to replace
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <IconPhoto className="h-8 w-8 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      {isDragActive
                        ? "Drop the image here"
                        : "Drag & drop an image here, or click to select"}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="rounded-xl"
            >
              {saving
                ? "Saving..."
                : editingPost
                  ? "Update Post"
                  : "Create Post"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
