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
        "fade-in slide-in-from-bottom-2 mt-2 flex animate-in duration-300",
        isOwnMessage ? "justify-end" : "justify-start"
      )}
      style={{
        animationDelay: isPending ? "0ms" : "100ms",
        opacity: isPending ? 0.8 : 1,
      }}
    >
      <div
        className={cn("flex w-fit max-w-[75%] flex-col gap-1", {
          "items-end": isOwnMessage,
        })}
      >
        {showHeader && (
          <div
            className={cn("flex items-center gap-2 px-3 text-xs", {
              "flex-row-reverse justify-end": isOwnMessage,
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
            "flex w-fit flex-col gap-2 rounded-2xl px-3 py-2 text-sm transition-all duration-300",
            isOwnMessage
              ? "rounded-br-sm bg-primary text-primary-foreground"
              : "rounded-bl-sm bg-muted text-foreground",
            isPending && isOwnMessage && "opacity-80"
          )}
        >
          {message.attachmentUrl && message.attachmentType === "image" && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt="Attachment"
              className="max-w-[200px] rounded-lg"
              src={message.attachmentUrl}
            />
          )}
          <div className="flex items-end gap-2">
            {message.content && (
              <p className="wrap-break-word whitespace-pre-wrap">
                {message.content}
              </p>
            )}
            {isOwnMessage && (
              <div className="flex shrink-0 items-center">
                {isPending ? (
                  <IconClock className="h-3 w-3 animate-pulse opacity-70" />
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
