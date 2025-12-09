"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/page-header";
import { RealtimeChat } from "@/components/realtime-chat";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { IconPlus, IconMessageCircle, IconUser, IconUsers } from "@tabler/icons-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/client";

interface Channel {
  id: string;
  name: string;
  type: "global" | "dm" | "group";
  eventId?: string;
}

interface GymMember {
  id: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
}

export default function ChatPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [chatType, setChatType] = useState<"dm" | "group" | null>(null);
  const [newChannelName, setNewChannelName] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [gymMembers, setGymMembers] = useState<GymMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [creating, setCreating] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string } | null>(null);
  const supabase = createClient();

  useEffect(() => {
    loadUser();
    loadChannels();
  }, []);

  async function loadGymMembers() {
    try {
      setLoadingMembers(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setGymMembers([]);
        return;
      }

      const response = await fetch(`/api/roster`);
      if (!response.ok) {
        console.error("Failed to fetch roster:", response.status, response.statusText);
        setGymMembers([]);
        return;
      }

      const result = await response.json();

      if (result.roster && Array.isArray(result.roster)) {
        // Filter out current user - compare IDs as strings to ensure proper comparison
        const filtered = result.roster.filter((m: GymMember) => String(m.id) !== String(user.id));
        setGymMembers(filtered);
      } else {
        setGymMembers([]);
      }
    } catch (error) {
      console.error("Error loading gym members:", error);
      setGymMembers([]);
    } finally {
      setLoadingMembers(false);
    }
  }

  async function loadUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("User")
        .select("id, name")
        .eq("id", user.id)
        .single();
      if (data) {
        setCurrentUser({ id: data.id, name: data.name || "User" });
      }
    }
  }

  async function loadChannels() {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from("User")
        .select("gymId")
        .eq("id", user.id)
        .single();

      if (!userData?.gymId) return;

      const response = await fetch(`/api/chat/channels?gymId=${userData.gymId}`);
      const result = await response.json();

      if (response.ok) {
        setChannels(result.channels || []);
        // Auto-select first channel or global channel
        if (result.channels && result.channels.length > 0) {
          const globalChannel = result.channels.find((c: Channel) => c.type === "global");
          setSelectedChannel(globalChannel?.id || result.channels[0].id);
        }
      }
    } catch (error) {
      console.error("Error loading channels:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateChannel() {
    if (chatType === "dm" && !selectedUserId) return;
    if (chatType === "group" && !newChannelName.trim()) return;

    try {
      setCreating(true);
      const response = await fetch("/api/chat/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: chatType === "dm" ? "" : newChannelName.trim(),
          type: chatType,
          userId: chatType === "dm" ? selectedUserId : undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create channel");
      }

      const result = await response.json();
      
      // Check if channel already exists (for DM)
      const existingChannel = channels.find((c) => c.id === result.channel.id);
      if (!existingChannel) {
        setChannels([...channels, result.channel]);
      }
      
      setSelectedChannel(result.channel.id);
      setNewChannelName("");
      setSelectedUserId(null);
      setChatType(null);
      setIsCreateDialogOpen(false);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to create channel");
    } finally {
      setCreating(false);
    }
  }

  function handleDialogOpenChange(open: boolean) {
    setIsCreateDialogOpen(open);
    if (!open) {
      // Reset form when dialog closes
      setChatType(null);
      setNewChannelName("");
      setSelectedUserId(null);
    } else {
      // Load gym members when dialog opens
      loadGymMembers();
    }
  }

  const selectedChannelData = channels.find((c) => c.id === selectedChannel);

  if (loading) {
    return (
      <div className="flex flex-1 flex-col min-h-0 h-full overflow-hidden">
        <PageHeader title="Chat" />
        <div className="flex flex-1 overflow-hidden gap-4 min-h-0 h-0">
          <div className="w-64 flex flex-col bg-card border rounded-xl shadow-sm overflow-hidden min-h-0 h-full">
            <div className="flex flex-1 items-center justify-center">
              <div className="animate-pulse text-muted-foreground">Loading...</div>
            </div>
          </div>
          <div className="flex-1 flex flex-col bg-card border rounded-xl shadow-sm overflow-hidden min-h-0">
            <div className="flex flex-1 items-center justify-center">
              <div className="animate-pulse text-muted-foreground">Loading...</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col min-h-0 h-full overflow-hidden">
      <PageHeader title="Chat">
        <Dialog open={isCreateDialogOpen} onOpenChange={handleDialogOpenChange}>
          <DialogTrigger asChild>
            <Button className="rounded-xl">
              <IconPlus className="mr-2 h-4 w-4" />
              New Chat
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
                    onClick={() => setChatType("dm")}
                    className="flex flex-col items-center gap-3 p-6 border rounded-xl hover:bg-muted transition-colors"
                  >
                    <IconUser className="h-8 w-8 text-muted-foreground" />
                    <span className="font-medium">Direct Message</span>
                    <span className="text-sm text-muted-foreground text-center">
                      Chat with one person
                    </span>
                  </button>
                  <button
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
                  <ScrollArea className="h-[300px] border rounded-xl">
                    {loadingMembers ? (
                      <div className="p-4 text-center text-muted-foreground">
                        Loading...
                      </div>
                    ) : gymMembers.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground">
                        <p className="mb-2">No other members in your gym</p>
                        <p className="text-xs">Add members from the Roster page to start chatting</p>
                      </div>
                    ) : (
                      <div className="p-2">
                        {gymMembers.map((member) => (
                          <button
                            key={member.id}
                            onClick={() => setSelectedUserId(member.id)}
                            className={`
                              w-full flex items-center gap-3 p-3 rounded-xl transition-colors mb-1
                              ${
                                selectedUserId === member.id
                                  ? "bg-primary text-primary-foreground"
                                  : "hover:bg-muted"
                              }
                            `}
                          >
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={member.avatarUrl || undefined} />
                              <AvatarFallback>
                                {member.name?.[0]?.toUpperCase() || member.email[0].toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 text-left">
                              <div className="font-medium text-sm">
                                {member.name || member.email}
                              </div>
                              {member.name && (
                                <div className="text-xs opacity-70">{member.email}</div>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="channelName">Group Name</Label>
                  <Input
                    id="channelName"
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value)}
                    placeholder="e.g., Team Discussion"
                    className="rounded-xl"
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        handleCreateChannel();
                      }
                    }}
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              {chatType && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setChatType(null);
                    setSelectedUserId(null);
                    setNewChannelName("");
                  }}
                  className="rounded-xl"
                >
                  Back
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => handleDialogOpenChange(false)}
                className="rounded-xl"
              >
                Cancel
              </Button>
              {chatType && (
                <Button
                  onClick={handleCreateChannel}
                  disabled={
                    creating ||
                    (chatType === "dm" && !selectedUserId) ||
                    (chatType === "group" && !newChannelName.trim())
                  }
                  className="rounded-xl"
                >
                  {creating ? "Creating..." : chatType === "dm" ? "Start Chat" : "Create"}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="flex flex-1 overflow-hidden gap-4 min-h-0 h-0">
        {/* Channels Sidebar */}
        <div className="w-64 flex flex-col bg-card border rounded-xl shadow-sm overflow-hidden min-h-0 h-full">
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {channels.map((channel) => (
                <button
                  key={channel.id}
                  onClick={() => setSelectedChannel(channel.id)}
                  className={`
                    w-full text-left p-3 rounded-xl transition-colors
                    ${
                      selectedChannel === channel.id
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    }
                  `}
                >
                  <div className="flex items-center gap-2">
                    <IconMessageCircle className="h-4 w-4" />
                    <span className="font-medium text-sm truncate">{channel.name}</span>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-card border rounded-xl shadow-sm overflow-hidden min-h-0">
          {selectedChannel && currentUser && selectedChannelData ? (
            <RealtimeChat
              channelId={selectedChannel}
              roomName={selectedChannelData.name}
              username={currentUser.name}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center text-muted-foreground">
              <div className="text-center">
                <IconMessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a channel to start chatting</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

