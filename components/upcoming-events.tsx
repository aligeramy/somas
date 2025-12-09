import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { IconCalendar, IconChevronRight } from "@tabler/icons-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

interface EventOccurrence {
  id: string
  date: string | Date
  startTime?: string
  endTime?: string
  status: string
  event: {
    id: string
    title: string
    gymId: string
    startTime?: string
    endTime?: string
  }
}

interface UpcomingEventsProps {
  occurrences: EventOccurrence[]
}

export function UpcomingEvents({ occurrences }: UpcomingEventsProps) {
  const formatDate = (dateValue: string | Date | undefined | null) => {
    if (!dateValue) return "Invalid date"
    const date = typeof dateValue === "string" ? new Date(dateValue) : dateValue
    if (isNaN(date.getTime())) return String(dateValue)
    return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
  }

  const formatTime = (time: string | undefined | null) => {
    if (!time) return ""
    const [hours, minutes] = time.split(":")
    const hour = parseInt(hours)
    if (isNaN(hour)) return time
    const ampm = hour >= 12 ? "PM" : "AM"
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  }

  if (occurrences.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <IconCalendar className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground mb-4">No upcoming events this week</p>
          <Button variant="outline" size="sm" asChild>
            <Link href="/events">Create an event</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">This Week</CardTitle>
          <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
            <Link href="/events">
              View all
              <IconChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {occurrences.map((occurrence) => {
            const startTime = occurrence.startTime || occurrence.event.startTime
            const endTime = occurrence.endTime || occurrence.event.endTime
            const isCanceled = occurrence.status === "canceled"

            return (
              <Link
                key={occurrence.id}
                href={`/events?event=${occurrence.event.id}`}
                className={`flex items-center gap-4 p-3 rounded-xl hover:bg-muted/50 transition-colors ${
                  isCanceled ? "opacity-50" : ""
                }`}
              >
                <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <IconCalendar className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{occurrence.event.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(occurrence.date)}
                    {startTime && ` at ${formatTime(startTime)}`}
                    {endTime && ` - ${formatTime(endTime)}`}
                  </p>
                </div>
                {isCanceled && (
                  <Badge variant="destructive" className="text-xs">Canceled</Badge>
                )}
              </Link>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
