import {
  BarChart3,
  Bell,
  Calendar,
  MessageSquare,
  Shield,
  Users,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DarkModeWrapper } from "@/components/dark-mode-wrapper";
import { LandingFooter } from "@/components/landing-footer";
import { LandingHeader } from "@/components/landing-header";
import { LaserFlowBg } from "@/components/laser-flow-bg";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  const features = [
    {
      icon: Calendar,
      title: "Event Scheduling",
      description:
        "Create recurring events with automatic calendar sync and RSVP tracking.",
    },
    {
      icon: Users,
      title: "Athlete Management",
      description:
        "Manage your roster, track attendance, and coordinate with your team.",
    },
    {
      icon: MessageSquare,
      title: "Team Communication",
      description:
        "Global, group, and direct messaging to keep everyone connected.",
    },
    {
      icon: Bell,
      title: "Smart Notifications",
      description:
        "Push notifications and email reminders for events and updates.",
    },
    {
      icon: BarChart3,
      title: "Analytics & Insights",
      description:
        "Track attendance patterns and get insights into your club operations.",
    },
    {
      icon: Shield,
      title: "Secure & Private",
      description:
        "Invite-only access with enterprise-grade security and privacy.",
    },
  ];

  return (
    <DarkModeWrapper>
      <div className="relative flex min-h-screen flex-col">
        <LandingHeader />

        {/* Hero Section */}
        <section className="relative z-10 flex flex-col items-center justify-center gap-8 px-4 py-20 md:py-32">
          <LaserFlowBg />
          <div className="relative z-10 flex max-w-3xl flex-col items-center gap-6 text-center">
            <h1 className="font-bold text-5xl tracking-tight md:text-6xl lg:text-7xl">
              SOMAS
            </h1>
            <p className="max-w-2xl text-muted-foreground text-xl md:text-2xl">
              Gym Management & Athlete Coordination Platform
            </p>
            <p className="max-w-xl text-lg text-muted-foreground md:text-xl">
              The modern platform for club management and athlete coordination.
              Streamline scheduling, communication, and team operations.
            </p>
            <div className="mt-4 flex flex-col gap-4 sm:flex-row">
              <Button asChild className="text-base" size="lg">
                <Link href="/login">Sign In</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section
          className="relative z-10 bg-muted/30 px-4 py-16 md:py-24"
          id="features"
        >
          <div className="mx-auto max-w-6xl">
            <div className="mb-12 text-center">
              <h2 className="mb-4 font-bold text-3xl tracking-tight md:text-4xl">
                Everything you need to manage your club
              </h2>
              <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
                Powerful features designed to help coaches and head coaches
                coordinate with athletes efficiently.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <Card className="border-border/50" key={feature.title}>
                    <CardHeader>
                      <div className="mb-2">
                        <Icon className="h-8 w-8 text-primary" />
                      </div>
                      <CardTitle>{feature.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-base">
                        {feature.description}
                      </CardDescription>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="relative z-10 px-4 py-16 md:py-24" id="about">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="mb-4 font-bold text-3xl tracking-tight md:text-4xl">
              Ready to get started?
            </h2>
            <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground">
              Join clubs and coaches who are already using SOMAS to streamline
              their operations and improve athlete coordination.
            </p>
            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <Button asChild className="text-base" size="lg">
                <Link href="/login">Sign In</Link>
              </Button>
            </div>
          </div>
        </section>

        <LandingFooter />
      </div>
    </DarkModeWrapper>
  );
}
