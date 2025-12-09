"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { IconPlus, IconEdit, IconTrash, IconBell } from "@tabler/icons-react";
import { format } from "date-fns";

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
  const [activeNotice, setActiveNotice] = useState<Notice | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [sendEmail, setSendEmail] = useState(false);

  useEffect(() => {
    loadNotices();
  }, []);

  async function loadNotices() {
    try {
      setLoading(true);
      // Load all notices (we'll need to add an endpoint for this)
      const response = await fetch("/api/notices/all");
      if (response.ok) {
        const data = await response.json();
        setNotices(data.notices || []);
        setActiveNotice(data.notices?.find((n: Notice) => n.active) || null);
      } else {
        // Fallback: just get active notice
        const activeResponse = await fetch("/api/notices");
        if (activeResponse.ok) {
          const activeData = await activeResponse.json();
          if (activeData.notice) {
            setActiveNotice(activeData.notice);
            setNotices([activeData.notice]);
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notices");
    } finally {
      setLoading(false);
    }
  }

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
    if (!title.trim() || !content.trim()) {
      setError("Title and content are required");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const url = editingNotice ? `/api/notices/${editingNotice.id}` : "/api/notices";
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

      if (!response.ok) throw new Error("Failed to update notice");
      await loadNotices();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update notice");
    }
  }

  async function handleDelete(noticeId: string) {
    if (!confirm("Are you sure you want to delete this notice?")) return;

    try {
      const response = await fetch(`/api/notices/${noticeId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete notice");
      await loadNotices();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete notice");
    }
  }

  return (
    <div className="flex flex-1 flex-col min-h-0 h-full overflow-hidden">
      <PageHeader title="Notices" description="Manage announcements for your team">
        <Button onClick={openCreateDialog} className="rounded-xl">
          <IconPlus className="mr-2 h-4 w-4" />
          New Notice
        </Button>
      </PageHeader>

      <div className="flex-1 overflow-auto min-h-0">
        <div className="max-w-4xl mx-auto space-y-6 p-4">
          {error && (
            <div className="bg-destructive/10 text-destructive rounded-xl p-4 text-sm">
              {error}
            </div>
          )}

          {/* Active Notice Highlight */}
          {activeNotice && (
            <Card className="rounded-xl border border-primary/20 bg-primary/5">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="rounded-lg">Active</Badge>
                    <CardTitle className="text-lg">{activeNotice.title}</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggleActive(activeNotice.id, true)}
                      className="h-8 w-8"
                    >
                      <IconEdit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(activeNotice.id)}
                      className="h-8 w-8 text-destructive"
                    >
                      <IconTrash className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <CardDescription>
                  by {activeNotice.author.name || "Admin"} • {format(new Date(activeNotice.createdAt), "MMM d, yyyy")}
                  {activeNotice.sendEmail && (
                    <Badge variant="secondary" className="ml-2 rounded-lg">
                      Email Sent
                    </Badge>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{activeNotice.content}</p>
              </CardContent>
            </Card>
          )}

          {/* All Notices */}
          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle>All Notices</CardTitle>
              <CardDescription>Manage your team notices</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse space-y-2">
                      <div className="h-4 w-3/4 bg-muted rounded" />
                      <div className="h-3 w-1/2 bg-muted rounded" />
                    </div>
                  ))}
                </div>
              ) : notices.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No notices yet. Create one to get started.
                </p>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {notices.map((notice) => (
                      <div
                        key={notice.id}
                        className={`p-4 rounded-xl border ${
                          notice.active ? "bg-primary/5 border-primary/20" : "bg-card"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {notice.active && (
                                <Badge variant="default" className="rounded-lg">Active</Badge>
                              )}
                              <h3 className="font-semibold">{notice.title}</h3>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                              {notice.content}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(notice.createdAt), "MMM d, yyyy")}
                              {notice.sendEmail && (
                                <span className="ml-2">• Email sent</span>
                              )}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={notice.active}
                              onCheckedChange={() => handleToggleActive(notice.id, notice.active)}
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(notice)}
                              className="h-8 w-8"
                            >
                              <IconEdit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(notice.id)}
                              className="h-8 w-8 text-destructive"
                            >
                              <IconTrash className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="rounded-xl max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingNotice ? "Edit Notice" : "Create New Notice"}</DialogTitle>
            <DialogDescription>
              Create a notice that will be displayed on the dashboard. Only one notice can be active at a time.
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
                placeholder="Notice title"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">Content *</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your notice content here..."
                className="rounded-xl min-h-[200px]"
              />
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
              <div>
                <p className="font-medium text-sm">Send Email Notification</p>
                <p className="text-xs text-muted-foreground">
                  Send this notice via email to all team members
                </p>
              </div>
              <Switch checked={sendEmail} onCheckedChange={setSendEmail} />
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
            <Button onClick={handleSave} disabled={saving} className="rounded-xl">
              {saving ? "Saving..." : editingNotice ? "Update Notice" : "Create Notice"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

