"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";

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
  const supabase = createClient();

  useEffect(() => {
    // Load initial messages from database via API
    async function loadMessages() {
      try {
        const response = await fetch(`/api/chat/messages?channelId=${channelId}`);
        if (!response.ok) throw new Error("Failed to load messages");
        
        const result = await response.json();
        const formattedMessages: ChatMessage[] = (result.messages || []).map((msg: any) => ({
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
        }));

        setMessages(formattedMessages);
        if (onMessage) {
          onMessage(formattedMessages);
        }
      } catch (error) {
        console.error("Error loading messages:", error);
      }
    }

    if (channelId) {
      loadMessages();
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
            const response = await fetch(`/api/chat/messages/${payload.new.id}`);
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
              const updated = [...prev, newMessage];
              if (onMessage) {
                onMessage(updated);
              }
              return updated;
            });
          } catch (error) {
            console.error("Error loading new message:", error);
          }
        }
      )
      .subscribe();

    setChannel(realtimeChannel);

    return () => {
      realtimeChannel.unsubscribe();
    };
  }, [channelId, supabase, onMessage]);

  const sendMessage = useCallback(
    async (content: string, attachmentUrl?: string, attachmentType?: string) => {
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
        throw new Error(error.error || "Failed to send message");
      }

      const result = await response.json();
      return result.message;
    },
    [channelId]
  );

  return {
    messages,
    sendMessage,
    channel,
  };
}

