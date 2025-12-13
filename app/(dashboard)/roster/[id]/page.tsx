"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  IconArrowLeft,
  IconMail,
  IconPhone,
  IconHome,
  IconBriefcase,
  IconDeviceMobile,
  IconUser,
  IconEdit,
} from "@tabler/icons-react";
import Link from "next/link";

interface AthleteDetails {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  address: string | null;
  homePhone: string | null;
  workPhone: string | null;
  cellPhone: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  emergencyContactRelationship: string | null;
  emergencyContactEmail: string | null;
  role: "owner" | "coach" | "athlete";
  avatarUrl: string | null;
  onboarded: boolean;
  createdAt: string;
}

export default function AthleteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const athleteId = params.id as string;
  const [athlete, setAthlete] = useState<AthleteDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAthleteDetails();
  }, [athleteId]);

  async function fetchAthleteDetails() {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/roster/${athleteId}`);
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Failed to fetch athlete details");
      }
      const result = await response.json();
      setAthlete(result.member);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  function getInitials(name: string | null, email: string) {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return email[0].toUpperCase();
  }

  function formatRoleDisplay(role: string) {
    if (role === "owner") return "Head Coach";
    return role.charAt(0).toUpperCase() + role.slice(1);
  }

  if (loading) {
    return (
      <div className="flex flex-1 flex-col min-h-0 h-full overflow-hidden">
        <PageHeader title="Athlete Details" />
        <div className="flex-1 overflow-auto min-h-0">
          <div className="max-w-4xl mx-auto space-y-6 p-4">
            <Card className="rounded-xl">
              <CardHeader>
                <Skeleton className="h-6 w-48 mb-2" />
                <Skeleton className="h-4 w-64" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (error || !athlete) {
    return (
      <div className="flex flex-1 flex-col min-h-0 h-full overflow-hidden">
        <PageHeader title="Athlete Details" />
        <div className="flex-1 overflow-auto min-h-0">
          <div className="max-w-4xl mx-auto space-y-6 p-4">
            <Card className="rounded-xl">
              <CardContent className="pt-6 text-center text-muted-foreground">
                {error || "Athlete not found"}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col min-h-0 h-full overflow-hidden">
      <PageHeader
        title="Athlete Details"
        description={`View details for ${athlete.name || athlete.email}`}
      >
        <Link href="/roster">
          <Button variant="outline" className="rounded-xl gap-2">
            <IconArrowLeft className="h-4 w-4" />
            Back to Roster
          </Button>
        </Link>
      </PageHeader>

      <div className="flex-1 overflow-auto min-h-0">
        <div className="max-w-4xl mx-auto space-y-6 p-4">
          {/* Profile Header */}
          <Card className="rounded-xl">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20 border-4 border-background shadow-lg">
                  <AvatarImage
                    src={athlete.avatarUrl || undefined}
                    alt={athlete.name || athlete.email}
                  />
                  <AvatarFallback className="text-xl bg-gradient-to-br from-primary/20 to-primary/5">
                    {getInitials(athlete.name, athlete.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-2xl font-semibold">
                      {athlete.name || "Unnamed"}
                    </h2>
                    <Badge
                      variant={
                        athlete.role === "owner"
                          ? "default"
                          : athlete.role === "coach"
                            ? "secondary"
                            : "outline"
                      }
                      className="rounded-lg"
                    >
                      {formatRoleDisplay(athlete.role)}
                    </Badge>
                    {!athlete.onboarded && (
                      <Badge variant="outline" className="rounded-lg">
                        Pending
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{athlete.email}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Personal Information */}
          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle className="text-base">Personal Information</CardTitle>
              <CardDescription>Contact details and address</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Email Address</p>
                  <div className="flex items-center gap-2">
                    <IconMail className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm">{athlete.email}</p>
                  </div>
                </div>
                {athlete.address && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Address</p>
                    <div className="flex items-center gap-2">
                      <IconHome className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm">{athlete.address}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-3 pt-2 border-t">
                {athlete.homePhone && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Home Phone</p>
                    <div className="flex items-center gap-2">
                      <IconPhone className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm">{athlete.homePhone}</p>
                    </div>
                  </div>
                )}
                {athlete.workPhone && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Work Phone</p>
                    <div className="flex items-center gap-2">
                      <IconBriefcase className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm">{athlete.workPhone}</p>
                    </div>
                  </div>
                )}
                {athlete.cellPhone && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Cell Number</p>
                    <div className="flex items-center gap-2">
                      <IconDeviceMobile className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm">{athlete.cellPhone}</p>
                    </div>
                  </div>
                )}
                {athlete.phone && !athlete.homePhone && !athlete.workPhone && !athlete.cellPhone && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <div className="flex items-center gap-2">
                      <IconPhone className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm">{athlete.phone}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Emergency Contact */}
          {(athlete.emergencyContactName ||
            athlete.emergencyContactPhone ||
            athlete.emergencyContactEmail) && (
            <Card className="rounded-xl">
              <CardHeader>
                <CardTitle className="text-base">Emergency Contact</CardTitle>
                <CardDescription>
                  Emergency contact information for this athlete
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  {athlete.emergencyContactName && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">
                        Emergency Contact Name
                      </p>
                      <div className="flex items-center gap-2">
                        <IconUser className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm">{athlete.emergencyContactName}</p>
                      </div>
                    </div>
                  )}
                  {athlete.emergencyContactRelationship && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">
                        Relationship to Athlete
                      </p>
                      <p className="text-sm">
                        {athlete.emergencyContactRelationship}
                      </p>
                    </div>
                  )}
                </div>
                <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t">
                  {athlete.emergencyContactPhone && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">
                        Emergency Contact Phone
                      </p>
                      <div className="flex items-center gap-2">
                        <IconPhone className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm">{athlete.emergencyContactPhone}</p>
                      </div>
                    </div>
                  )}
                  {athlete.emergencyContactEmail && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">
                        Emergency Contact Email
                      </p>
                      <div className="flex items-center gap-2">
                        <IconMail className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm">{athlete.emergencyContactEmail}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Empty state for emergency contact */}
          {!athlete.emergencyContactName &&
            !athlete.emergencyContactPhone &&
            !athlete.emergencyContactEmail && (
              <Card className="rounded-xl">
                <CardHeader>
                  <CardTitle className="text-base">Emergency Contact</CardTitle>
                  <CardDescription>
                    No emergency contact information available
                  </CardDescription>
                </CardHeader>
              </Card>
            )}
        </div>
      </div>
    </div>
  );
}

