"use client";

import { useState, useEffect, useCallback } from "react";
import { useRealtimeChat, type ChatMessage } from "@/hooks/use-realtime-chat";
import { useChatScroll } from "@/hooks/use-chat-scroll";
import { ChatMessageItem } from "@/components/chat-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { IconSend, IconPhoto, IconX } from "@tabler/icons-react";
import { createClient } from "@/lib/supabase/client";
import { useDropzone } from "react-dropzone";
import { cn } from "@/lib/utils";

interface RealtimeChatProps {
  channelId: string;
  roomName: string;
  username: string;
  onMessage?: (messages: ChatMessage[]) => void;
  initialMessages?: ChatMessage[];
}

export function RealtimeChat({
  channelId,
  roomName,
  username,
  onMessage,
  initialMessages,
}: RealtimeChatProps) {
  const [input, setInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const supabase = createClient();

  // Get current user ID
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
          setCurrentUserId(data.id);
        }
      }
    }
    getCurrentUser();
  }, [supabase]);

  // Memoize the onMessage callback to prevent infinite loops
  const handleMessage = useCallback((msgs: ChatMessage[]) => {
    setLoading(false);
    if (onMessage) onMessage(msgs);
  }, [onMessage]);

  const { messages, sendMessage } = useRealtimeChat({
    channelId,
    onMessage: handleMessage,
    initialMessages,
  });

  // Reset loading when channel changes and scroll to bottom
  useEffect(() => {
    setLoading(true);
    // Scroll to bottom when channel changes
    const timer = setTimeout(() => {
      if (scrollRef.current) {
        const scrollArea = scrollRef.current.closest('[data-slot="scroll-area"]');
        const viewport = scrollArea?.querySelector('[data-slot="scroll-area-viewport"]') as HTMLElement;
        if (viewport) {
          viewport.scrollTop = viewport.scrollHeight;
        }
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [channelId]);

  const scrollRef = useChatScroll(messages);

  // Also scroll when loading completes
  useEffect(() => {
    if (!loading && messages.length > 0) {
      // Small delay to ensure messages are rendered
      setTimeout(() => {
        if (scrollRef.current) {
          const scrollArea = scrollRef.current.closest('[data-slot="scroll-area"]');
          const viewport = scrollArea?.querySelector('[data-slot="scroll-area-viewport"]') as HTMLElement;
          if (viewport) {
            viewport.scrollTop = viewport.scrollHeight;
          }
        }
      }, 100);
    }
  }, [loading, messages.length, scrollRef]);

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

  const handleSend = async () => {
    if (!input.trim() && !imageFile) return;

    try {
      let attachmentUrl: string | undefined;
      let attachmentType: string | undefined;

      // Upload image if present
      if (imageFile) {
        setUploading(true);
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        const fileExt = imageFile.name.split(".").pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const filePath = `chat/${channelId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("chat-attachments")
          .upload(filePath, imageFile, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          throw new Error(`Failed to upload image: ${uploadError.message}`);
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("chat-attachments").getPublicUrl(filePath);
        attachmentUrl = publicUrl;
        attachmentType = "image";
      }

      const tempId = `temp-${Date.now()}-${Math.random()}`;
      await sendMessage(input.trim() || "", attachmentUrl, attachmentType, tempId);
      setInput("");
      setImageFile(null);
      setImagePreview(null);
      
      // Scroll to bottom after sending message
      setTimeout(() => {
        if (scrollRef.current) {
          const scrollArea = scrollRef.current.closest('[data-slot="scroll-area"]');
          const viewport = scrollArea?.querySelector('[data-slot="scroll-area-viewport"]') as HTMLElement;
          if (viewport) {
            viewport.scrollTop = viewport.scrollHeight;
          }
        }
      }, 50);
    } catch (error) {
      console.error("Error sending message:", error);
      alert(error instanceof Error ? error.message : "Failed to send message");
    } finally {
      setUploading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Deduplicate messages - prefer real messages over temp ones, then sort
  const deduplicatedMessages = messages.reduce((acc, msg) => {
    // If message has a real ID (not temp), check if it already exists
    if (!msg.tempId) {
      const existing = acc.find((m) => m.id === msg.id && !m.tempId);
      if (!existing) {
        acc.push(msg);
      }
      return acc;
    }
    // For temp messages, check if a real version exists
    const realVersionExists = acc.some((m) => 
      !m.tempId && 
      m.content === msg.content && 
      m.user.id === msg.user.id &&
      Math.abs(new Date(m.createdAt).getTime() - new Date(msg.createdAt).getTime()) < 3000
    );
    if (!realVersionExists) {
      acc.push(msg);
    }
    return acc;
  }, [] as ChatMessage[]);

  // Sort messages by createdAt to ensure proper ordering
  const sortedMessages = deduplicatedMessages.sort((a, b) => 
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  // Group messages by sender and time
  const groupedMessages = sortedMessages.reduce((acc, msg, index) => {
    const prevMsg = index > 0 ? sortedMessages[index - 1] : null;
    const showHeader =
      !prevMsg ||
      prevMsg.user.id !== msg.user.id ||
      new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime() > 300000; // 5 minutes

    acc.push({ ...msg, showHeader });
    return acc;
  }, [] as (ChatMessage & { showHeader: boolean })[]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Chat Header */}
      <div className="border-b p-4 shrink-0">
        <h2 className="font-semibold text-lg">{roomName}</h2>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 min-h-0 overflow-hidden">
        <div className="p-4" ref={scrollRef}>
        {loading ? (
          <div className="flex flex-col gap-4">
            {/* Skeleton messages */}
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-16 w-3/4 rounded-2xl" />
                </div>
              </div>
            ))}
          </div>
        ) : groupedMessages.length === 0 ? (
          <div className="flex items-center justify-center min-h-[200px]">
            <div className="text-center text-muted-foreground">
              <p>No messages yet</p>
              <p className="text-sm mt-2">Start the conversation!</p>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {groupedMessages.map((message) => (
              <ChatMessageItem
                key={message.tempId ? `temp-${message.tempId}` : message.id}
                message={message}
                isOwnMessage={message.user.name === username || message.user.id === currentUserId || message.user.id === "current-user"}
                showHeader={message.showHeader}
              />
            ))}
          </div>
        )}
        </div>
      </ScrollArea>

      {/* Image Preview */}
      {imagePreview && (
        <div className="border-t p-2 bg-muted/50 shrink-0">
          <div className="relative inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imagePreview}
              alt="Preview"
              className="max-h-32 rounded-lg"
            />
            <button
              type="button"
              onClick={() => {
                setImagePreview(null);
                setImageFile(null);
              }}
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
            >
              <IconX className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="border-t p-4 bg-background shrink-0">
        <div className="flex gap-2 items-end">
          <div {...getRootProps()} className="cursor-pointer">
            <input {...getInputProps()} />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn(
                "h-10 w-10",
                isDragActive && "bg-primary/10"
              )}
            >
              <IconPhoto className="h-5 w-5" />
            </Button>
          </div>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1 rounded-xl"
            disabled={uploading}
          />
          <Button
            onClick={handleSend}
            disabled={(!input.trim() && !imageFile) || uploading}
            className="rounded-xl"
          >
            <IconSend className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

