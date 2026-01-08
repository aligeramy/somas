"use client";

import {
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconPlus,
  IconX,
} from "@tabler/icons-react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface EventOccurrence {
  id: string;
  date: string;
  status: string;
  isCustom?: boolean;
  note?: string;
}

interface CustomEventCalendarProps {
  occurrences: EventOccurrence[];
  eventTitle: string;
  eventId?: string;
  currentUserRole?: string | null;
  currentUserRsvps?: Map<string, "going" | "not_going">;
  onToggleDate?: (date: Date, currentStatus: string | null) => void;
  onAddCustomDate?: (date: Date) => void;
  onRemoveDate?: (occurrenceId: string) => void;
  onRsvp?: (
    occurrenceId: string,
    status: "going" | "not_going"
  ) => Promise<void>;
  onCancel?: (occurrenceId: string) => Promise<void>;
  readOnly?: boolean;
  className?: string;
}

export function CustomEventCalendar({
  occurrences,
  eventTitle,
  eventId,
  currentUserRole,
  currentUserRsvps = new Map(),
  onToggleDate,
  onAddCustomDate,
  onRemoveDate,
  onRsvp,
  onCancel,
  readOnly = false,
  className,
}: CustomEventCalendarProps) {
  const [month, setMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [rsvping, setRsvping] = useState<string | null>(null);
  const [canceling, setCanceling] = useState<string | null>(null);

  const isAdmin = currentUserRole === "owner" || currentUserRole === "coach";

  // Create a map of dates to occurrences
  const occurrenceMap = useMemo(() => {
    const map = new Map<string, EventOccurrence>();
    occurrences.forEach((occ) => {
      const dateKey = format(parseISO(occ.date), "yyyy-MM-dd");
      map.set(dateKey, occ);
    });
    return map;
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

  async function handleRsvp(
    occurrenceId: string,
    status: "going" | "not_going",
    e: React.MouseEvent
  ) {
    e.stopPropagation();
    if (!onRsvp || rsvping) {
      return;
    }
    setRsvping(occurrenceId);
    try {
      await onRsvp(occurrenceId, status);
      // Close popover after successful RSVP
      setSelectedDate(null);
    } catch (err) {
      console.error("RSVP error:", err);
    } finally {
      setRsvping(null);
    }
  }

  async function handleCancel(occurrenceId: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!onCancel || canceling) {
      return;
    }
    setCanceling(occurrenceId);
    try {
      await onCancel(occurrenceId);
      // Close popover after successful cancel
      setSelectedDate(null);
    } catch (err) {
      console.error("Cancel error:", err);
    } finally {
      setCanceling(null);
    }
  }

  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const previousMonth = () => setMonth(subMonths(month, 1));
  const nextMonth = () => setMonth(addMonths(month, 1));

  const isCurrentMonth = (date: Date) => {
    return format(date, "yyyy-MM") === format(month, "yyyy-MM");
  };

  const isToday = (date: Date) => {
    return isSameDay(date, new Date());
  };

  return (
    <div className={`flex w-full flex-col ${className || ""}`}>
      {/* Calendar Header */}
      <div className="mb-4 flex items-center justify-between px-2">
        <Button
          className="h-10 w-10 rounded-xl"
          onClick={(e) => {
            e.stopPropagation();
            previousMonth();
          }}
          size="icon"
          variant="ghost"
        >
          <IconChevronLeft className="h-5 w-5" />
        </Button>
        <h2 className="font-semibold text-2xl">{format(month, "MMMM yyyy")}</h2>
        <Button
          className="h-10 w-10 rounded-xl"
          onClick={(e) => {
            e.stopPropagation();
            nextMonth();
          }}
          size="icon"
          variant="ghost"
        >
          <IconChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Weekday Headers */}
      <div className="mb-2 grid grid-cols-7 gap-2 px-2">
        {weekDays.map((day) => (
          <div
            className="py-1 text-center font-medium text-muted-foreground text-xs"
            key={day}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2 px-2">
        {days.map((day) => {
          const occ = getOccurrenceForDate(day);
          const isCurrent = isCurrentMonth(day);
          const isDayToday = isToday(day);
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const userRsvp = occ ? currentUserRsvps.get(occ.id) : null;
          const isScheduled = occ?.status === "scheduled";
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const dayDate = new Date(day);
          dayDate.setHours(0, 0, 0, 0);
          const isPast = dayDate < today;
          const canInteract = isScheduled && !isPast && !readOnly;
          const dateKey = format(day, "yyyy-MM-dd");

          let dayClasses =
            "h-20 rounded-xl flex flex-col items-center justify-center text-sm font-medium transition-all cursor-pointer border border-border relative group ";

          if (isCurrent) {
            dayClasses +=
              "text-foreground hover:bg-muted hover:text-foreground ";
          } else {
            dayClasses +=
              "text-muted-foreground/40 border-muted/50 hover:bg-muted/30 hover:text-muted-foreground/60 ";
          }

          if (isDayToday && isCurrent) {
            dayClasses += "ring-2 ring-primary border-primary ";
          }

          if (occ) {
            if (occ.status === "scheduled") {
              dayClasses +=
                "bg-primary text-primary-foreground border-primary hover:bg-primary/90 hover:text-primary-foreground ";
            } else if (occ.status === "canceled") {
              dayClasses +=
                "bg-destructive/20 text-destructive line-through border-destructive/50 hover:bg-destructive/30 hover:text-destructive ";
            }
            if (occ.isCustom) {
              dayClasses += "border border-dashed border-primary ";
            }
          }

          if (isSelected && isCurrent) {
            dayClasses += "ring-2 ring-offset-2 ring-primary border-primary ";
          }

          return (
            <Popover
              key={dateKey}
              onOpenChange={(open) => {
                if (open) {
                  setSelectedDate(day);
                } else {
                  setSelectedDate(null);
                }
              }}
              open={!!isSelected && !readOnly}
            >
              <PopoverTrigger asChild>
                <button
                  className={dayClasses}
                  onClick={() => handleDayClick(day)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleDayClick(day);
                    }
                  }}
                  type="button"
                >
                  <span className="font-semibold text-xs">
                    {format(day, "d")}
                  </span>
                  {occ && occ.status === "scheduled" && (
                    <div className="mt-0.5 h-1 w-1 rounded-full bg-primary-foreground/50" />
                  )}

                  {/* RSVP and Cancel buttons in day box */}
                  {canInteract && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1 rounded-xl bg-black/60 p-1 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
                      {onRsvp && (
                        <div className="flex items-center gap-0.5">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                className={`h-6 w-6 shrink-0 rounded-md p-0 text-[10px] ${
                                  userRsvp === "going"
                                    ? "bg-emerald-600 text-white hover:bg-emerald-700"
                                    : "bg-background/90 text-foreground hover:bg-background"
                                }`}
                                disabled={rsvping === occ.id}
                                onClick={(e) => handleRsvp(occ.id, "going", e)}
                                size="icon"
                                variant={
                                  userRsvp === "going" ? "default" : "secondary"
                                }
                              >
                                <IconCheck className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              <p>Going</p>
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                className={`h-6 w-6 shrink-0 rounded-md p-0 text-[10px] ${
                                  userRsvp === "not_going"
                                    ? "bg-red-600 text-white hover:bg-red-700"
                                    : "bg-background/90 text-foreground hover:bg-background"
                                }`}
                                disabled={rsvping === occ.id}
                                onClick={(e) =>
                                  handleRsvp(occ.id, "not_going", e)
                                }
                                size="icon"
                                variant={
                                  userRsvp === "not_going"
                                    ? "destructive"
                                    : "secondary"
                                }
                              >
                                <IconX className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              <p>Not Going</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      )}
                      {isAdmin && onCancel && (
                        <Button
                          className="h-5 rounded-md bg-red-600/90 px-2 text-[10px] text-white hover:bg-red-700"
                          disabled={canceling === occ.id}
                          onClick={(e) => handleCancel(occ.id, e)}
                          size="sm"
                          variant="destructive"
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Show RSVP status badge when not hovering */}
                  {canInteract && !isSelected && userRsvp && (
                    <div className="absolute bottom-1 left-1/2 -translate-x-1/2 opacity-100 transition-opacity group-hover:opacity-0">
                      {userRsvp === "going" && (
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-sm" />
                      )}
                      {userRsvp === "not_going" && (
                        <div className="h-1.5 w-1.5 rounded-full bg-red-400 shadow-sm" />
                      )}
                    </div>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="center"
                className="w-64 rounded-xl p-3"
                side="top"
              >
                <div className="space-y-3">
                  <div className="text-sm">
                    <p className="font-medium">{format(day, "EEEE, MMM d")}</p>
                    {occ ? (
                      <Badge
                        className="mt-1"
                        variant={
                          occ.status === "scheduled" ? "default" : "destructive"
                        }
                      >
                        {occ.status === "scheduled" ? "Scheduled" : "Canceled"}
                        {occ.isCustom && " (Custom)"}
                      </Badge>
                    ) : (
                      <p className="mt-1 text-muted-foreground text-xs">
                        No event scheduled
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    {occ ? (
                      <>
                        {occ.status === "scheduled" && onToggleDate && (
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
                        {occ.status === "canceled" && onToggleDate && (
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
                        {occ.isCustom && onRemoveDate && (
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
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex shrink-0 items-center justify-center gap-6 px-2 text-muted-foreground text-xs">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded-lg bg-primary" />
          <span>Scheduled</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded-lg bg-destructive/20" />
          <span>Canceled</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded-lg border border-primary border-dashed" />
          <span>Custom</span>
        </div>
      </div>
    </div>
  );
}
