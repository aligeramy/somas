import { Card, CardDescription, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { IconCalendar } from "@tabler/icons-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

interface EventOccurrence {
  id: string
  date: string | Date
  startTime: string
  endTime: string
  status: string
  event: {
    id: string
    title: string
    gymId: string
  }
}

interface UpcomingEventsProps {
  occurrences: EventOccurrence[]
}

export function UpcomingEvents({ occurrences }: UpcomingEventsProps) {
  if (occurrences.length === 0) {
    return (
      <div className="px-4 lg:px-6">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Events</CardTitle>
            <CardDescription>No upcoming events in the next 7 days</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const formatDate = (dateValue: string | Date | undefined | null) => {
    if (!dateValue) return 'Invalid date'
    const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue
    if (isNaN(date.getTime())) {
      return String(dateValue)
    }
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  const formatTime = (time: string | undefined | null) => {
    if (!time) return 'TBD'
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    if (isNaN(hour)) return time
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  }

  return (
    <div className="px-4 lg:px-6">
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Events</CardTitle>
          <CardDescription>Events happening in the next 7 days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {occurrences.map((occurrence) => (
              <div
                key={occurrence.id}
                className="flex items-center justify-between rounded-lg border p-4 hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <IconCalendar className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{occurrence.event.title}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{formatDate(occurrence.date)}</span>
                      <span>•</span>
                      <span>
                        {formatTime(occurrence.startTime)} - {formatTime(occurrence.endTime)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {occurrence.status === 'canceled' && (
                    <Badge variant="destructive">Canceled</Badge>
                  )}
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/events?event=${occurrence.event.id}`}>View</Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
          {occurrences.length > 0 && (
            <div className="mt-4">
              <Button variant="outline" className="w-full" asChild>
                <Link href="/events">View All Events</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

