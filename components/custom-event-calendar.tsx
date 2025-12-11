"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { IconX, IconCheck, IconPlus, IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { format, isSameDay, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, addMonths, subMonths } from "date-fns";

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
  onRsvp?: (occurrenceId: string, status: "going" | "not_going") => Promise<void>;
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
    if (readOnly) return;
    setSelectedDate(date);
  }

  function handleToggle() {
    if (!selectedDate || !onToggleDate) return;
    const occ = getOccurrenceForDate(selectedDate);
    onToggleDate(selectedDate, occ?.status || null);
    setSelectedDate(null);
  }

  function handleAddCustom() {
    if (!selectedDate || !onAddCustomDate) return;
    onAddCustomDate(selectedDate);
    setSelectedDate(null);
  }

  function handleRemove() {
    if (!selectedDate || !onRemoveDate) return;
    const occ = getOccurrenceForDate(selectedDate);
    if (occ) {
      onRemoveDate(occ.id);
    }
    setSelectedDate(null);
  }

  async function handleRsvp(occurrenceId: string, status: "going" | "not_going", e: React.MouseEvent) {
    e.stopPropagation();
    if (!onRsvp || rsvping) return;
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
    if (!onCancel || canceling) return;
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
    <div className={`flex flex-col w-full ${className || ""}`}>
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-4 px-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            previousMonth();
          }}
          className="h-10 w-10 rounded-xl"
        >
          <IconChevronLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-2xl font-semibold">
          {format(month, "MMMM yyyy")}
        </h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            nextMonth();
          }}
          className="h-10 w-10 rounded-xl"
        >
          <IconChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-2 mb-2 px-2">
        {weekDays.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium text-muted-foreground py-1"
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

          let dayClasses = "h-20 rounded-xl flex flex-col items-center justify-center text-sm font-medium transition-all cursor-pointer border border-border relative group ";
          
          if (!isCurrent) {
            dayClasses += "text-muted-foreground/40 border-muted/50 hover:bg-muted/30 hover:text-muted-foreground/60 ";
          } else {
            dayClasses += "text-foreground hover:bg-muted hover:text-foreground ";
          }

          if (isDayToday && isCurrent) {
            dayClasses += "ring-2 ring-primary border-primary ";
          }

          if (occ) {
            if (occ.status === "scheduled") {
              dayClasses += "bg-primary text-primary-foreground border-primary hover:bg-primary/90 hover:text-primary-foreground ";
            } else if (occ.status === "canceled") {
              dayClasses += "bg-destructive/20 text-destructive line-through border-destructive/50 hover:bg-destructive/30 hover:text-destructive ";
            }
            if (occ.isCustom) {
              dayClasses += "border border-dashed border-primary ";
            }
          }

          if (isSelected && isCurrent) {
            dayClasses += "ring-2 ring-offset-2 ring-primary border-primary ";
          }

          return (
            <Popover key={dateKey} open={!!isSelected && !readOnly} onOpenChange={(open) => {
              if (open) {
                setSelectedDate(day);
              } else {
                setSelectedDate(null);
              }
            }}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={dayClasses}
                  onClick={() => handleDayClick(day)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleDayClick(day);
                    }
                  }}
                >
                  <span className="text-xs font-semibold">{format(day, "d")}</span>
                  {occ && occ.status === "scheduled" && (
                    <div className="h-1 w-1 rounded-full bg-primary-foreground/50 mt-0.5" />
                  )}
                  
                  {/* RSVP and Cancel buttons in day box */}
                  {canInteract && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 backdrop-blur-sm rounded-xl p-1 z-10">
                      {onRsvp && (
                        <div className="flex items-center gap-0.5">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant={userRsvp === "going" ? "default" : "secondary"}
                                className={`h-6 w-6 rounded-md text-[10px] p-0 shrink-0 ${
                                  userRsvp === "going" 
                                    ? "bg-emerald-600 hover:bg-emerald-700 text-white" 
                                    : "bg-background/90 hover:bg-background text-foreground"
                                }`}
                                onClick={(e) => handleRsvp(occ.id, "going", e)}
                                disabled={rsvping === occ.id}
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
                                size="icon"
                                variant={userRsvp === "not_going" ? "destructive" : "secondary"}
                                className={`h-6 w-6 rounded-md text-[10px] p-0 shrink-0 ${
                                  userRsvp === "not_going" 
                                    ? "bg-red-600 hover:bg-red-700 text-white" 
                                    : "bg-background/90 hover:bg-background text-foreground"
                                }`}
                                onClick={(e) => handleRsvp(occ.id, "not_going", e)}
                                disabled={rsvping === occ.id}
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
                          size="sm"
                          variant="destructive"
                          className="h-5 px-2 text-[10px] rounded-md bg-red-600/90 hover:bg-red-700 text-white"
                          onClick={(e) => handleCancel(occ.id, e)}
                          disabled={canceling === occ.id}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  )}
                  
                  {/* Show RSVP status badge when not hovering */}
                  {canInteract && !isSelected && userRsvp && (
                    <div className="absolute bottom-1 left-1/2 -translate-x-1/2 opacity-100 group-hover:opacity-0 transition-opacity">
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
              <PopoverContent className="w-64 p-3 rounded-xl" side="top" align="center">
                <div className="space-y-3">
                  <div className="text-sm">
                    <p className="font-medium">{format(day, "EEEE, MMM d")}</p>
                    {occ ? (
                      <Badge
                        variant={occ.status === "scheduled" ? "default" : "destructive"}
                        className="mt-1"
                      >
                        {occ.status === "scheduled" ? "Scheduled" : "Canceled"}
                        {occ.isCustom && " (Custom)"}
                      </Badge>
                    ) : (
                      <p className="text-muted-foreground text-xs mt-1">No event scheduled</p>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    {occ ? (
                      <>
                        {occ.status === "scheduled" && onToggleDate && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full justify-start gap-2 rounded-lg text-destructive hover:text-destructive"
                            onClick={handleToggle}
                          >
                            <IconX className="h-4 w-4" />
                            Cancel this session
                          </Button>
                        )}
                        {occ.status === "canceled" && onToggleDate && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full justify-start gap-2 rounded-lg"
                            onClick={handleToggle}
                          >
                            <IconCheck className="h-4 w-4" />
                            Restore session
                          </Button>
                        )}
                        {occ.isCustom && onRemoveDate && (
                          <Button
                            size="sm"
                            variant="destructive"
                            className="w-full justify-start gap-2 rounded-lg"
                            onClick={handleRemove}
                          >
                            <IconX className="h-4 w-4" />
                            Remove custom date
                          </Button>
                        )}
                      </>
                    ) : (
                      onAddCustomDate && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full justify-start gap-2 rounded-lg"
                          onClick={handleAddCustom}
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
      <div className="flex items-center gap-6 mt-4 text-xs text-muted-foreground justify-center shrink-0 px-2">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded-lg bg-primary" />
          <span>Scheduled</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded-lg bg-destructive/20" />
          <span>Canceled</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded-lg border border-dashed border-primary" />
          <span>Custom</span>
        </div>
      </div>
    </div>
  );
}

