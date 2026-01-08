"use client";

import { IconEdit, IconPlus, IconTrash } from "@tabler/icons-react";
import { format } from "date-fns";
import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

interface Notice {
  id: string;
  title: string;
  content: string;
  active: boolean;
  sendEmail: boolean;
  createdAt: string;
  author: {
    id: string;
    name: string | null;
  };
}

export default function NoticesPage() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [sendEmail, setSendEmail] = useState(false);

  const canManage = userRole === "owner" || userRole === "coach";

  const loadNotices = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/notices/all");
      if (response.ok) {
        const data = await response.json();
        // Notices are already sorted by date desc from the API
        setNotices(data.notices || []);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to load notices");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notices");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    async function fetchUserRole() {
      try {
        const response = await fetch("/api/user-info");
        if (response.ok) {
          const data = await response.json();
          setUserRole(data.role);
        }
      } catch (err) {
        console.error("Failed to fetch user role:", err);
      }
    }
    fetchUserRole();
    loadNotices();
  }, [loadNotices]);

  useEffect(() => {
    const handleOpenCreateNotice = () => {
      if (userRole === "owner" || userRole === "coach") {
        setEditingNotice(null);
        setTitle("");
        setContent("");
        setSendEmail(false);
        setIsCreateDialogOpen(true);
      }
    };

    window.addEventListener(
      "notices-open-create-notice",
      handleOpenCreateNotice
    );
    return () => {
      window.removeEventListener(
        "notices-open-create-notice",
        handleOpenCreateNotice
      );
    };
  }, [userRole]);

  function openCreateDialog() {
    setEditingNotice(null);
    setTitle("");
    setContent("");
    setSendEmail(false);
    setIsCreateDialogOpen(true);
  }

  function openEditDialog(notice: Notice) {
    setEditingNotice(notice);
    setTitle(notice.title);
    setContent(notice.content);
    setSendEmail(notice.sendEmail);
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

      const url = editingNotice
        ? `/api/notices/${editingNotice.id}`
        : "/api/notices";
      const method = editingNotice ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          sendEmail,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save notice");
      }

      setIsCreateDialogOpen(false);
      await loadNotices();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save notice");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(noticeId: string, currentActive: boolean) {
    try {
      const response = await fetch("/api/notices", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: noticeId,
          active: !currentActive,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update notice");
      }
      await loadNotices();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update notice");
    }
  }

  async function handleDelete(noticeId: string) {
    if (!confirm("Are you sure you want to delete this notice?")) {
      return;
    }

    try {
      const response = await fetch(`/api/notices/${noticeId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete notice");
      }
      await loadNotices();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete notice");
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <PageHeader
        description={
          canManage
            ? "Manage announcements for your team"
            : "View all team announcements"
        }
        title="Notices"
      >
        {canManage && (
          <Button
            className="rounded-sm"
            data-show-text-mobile
            onClick={openCreateDialog}
          >
            <IconPlus className="mr-2 h-4 w-4" />
            New Notice
          </Button>
        )}
      </PageHeader>

      <div className="min-h-0 flex-1 overflow-auto">
        <div className="mx-auto max-w-4xl space-y-6 p-4">
          {error && (
            <div className="rounded-xl bg-destructive/10 p-4 text-destructive text-sm">
              {error}
            </div>
          )}

          {/* All Notices - Latest First */}
          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle>All Notices</CardTitle>
              <CardDescription>
                {canManage
                  ? "Manage your team notices"
                  : "View all team notices"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div
                      className="animate-pulse space-y-3 rounded-xl border p-4"
                      key={i}
                    >
                      <div className="h-5 w-3/4 rounded bg-muted" />
                      <div className="h-4 w-full rounded bg-muted" />
                      <div className="h-3 w-1/2 rounded bg-muted" />
                    </div>
                  ))}
                </div>
              ) : notices.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">
                  No notices yet.
                  {canManage && " Create one to get started."}
                </p>
              ) : (
                <div className="space-y-4">
                  {notices.map((notice) => (
                    <Card
                      className={`rounded-xl ${
                        notice.active ? "border-primary/20 bg-primary/5" : ""
                      }`}
                      key={notice.id}
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            {notice.active && (
                              <Badge className="rounded-lg" variant="default">
                                Active
                              </Badge>
                            )}
                            <CardTitle className="text-lg">
                              {notice.title}
                            </CardTitle>
                            <CardDescription>
                              by {notice.author.name || "Admin"} •{" "}
                              {format(
                                new Date(notice.createdAt),
                                "MMM d, yyyy 'at' h:mm a"
                              )}
                              {notice.sendEmail && (
                                <Badge
                                  className="ml-2 rounded-lg"
                                  variant="secondary"
                                >
                                  Email Sent
                                </Badge>
                              )}
                            </CardDescription>
                          </div>
                          {canManage && (
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={notice.active}
                                onCheckedChange={() =>
                                  handleToggleActive(notice.id, notice.active)
                                }
                              />
                              <Button
                                className="h-8 w-8"
                                onClick={() => openEditDialog(notice)}
                                size="icon"
                                variant="ghost"
                              >
                                <IconEdit className="h-4 w-4" />
                              </Button>
                              <Button
                                className="h-8 w-8 text-destructive"
                                onClick={() => handleDelete(notice.id)}
                                size="icon"
                                variant="ghost"
                              >
                                <IconTrash className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">
                          {notice.content}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create/Edit Dialog - Only show for coaches/owners */}
      {canManage && (
        <Dialog onOpenChange={setIsCreateDialogOpen} open={isCreateDialogOpen}>
          <DialogContent className="max-w-2xl rounded-xl">
            <DialogHeader>
              <DialogTitle>
                {editingNotice ? "Edit Notice" : "Create New Notice"}
              </DialogTitle>
              <DialogDescription>
                Create a notice that will be displayed on the dashboard. Only
                one notice can be active at a time.
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
                  placeholder="Notice title"
                  value={title}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">Content *</Label>
                <Textarea
                  className="min-h-[200px] rounded-xl"
                  id="content"
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write your notice content here..."
                  value={content}
                />
              </div>
              <div className="flex items-center justify-between rounded-xl bg-muted/50 p-3">
                <div>
                  <p className="font-medium text-sm">Send Email Notification</p>
                  <p className="text-muted-foreground text-xs">
                    Send this notice via email to all team members
                  </p>
                </div>
                <Switch checked={sendEmail} onCheckedChange={setSendEmail} />
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
                {saving
                  ? "Saving..."
                  : editingNotice
                    ? "Update Notice"
                    : "Create Notice"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
