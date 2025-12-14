"use client";

import { IconCheck, IconClock } from "@tabler/icons-react";
import { format } from "date-fns";
import type { ChatMessage } from "@/hooks/use-realtime-chat";
import { cn } from "@/lib/utils";

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
  const isPending = message.status === "pending";

  return (
    <div
      className={cn(
        "flex mt-2 animate-in fade-in slide-in-from-bottom-2 duration-300",
        isOwnMessage ? "justify-end" : "justify-start",
      )}
      style={{
        animationDelay: isPending ? "0ms" : "100ms",
        opacity: isPending ? 0.8 : 1,
      }}
    >
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
            "py-2 px-3 rounded-2xl text-sm w-fit flex flex-col gap-2 transition-all duration-300",
            isOwnMessage
              ? "bg-primary text-primary-foreground rounded-br-sm"
              : "bg-muted text-foreground rounded-bl-sm",
            isPending && isOwnMessage && "opacity-80",
          )}
        >
          {message.attachmentUrl && message.attachmentType === "image" && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={message.attachmentUrl}
              alt="Attachment"
              className="max-w-[200px] rounded-lg"
            />
          )}
          <div className="flex items-end gap-2">
            {message.content && (
              <p className="whitespace-pre-wrap wrap-break-word">
                {message.content}
              </p>
            )}
            {isOwnMessage && (
              <div className="flex items-center shrink-0">
                {isPending ? (
                  <IconClock className="h-3 w-3 opacity-70 animate-pulse" />
                ) : (
                  <IconCheck className="h-3 w-3 opacity-70 transition-opacity duration-300" />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
