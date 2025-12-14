"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export interface ChatMessage {
  id: string;
  content: string;
  user: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  attachmentUrl?: string;
  attachmentType?: string;
  createdAt: string;
  status?: "pending" | "delivered" | "sent";
  tempId?: string; // For optimistic updates
}

interface UseRealtimeChatOptions {
  channelId: string;
  onMessage?: (messages: ChatMessage[]) => void;
  initialMessages?: ChatMessage[];
}

export function useRealtimeChat({
  channelId,
  onMessage,
  initialMessages = [],
}: UseRealtimeChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    name: string;
    avatarUrl?: string;
  } | null>(null);
  const supabase = createClient();

  // Get current user info
  useEffect(() => {
    async function getCurrentUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("User")
          .select("id, name, avatarUrl")
          .eq("id", user.id)
          .single();
        if (data) {
          setCurrentUser({
            id: data.id,
            name: data.name || "You",
            avatarUrl: data.avatarUrl || undefined,
          });
        }
      }
    }
    getCurrentUser();
  }, [supabase]);

  useEffect(() => {
    // Load initial messages from database via API
    async function loadMessages() {
      try {
        const response = await fetch(
          `/api/chat/messages?channelId=${channelId}`,
        );
        if (!response.ok) throw new Error("Failed to load messages");

        const result = await response.json();
        const formattedMessages: ChatMessage[] = (result.messages || [])
          .map(
            (msg: {
              id: string;
              content: string;
              attachmentUrl?: string | null;
              attachmentType?: string | null;
              createdAt: string;
              sender: {
                id: string;
                name: string | null;
                avatarUrl?: string | null;
              };
            }) => ({
              id: msg.id,
              content: msg.content,
              user: {
                id: msg.sender.id,
                name: msg.sender.name || "Unknown",
                avatarUrl: msg.sender.avatarUrl,
              },
              attachmentUrl: msg.attachmentUrl,
              attachmentType: msg.attachmentType,
              createdAt: msg.createdAt,
              status: "delivered",
            }),
          )
          .sort(
            (a: ChatMessage, b: ChatMessage) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
          );

        setMessages(formattedMessages);
        if (onMessage) {
          onMessage(formattedMessages);
        }
      } catch (error) {
        console.error("Error loading messages:", error);
        // Still call onMessage with empty array to signal loading is done
        if (onMessage) {
          onMessage([]);
        }
      }
    }

    if (channelId) {
      loadMessages();
    } else {
      // If no channelId, signal loading is done
      if (onMessage) {
        onMessage([]);
      }
    }
  }, [channelId, onMessage]);

  useEffect(() => {
    if (!channelId) return;

    // Subscribe to realtime updates
    const realtimeChannel = supabase
      .channel(`chat:${channelId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "Message",
          filter: `channelId=eq.${channelId}`,
        },
        async (payload) => {
          // Fetch the full message with sender info via API
          try {
            const response = await fetch(
              `/api/chat/messages/${payload.new.id}`,
            );
            if (!response.ok) return;

            const result = await response.json();
            const newMessage: ChatMessage = {
              id: result.message.id,
              content: result.message.content,
              user: {
                id: result.message.sender.id,
                name: result.message.sender.name || "Unknown",
                avatarUrl: result.message.sender.avatarUrl,
              },
              attachmentUrl: result.message.attachmentUrl,
              attachmentType: result.message.attachmentType,
              createdAt: result.message.createdAt,
            };

            setMessages((prev) => {
              // First check if message with this ID already exists (avoid duplicates)
              const existingById = prev.findIndex(
                (msg) => msg.id === newMessage.id && !msg.tempId,
              );
              if (existingById >= 0) {
                // Message already exists, don't add duplicate
                return prev;
              }

              // Check if this message matches an optimistic update
              // Match by content, user ID, and time proximity
              const optimisticIndex = prev.findIndex(
                (msg) =>
                  msg.tempId &&
                  newMessage.content === msg.content &&
                  newMessage.user.id === msg.user.id &&
                  Math.abs(
                    new Date(newMessage.createdAt).getTime() -
                      new Date(msg.createdAt).getTime(),
                  ) < 3000,
              );

              let updated: ChatMessage[];
              if (optimisticIndex >= 0) {
                // Replace optimistic message with real one
                updated = [...prev];
                updated[optimisticIndex] = {
                  ...newMessage,
                  status: "delivered",
                };
              } else {
                // New message from another user
                updated = [...prev, { ...newMessage, status: "delivered" }];
              }

              // Sort by createdAt
              updated = updated.sort(
                (a, b) =>
                  new Date(a.createdAt).getTime() -
                  new Date(b.createdAt).getTime(),
              );

              if (onMessage) {
                onMessage(updated);
              }
              return updated;
            });
          } catch (error) {
            console.error("Error loading new message:", error);
          }
        },
      )
      .subscribe();

    setChannel(realtimeChannel);

    return () => {
      realtimeChannel.unsubscribe();
    };
  }, [channelId, supabase, onMessage]);

  const sendMessage = useCallback(
    async (
      content: string,
      attachmentUrl?: string,
      attachmentType?: string,
      tempId?: string,
    ) => {
      // Create optimistic message immediately
      const optimisticMessage: ChatMessage = {
        id: tempId || `temp-${Date.now()}`,
        tempId: tempId || `temp-${Date.now()}`,
        content,
        user: currentUser || {
          id: "current-user", // Will be replaced by real message
          name: "You",
        },
        attachmentUrl,
        attachmentType,
        createdAt: new Date().toISOString(),
        status: "pending",
      };

      // Add optimistic message immediately
      setMessages((prev) => {
        const updated = [...prev, optimisticMessage];
        if (onMessage) {
          onMessage(updated);
        }
        return updated;
      });
      const response = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId,
          content,
          attachmentUrl,
          attachmentType,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        // Remove optimistic message on error
        setMessages((prev) =>
          prev.filter((msg) => msg.tempId !== optimisticMessage.tempId),
        );
        throw new Error(error.error || "Failed to send message");
      }

      const result = await response.json();
      const realMessage: ChatMessage = {
        id: result.message.id,
        content: result.message.content,
        user: {
          id: result.message.sender.id,
          name: result.message.sender.name || "Unknown",
          avatarUrl: result.message.sender.avatarUrl,
        },
        attachmentUrl: result.message.attachmentUrl,
        attachmentType: result.message.attachmentType,
        createdAt: result.message.createdAt,
        status: "delivered",
      };

      // Replace optimistic message with real one after a short delay for smooth transition
      // Note: The realtime subscription will also handle this, but we do it here too
      // to ensure it happens even if realtime is slow
      setTimeout(() => {
        setMessages((prev) => {
          // Check if message already exists (from realtime subscription)
          const alreadyExists = prev.some(
            (msg) => msg.id === realMessage.id && !msg.tempId,
          );
          if (alreadyExists) {
            // Already added by realtime, just remove optimistic one
            return prev.filter(
              (msg) => msg.tempId !== optimisticMessage.tempId,
            );
          }

          // Replace optimistic message with real one
          const optimisticIndex = prev.findIndex(
            (msg) => msg.tempId === optimisticMessage.tempId,
          );
          if (optimisticIndex >= 0) {
            const updated = [...prev];
            updated[optimisticIndex] = {
              ...realMessage,
              status: "delivered",
            };
            const sorted = updated.sort(
              (a, b) =>
                new Date(a.createdAt).getTime() -
                new Date(b.createdAt).getTime(),
            );
            if (onMessage) {
              onMessage(sorted);
            }
            return sorted;
          }
          return prev;
        });
      }, 300); // Small delay to show "sending" state

      return realMessage;
    },
    [channelId, onMessage, currentUser],
  );

  return {
    messages,
    sendMessage,
    channel,
  };
}
