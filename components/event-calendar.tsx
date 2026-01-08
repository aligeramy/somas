"use client";

import { IconCheck, IconPlus, IconX } from "@tabler/icons-react";
import { format, parseISO } from "date-fns";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface EventOccurrence {
  id: string;
  date: string;
  status: string;
  isCustom?: boolean;
  note?: string;
}

interface EventCalendarProps {
  occurrences: EventOccurrence[];
  eventTitle: string;
  onToggleDate?: (date: Date, currentStatus: string | null) => void;
  onAddCustomDate?: (date: Date) => void;
  onRemoveDate?: (occurrenceId: string) => void;
  readOnly?: boolean;
  className?: string;
}

export function EventCalendar({
  occurrences,
  eventTitle,
  onToggleDate,
  onAddCustomDate,
  onRemoveDate,
  readOnly = false,
  className,
}: EventCalendarProps) {
  const [month, setMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Create a map of dates to occurrences
  const occurrenceMap = useMemo(() => {
    const map = new Map<string, EventOccurrence>();
    occurrences.forEach((occ) => {
      const dateKey = format(parseISO(occ.date), "yyyy-MM-dd");
      map.set(dateKey, occ);
    });
    return map;
  }, [occurrences]);

  // Get all dates with events in the current month view
  const eventDates = useMemo(() => {
    const dates: Date[] = [];
    occurrences.forEach((occ) => {
      dates.push(parseISO(occ.date));
    });
    return dates;
  }, [occurrences]);

  function getOccurrenceForDate(date: Date): EventOccurrence | null {
    const dateKey = format(date, "yyyy-MM-dd");
    return occurrenceMap.get(dateKey) || null;
  }

  function handleDayClick(date: Date) {
    if (readOnly) {
      return;
    }
    setSelectedDate(date);
  }

  function handleToggle() {
    if (!(selectedDate && onToggleDate)) {
      return;
    }
    const occ = getOccurrenceForDate(selectedDate);
    onToggleDate(selectedDate, occ?.status || null);
    setSelectedDate(null);
  }

  function handleAddCustom() {
    if (!(selectedDate && onAddCustomDate)) {
      return;
    }
    onAddCustomDate(selectedDate);
    setSelectedDate(null);
  }

  function handleRemove() {
    if (!(selectedDate && onRemoveDate)) {
      return;
    }
    const occ = getOccurrenceForDate(selectedDate);
    if (occ) {
      onRemoveDate(occ.id);
    }
    setSelectedDate(null);
  }

  // Custom day render
  const modifiers = {
    scheduled: eventDates.filter((d) => {
      const occ = getOccurrenceForDate(d);
      return occ?.status === "scheduled";
    }),
    canceled: eventDates.filter((d) => {
      const occ = getOccurrenceForDate(d);
      return occ?.status === "canceled";
    }),
    custom: eventDates.filter((d) => {
      const occ = getOccurrenceForDate(d);
      return occ?.isCustom;
    }),
  };

  const modifiersStyles = {
    scheduled: {
      backgroundColor: "hsl(var(--primary))",
      color: "hsl(var(--primary-foreground))",
      borderRadius: "8px",
    },
    canceled: {
      backgroundColor: "hsl(var(--destructive) / 0.2)",
      color: "hsl(var(--destructive))",
      borderRadius: "8px",
      textDecoration: "line-through",
    },
    custom: {
      border: "2px dashed hsl(var(--primary))",
    },
  };

  const selectedOccurrence = selectedDate
    ? getOccurrenceForDate(selectedDate)
    : null;

  return (
    <div className={`flex h-full flex-col ${className || ""}`}>
      <Popover
        onOpenChange={(open) => !open && setSelectedDate(null)}
        open={!!selectedDate && !readOnly}
      >
        <PopoverTrigger asChild>
          <div className="flex flex-1 items-center justify-center p-6">
            <Calendar
              className="w-full max-w-5xl rounded-xl border p-8"
              classNames={{
                root: "w-full",
                months: "w-full",
                month: "w-full",
                month_caption: "text-2xl font-semibold mb-6",
                weekday: "text-sm font-medium",
                day: "h-14 w-14 rounded-lg text-base hover:bg-muted transition-colors",
                day_selected: "!bg-primary/20 !text-primary font-semibold",
              }}
              mode="single"
              modifiers={modifiers}
              modifiersStyles={modifiersStyles}
              month={month}
              onMonthChange={setMonth}
              onSelect={(date) => date && handleDayClick(date)}
              selected={selectedDate || undefined}
            />
          </div>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 rounded-xl p-3">
          <div className="space-y-3">
            <div className="text-sm">
              <p className="font-medium">
                {selectedDate && format(selectedDate, "EEEE, MMM d")}
              </p>
              {selectedOccurrence ? (
                <Badge
                  className="mt-1"
                  variant={
                    selectedOccurrence.status === "scheduled"
                      ? "default"
                      : "destructive"
                  }
                >
                  {selectedOccurrence.status === "scheduled"
                    ? "Scheduled"
                    : "Canceled"}
                  {selectedOccurrence.isCustom && " (Custom)"}
                </Badge>
              ) : (
                <p className="mt-1 text-muted-foreground text-xs">
                  No event scheduled
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              {selectedOccurrence ? (
                <>
                  {selectedOccurrence.status === "scheduled" &&
                    onToggleDate && (
                      <Button
                        className="w-full justify-start gap-2 rounded-lg text-destructive hover:text-destructive"
                        onClick={handleToggle}
                        size="sm"
                        variant="outline"
                      >
                        <IconX className="h-4 w-4" />
                        Cancel this session
                      </Button>
                    )}
                  {selectedOccurrence.status === "canceled" && onToggleDate && (
                    <Button
                      className="w-full justify-start gap-2 rounded-lg"
                      onClick={handleToggle}
                      size="sm"
                      variant="outline"
                    >
                      <IconCheck className="h-4 w-4" />
                      Restore session
                    </Button>
                  )}
                  {selectedOccurrence.isCustom && onRemoveDate && (
                    <Button
                      className="w-full justify-start gap-2 rounded-lg"
                      onClick={handleRemove}
                      size="sm"
                      variant="destructive"
                    >
                      <IconX className="h-4 w-4" />
                      Remove custom date
                    </Button>
                  )}
                </>
              ) : (
                onAddCustomDate && (
                  <Button
                    className="w-full justify-start gap-2 rounded-lg"
                    onClick={handleAddCustom}
                    size="sm"
                    variant="outline"
                  >
                    <IconPlus className="h-4 w-4" />
                    Add session on this date
                  </Button>
                )
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Legend */}
      <div className="mt-3 flex shrink-0 items-center justify-center gap-4 text-muted-foreground text-xs">
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded bg-primary" />
          <span>Scheduled</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded bg-destructive/20" />
          <span>Canceled</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded border border-primary border-dashed" />
          <span>Custom</span>
        </div>
      </div>
    </div>
  );
}
