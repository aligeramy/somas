"use client";

import {
  IconBuilding,
  IconCamera,
  IconCheck,
  IconDeviceFloppy,
  IconMail,
  IconPhone,
  IconPlus,
} from "@tabler/icons-react";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import { createClient } from "@/lib/supabase/client";

interface GymProfile {
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

export default function GymSettingsPage() {
  const supabase = createClient();
  const isMobile = useIsMobile();
  const [gym, setGym] = useState<GymProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Gym fields
  const [gymName, setGymName] = useState("");
  const [gymWebsite, setGymWebsite] = useState("");
  const [gymLogoFile, setGymLogoFile] = useState<File | null>(null);
  const [gymLogoPreview, setGymLogoPreview] = useState<string | null>(null);

  // Coaches
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loadingCoaches, setLoadingCoaches] = useState(false);
  const [isAddCoachDialogOpen, setIsAddCoachDialogOpen] = useState(false);
  const [coachEmail, setCoachEmail] = useState("");
  const [invitingCoach, setInvitingCoach] = useState(false);

  const { getRootProps: getLogoRootProps, getInputProps: getLogoInputProps } =
    useDropzone({
      accept: {
        "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"],
      },
      maxFiles: 1,
      onDrop: (acceptedFiles) => {
        if (acceptedFiles.length > 0) {
          const file = acceptedFiles[0];
          setGymLogoFile(file);
          const reader = new FileReader();
          reader.onloadend = () => {
            setGymLogoPreview(reader.result as string);
          };
          reader.readAsDataURL(file);
        }
      },
    });

  const loadCoaches = useCallback(async () => {
    setLoadingCoaches(true);
    try {
      const response = await fetch("/api/roster");
      if (!response.ok) {
        throw new Error("Failed to load coaches");
      }
      const data = await response.json();
      const coachesList = data.roster.filter(
        (user: Coach) => user.role === "coach"
      );
      setCoaches(coachesList);
    } catch (err) {
      console.error("Failed to load coaches:", err);
    } finally {
      setLoadingCoaches(false);
    }
  }, []);

  const loadGym = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/gym");
      if (!response.ok) {
        throw new Error("Failed to load gym");
      }
      const data = await response.json();
      setGym(data.gym);
      setGymName(data.gym.name || "");
      setGymWebsite(data.gym.website || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load gym");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGym();
    loadCoaches();
  }, [loadGym, loadCoaches]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSaving(true);

    // Dispatch event for SiteHeader
    window.dispatchEvent(new CustomEvent("gym-settings-save-start"));

    try {
      let logoUrl = gym?.logoUrl || null;

      // Upload gym logo if provided
      if (gymLogoFile) {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();
        if (!authUser) {
          throw new Error("Not authenticated");
        }

        const fileExt = gymLogoFile.name.split(".").pop();
        const fileName = `${authUser.id}-${Date.now()}.${fileExt}`;
        const filePath = `logos/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("logos")
          .upload(filePath, gymLogoFile, {
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

      const gymResponse = await fetch("/api/gym", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: gymName,
          logoUrl,
          website: gymWebsite.trim() || null,
        }),
      });

      if (!gymResponse.ok) {
        throw new Error("Failed to save gym");
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      await loadGym(); // Reload to get updated data
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
      window.dispatchEvent(new CustomEvent("gym-settings-save-error"));
    } finally {
      setSaving(false);
      window.dispatchEvent(new CustomEvent("gym-settings-save-end"));
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
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return email[0].toUpperCase();
  }

  if (loading) {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
        <PageHeader title="Club Settings" />
        <div className="flex flex-1 items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  if (!gym) {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
        <PageHeader title="Club Settings" />
        <div className="flex flex-1 items-center justify-center">
          <p className="text-muted-foreground">Club not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <PageHeader
        description="Manage your club information"
        title="Club Settings"
      >
        <Button
          className="gap-2 rounded-xl"
          data-show-text-mobile
          disabled={saving}
          onClick={handleSave}
        >
          {success ? (
            <>
              <IconCheck className="h-4 w-4" />
              Saved
            </>
          ) : saving ? (
            <>
              <IconDeviceFloppy className="h-4 w-4" />
              Saving...
            </>
          ) : (
            <>
              <IconDeviceFloppy className="h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </PageHeader>

      <div className="min-h-0 flex-1 overflow-auto">
        <form
          className="mx-auto max-w-2xl space-y-6 p-4"
          id="gym-settings-form"
          onSubmit={handleSave}
        >
          {error && (
            <div className="rounded-xl bg-destructive/10 p-4 text-destructive text-sm">
              {error}
            </div>
          )}

          {/* Gym Logo Section */}
          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <IconBuilding className="h-5 w-5" />
                Club Logo
              </CardTitle>
              <CardDescription>Update your club's logo</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="relative">
                  {gymLogoPreview || gym.logoUrl ? (
                    <Image
                      alt="Club logo"
                      className="h-24 w-24 rounded-xl border-4 border-background object-cover shadow-lg"
                      height={96}
                      src={gymLogoPreview || gym.logoUrl || ""}
                      width={96}
                    />
                  ) : (
                    <div className="flex h-24 w-24 items-center justify-center rounded-xl border-4 border-background bg-muted shadow-lg">
                      <span className="font-bold text-3xl">
                        {gymName[0]?.toUpperCase() || "G"}
                      </span>
                    </div>
                  )}
                  <button
                    {...getLogoRootProps()}
                    className="absolute right-0 bottom-0 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-colors hover:bg-primary/90"
                    type="button"
                  >
                    <input {...getLogoInputProps()} />
                    <IconCamera className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex-1">
                  <p className="text-muted-foreground text-sm">
                    Click the camera icon to upload a new logo. Recommended
                    size: 512x512px
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Gym Information */}
          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle className="text-base">Club Information</CardTitle>
              <CardDescription>
                Update your club's basic information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm" htmlFor="gymName">
                  Club Name
                </Label>
                <Input
                  className="h-11 rounded-xl"
                  id="gymName"
                  onChange={(e) => setGymName(e.target.value)}
                  placeholder="Club Name"
                  required
                  value={gymName}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm" htmlFor="gymWebsite">
                  Website
                </Label>
                <Input
                  className="h-11 rounded-xl"
                  id="gymWebsite"
                  onChange={(e) => setGymWebsite(e.target.value)}
                  placeholder="https://example.com"
                  type="url"
                  value={gymWebsite}
                />
                <p className="text-muted-foreground text-xs">
                  Enter your club's website URL. This will be visible to all
                  members.
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
                <Dialog
                  onOpenChange={setIsAddCoachDialogOpen}
                  open={isAddCoachDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button className="gap-2 rounded-xl" size="sm">
                      <IconPlus className="h-4 w-4" />
                      Add Coach
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="rounded-xl">
                    <DialogHeader>
                      <DialogTitle>Invite Coach</DialogTitle>
                      <DialogDescription>
                        Send an invitation email to add a new coach to your
                        club.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleInviteCoach}>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="coachEmail">Email Address</Label>
                          <Input
                            className="h-11 rounded-xl"
                            id="coachEmail"
                            onChange={(e) => setCoachEmail(e.target.value)}
                            placeholder="coach@example.com"
                            required
                            type="email"
                            value={coachEmail}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          className="rounded-xl"
                          onClick={() => setIsAddCoachDialogOpen(false)}
                          type="button"
                          variant="outline"
                        >
                          Cancel
                        </Button>
                        <Button
                          className="rounded-xl"
                          disabled={invitingCoach}
                          type="submit"
                        >
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
                    <Skeleton className="h-16 w-full rounded-xl" key={i} />
                  ))}
                </div>
              ) : coaches.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <p>No coaches yet</p>
                  <p className="mt-1 text-sm">
                    Add coaches to help manage your club
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {coaches.map((coach) => (
                      <div
                        className="flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:bg-muted/50"
                        key={coach.id}
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={coach.avatarUrl || undefined} />
                          <AvatarFallback className="text-sm">
                            {getInitials(coach.name, coach.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-sm">
                            {coach.name || "No name"}
                          </p>
                          <div className="flex items-center gap-2 text-muted-foreground text-xs">
                            <IconMail className="h-3 w-3" />
                            <span className="truncate">{coach.email}</span>
                          </div>
                          {coach.phone && (
                            <div className="mt-1 flex items-center gap-2 text-muted-foreground text-xs">
                              <IconPhone className="h-3 w-3" />
                              <span>{coach.phone}</span>
                            </div>
                          )}
                        </div>
                        <Badge className="rounded-lg" variant="secondary">
                          Coach
                        </Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Save Button for PC View */}
          {!isMobile && (
            <div className="flex justify-end pt-4">
              <Button
                className="gap-2 rounded-xl"
                disabled={saving}
                onClick={handleSave}
              >
                {success ? (
                  <>
                    <IconCheck className="h-4 w-4" />
                    Saved
                  </>
                ) : saving ? (
                  <>
                    <IconDeviceFloppy className="h-4 w-4" />
                    Saving...
                  </>
                ) : (
                  <>
                    <IconDeviceFloppy className="h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
