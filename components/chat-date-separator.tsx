"use client";

import { format } from "date-fns";
import { Separator } from "@/components/ui/separator";

interface ChatDateSeparatorProps {
  date: Date;
}

export function ChatDateSeparator({ date }: ChatDateSeparatorProps) {
  const formattedDate = format(date, "MMM d");

  return (
    <div className="my-4 flex items-center gap-3">
      <Separator className="flex-1" />
      <span className="font-medium text-muted-foreground text-xs">
        {formattedDate}
      </span>
      <Separator className="flex-1" />
    </div>
  );
}
