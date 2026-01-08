"use client";

import { IconMessageCircle, IconPlus, IconUsers } from "@tabler/icons-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function SiteHeader() {
  const pathname = usePathname();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [chatType, setChatType] = useState<"dm" | "group" | null>(null);
  const [newChannelName, setNewChannelName] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [gymMembers, setGymMembers] = useState<
    Array<{ id: string; name: string | null; email: string; avatarUrl: string | null }>
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
            (m: { id: string }) => String(m.id) !== String(user.id),
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
              },
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

  return (
    <header className="hidden lg:flex h-14 shrink-0 items-center gap-2 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 transition-[width,height] ease-linear pt-0 !px-0 -mt-3">
      <div className="flex w-full items-center justify-end gap-3">
        <div className="flex items-center gap-2">
          {pathname?.startsWith("/events") && (
            <Button size="sm" className="gap-2 rounded-sm" asChild>
              <Link href="/events/new">
                <IconPlus className="h-4 w-4" />
                Add Event
              </Link>
            </Button>
          )}
          {pathname?.startsWith("/chat") && (
            <Dialog open={isCreateDialogOpen} onOpenChange={handleDialogOpenChange}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2 rounded-sm">
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
                  {!chatType ? (
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => {
                          setChatType("dm");
                          loadGymMembers();
                        }}
                        className="flex flex-col items-center gap-3 p-6 border rounded-xl hover:bg-muted transition-colors"
                      >
                        <IconMessageCircle className="h-8 w-8 text-muted-foreground" />
                        <span className="font-medium">Direct Message</span>
                        <span className="text-sm text-muted-foreground text-center">
                          Chat with one person
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setChatType("group")}
                        className="flex flex-col items-center gap-3 p-6 border rounded-xl hover:bg-muted transition-colors"
                      >
                        <IconUsers className="h-8 w-8 text-muted-foreground" />
                        <span className="font-medium">Group Chat</span>
                        <span className="text-sm text-muted-foreground text-center">
                          Create a group conversation
                        </span>
                      </button>
                    </div>
                  ) : chatType === "dm" ? (
                    <div className="space-y-2">
                      <Label>Select a person</Label>
                      {loadingMembers ? (
                        <div className="text-sm text-muted-foreground py-4">
                          Loading members...
                        </div>
                      ) : (
                        <div className="max-h-60 overflow-y-auto space-y-1">
                          {gymMembers.map((member) => (
                            <button
                              key={member.id}
                              type="button"
                              onClick={() => setSelectedUserId(member.id)}
                              className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                                selectedUserId === member.id
                                  ? "bg-primary text-primary-foreground"
                                  : "hover:bg-muted"
                              }`}
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
                        id="channel-name"
                        placeholder="Enter group name"
                        value={newChannelName}
                        onChange={(e) => setNewChannelName(e.target.value)}
                        className="rounded-xl"
                      />
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => handleDialogOpenChange(false)}
                    className="rounded-xl"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateChat}
                    disabled={
                      creating ||
                      (chatType === "dm" && !selectedUserId) ||
                      (chatType === "group" && !newChannelName.trim())
                    }
                    className="rounded-xl"
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
