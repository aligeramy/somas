"use client";

import { format } from "date-fns";
import { Separator } from "@/components/ui/separator";

interface ChatDateSeparatorProps {
  date: Date;
}

export function ChatDateSeparator({ date }: ChatDateSeparatorProps) {
  const formattedDate = format(date, "MMM d");

  return (
    <div className="flex items-center gap-3 my-4">
      <Separator className="flex-1" />
      <span className="text-xs text-muted-foreground font-medium">
        {formattedDate}
      </span>
      <Separator className="flex-1" />
    </div>
  );
}
