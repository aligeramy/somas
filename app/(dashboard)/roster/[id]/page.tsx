"use client";

import {
  IconArrowLeft,
  IconBriefcase,
  IconCalendar,
  IconDeviceMobile,
  IconEdit,
  IconHome,
  IconMail,
  IconMedicalCross,
  IconPhone,
  IconUser,
} from "@tabler/icons-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useGooglePlacesAutocomplete } from "@/hooks/use-google-places-autocomplete";

interface AthleteDetails {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  address: string | null;
  altEmail?: string | null;
  homePhone: string | null;
  workPhone: string | null;
  cellPhone: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  emergencyContactRelationship: string | null;
  emergencyContactEmail: string | null;
  medicalConditions: string | null;
  medications: string | null;
  allergies: string | null;
  dateOfBirth: string | null;
  joinDate: string | null;
  role: "owner" | "coach" | "athlete";
  avatarUrl: string | null;
  onboarded: boolean;
  notifPreferences: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
}

export default function AthleteDetailPage() {
  const params = useParams();
  const _router = useRouter();
  const athleteId = params.id as string;
  const [athlete, setAthlete] = useState<AthleteDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
    address: "",
    altEmail: "",
    homePhone: "",
    workPhone: "",
    cellPhone: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    emergencyContactRelationship: "",
    emergencyContactEmail: "",
    medicalConditions: "",
    medications: "",
    allergies: "",
    dateOfBirth: "",
    joinDate: "",
    role: "",
  });
  const editAddressInputRef = useRef<HTMLInputElement>(null);

  useGooglePlacesAutocomplete(editAddressInputRef, (address) => {
    setEditForm({ ...editForm, address });
  });

  const fetchAthleteDetails = useCallback(
    async (userRole: string | null) => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/roster/${athleteId}`);
        if (!response.ok) {
          const result = await response.json();
          throw new Error(result.error || "Failed to fetch athlete details");
        }
        const result = await response.json();

        // Check if athlete is trying to access another athlete
        if (userRole === "athlete" && result.member.role === "athlete") {
          setError("Access denied");
          setAthlete(null);
          return;
        }

        setAthlete(result.member);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    },
    [athleteId]
  );

  useEffect(() => {
    // Get current user role and ID first
    fetch("/api/user-info")
      .then((res) => res.json())
      .then((data) => {
        setCurrentUserRole(data.role);
        setCurrentUserId(data.id);
        // Then fetch athlete details
        fetchAthleteDetails(data.role);
      })
      .catch(() => {
        fetchAthleteDetails(null);
      });
  }, [fetchAthleteDetails]);

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

  function openEditDialog() {
    if (!athlete) return;
    setEditForm({
      name: athlete.name || "",
      phone: athlete.phone || "",
      address: athlete.address || "",
      altEmail: athlete.altEmail || "",
      homePhone: athlete.homePhone || "",
      workPhone: athlete.workPhone || "",
      cellPhone: athlete.cellPhone || "",
      emergencyContactName: athlete.emergencyContactName || "",
      emergencyContactPhone: athlete.emergencyContactPhone || "",
      emergencyContactRelationship: athlete.emergencyContactRelationship || "",
      emergencyContactEmail: athlete.emergencyContactEmail || "",
      medicalConditions: athlete.medicalConditions || "",
      medications: athlete.medications || "",
      allergies: athlete.allergies || "",
      dateOfBirth: athlete.dateOfBirth
        ? new Date(athlete.dateOfBirth).toISOString().split("T")[0]
        : "",
      joinDate: athlete.joinDate
        ? new Date(athlete.joinDate).toISOString().split("T")[0]
        : "",
      role: athlete.role,
    });
    setIsEditDialogOpen(true);
  }

  async function handleSaveEdit() {
    if (!athlete) return;
    setSaving(true);
    setError(null);

    try {
      // Don't send role field if editing head coach (can't change head coach role)
      const { role, ...restForm } = editForm;
      const updateData =
        athlete.role === "owner" ? restForm : { ...restForm, role };

      // Convert empty strings to null for optional fields
      Object.keys(updateData).forEach((key) => {
        if (updateData[key as keyof typeof updateData] === "") {
          updateData[key as keyof typeof updateData] = null as any;
        }
      });

      const response = await fetch(`/api/roster/${athlete.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Failed to update member");
      }

      setIsEditDialogOpen(false);
      // Refresh the athlete data
      fetchAthleteDetails(currentUserRole);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSaving(false);
    }
  }

  const isOwner = currentUserRole === "owner";
  const isCoach = currentUserRole === "coach";
  const canEdit =
    isOwner ||
    (isCoach && athlete?.role === "athlete") ||
    (currentUserId && athlete?.id === currentUserId);

  if (loading) {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
        <PageHeader title="Athlete Details" />
        <div className="min-h-0 flex-1 overflow-auto">
          <div className="mx-auto max-w-4xl space-y-6 p-4">
            <Card className="rounded-xl">
              <CardHeader>
                <Skeleton className="mb-2 h-6 w-48" />
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
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
        <PageHeader title="Athlete Details" />
        <div className="min-h-0 flex-1 overflow-auto">
          <div className="mx-auto max-w-4xl space-y-6 p-4">
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
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <PageHeader
        description={`View details for ${athlete.name || athlete.email}`}
        title="Athlete Details"
      >
        <div className="flex gap-2">
          {canEdit && (
            <Button className="gap-2 rounded-xl" onClick={openEditDialog}>
              <IconEdit className="h-4 w-4" />
              Edit
            </Button>
          )}
          <Link href="/roster">
            <Button className="gap-2 rounded-xl" variant="outline">
              <IconArrowLeft className="h-4 w-4" />
              Back to Roster
            </Button>
          </Link>
        </div>
      </PageHeader>

      <div className="min-h-0 flex-1 overflow-auto">
        <div className="mx-auto max-w-4xl space-y-6 p-4">
          {/* Profile Header */}
          <Card className="rounded-xl">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20 border-4 border-background shadow-lg">
                  <AvatarImage
                    alt={athlete.name || athlete.email}
                    src={athlete.avatarUrl || undefined}
                  />
                  <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-xl">
                    {getInitials(athlete.name, athlete.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="mb-2 flex items-center gap-3">
                    <h2 className="font-semibold text-2xl">
                      {athlete.name || "Unnamed"}
                    </h2>
                    <Badge
                      className="rounded-lg"
                      variant={
                        athlete.role === "owner"
                          ? "default"
                          : athlete.role === "coach"
                            ? "secondary"
                            : "outline"
                      }
                    >
                      {formatRoleDisplay(athlete.role)}
                    </Badge>
                    {!athlete.onboarded && (
                      <Badge className="rounded-lg" variant="outline">
                        Pending
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground text-sm">
                    {athlete.email}
                  </p>
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
                  <p className="text-muted-foreground text-xs">Primary Email</p>
                  <a
                    className="flex items-center gap-2 text-primary text-sm hover:underline"
                    href={`mailto:${athlete.email}`}
                  >
                    <IconMail className="h-4 w-4" />
                    {athlete.email}
                  </a>
                </div>
                {athlete.altEmail && (
                  <div className="space-y-1">
                    <p className="text-muted-foreground text-xs">
                      Alternate Email
                    </p>
                    <a
                      className="flex items-center gap-2 text-primary text-sm hover:underline"
                      href={`mailto:${athlete.altEmail}`}
                    >
                      <IconMail className="h-4 w-4" />
                      {athlete.altEmail}
                    </a>
                  </div>
                )}
                {athlete.address && (
                  <div className="space-y-1">
                    <p className="text-muted-foreground text-xs">Address</p>
                    <div className="flex items-center gap-2">
                      <IconHome className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm">{athlete.address}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid gap-4 border-t pt-2 sm:grid-cols-3">
                {athlete.homePhone && (
                  <div className="space-y-1">
                    <p className="text-muted-foreground text-xs">Home Phone</p>
                    <a
                      className="flex items-center gap-2 text-primary text-sm hover:underline"
                      href={`tel:${athlete.homePhone}`}
                    >
                      <IconPhone className="h-4 w-4" />
                      {athlete.homePhone}
                    </a>
                  </div>
                )}
                {athlete.workPhone && (
                  <div className="space-y-1">
                    <p className="text-muted-foreground text-xs">Work Phone</p>
                    <a
                      className="flex items-center gap-2 text-primary text-sm hover:underline"
                      href={`tel:${athlete.workPhone}`}
                    >
                      <IconBriefcase className="h-4 w-4" />
                      {athlete.workPhone}
                    </a>
                  </div>
                )}
                {athlete.cellPhone && (
                  <div className="space-y-1">
                    <p className="text-muted-foreground text-xs">Cell Number</p>
                    <a
                      className="flex items-center gap-2 text-primary text-sm hover:underline"
                      href={`tel:${athlete.cellPhone}`}
                    >
                      <IconDeviceMobile className="h-4 w-4" />
                      {athlete.cellPhone}
                    </a>
                  </div>
                )}
                {athlete.phone &&
                  !athlete.homePhone &&
                  !athlete.workPhone &&
                  !athlete.cellPhone && (
                    <div className="space-y-1">
                      <p className="text-muted-foreground text-xs">Phone</p>
                      <a
                        className="flex items-center gap-2 text-primary text-sm hover:underline"
                        href={`tel:${athlete.phone}`}
                      >
                        <IconPhone className="h-4 w-4" />
                        {athlete.phone}
                      </a>
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
                      <p className="text-muted-foreground text-xs">
                        Emergency Contact Name
                      </p>
                      <div className="flex items-center gap-2">
                        <IconUser className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm">
                          {athlete.emergencyContactName}
                        </p>
                      </div>
                    </div>
                  )}
                  {athlete.emergencyContactRelationship && (
                    <div className="space-y-1">
                      <p className="text-muted-foreground text-xs">
                        Relationship to Athlete
                      </p>
                      <p className="text-sm">
                        {athlete.emergencyContactRelationship}
                      </p>
                    </div>
                  )}
                </div>
                <div className="grid gap-4 border-t pt-2 sm:grid-cols-2">
                  {athlete.emergencyContactPhone && (
                    <div className="space-y-1">
                      <p className="text-muted-foreground text-xs">
                        Emergency Contact Phone
                      </p>
                      <a
                        className="flex items-center gap-2 text-primary text-sm hover:underline"
                        href={`tel:${athlete.emergencyContactPhone}`}
                      >
                        <IconPhone className="h-4 w-4" />
                        {athlete.emergencyContactPhone}
                      </a>
                    </div>
                  )}
                  {athlete.emergencyContactEmail && (
                    <div className="space-y-1">
                      <p className="text-muted-foreground text-xs">
                        Emergency Contact Email
                      </p>
                      <a
                        className="flex items-center gap-2 text-primary text-sm hover:underline"
                        href={`mailto:${athlete.emergencyContactEmail}`}
                      >
                        <IconMail className="h-4 w-4" />
                        {athlete.emergencyContactEmail}
                      </a>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Empty state for emergency contact */}
          {!(
            athlete.emergencyContactName ||
            athlete.emergencyContactPhone ||
            athlete.emergencyContactEmail
          ) && (
            <Card className="rounded-xl">
              <CardHeader>
                <CardTitle className="text-base">Emergency Contact</CardTitle>
                <CardDescription>
                  No emergency contact information available
                </CardDescription>
              </CardHeader>
            </Card>
          )}

          {/* Medical Information */}
          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <IconMedicalCross className="h-5 w-5" />
                Medical Information
              </CardTitle>
              <CardDescription>
                Medical conditions, medications, and allergies
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {athlete.medications ? (
                <div className="space-y-1">
                  <p className="font-medium text-muted-foreground text-xs">
                    Medications
                  </p>
                  <p className="whitespace-pre-wrap rounded-lg bg-muted/50 p-3 text-sm">
                    {athlete.medications}
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="font-medium text-muted-foreground text-xs">
                    Medications
                  </p>
                  <p className="text-muted-foreground text-sm italic">
                    No medications listed
                  </p>
                </div>
              )}
              {athlete.medicalConditions ? (
                <div className="space-y-1 border-t pt-2">
                  <p className="font-medium text-muted-foreground text-xs">
                    Medical Conditions
                  </p>
                  <p className="whitespace-pre-wrap rounded-lg bg-muted/50 p-3 text-sm">
                    {athlete.medicalConditions}
                  </p>
                </div>
              ) : (
                <div className="space-y-1 border-t pt-2">
                  <p className="font-medium text-muted-foreground text-xs">
                    Medical Conditions
                  </p>
                  <p className="text-muted-foreground text-sm italic">
                    No medical conditions listed
                  </p>
                </div>
              )}
              {athlete.allergies ? (
                <div className="space-y-1 border-t pt-2">
                  <p className="font-medium text-muted-foreground text-xs">
                    Allergies
                  </p>
                  <p className="whitespace-pre-wrap rounded-lg bg-muted/50 p-3 text-sm">
                    {athlete.allergies}
                  </p>
                </div>
              ) : (
                <div className="space-y-1 border-t pt-2">
                  <p className="font-medium text-muted-foreground text-xs">
                    Allergies
                  </p>
                  <p className="text-muted-foreground text-sm italic">
                    No allergies listed
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Additional Information */}
          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <IconCalendar className="h-5 w-5" />
                Additional Information
              </CardTitle>
              <CardDescription>
                Membership details and account information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {athlete.dateOfBirth ? (
                  <div className="space-y-1">
                    <p className="text-muted-foreground text-xs">
                      Date of Birth
                    </p>
                    <p className="text-sm">
                      {new Date(athlete.dateOfBirth).toLocaleDateString(
                        "en-US",
                        {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        }
                      )}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-muted-foreground text-xs">
                      Date of Birth
                    </p>
                    <p className="text-muted-foreground text-sm italic">
                      Not provided
                    </p>
                  </div>
                )}
                {athlete.joinDate ? (
                  <div className="space-y-1">
                    <p className="text-muted-foreground text-xs">Join Date</p>
                    <p className="text-sm">
                      {new Date(athlete.joinDate).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-muted-foreground text-xs">Join Date</p>
                    <p className="text-muted-foreground text-sm italic">
                      Not provided
                    </p>
                  </div>
                )}
              </div>
              <div className="grid gap-4 border-t pt-2 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs">
                    Account Created
                  </p>
                  <p className="text-sm">
                    {new Date(athlete.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs">Last Updated</p>
                  <p className="text-sm">
                    {new Date(athlete.updatedAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Member Dialog */}
      <Dialog onOpenChange={setIsEditDialogOpen} open={isEditDialogOpen}>
        <DialogContent className="rounded-xl">
          <DialogHeader>
            <DialogTitle>Edit Member</DialogTitle>
            <DialogDescription>
              Update {athlete?.name || athlete?.email}'s information
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh]">
            <div className="space-y-4 py-4 pr-4">
              {error && (
                <div className="rounded-xl bg-destructive/10 p-3 text-destructive text-sm">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  className="h-11 rounded-xl"
                  onChange={(e) =>
                    setEditForm({ ...editForm, name: e.target.value })
                  }
                  placeholder="Full name"
                  value={editForm.name}
                />
              </div>
              <div className="space-y-2">
                <Label>Primary Email</Label>
                <Input
                  className="h-11 rounded-xl bg-muted"
                  disabled
                  type="email"
                  value={athlete?.email || ""}
                />
                <p className="text-muted-foreground text-xs">
                  Primary email cannot be changed
                </p>
              </div>
              <div className="space-y-2">
                <Label>Alternate Email</Label>
                <Input
                  className="h-11 rounded-xl"
                  onChange={(e) =>
                    setEditForm({ ...editForm, altEmail: e.target.value })
                  }
                  placeholder="Alternate email address"
                  type="email"
                  value={editForm.altEmail}
                />
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input
                  autoComplete="off"
                  className="h-11 rounded-xl"
                  onChange={(e) =>
                    setEditForm({ ...editForm, address: e.target.value })
                  }
                  placeholder="Address"
                  ref={editAddressInputRef}
                  value={editForm.address}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Home Phone Number</Label>
                  <Input
                    className="h-11 rounded-xl"
                    onChange={(e) =>
                      setEditForm({ ...editForm, homePhone: e.target.value })
                    }
                    placeholder="Home phone"
                    value={editForm.homePhone}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Work Phone Number</Label>
                  <Input
                    className="h-11 rounded-xl"
                    onChange={(e) =>
                      setEditForm({ ...editForm, workPhone: e.target.value })
                    }
                    placeholder="Work phone"
                    value={editForm.workPhone}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Cell Number</Label>
                <Input
                  className="h-11 rounded-xl"
                  onChange={(e) =>
                    setEditForm({ ...editForm, cellPhone: e.target.value })
                  }
                  placeholder="Cell phone"
                  value={editForm.cellPhone}
                />
              </div>
              <div className="space-y-2">
                <Label>Emergency Contact Name</Label>
                <Input
                  className="h-11 rounded-xl"
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      emergencyContactName: e.target.value,
                    })
                  }
                  placeholder="Emergency contact name"
                  value={editForm.emergencyContactName}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Emergency Contact Phone</Label>
                  <Input
                    className="h-11 rounded-xl"
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        emergencyContactPhone: e.target.value,
                      })
                    }
                    placeholder="Emergency contact phone"
                    value={editForm.emergencyContactPhone}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Relationship to Athlete</Label>
                  <Input
                    className="h-11 rounded-xl"
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        emergencyContactRelationship: e.target.value,
                      })
                    }
                    placeholder="Parent, Guardian, etc."
                    value={editForm.emergencyContactRelationship}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Emergency Contact Email Address</Label>
                <Input
                  className="h-11 rounded-xl"
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      emergencyContactEmail: e.target.value,
                    })
                  }
                  placeholder="Emergency contact email"
                  type="email"
                  value={editForm.emergencyContactEmail}
                />
              </div>
              <div className="space-y-2 border-t pt-2">
                <Label>Medications</Label>
                <Textarea
                  className="min-h-[100px] rounded-xl"
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      medications: e.target.value,
                    })
                  }
                  placeholder="List any medications the athlete is currently taking"
                  value={editForm.medications}
                />
              </div>
              <div className="space-y-2">
                <Label>Medical Conditions</Label>
                <Textarea
                  className="min-h-[100px] rounded-xl"
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      medicalConditions: e.target.value,
                    })
                  }
                  placeholder="List any medical conditions"
                  value={editForm.medicalConditions}
                />
              </div>
              <div className="space-y-2">
                <Label>Allergies</Label>
                <Textarea
                  className="min-h-[100px] rounded-xl"
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      allergies: e.target.value,
                    })
                  }
                  placeholder="List any allergies"
                  value={editForm.allergies}
                />
              </div>
              <div className="grid gap-4 border-t pt-2 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Date of Birth</Label>
                  <Input
                    className="h-11 rounded-xl"
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        dateOfBirth: e.target.value,
                      })
                    }
                    type="date"
                    value={editForm.dateOfBirth}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Join Date</Label>
                  <Input
                    className="h-11 rounded-xl"
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        joinDate: e.target.value,
                      })
                    }
                    type="date"
                    value={editForm.joinDate}
                  />
                </div>
              </div>
              {isOwner && athlete?.role !== "owner" && (
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select
                    onValueChange={(value) =>
                      setEditForm({ ...editForm, role: value })
                    }
                    value={editForm.role}
                  >
                    <SelectTrigger className="h-11 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="athlete">Athlete</SelectItem>
                      <SelectItem value="coach">Coach</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              {athlete?.role === "owner" && (
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Input
                    className="h-11 rounded-xl bg-muted"
                    disabled
                    value="Head Coach"
                  />
                  <p className="text-muted-foreground text-xs">
                    Head Coach role cannot be changed
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button
              className="rounded-xl"
              onClick={() => setIsEditDialogOpen(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              className="rounded-xl"
              disabled={saving}
              onClick={handleSaveEdit}
            >
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
