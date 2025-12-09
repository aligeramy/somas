"use client";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { ChatMessage } from "@/hooks/use-realtime-chat";
import { format } from "date-fns";

interface ChatMessageItemProps {
  message: ChatMessage;
  isOwnMessage: boolean;
  showHeader: boolean;
}

export function ChatMessageItem({
  message,
  isOwnMessage,
  showHeader,
}: ChatMessageItemProps) {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className={cn("flex mt-2", isOwnMessage ? "justify-end" : "justify-start")}>
      <div
        className={cn("max-w-[75%] w-fit flex flex-col gap-1", {
          "items-end": isOwnMessage,
        })}
      >
        {showHeader && (
          <div
            className={cn("flex items-center gap-2 text-xs px-3", {
              "justify-end flex-row-reverse": isOwnMessage,
            })}
          >
            <span className="font-medium">{message.user.name}</span>
            <span className="text-foreground/50 text-xs">
              {format(new Date(message.createdAt), "h:mm a")}
            </span>
          </div>
        )}
        <div
          className={cn(
            "py-2 px-3 rounded-2xl text-sm w-fit flex flex-col gap-2",
            isOwnMessage
              ? "bg-primary text-primary-foreground rounded-br-sm"
              : "bg-muted text-foreground rounded-bl-sm"
          )}
        >
          {message.attachmentUrl && message.attachmentType === "image" && (
            <img
              src={message.attachmentUrl}
              alt="Attachment"
              className="max-w-[200px] rounded-lg"
            />
          )}
          {message.content && <p className="whitespace-pre-wrap break-words">{message.content}</p>}
        </div>
      </div>
    </div>
  );
}

