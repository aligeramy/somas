import { IconCalendar, IconChevronRight } from "@tabler/icons-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface EventOccurrence {
  id: string;
  date: string | Date;
  startTime?: string;
  endTime?: string;
  status: string;
  event: {
    id: string;
    title: string;
    gymId: string;
    startTime?: string;
    endTime?: string;
  };
}

interface UpcomingEventsProps {
  occurrences: EventOccurrence[];
}

export function UpcomingEvents({ occurrences }: UpcomingEventsProps) {
  const formatDate = (dateValue: string | Date | undefined | null) => {
    if (!dateValue) {
      return "Invalid date";
    }
    const date =
      typeof dateValue === "string" ? new Date(dateValue) : dateValue;
    if (Number.isNaN(date.getTime())) {
      return String(dateValue);
    }
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (time: string | undefined | null) => {
    if (!time) {
      return "";
    }
    const [hours, minutes] = time.split(":");
    const hour = Number.parseInt(hours, 10);
    if (Number.isNaN(hour)) {
      return time;
    }
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  if (occurrences.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <IconCalendar className="mb-3 h-10 w-10 text-muted-foreground/30" />
          <p className="mb-4 text-muted-foreground text-sm">
            No upcoming events
          </p>
          <Button asChild size="sm" variant="outline">
            <Link href="/events">Create an event</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="font-semibold text-lg">
            Upcoming Events
          </CardTitle>
          <Button
            asChild
            className="text-muted-foreground"
            size="sm"
            variant="ghost"
          >
            <Link href="/events">
              View all
              <IconChevronRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {occurrences.map((occurrence) => {
            const startTime =
              occurrence.startTime || occurrence.event.startTime;
            const endTime = occurrence.endTime || occurrence.event.endTime;
            const isCanceled = occurrence.status === "canceled";

            return (
              <Link
                className={`flex items-center gap-4 rounded-xl p-3 transition-colors hover:bg-muted/50 ${
                  isCanceled ? "opacity-50" : ""
                }`}
                href={`/events?event=${occurrence.event.id}`}
                key={occurrence.id}
              >
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <IconCalendar className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {occurrence.event.title}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {formatDate(occurrence.date)}
                    {startTime && ` at ${formatTime(startTime)}`}
                    {endTime && ` - ${formatTime(endTime)}`}
                  </p>
                </div>
                {isCanceled && (
                  <Badge className="text-xs" variant="destructive">
                    Canceled
                  </Badge>
                )}
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
