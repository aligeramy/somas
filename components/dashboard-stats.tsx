import { IconUsers, IconCalendar, IconCheck } from "@tabler/icons-react"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface DashboardStatsProps {
  totalAthletes: number
  totalEvents: number
  upcomingRsvps: number
}

export function DashboardStats({ totalAthletes, totalEvents, upcomingRsvps }: DashboardStatsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-3">
      <Card>
        <CardHeader>
          <CardDescription>Total Athletes</CardDescription>
          <CardTitle className="text-3xl font-semibold tabular-nums">
            {totalAthletes}
          </CardTitle>
        </CardHeader>
        <div className="px-6 pb-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <IconUsers className="h-4 w-4" />
            <span>Registered members</span>
          </div>
        </div>
      </Card>
      <Card>
        <CardHeader>
          <CardDescription>Total Events</CardDescription>
          <CardTitle className="text-3xl font-semibold tabular-nums">
            {totalEvents}
          </CardTitle>
        </CardHeader>
        <div className="px-6 pb-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <IconCalendar className="h-4 w-4" />
            <span>Active events</span>
          </div>
        </div>
      </Card>
      <Card>
        <CardHeader>
          <CardDescription>Upcoming RSVPs</CardDescription>
          <CardTitle className="text-3xl font-semibold tabular-nums">
            {upcomingRsvps}
          </CardTitle>
        </CardHeader>
        <div className="px-6 pb-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <IconCheck className="h-4 w-4" />
            <span>Confirmed attendees</span>
          </div>
        </div>
      </Card>
    </div>
  )
}

