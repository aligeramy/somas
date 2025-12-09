"use client";

import { useState, useRef, useEffect } from "react";
import { useRealtimeChat, type ChatMessage } from "@/hooks/use-realtime-chat";
import { useChatScroll } from "@/hooks/use-chat-scroll";
import { ChatMessageItem } from "@/components/chat-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  const supabase = createClient();

  const { messages, sendMessage } = useRealtimeChat({
    channelId,
    onMessage,
    initialMessages,
  });

  const scrollRef = useChatScroll(messages);

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

      await sendMessage(input.trim() || "", attachmentUrl, attachmentType);
      setInput("");
      setImageFile(null);
      setImagePreview(null);
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

  // Group messages by sender and time
  const groupedMessages = messages.reduce((acc, msg, index) => {
    const prevMsg = index > 0 ? messages[index - 1] : null;
    const showHeader =
      !prevMsg ||
      prevMsg.user.id !== msg.user.id ||
      new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime() > 300000; // 5 minutes

    acc.push({ ...msg, showHeader });
    return acc;
  }, [] as (ChatMessage & { showHeader: boolean })[]);

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="border-b p-4 bg-background">
        <h2 className="font-semibold text-lg">{roomName}</h2>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-1">
          {groupedMessages.map((message) => (
            <ChatMessageItem
              key={message.id}
              message={message}
              isOwnMessage={message.user.name === username}
              showHeader={message.showHeader}
            />
          ))}
        </div>
      </ScrollArea>

      {/* Image Preview */}
      {imagePreview && (
        <div className="border-t p-2 bg-muted/50">
          <div className="relative inline-block">
            <img
              src={imagePreview}
              alt="Preview"
              className="max-h-32 rounded-lg"
            />
            <button
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
      <div className="border-t p-4 bg-background">
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

