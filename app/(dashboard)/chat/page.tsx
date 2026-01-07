"use client";

import {
  IconArrowLeft,
  IconMessageCircle,
  IconPlus,
  IconUser,
  IconUsers,
  IconWorld,
} from "@tabler/icons-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { RealtimeChat } from "@/components/realtime-chat";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
import { useIsMobile } from "@/hooks/use-mobile";
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

interface ChannelAvatar {
  id: string;
  name: string | null;
  avatarUrl: string | null;
  email: string;
}

export default function ChatPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
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
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<Map<string, number>>(
    new Map(),
  );
  const [totalUnreadChats, setTotalUnreadChats] = useState(0);
  const [openingDm, setOpeningDm] = useState(false);
  const processedUserIdRef = useRef<string | null>(null);
  const supabase = createClient();
  const isMobile = useIsMobile();
  const [showChatView, setShowChatView] = useState(false);
  const [channelAvatars, setChannelAvatars] = useState<
    Map<string, ChannelAvatar[]>
  >(new Map());

  // Load unread counts
  const loadUnreadCounts = useCallback(async () => {
    try {
      const response = await fetch("/api/chat/notifications/counts");
      if (!response.ok) return;

      const result = await response.json();
      const countsMap = new Map<string, number>();
      for (const item of result.channelCounts || []) {
        countsMap.set(item.channelId, item.unreadCount);
      }
      setUnreadCounts(countsMap);
      setTotalUnreadChats(result.totalUnreadChats || 0);
    } catch (error) {
      console.error("Error loading unread counts:", error);
    }
  }, []);

  // Mark messages as read
  const markChannelAsRead = useCallback(async (channelId: string) => {
    try {
      await fetch("/api/chat/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId }),
      });
      // Update local state immediately
      setUnreadCounts((prev) => {
        const updated = new Map(prev);
        updated.set(channelId, 0);
        return updated;
      });
    } catch (error) {
      console.error("Error marking channel as read:", error);
    }
  }, []);

  useEffect(() => {
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
          .select("gymId, name, email")
          .eq("id", user.id)
          .single();

        if (!userData?.gymId) return;

        const response = await fetch(
          `/api/chat/channels?gymId=${userData.gymId}`,
        );
        const result = await response.json();

        if (response.ok) {
          // Filter out event-specific channels (only show global, dm, and group chats)
          const filteredChannels = (result.channels || []).filter(
            (c: Channel) => !c.eventId,
          );
          // Sort channels: global first, then others
          const sortedChannels = filteredChannels.sort(
            (a: Channel, b: Channel) => {
              if (a.type === "global") return -1;
              if (b.type === "global") return 1;
              return 0;
            },
          );
          setChannels(sortedChannels);
          // Auto-select global channel if available, otherwise first channel
          // Only auto-select on desktop - on mobile, show the list first
          // Check isMobile at runtime to avoid dependency issues
          if (sortedChannels.length > 0 && window.innerWidth >= 768) {
            const globalChannel = sortedChannels.find(
              (c: Channel) => c.type === "global",
            );
            setSelectedChannel(globalChannel?.id || sortedChannels[0].id);
          }

          // Load avatars for channels in the background (non-blocking)
          loadChannelAvatars(sortedChannels, user.id, userData.gymId).catch(
            (error) => {
              console.error("Error loading channel avatars:", error);
            },
          );
        }
      } catch (error) {
        console.error("Error loading channels:", error);
      } finally {
        setLoading(false);
      }
    }

    async function loadChannelAvatars(
      channels: Channel[],
      currentUserId: string,
      gymId: string,
    ) {
      try {
        const avatarsMap = new Map<string, ChannelAvatar[]>();
        const dmChannels = channels.filter((c) => c.type === "dm");
        const groupChannels = channels.filter((c) => c.type === "group");

        // Load DM avatars in parallel
        const dmPromises = dmChannels.map(async (channel) => {
          // Try name first, then email - do both queries in parallel
          const [userByName, userByEmail] = await Promise.all([
            supabase
              .from("User")
              .select("id, name, avatarUrl, email")
              .eq("gymId", gymId)
              .neq("id", currentUserId)
              .eq("name", channel.name)
              .limit(1)
              .maybeSingle(),
            supabase
              .from("User")
              .select("id, name, avatarUrl, email")
              .eq("gymId", gymId)
              .neq("id", currentUserId)
              .eq("email", channel.name)
              .limit(1)
              .maybeSingle(),
          ]);

          const otherUser = userByName.data || userByEmail.data;
          if (otherUser) {
            return {
              channelId: channel.id,
              avatar: [
                {
                  id: otherUser.id,
                  name: otherUser.name,
                  avatarUrl: otherUser.avatarUrl,
                  email: otherUser.email,
                },
              ],
            };
          }
          return null;
        });

        // Load group avatars in parallel
        const groupPromises = groupChannels.map(async (channel) => {
          const { data: messages } = await supabase
            .from("Message")
            .select("senderId")
            .eq("channelId", channel.id)
            .order("createdAt", { ascending: false })
            .limit(50);

          if (messages && messages.length > 0) {
            const uniqueSenderIds = [
              ...new Set(
                messages
                  .map((m) => m.senderId)
                  .filter((id) => id !== currentUserId),
              ),
            ].slice(0, 3);

            if (uniqueSenderIds.length > 0) {
              const { data: users } = await supabase
                .from("User")
                .select("id, name, avatarUrl, email")
                .in("id", uniqueSenderIds)
                .eq("gymId", gymId);

              if (users) {
                return {
                  channelId: channel.id,
                  avatar: users.map((u) => ({
                    id: u.id,
                    name: u.name,
                    avatarUrl: u.avatarUrl,
                    email: u.email,
                  })),
                };
              }
            }
          }
          return null;
        });

        // Wait for all promises and update the map
        const [dmResults, groupResults] = await Promise.all([
          Promise.all(dmPromises),
          Promise.all(groupPromises),
        ]);

        dmResults.forEach((result) => {
          if (result) {
            avatarsMap.set(result.channelId, result.avatar);
          }
        });

        groupResults.forEach((result) => {
          if (result) {
            avatarsMap.set(result.channelId, result.avatar);
          }
        });

        setChannelAvatars(avatarsMap);
      } catch (error) {
        console.error("Error loading channel avatars:", error);
      }
    }

    loadUser();
    loadChannels();
    loadUnreadCounts();
  }, [supabase, loadUnreadCounts]);

  // Reset chat view when navigating to chat page on mobile
  useEffect(() => {
    if (isMobile) {
      setShowChatView(false);
    }
  }, [isMobile]);

  // Mark messages as read when channel is selected
  useEffect(() => {
    if (selectedChannel) {
      markChannelAsRead(selectedChannel);
      // Refresh unread counts after marking as read
      setTimeout(() => {
        loadUnreadCounts();
      }, 500);
    }
  }, [selectedChannel, markChannelAsRead, loadUnreadCounts]);

  // Poll for unread counts periodically
  useEffect(() => {
    const interval = setInterval(() => {
      loadUnreadCounts();
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [loadUnreadCounts]);

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
        console.error(
          "Failed to fetch roster:",
          response.status,
          response.statusText,
        );
        setGymMembers([]);
        return;
      }

      const result = await response.json();

      if (result.roster && Array.isArray(result.roster)) {
        // Filter out current user - compare IDs as strings to ensure proper comparison
        const filtered = result.roster.filter(
          (m: GymMember) => String(m.id) !== String(user.id),
        );
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

  const createOrOpenDM = useCallback(
    async (userId: string) => {
      try {
        setOpeningDm(true);
        const response = await fetch("/api/chat/channels", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "",
            type: "dm",
            userId: userId,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to create channel");
        }

        const result = await response.json();

        // Check if channel already exists (for DM)
        setChannels((prevChannels) => {
          const existingChannel = prevChannels.find(
            (c) => c.id === result.channel.id,
          );
          if (!existingChannel) {
            return [...prevChannels, result.channel];
          }
          return prevChannels;
        });

        setSelectedChannel(result.channel.id);
        if (isMobile) {
          setShowChatView(true);
        }
        router.replace("/chat");
      } catch (error) {
        console.error("Error creating DM:", error);
        alert(error instanceof Error ? error.message : "Failed to create chat");
      } finally {
        setOpeningDm(false);
      }
    },
    [router, isMobile],
  );

  async function handleCreateChannel() {
    const targetUserId = selectedUserId;
    if (chatType === "dm" && !targetUserId) return;
    if (chatType === "group" && !newChannelName.trim()) return;

    try {
      setCreating(true);
      const response = await fetch("/api/chat/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: chatType === "dm" ? "" : newChannelName.trim(),
          type: chatType,
          userId: chatType === "dm" ? targetUserId : undefined,
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
      if (isMobile) {
        setShowChatView(true);
      }
      setNewChannelName("");
      setSelectedUserId(null);
      setChatType(null);
      setIsCreateDialogOpen(false);
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "Failed to create channel",
      );
    } finally {
      setCreating(false);
    }
  }

  // Handle userId query parameter - auto-create/open DM
  useEffect(() => {
    const userId = searchParams.get("userId");
    if (
      userId &&
      userId !== processedUserIdRef.current &&
      channels.length > 0 &&
      currentUser &&
      !openingDm &&
      !loading
    ) {
      processedUserIdRef.current = userId;
      // The API will return existing DM if it exists, or create a new one
      createOrOpenDM(userId);
    }
    // Reset ref when userId is cleared from URL
    if (!userId && processedUserIdRef.current) {
      processedUserIdRef.current = null;
    }
  }, [
    searchParams,
    channels.length,
    currentUser,
    openingDm,
    loading,
    createOrOpenDM,
  ]);

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

  // Component to render channel avatar(s)
  function ChannelAvatarDisplay({
    channel,
    size = "md",
  }: {
    channel: Channel;
    size?: "sm" | "md";
  }) {
    const avatars = channelAvatars.get(channel.id) || [];
    const avatarSize = size === "sm" ? "h-4 w-4" : "h-5 w-5";
    const avatarHeight = size === "sm" ? "16px" : "20px";
    const borderWidth = size === "sm" ? "1px" : "2px";
    const offset = size === "sm" ? 8 : 10;
    const containerWidth = size === "sm" ? 12 : 12;

    if (channel.type === "global") {
      return <IconWorld className={`${avatarSize} shrink-0`} />;
    }

    if (channel.type === "dm" && avatars.length > 0) {
      const user = avatars[0];
      return (
        <Avatar className={`${avatarSize} shrink-0`}>
          <AvatarImage src={user.avatarUrl || undefined} />
          <AvatarFallback className="text-xs">
            {user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
          </AvatarFallback>
        </Avatar>
      );
    }

    if (channel.type === "group") {
      if (avatars.length === 0) {
        return <IconUsers className={`${avatarSize} shrink-0`} />;
      }

      // Stack up to 3 avatars
      const displayAvatars = avatars.slice(0, 3);
      const remainingCount = avatars.length - 3;

      return (
        <div
          className="relative flex shrink-0 items-center"
          style={{
            width: `${Math.min(displayAvatars.length, 3) * containerWidth + 8}px`,
            height: avatarHeight,
          }}
        >
          {displayAvatars.map((user, index) => (
            <Avatar
              key={user.id}
              className={`${avatarSize} absolute`}
              style={{
                left: `${index * offset}px`,
                zIndex: displayAvatars.length - index,
                borderWidth: borderWidth,
                borderStyle: "solid",
                borderColor: "hsl(var(--background))",
              }}
            >
              <AvatarImage src={user.avatarUrl || undefined} />
              <AvatarFallback className="text-xs">
                {user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
          ))}
          {remainingCount > 0 && (
            <div
              className={`${avatarSize} absolute rounded-full bg-muted flex items-center justify-center text-xs font-medium`}
              style={{
                left: `${displayAvatars.length * offset}px`,
                zIndex: 0,
                borderWidth: borderWidth,
                borderStyle: "solid",
                borderColor: "hsl(var(--background))",
              }}
            >
              +{remainingCount}
            </div>
          )}
        </div>
      );
    }

    return <IconUser className={`${avatarSize} shrink-0`} />;
  }

  if (loading) {
    return (
      <div className="flex flex-1 flex-col min-h-0 h-full overflow-hidden">
        <PageHeader title="Chat" />
        <div className="flex flex-1 overflow-hidden gap-4 min-h-0 h-0">
          <div className="w-64 lg:flex flex-col bg-card border rounded-xl shadow-sm overflow-hidden min-h-0 h-full hidden">
            <div className="flex flex-1 items-center justify-center">
              <div className="animate-pulse text-muted-foreground">
                Loading...
              </div>
            </div>
          </div>
          <div className="flex-1 flex flex-col bg-card border lg:rounded-xl shadow-sm overflow-hidden min-h-0">
            <div className="flex flex-1 items-center justify-center">
              <div className="animate-pulse text-muted-foreground">
                Loading...
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Mobile view: show either channel list or chat view
  if (isMobile) {
    if (showChatView && selectedChannel && currentUser && selectedChannelData) {
      return (
        <div className="flex flex-1 flex-col min-h-0 h-full overflow-hidden">
          <div className="flex items-center gap-2 p-4 border-b shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowChatView(false)}
              className="rounded-xl"
            >
              <IconArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="font-semibold text-lg flex-1">
              {selectedChannelData.name}
            </h1>
          </div>
          <div className="flex-1 min-h-0 overflow-hidden">
            <RealtimeChat
              channelId={selectedChannel}
              roomName={selectedChannelData.name}
              username={currentUser.name}
            />
          </div>
        </div>
      );
    }

    // Mobile channel list view
    return (
      <div className="flex flex-1 flex-col min-h-0 h-full overflow-hidden">
        <PageHeader
          title={`Chat${totalUnreadChats > 0 ? ` (${totalUnreadChats})` : ""}`}
        >
          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={handleDialogOpenChange}
          >
            <DialogTrigger asChild>
              <Button className="rounded-sm capitalize" data-show-text-mobile>
                <IconPlus className="mr-2 h-4 w-4" />
                start new chat
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
                    <ScrollArea className="h-[300px] border rounded-xl">
                      {loadingMembers ? (
                        <div className="p-4 text-center text-muted-foreground">
                          Loading...
                        </div>
                      ) : gymMembers.length === 0 ? (
                        <div className="p-4 text-center text-muted-foreground">
                          <p className="mb-2">No other members in your gym</p>
                          <p className="text-xs">
                            Add members from the Roster page to start chatting
                          </p>
                        </div>
                      ) : (
                        <div className="p-2">
                          {gymMembers.map((member) => (
                            <button
                              key={member.id}
                              type="button"
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
                                <AvatarImage
                                  src={member.avatarUrl || undefined}
                                />
                                <AvatarFallback>
                                  {member.name?.[0]?.toUpperCase() ||
                                    member.email[0].toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 text-left">
                                <div className="font-medium text-sm">
                                  {member.name || member.email}
                                </div>
                                {member.name && (
                                  <div className="text-xs opacity-70">
                                    {member.email}
                                  </div>
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
                    onClick={() => handleCreateChannel()}
                    disabled={
                      creating ||
                      (chatType === "dm" && !selectedUserId) ||
                      (chatType === "group" && !newChannelName.trim())
                    }
                    className="rounded-xl"
                  >
                    {creating
                      ? "Creating..."
                      : chatType === "dm"
                        ? "Start Chat"
                        : "Create"}
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </PageHeader>

        {/* Mobile Channel List */}
        <div className="flex-1 overflow-hidden min-h-0">
          <ScrollArea className="h-full">
            <div className="p-2">
              {(() => {
                const globalChannels = channels.filter(
                  (c) => c.type === "global",
                );
                const dmChannels = channels.filter((c) => c.type === "dm");
                const groupChannels = channels.filter(
                  (c) => c.type === "group",
                );

                return (
                  <>
                    {globalChannels.length > 0 && (
                      <>
                        <div className="px-2 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Public Channels
                        </div>
                        {globalChannels.map((channel) => {
                          const unreadCount = unreadCounts.get(channel.id) || 0;
                          return (
                            <button
                              key={channel.id}
                              type="button"
                              onClick={() => {
                                setSelectedChannel(channel.id);
                                setShowChatView(true);
                              }}
                              className="w-full flex items-center gap-3 p-3 hover:bg-muted transition-colors mb-1"
                            >
                              <ChannelAvatarDisplay channel={channel} />
                              <div className="flex-1 text-left min-w-0">
                                <div className="font-medium text-sm truncate">
                                  {channel.name}
                                </div>
                              </div>
                              {unreadCount > 0 && (
                                <span className="shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold bg-primary text-primary-foreground">
                                  {unreadCount > 99 ? "99+" : unreadCount}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </>
                    )}

                    {dmChannels.length > 0 && (
                      <>
                        <div className="px-2 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-2">
                          Direct Messages
                        </div>
                        {dmChannels.map((channel) => {
                          const unreadCount = unreadCounts.get(channel.id) || 0;
                          return (
                            <button
                              key={channel.id}
                              type="button"
                              onClick={() => {
                                setSelectedChannel(channel.id);
                                setShowChatView(true);
                              }}
                              className="w-full flex items-center gap-3 p-3 hover:bg-muted transition-colors mb-1"
                            >
                              <ChannelAvatarDisplay channel={channel} />
                              <div className="flex-1 text-left min-w-0">
                                <div className="font-medium text-sm truncate">
                                  {channel.name}
                                </div>
                              </div>
                              {unreadCount > 0 && (
                                <span className="shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold bg-primary text-primary-foreground">
                                  {unreadCount > 99 ? "99+" : unreadCount}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </>
                    )}

                    {groupChannels.length > 0 && (
                      <>
                        <div className="px-2 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-2">
                          Group Chats
                        </div>
                        {groupChannels.map((channel) => {
                          const unreadCount = unreadCounts.get(channel.id) || 0;
                          return (
                            <button
                              key={channel.id}
                              type="button"
                              onClick={() => {
                                setSelectedChannel(channel.id);
                                setShowChatView(true);
                              }}
                              className="w-full flex items-center gap-3 p-3 hover:bg-muted transition-colors mb-1"
                            >
                              <ChannelAvatarDisplay channel={channel} />
                              <div className="flex-1 text-left min-w-0">
                                <div className="font-medium text-sm truncate">
                                  {channel.name}
                                </div>
                              </div>
                              {unreadCount > 0 && (
                                <span className="shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold bg-primary text-primary-foreground">
                                  {unreadCount > 99 ? "99+" : unreadCount}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </>
                    )}

                    {channels.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                        <IconMessageCircle className="h-12 w-12 mb-4 opacity-50" />
                        <p>No channels yet</p>
                        <p className="text-sm mt-2">
                          Create a new chat to get started
                        </p>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </ScrollArea>
        </div>
      </div>
    );
  }

  // Desktop view (existing code)
  return (
    <div className="flex flex-1 flex-col min-h-0 h-full overflow-hidden">
      <PageHeader
        title={`Chat${totalUnreadChats > 0 ? ` (${totalUnreadChats})` : ""}`}
      >
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
                    type="button"
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
                  <ScrollArea className="h-[300px] border rounded-xl">
                    {loadingMembers ? (
                      <div className="p-4 text-center text-muted-foreground">
                        Loading...
                      </div>
                    ) : gymMembers.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground">
                        <p className="mb-2">No other members in your gym</p>
                        <p className="text-xs">
                          Add members from the Roster page to start chatting
                        </p>
                      </div>
                    ) : (
                      <div className="p-2">
                        {gymMembers.map((member) => (
                          <button
                            key={member.id}
                            type="button"
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
                              <AvatarImage
                                src={member.avatarUrl || undefined}
                              />
                              <AvatarFallback>
                                {member.name?.[0]?.toUpperCase() ||
                                  member.email[0].toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 text-left">
                              <div className="font-medium text-sm">
                                {member.name || member.email}
                              </div>
                              {member.name && (
                                <div className="text-xs opacity-70">
                                  {member.email}
                                </div>
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
                  onClick={() => handleCreateChannel()}
                  disabled={
                    creating ||
                    (chatType === "dm" && !selectedUserId) ||
                    (chatType === "group" && !newChannelName.trim())
                  }
                  className="rounded-xl"
                >
                  {creating
                    ? "Creating..."
                    : chatType === "dm"
                      ? "Start Chat"
                      : "Create"}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="flex flex-1 overflow-hidden gap-4 min-h-0 h-0">
        {/* Channels Sidebar */}
        <div className="hidden lg:flex w-64 flex-col bg-card border rounded-xl shadow-sm overflow-hidden min-h-0 h-full">
          <ScrollArea className="flex-1">
            <div className="overflow-x-hidden">
              {/* Separate channels by type */}
              {(() => {
                const globalChannels = channels.filter(
                  (c) => c.type === "global",
                );
                const dmChannels = channels.filter((c) => c.type === "dm");
                const groupChannels = channels.filter(
                  (c) => c.type === "group",
                );

                return (
                  <>
                    {/* Public Channels Section */}
                    {globalChannels.length > 0 && (
                      <>
                        <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/50">
                          Public Channels
                        </div>
                        {globalChannels.map((channel) => {
                          const unreadCount = unreadCounts.get(channel.id) || 0;
                          return (
                            <button
                              key={channel.id}
                              type="button"
                              onClick={() => setSelectedChannel(channel.id)}
                              className={`
                                w-full max-w-full text-left px-4 py-2.5 rounded-none transition-colors border-b border-border/50
                                ${
                                  selectedChannel === channel.id
                                    ? "bg-primary text-primary-foreground"
                                    : "hover:bg-muted/50"
                                }
                              `}
                              style={{ boxSizing: "border-box" }}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <ChannelAvatarDisplay channel={channel} size="sm" />
                                <span className="font-medium text-sm truncate min-w-0 flex-1">
                                  {channel.name}
                                </span>
                                <Badge
                                  variant="secondary"
                                  className="bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30 shrink-0"
                                >
                                  Public
                                </Badge>
                                {unreadCount > 0 && (
                                  <span
                                    className={`
                                    shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold
                                    ${
                                      selectedChannel === channel.id
                                        ? "bg-primary-foreground text-primary"
                                        : "bg-primary text-primary-foreground"
                                    }
                                  `}
                                  >
                                    {unreadCount > 99 ? "99+" : unreadCount}
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </>
                    )}

                    {/* Direct Messages Section */}
                    {dmChannels.length > 0 && (
                      <>
                        <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/50 mt-2">
                          Direct Messages
                        </div>
                        {dmChannels.map((channel) => {
                          const unreadCount = unreadCounts.get(channel.id) || 0;
                          return (
                            <button
                              key={channel.id}
                              type="button"
                              onClick={() => setSelectedChannel(channel.id)}
                              className={`
                                w-full max-w-full text-left px-4 py-2.5 rounded-none transition-colors border-b border-border/50
                                ${
                                  selectedChannel === channel.id
                                    ? "bg-primary text-primary-foreground"
                                    : "hover:bg-muted/50"
                                }
                              `}
                              style={{ boxSizing: "border-box" }}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <ChannelAvatarDisplay channel={channel} size="sm" />
                                <span className="font-medium text-sm truncate min-w-0 flex-1">
                                  {channel.name}
                                </span>
                                {unreadCount > 0 && (
                                  <span
                                    className={`
                                    shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold
                                    ${
                                      selectedChannel === channel.id
                                        ? "bg-primary-foreground text-primary"
                                        : "bg-primary text-primary-foreground"
                                    }
                                  `}
                                  >
                                    {unreadCount > 99 ? "99+" : unreadCount}
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </>
                    )}

                    {/* Group Chats Section */}
                    {groupChannels.length > 0 && (
                      <>
                        <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/50 mt-2">
                          Group Chats
                        </div>
                        {groupChannels.map((channel) => {
                          const unreadCount = unreadCounts.get(channel.id) || 0;
                          return (
                            <button
                              key={channel.id}
                              type="button"
                              onClick={() => setSelectedChannel(channel.id)}
                              className={`
                                w-full max-w-full text-left px-4 py-2.5 rounded-none transition-colors border-b border-border/50
                                ${
                                  selectedChannel === channel.id
                                    ? "bg-primary text-primary-foreground"
                                    : "hover:bg-muted/50"
                                }
                              `}
                              style={{ boxSizing: "border-box" }}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <ChannelAvatarDisplay channel={channel} size="sm" />
                                <span className="font-medium text-sm truncate min-w-0 flex-1">
                                  {channel.name}
                                </span>
                                {unreadCount > 0 && (
                                  <span
                                    className={`
                                    shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold
                                    ${
                                      selectedChannel === channel.id
                                        ? "bg-primary-foreground text-primary"
                                        : "bg-primary text-primary-foreground"
                                    }
                                  `}
                                  >
                                    {unreadCount > 99 ? "99+" : unreadCount}
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </>
                    )}
                  </>
                );
              })()}
            </div>
          </ScrollArea>
        </div>

        {/* Chat Area */}
        <div className="hidden lg:flex flex-1 flex-col bg-card border rounded-xl shadow-sm overflow-hidden min-h-0">
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
