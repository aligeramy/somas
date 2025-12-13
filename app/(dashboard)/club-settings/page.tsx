"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { IconCamera, IconCheck, IconBuilding, IconPlus, IconMail, IconPhone } from "@tabler/icons-react";
import { useDropzone } from "react-dropzone";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

interface ClubProfile {
  id: string;
  name: string;
  logoUrl: string | null;
  website: string | null;
  emailSettings: {
    enabled?: boolean;
    reminderEnabled?: boolean;
    announcementEnabled?: boolean;
  };
}

interface Coach {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  avatarUrl: string | null;
  role: "coach";
  createdAt: string;
}

export default function ClubSettingsPage() {
  const supabase = createClient();
  const [club, setClub] = useState<ClubProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Club fields
  const [clubName, setClubName] = useState("");
  const [clubWebsite, setClubWebsite] = useState("");
  const [clubLogoFile, setClubLogoFile] = useState<File | null>(null);
  const [clubLogoPreview, setClubLogoPreview] = useState<string | null>(null);

  // Coaches
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loadingCoaches, setLoadingCoaches] = useState(false);
  const [isAddCoachDialogOpen, setIsAddCoachDialogOpen] = useState(false);
  const [coachEmail, setCoachEmail] = useState("");
  const [invitingCoach, setInvitingCoach] = useState(false);

  const { getRootProps: getLogoRootProps, getInputProps: getLogoInputProps } = useDropzone({
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"],
    },
    maxFiles: 1,
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        setClubLogoFile(file);
        const reader = new FileReader();
        reader.onloadend = () => {
          setClubLogoPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    },
  });

  const loadCoaches = useCallback(async () => {
    setLoadingCoaches(true);
    try {
      const response = await fetch("/api/roster");
      if (!response.ok) throw new Error("Failed to load coaches");
      const data = await response.json();
      const coachesList = data.roster.filter((user: Coach) => user.role === "coach");
      setCoaches(coachesList);
    } catch (err) {
      console.error("Failed to load coaches:", err);
    } finally {
      setLoadingCoaches(false);
    }
  }, []);

  const loadClub = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/club");
      if (!response.ok) throw new Error("Failed to load club");
      const data = await response.json();
      setClub(data.club);
      setClubName(data.club.name || "");
      setClubWebsite(data.club.website || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load club");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClub();
    loadCoaches();
  }, [loadClub, loadCoaches]);


  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSaving(true);

    try {
      let logoUrl = club?.logoUrl || null;

      // Upload club logo if provided
      if (clubLogoFile) {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();
        if (!authUser) throw new Error("Not authenticated");

        const fileExt = clubLogoFile.name.split(".").pop();
        const fileName = `${authUser.id}-${Date.now()}.${fileExt}`;
        const filePath = `logos/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("logos")
          .upload(filePath, clubLogoFile, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          throw new Error(`Failed to upload logo: ${uploadError.message}`);
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("logos").getPublicUrl(filePath);
        logoUrl = publicUrl;
      }

      const clubResponse = await fetch("/api/club", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: clubName,
          logoUrl,
          website: clubWebsite.trim() || null,
        }),
      });

      if (!clubResponse.ok) throw new Error("Failed to save club");
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      await loadClub(); // Reload to get updated data
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleInviteCoach(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInvitingCoach(true);

    try {
      if (!coachEmail.trim()) {
        throw new Error("Email is required");
      }

      const response = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emails: [coachEmail.trim()],
          role: "coach",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send invitation");
      }

      if (data.errors && data.errors.length > 0) {
        throw new Error(data.errors[0].error || "Failed to send invitation");
      }

      setCoachEmail("");
      setIsAddCoachDialogOpen(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      await loadCoaches(); // Reload coaches list
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to invite coach");
    } finally {
      setInvitingCoach(false);
    }
  }

  function getInitials(name: string | null, email: string) {
    if (name) {
      return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
    }
    return email[0].toUpperCase();
  }

  if (loading) {
    return (
      <div className="flex flex-1 flex-col min-h-0 h-full overflow-hidden">
        <PageHeader title="Club Settings" />
        <div className="flex flex-1 items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  if (!club) {
    return (
      <div className="flex flex-1 flex-col min-h-0 h-full overflow-hidden">
        <PageHeader title="Club Settings" />
        <div className="flex flex-1 items-center justify-center">
          <p className="text-muted-foreground">Club not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col min-h-0 h-full overflow-hidden">
      <PageHeader title="Club Settings" description="Manage your club information">
        <Button onClick={handleSave} disabled={saving} className="gap-2 rounded-xl">
          {success ? (
            <>
              <IconCheck className="h-4 w-4" />
              Saved
            </>
          ) : (
            saving ? "Saving..." : "Save Changes"
          )}
        </Button>
      </PageHeader>

      <div className="flex-1 overflow-auto min-h-0">
        <div className="max-w-2xl mx-auto space-y-6 p-4">
          {error && (
            <div className="bg-destructive/10 text-destructive rounded-xl p-4 text-sm">
              {error}
            </div>
          )}

          {/* Club Logo Section */}
          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <IconBuilding className="h-5 w-5" />
                Club Logo
              </CardTitle>
              <CardDescription>Update your club's logo</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="relative">
                  {clubLogoPreview || club.logoUrl ? (
                    <img
                      src={clubLogoPreview || club.logoUrl || ""}
                      alt="Club logo"
                      className="h-24 w-24 rounded-xl border-4 border-background shadow-lg object-cover"
                    />
                  ) : (
                    <div className="h-24 w-24 rounded-xl border-4 border-background shadow-lg bg-muted flex items-center justify-center">
                      <span className="text-3xl font-bold">
                        {clubName[0]?.toUpperCase() || "C"}
                      </span>
                    </div>
                  )}
                  <button
                    {...getLogoRootProps()}
                    className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors cursor-pointer"
                  >
                    <input {...getLogoInputProps()} />
                    <IconCamera className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">
                    Click the camera icon to upload a new logo. Recommended size: 512x512px
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Club Information */}
          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle className="text-base">Club Information</CardTitle>
              <CardDescription>Update your club's basic information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="clubName" className="text-sm">Club Name</Label>
                <Input
                  id="clubName"
                  value={clubName}
                  onChange={(e) => setClubName(e.target.value)}
                  placeholder="Club Name"
                  className="rounded-xl h-11"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clubWebsite" className="text-sm">Website</Label>
                <Input
                  id="clubWebsite"
                  type="url"
                  value={clubWebsite}
                  onChange={(e) => setClubWebsite(e.target.value)}
                  placeholder="https://example.com"
                  className="rounded-xl h-11"
                />
                <p className="text-xs text-muted-foreground">
                  Enter your club's website URL. This will be visible to all members.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Coaches Section */}
          <Card className="rounded-xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Coaches</CardTitle>
                  <CardDescription>Manage your club's coaches</CardDescription>
                </div>
                <Dialog open={isAddCoachDialogOpen} onOpenChange={setIsAddCoachDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-2 rounded-xl">
                      <IconPlus className="h-4 w-4" />
                      Add Coach
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="rounded-xl">
                    <DialogHeader>
                      <DialogTitle>Invite Coach</DialogTitle>
                      <DialogDescription>
                        Send an invitation email to add a new coach to your club.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleInviteCoach}>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="coachEmail">Email Address</Label>
                          <Input
                            id="coachEmail"
                            type="email"
                            value={coachEmail}
                            onChange={(e) => setCoachEmail(e.target.value)}
                            placeholder="coach@example.com"
                            className="rounded-xl h-11"
                            required
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsAddCoachDialogOpen(false)}
                          className="rounded-xl"
                        >
                          Cancel
                        </Button>
                        <Button type="submit" disabled={invitingCoach} className="rounded-xl">
                          {invitingCoach ? "Sending..." : "Send Invitation"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {loadingCoaches ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-xl" />
                  ))}
                </div>
              ) : coaches.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No coaches yet</p>
                  <p className="text-sm mt-1">Add coaches to help manage your club</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {coaches.map((coach) => (
                      <div
                        key={coach.id}
                        className="flex items-center gap-3 p-3 rounded-xl border bg-card hover:bg-muted/50 transition-colors"
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={coach.avatarUrl || undefined} />
                          <AvatarFallback className="text-sm">
                            {getInitials(coach.name, coach.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {coach.name || "No name"}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <IconMail className="h-3 w-3" />
                            <span className="truncate">{coach.email}</span>
                          </div>
                          {coach.phone && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                              <IconPhone className="h-3 w-3" />
                              <span>{coach.phone}</span>
                            </div>
                          )}
                        </div>
                        <Badge variant="secondary" className="rounded-lg">
                          Coach
                        </Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

