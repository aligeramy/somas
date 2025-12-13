import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import {
  IconDashboard,
  IconCalendar,
  IconUsers,
  IconListCheck,
  IconBuilding,
  IconHelpCircle,
  IconQuestionMark,
} from "@tabler/icons-react";

export default function HelpPage() {
  return (
    <div className="flex flex-1 flex-col min-h-0 h-full overflow-hidden">
      <PageHeader 
        title="Help & Support" 
        description="Get help using the dashboard"
      />

      <div className="flex-1 overflow-auto min-h-0">
        <div className="max-w-4xl mx-auto space-y-6 p-4">
          {/* Getting Started */}
          <Card className="rounded-xl">
            <CardHeader>
              <div className="flex items-center gap-2">
                <IconHelpCircle className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Getting Started</CardTitle>
              </div>
              <CardDescription>Learn the basics of using the dashboard</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-medium text-sm">Dashboard Overview</h3>
                <p className="text-sm text-muted-foreground">
                  Your dashboard provides an overview of your team's activities, upcoming events, and member statistics. 
                  Use the sidebar to navigate between different sections.
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="font-medium text-sm">Navigation</h3>
                <p className="text-sm text-muted-foreground">
                  Use the sidebar menu to access different features. The menu adapts based on your role (Head Coach, Coach, or Athlete).
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Features */}
          <Card className="rounded-xl">
            <CardHeader>
              <div className="flex items-center gap-2">
                <IconDashboard className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Features</CardTitle>
              </div>
              <CardDescription>Learn about available features</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center shrink-0 mt-0.5">
                    <IconDashboard className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-medium text-sm">Dashboard</h3>
                    <p className="text-sm text-muted-foreground">
                      View statistics, upcoming events, and recent team activity at a glance.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-violet-100 dark:bg-violet-950/50 flex items-center justify-center shrink-0 mt-0.5">
                    <IconCalendar className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-medium text-sm">Events</h3>
                    <p className="text-sm text-muted-foreground">
                      Create and manage training sessions, competitions, and other team events. 
                      Set recurring schedules and track attendance.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center shrink-0 mt-0.5">
                    <IconUsers className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-medium text-sm">Members (Head Coaches Only)</h3>
                    <p className="text-sm text-muted-foreground">
                      Manage your team roster, add new members, and view member profiles. 
                      Import members from CSV files for bulk additions.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-orange-100 dark:bg-orange-950/50 flex items-center justify-center shrink-0 mt-0.5">
                    <IconListCheck className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-medium text-sm">Attendance</h3>
                    <p className="text-sm text-muted-foreground">
                      View and manage RSVPs for upcoming events. See who's attending and who's not.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-purple-100 dark:bg-purple-950/50 flex items-center justify-center shrink-0 mt-0.5">
                    <IconBuilding className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-medium text-sm">Club Settings (Head Coaches Only)</h3>
                    <p className="text-sm text-muted-foreground">
                      Configure your club's information, logo, and other settings.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Common Questions */}
          <Card className="rounded-xl">
            <CardHeader>
              <div className="flex items-center gap-2">
                <IconQuestionMark className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Frequently Asked Questions</CardTitle>
              </div>
              <CardDescription>Answers to common questions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="space-y-1">
                  <h3 className="font-medium text-sm">How do I create an event?</h3>
                  <p className="text-sm text-muted-foreground">
                    Navigate to the Events page and click the "New Event" button. Fill in the event details, 
                    set the date and time, and optionally configure recurring schedules.
                  </p>
                </div>

                <div className="space-y-1">
                  <h3 className="font-medium text-sm">How do I RSVP to an event?</h3>
                  <p className="text-sm text-muted-foreground">
                    Go to the Attendance page or click on an event from the dashboard. You can mark yourself as 
                    "Going" or "Not Going" for any upcoming event.
                  </p>
                </div>

                <div className="space-y-1">
                  <h3 className="font-medium text-sm">Can I cancel an event?</h3>
                  <p className="text-sm text-muted-foreground">
                    Yes, head coaches and coaches can cancel events. Navigate to the event details and use the 
                    cancel option. Members will be notified automatically.
                  </p>
                </div>

                <div className="space-y-1">
                  <h3 className="font-medium text-sm">How do I add team members?</h3>
                  <p className="text-sm text-muted-foreground">
                    Head coaches can add members by going to the Members page. You can add members individually or 
                    import them in bulk using a CSV file.
                  </p>
                </div>

                <div className="space-y-1">
                  <h3 className="font-medium text-sm">How do I update my profile?</h3>
                  <p className="text-sm text-muted-foreground">
                    Click on your profile in the sidebar footer, or navigate to the Profile page from the menu. 
                    You can update your name, phone, address, and notification preferences.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Support */}
          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle className="text-base">Need More Help?</CardTitle>
              <CardDescription>Get in touch with support</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                If you need additional assistance or have questions not covered here, please contact your club administrator 
                or reach out to support through your organization's preferred channel.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}




