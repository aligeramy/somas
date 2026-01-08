import { IconCalendar, IconCheck, IconUsers } from "@tabler/icons-react";

interface DashboardStatsProps {
  totalAthletes: number;
  totalEvents: number;
  upcomingRsvps: number;
}

export function DashboardStats({
  totalAthletes,
  totalEvents,
  upcomingRsvps,
}: DashboardStatsProps) {
  const stats = [
    {
      label: "Team Members",
      value: totalAthletes,
      icon: IconUsers,
      color: "bg-blue-100 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400",
    },
    {
      label: "Active Events",
      value: totalEvents,
      icon: IconCalendar,
      color:
        "bg-violet-100 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400",
    },
    {
      label: "Upcoming RSVPs",
      value: upcomingRsvps,
      icon: IconCheck,
      color:
        "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400",
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-4">
      {stats.map((stat) => (
        <div
          className="rounded-xl border bg-card p-5 transition-shadow hover:shadow-md"
          key={stat.label}
        >
          <div
            className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${stat.color} mb-3`}
          >
            <stat.icon className="h-5 w-5" />
          </div>
          <p className="font-semibold text-3xl tracking-tight">{stat.value}</p>
          <p className="mt-1 text-muted-foreground text-sm">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}
