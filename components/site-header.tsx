"use client";

import {
  IconCheck,
  IconDeviceFloppy,
  IconMessageCircle,
  IconPlus,
  IconUsers,
} from "@tabler/icons-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

export function SiteHeader() {
  const pathname = usePathname();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [chatType, setChatType] = useState<"dm" | "group" | null>(null);
  const [newChannelName, setNewChannelName] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [gymMembers, setGymMembers] = useState<
    Array<{
      id: string;
      name: string | null;
      email: string;
      avatarUrl: string | null;
    }>
  >([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [creating, setCreating] = useState(false);
  const supabase = createClient();

  const handleDialogOpenChange = (open: boolean) => {
    setIsCreateDialogOpen(open);
    if (!open) {
      setChatType(null);
      setNewChannelName("");
      setSelectedUserId(null);
    }
  };

  const loadGymMembers = async () => {
    if (gymMembers.length > 0) return;
    setLoadingMembers(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setGymMembers([]);
        return;
      }

      const response = await fetch("/api/roster");
      if (response.ok) {
        const result = await response.json();
        if (result.roster && Array.isArray(result.roster)) {
          // Filter out current user
          const filtered = result.roster.filter(
            (m: { id: string }) => String(m.id) !== String(user.id)
          );
          setGymMembers(filtered);
        }
      }
    } catch (error) {
      console.error("Error loading members:", error);
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleCreateChat = async () => {
    if (chatType === "dm" && !selectedUserId) return;
    if (chatType === "group" && !newChannelName.trim()) return;

    setCreating(true);
    try {
      const response = await fetch("/api/chat/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          chatType === "dm"
            ? {
                type: "dm",
                userId: selectedUserId,
              }
            : {
                type: "group",
                name: newChannelName.trim(),
              }
        ),
      });

      if (response.ok) {
        const data = await response.json();
        handleDialogOpenChange(false);
        // Navigate to the new chat
        if (data.channel) {
          window.location.href = `/chat?channel=${data.channel.id}`;
        }
      }
    } catch (error) {
      console.error("Error creating chat:", error);
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    const handleSaveStart = () => {
      setSaving(true);
      setSuccess(false);
    };

    const handleSaveSuccess = () => {
      setSaving(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    };

    const handleSaveEnd = () => {
      setSaving(false);
    };

    const handleSaveError = () => {
      setSaving(false);
      setSuccess(false);
    };

    if (pathname === "/profile") {
      window.addEventListener("profile-save-start", handleSaveStart);
      window.addEventListener("profile-save-success", handleSaveSuccess);
      window.addEventListener("profile-save-end", handleSaveEnd);
      window.addEventListener("profile-save-error", handleSaveError);
    } else if (pathname === "/gym-settings") {
      window.addEventListener("gym-settings-save-start", handleSaveStart);
      window.addEventListener("gym-settings-save-success", handleSaveSuccess);
      window.addEventListener("gym-settings-save-end", handleSaveEnd);
      window.addEventListener("gym-settings-save-error", handleSaveError);
    }

    return () => {
      if (pathname === "/profile") {
        window.removeEventListener("profile-save-start", handleSaveStart);
        window.removeEventListener("profile-save-success", handleSaveSuccess);
        window.removeEventListener("profile-save-end", handleSaveEnd);
        window.removeEventListener("profile-save-error", handleSaveError);
      } else if (pathname === "/gym-settings") {
        window.removeEventListener("gym-settings-save-start", handleSaveStart);
        window.removeEventListener(
          "gym-settings-save-success",
          handleSaveSuccess
        );
        window.removeEventListener("gym-settings-save-end", handleSaveEnd);
        window.removeEventListener("gym-settings-save-error", handleSaveError);
      }
    };
  }, [pathname]);

  const handleSave = () => {
    const formId =
      pathname === "/profile"
        ? "profile-form"
        : pathname === "/gym-settings"
          ? "gym-settings-form"
          : null;
    if (!formId) return;

    const form = document.getElementById(formId) as HTMLFormElement;
    if (form) {
      form.requestSubmit();
    }
  };

  return (
    <header className="!px-0 -mt-3 hidden h-14 shrink-0 items-center gap-2 bg-background/95 pt-0 backdrop-blur transition-[width,height] ease-linear supports-backdrop-filter:bg-background/60 lg:flex">
      <div className="flex w-full items-center justify-end gap-3">
        <div className="flex items-center gap-2">
          {(pathname === "/profile" || pathname === "/gym-settings") && (
            <Button
              className="gap-2 rounded-sm"
              disabled={saving}
              onClick={handleSave}
              size="sm"
            >
              {success ? (
                <>
                  <IconCheck className="h-4 w-4" />
                  Saved
                </>
              ) : saving ? (
                <>
                  <IconDeviceFloppy className="h-4 w-4" />
                  Saving...
                </>
              ) : (
                <>
                  <IconDeviceFloppy className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          )}
          {pathname === "/roster" && (
            <Button
              className="gap-2 rounded-sm"
              onClick={() => {
                window.dispatchEvent(new CustomEvent("roster-open-add-member"));
              }}
              size="sm"
            >
              <IconPlus className="h-4 w-4" />
              Add Member
            </Button>
          )}
          {pathname === "/blog" && (
            <Button
              className="gap-2 rounded-sm"
              onClick={() => {
                window.dispatchEvent(new CustomEvent("blog-open-create-post"));
              }}
              size="sm"
            >
              <IconPlus className="h-4 w-4" />
              New Post
            </Button>
          )}
          {pathname === "/notices" && (
            <Button
              className="gap-2 rounded-sm"
              onClick={() => {
                window.dispatchEvent(
                  new CustomEvent("notices-open-create-notice")
                );
              }}
              size="sm"
            >
              <IconPlus className="h-4 w-4" />
              New Notice
            </Button>
          )}
          {pathname?.startsWith("/events") && (
            <Button asChild className="gap-2 rounded-sm" size="sm">
              <Link href="/events/new">
                <IconPlus className="h-4 w-4" />
                Add Event
              </Link>
            </Button>
          )}
          {pathname?.startsWith("/chat") && (
            <Dialog
              onOpenChange={handleDialogOpenChange}
              open={isCreateDialogOpen}
            >
              <DialogTrigger asChild>
                <Button className="gap-2 rounded-sm" size="sm">
                  <IconPlus className="h-4 w-4" />
                  Add Chat
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-xl">
                <DialogHeader>
                  <DialogTitle>New Chat</DialogTitle>
                  <DialogDescription>
                    Start a direct message or create a group chat
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  {chatType ? (
                    chatType === "dm" ? (
                      <div className="space-y-2">
                        <Label>Select a person</Label>
                        {loadingMembers ? (
                          <div className="py-4 text-muted-foreground text-sm">
                            Loading members...
                          </div>
                        ) : (
                          <div className="max-h-60 space-y-1 overflow-y-auto">
                            {gymMembers.map((member) => (
                              <button
                                className={`flex w-full items-center gap-3 rounded-lg border p-3 transition-colors ${
                                  selectedUserId === member.id
                                    ? "bg-primary text-primary-foreground"
                                    : "hover:bg-muted"
                                }`}
                                key={member.id}
                                onClick={() => setSelectedUserId(member.id)}
                                type="button"
                              >
                                <div className="flex-1 text-left">
                                  <div className="font-medium">
                                    {member.name || member.email}
                                  </div>
                                  {member.name && (
                                    <div className="text-sm opacity-70">
                                      {member.email}
                                    </div>
                                  )}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label htmlFor="channel-name">Group Name</Label>
                        <Input
                          className="rounded-xl"
                          id="channel-name"
                          onChange={(e) => setNewChannelName(e.target.value)}
                          placeholder="Enter group name"
                          value={newChannelName}
                        />
                      </div>
                    )
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        className="flex flex-col items-center gap-3 rounded-xl border p-6 transition-colors hover:bg-muted"
                        onClick={() => {
                          setChatType("dm");
                          loadGymMembers();
                        }}
                        type="button"
                      >
                        <IconMessageCircle className="h-8 w-8 text-muted-foreground" />
                        <span className="font-medium">Direct Message</span>
                        <span className="text-center text-muted-foreground text-sm">
                          Chat with one person
                        </span>
                      </button>
                      <button
                        className="flex flex-col items-center gap-3 rounded-xl border p-6 transition-colors hover:bg-muted"
                        onClick={() => setChatType("group")}
                        type="button"
                      >
                        <IconUsers className="h-8 w-8 text-muted-foreground" />
                        <span className="font-medium">Group Chat</span>
                        <span className="text-center text-muted-foreground text-sm">
                          Create a group conversation
                        </span>
                      </button>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button
                    className="rounded-xl"
                    onClick={() => handleDialogOpenChange(false)}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                  <Button
                    className="rounded-xl"
                    disabled={
                      creating ||
                      (chatType === "dm" && !selectedUserId) ||
                      (chatType === "group" && !newChannelName.trim())
                    }
                    onClick={handleCreateChat}
                  >
                    {creating ? "Creating..." : "Create"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
    </header>
  );
}
