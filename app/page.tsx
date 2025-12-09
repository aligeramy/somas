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
        "Track attendance patterns and get insights into your gym operations.",
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
      <div className="flex min-h-screen flex-col relative">
        <LandingHeader />

        {/* Hero Section */}
        <section className="flex flex-col items-center justify-center gap-8 px-4 py-20 md:py-32 relative z-10">
          <LaserFlowBg />
          <div className="flex flex-col items-center gap-6 text-center max-w-3xl relative z-10">
            <h1 className="text-5xl font-bold tracking-tight md:text-6xl lg:text-7xl">
              TOM
            </h1>
            <p className="text-muted-foreground text-xl md:text-2xl max-w-2xl">
              Team Operations Manager
            </p>
            <p className="text-muted-foreground text-lg md:text-xl max-w-xl">
              The modern platform for gym management and athlete coordination.
              Streamline scheduling, communication, and team operations.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mt-4">
              <Button asChild size="lg" className="text-base">
                <Link href="/register">Get Started</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="text-base">
                <Link href="/login">Sign In</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section
          id="features"
          className="px-4 py-16 md:py-24 bg-muted/30 relative z-10"
        >
          <div className="mx-auto max-w-6xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl mb-4">
                Everything you need to manage your gym
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Powerful features designed to help coaches and gym owners
                coordinate with athletes efficiently.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <Card key={feature.title} className="border-border/50">
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
        <section id="about" className="px-4 py-16 md:py-24 relative z-10">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl mb-4">
              Ready to get started?
            </h2>
            <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
              Join gyms and coaches who are already using TOM to streamline
              their operations and improve athlete coordination.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="text-base">
                <Link href="/register">Create Account</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="text-base">
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
