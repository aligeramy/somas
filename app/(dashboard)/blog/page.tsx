"use client";

import { IconEdit, IconPhoto, IconPlus, IconTrash } from "@tabler/icons-react";
import { format } from "date-fns";
import Image from "next/image";
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState<"about" | "schedule" | "event" | "general">(
    "general"
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
      if (!response.ok) {
        throw new Error("Failed to load posts");
      }
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

    window.addEventListener("blog-open-create-post", handleOpenCreatePost);
    return () => {
      window.removeEventListener("blog-open-create-post", handleOpenCreatePost);
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
    if (!(title.trim() && content.trim())) {
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
        if (!user) {
          throw new Error("Not authenticated");
        }

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
    setPostToDelete(postId);
    setDeleteDialogOpen(true);
  }

  async function confirmDelete() {
    if (!postToDelete) {
      return;
    }

    try {
      const response = await fetch(`/api/blog/${postToDelete}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete post");
      }
      await loadPosts();
      setDeleteDialogOpen(false);
      setPostToDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete post");
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <PageHeader
        description="Share information with your team"
        title="Blog Posts"
      >
        <Button
          className="rounded-sm"
          data-show-text-mobile
          onClick={openCreateDialog}
        >
          <IconPlus className="mr-2 h-4 w-4" />
          New Post
        </Button>
      </PageHeader>

      <div className="min-h-0 flex-1 overflow-auto">
        <div className="mx-auto max-w-4xl space-y-6 p-4">
          {error && (
            <div className="rounded-xl bg-destructive/10 p-4 text-destructive text-sm">
              {error}
            </div>
          )}

          {(() => {
            if (loading) {
              return (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Card className="rounded-xl" key={i}>
                      <CardContent className="p-6">
                        <div className="animate-pulse space-y-3">
                          <div className="h-6 w-3/4 rounded bg-muted" />
                          <div className="h-4 w-full rounded bg-muted" />
                          <div className="h-4 w-2/3 rounded bg-muted" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              );
            }

            if (posts.length === 0) {
              return (
                <Card className="rounded-xl">
                  <CardContent className="pt-6 text-center text-muted-foreground">
                    <p>No posts yet</p>
                    <p className="mt-1 text-sm">
                      Create your first post to share information with your team
                    </p>
                  </CardContent>
                </Card>
              );
            }

            return (
              <div className="space-y-4">
                {posts.map((post) => (
                  <Card className="rounded-xl" key={post.id}>
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
                          <CardTitle className="text-xl">
                            <Link
                              className="hover:underline"
                              href={`/blog/${post.id}`}
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
                            className="h-8 w-8"
                            onClick={() => openEditDialog(post)}
                            size="icon"
                            variant="ghost"
                          >
                            <IconEdit className="h-4 w-4" />
                          </Button>
                          <Button
                            className="h-8 w-8 text-destructive"
                            onClick={() => handleDelete(post.id)}
                            size="icon"
                            variant="ghost"
                          >
                            <IconTrash className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {post.imageUrl && (
                        <Image
                          alt={post.title}
                          className="mb-4 max-h-64 w-full rounded-xl object-cover"
                          height={250}
                          src={post.imageUrl}
                          width={400}
                        />
                      )}
                      <div
                        className="prose prose-sm dark:prose-invert line-clamp-3 max-w-none"
                        dangerouslySetInnerHTML={{ __html: post.content }}
                      />
                      <Link
                        className="mt-2 inline-block text-primary text-sm hover:underline"
                        href={`/blog/${post.id}`}
                      >
                        Read more →
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog onOpenChange={setIsCreateDialogOpen} open={isCreateDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto rounded-xl">
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
              <div className="rounded-xl bg-destructive/10 p-3 text-destructive text-sm">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                className="rounded-xl"
                id="title"
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Post title"
                value={title}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type *</Label>
              <Select
                onValueChange={(v) =>
                  setType(v as "about" | "schedule" | "event" | "general")
                }
                value={type}
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
                <Select onValueChange={setEventId} value={eventId}>
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
                onChange={setContent}
                placeholder="Write your post content here..."
                value={content}
              />
            </div>
            <div className="space-y-2">
              <Label>Image (Optional)</Label>
              <div
                {...getRootProps()}
                className={`cursor-pointer rounded-xl border border-dashed p-6 text-center transition-colors ${
                  isDragActive
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25 hover:border-muted-foreground/50"
                }`}
              >
                <input {...getInputProps()} />
                {imagePreview ? (
                  <div className="space-y-2">
                    <Image
                      alt="Preview"
                      className="mx-auto max-h-48 rounded-lg"
                      height={150}
                      src={imagePreview}
                      width={200}
                    />
                    <p className="text-muted-foreground text-sm">
                      Click or drag to replace
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <IconPhoto className="mx-auto h-8 w-8 text-muted-foreground" />
                    <p className="text-muted-foreground text-sm">
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
              className="rounded-xl"
              onClick={() => setIsCreateDialogOpen(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              className="rounded-xl"
              disabled={saving}
              onClick={handleSave}
            >
              {(() => {
                if (saving) return "Saving...";
                if (editingPost) return "Update Post";
                return "Create Post";
              })()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog onOpenChange={setDeleteDialogOpen} open={deleteDialogOpen}>
        <DialogContent className="rounded-xl">
          <DialogHeader>
            <DialogTitle>Delete Post</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this post? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => setDeleteDialogOpen(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button onClick={confirmDelete} variant="destructive">
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
