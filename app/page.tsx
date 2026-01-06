import {
  BarChart3,
  Bell,
  Calendar,
  MessageSquare,
  Shield,
  Users,
  Snowflake,
  Trophy,
  Heart,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LightModeWrapper } from "@/components/light-mode-wrapper";
import { LandingFooter } from "@/components/landing-footer";
import { LandingHeader } from "@/components/landing-header";
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
    <LightModeWrapper>
      <div className="flex min-h-screen flex-col relative bg-gradient-to-b from-blue-50 via-white to-white">
        <LandingHeader />

        {/* Hero Section */}
        <section className="flex flex-col items-center justify-center gap-8 px-4 py-20 md:py-32 relative z-10">
          <div className="flex flex-col items-center gap-6 text-center max-w-4xl relative z-10">
            <div className="mb-4">
              <Image
                src="/somas.png"
                alt="SOMAS Logo"
                width={120}
                height={120}
                className="rounded-full shadow-lg"
              />
            </div>
            <h1 className="text-5xl font-bold tracking-tight md:text-6xl lg:text-7xl bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
              SOMAS
            </h1>
            <p className="text-2xl md:text-3xl font-semibold text-gray-800 max-w-2xl">
              Special Olympics Mississauga Alpine Skiing
            </p>
            <p className="text-lg md:text-xl text-gray-600 max-w-2xl">
              The modern platform for club management and athlete coordination.
              Streamline scheduling, communication, and team operations.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mt-6">
              <Button asChild size="lg" className="text-base bg-blue-600 hover:bg-blue-700 text-white shadow-lg">
                <Link href="/login">Sign In</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="text-base border-blue-600 text-blue-600 hover:bg-blue-50">
                <Link href="/register">Get Started</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section
          id="features"
          className="px-4 py-16 md:py-24 bg-white relative z-10"
        >
          <div className="mx-auto max-w-6xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl mb-4 text-gray-900">
                Everything you need to manage your club
              </h2>
              <p className="text-gray-600 text-lg max-w-2xl mx-auto">
                Powerful features designed to help coaches and head coaches
                coordinate with athletes efficiently.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <Card key={feature.title} className="border-gray-200 shadow-sm hover:shadow-md transition-shadow bg-white">
                    <CardHeader>
                      <div className="mb-2">
                        <Icon className="h-8 w-8 text-blue-600" />
                      </div>
                      <CardTitle className="text-gray-900">{feature.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-base text-gray-600">
                        {feature.description}
                      </CardDescription>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* About Section */}
        <section className="px-4 py-16 md:py-24 bg-gradient-to-b from-white to-blue-50 relative z-10">
          <div className="mx-auto max-w-4xl">
            <div className="text-center mb-12">
              <div className="flex justify-center gap-4 mb-6">
                <Snowflake className="h-12 w-12 text-blue-600" />
                <Trophy className="h-12 w-12 text-yellow-500" />
                <Heart className="h-12 w-12 text-red-500" />
              </div>
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl mb-4 text-gray-900">
                Empowering Athletes Through Technology
              </h2>
              <p className="text-gray-600 text-lg max-w-2xl mx-auto">
                SOMAS is dedicated to supporting Special Olympics athletes and coaches
                with modern tools that make coordination, communication, and management seamless.
              </p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section id="about" className="px-4 py-16 md:py-24 relative z-10 bg-white">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl mb-4 text-gray-900">
              Ready to get started?
            </h2>
            <p className="text-gray-600 text-lg mb-8 max-w-2xl mx-auto">
              Join Special Olympics Mississauga Alpine Skiing coaches and athletes
              who are already using SOMAS to streamline their operations and improve coordination.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="text-base bg-blue-600 hover:bg-blue-700 text-white shadow-lg">
                <Link href="/login">Sign In</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="text-base border-blue-600 text-blue-600 hover:bg-blue-50">
                <Link href="/register">Create Account</Link>
              </Button>
            </div>
          </div>
        </section>

        <LandingFooter />
      </div>
    </LightModeWrapper>
  );
}
