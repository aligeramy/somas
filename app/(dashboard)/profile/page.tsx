"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/page-header";
import { IconCamera, IconCheck, IconBuilding } from "@tabler/icons-react";
import { useDropzone } from "react-dropzone";
import { createClient } from "@/lib/supabase/client";

interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  address: string | null;
  avatarUrl: string | null;
  role: string;
  notifPreferences: {
    email?: boolean;
    push?: boolean;
    reminders?: boolean;
  };
}

interface GymProfile {
  id: string;
  name: string;
  logoUrl: string | null;
}

export default function ProfilePage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [gym, setGym] = useState<GymProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [emailNotif, setEmailNotif] = useState(true);
  const [pushNotif, setPushNotif] = useState(true);
  const [reminders, setReminders] = useState(true);
  
  // Avatar upload
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Gym settings fields (for owners)
  const [gymName, setGymName] = useState("");
  const [gymLogoFile, setGymLogoFile] = useState<File | null>(null);
  const [gymLogoPreview, setGymLogoPreview] = useState<string | null>(null);

  const { getRootProps: getAvatarRootProps, getInputProps: getAvatarInputProps } = useDropzone({
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"],
    },
    maxFiles: 1,
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        setAvatarFile(file);
        const reader = new FileReader();
        reader.onloadend = () => {
          setAvatarPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    },
  });

  const { getRootProps: getLogoRootProps, getInputProps: getLogoInputProps } = useDropzone({
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

  useEffect(() => {
    loadProfile();
    loadGym();
  }, []);

  async function loadProfile() {
    try {
      setLoading(true);
      const response = await fetch("/api/profile");
      if (!response.ok) throw new Error("Failed to load profile");
      const data = await response.json();
      setProfile(data.user);
      setName(data.user.name || "");
      setPhone(data.user.phone || "");
      setAddress(data.user.address || "");
      setEmailNotif(data.user.notifPreferences?.email ?? true);
      setPushNotif(data.user.notifPreferences?.push ?? true);
      setReminders(data.user.notifPreferences?.reminders ?? true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }

  async function loadGym() {
    try {
      const response = await fetch("/api/gym");
      if (response.ok) {
        const data = await response.json();
        setGym(data.gym);
        setGymName(data.gym.name || "");
      }
    } catch (err) {
      // Not an error if user is not owner
      console.log("Gym not accessible (user may not be owner)");
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSaving(true);

    try {
      let avatarUrl = profile?.avatarUrl || null;

      // Upload avatar if provided
      if (avatarFile) {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();
        if (!authUser) throw new Error("Not authenticated");

        const fileExt = avatarFile.name.split(".").pop();
        const fileName = `${authUser.id}-${Date.now()}.${fileExt}`;
        const filePath = `avatars/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(filePath, avatarFile, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          throw new Error(`Failed to upload avatar: ${uploadError.message}`);
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("avatars").getPublicUrl(filePath);
        avatarUrl = publicUrl;
      }

      // Update user profile
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          address,
          avatarUrl,
          notifPreferences: {
            email: emailNotif,
            push: pushNotif,
            reminders: reminders,
          },
        }),
      });

      if (!response.ok) throw new Error("Failed to save profile");

      // Update gym settings if user is owner
      if (profile?.role === "owner" && gym) {
        let logoUrl = gym.logoUrl || null;

        // Upload gym logo if provided
        if (gymLogoFile) {
          const {
            data: { user: authUser },
          } = await supabase.auth.getUser();
          if (!authUser) throw new Error("Not authenticated");

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
          }),
        });

        if (!gymResponse.ok) throw new Error("Failed to save gym settings");
        await loadGym();
      }
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      await loadProfile(); // Reload to get updated data
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
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
      <div className="flex flex-1 flex-col">
        <PageHeader title="Profile" />
        <div className="flex flex-1 items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-1 flex-col">
        <PageHeader title="Profile" />
        <div className="flex flex-1 items-center justify-center">
          <p className="text-muted-foreground">Profile not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col min-h-0 h-full overflow-hidden">
      <PageHeader title="Profile" description="Manage your account settings">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
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

          {/* Avatar Section */}
          <Card className="rounded-xl">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar className="h-20 w-20 border-4 border-background shadow-lg">
                    <AvatarImage src={avatarPreview || profile.avatarUrl || undefined} />
                    <AvatarFallback className="text-xl bg-gradient-to-br from-primary/20 to-primary/5">
                      {getInitials(profile.name, profile.email)}
                    </AvatarFallback>
                  </Avatar>
                  <button
                    {...getAvatarRootProps()}
                    className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors cursor-pointer"
                  >
                    <input {...getAvatarInputProps()} />
                    <IconCamera className="h-4 w-4" />
                  </button>
                </div>
                <div>
                  <p className="font-semibold text-lg">{profile.name || "Unnamed"}</p>
                  <p className="text-sm text-muted-foreground">{profile.email}</p>
                  <p className="text-xs text-muted-foreground capitalize mt-1">{profile.role}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Personal Information */}
          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle className="text-base">Personal Information</CardTitle>
              <CardDescription>Update your personal details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm">Full Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    className="rounded-xl h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="rounded-xl h-11"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address" className="text-sm">Address</Label>
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="123 Main St, City, Country"
                  className="rounded-xl h-11"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Email</Label>
                <Input
                  value={profile.email}
                  disabled
                  className="rounded-xl h-11 bg-muted"
                />
              </div>
            </CardContent>
          </Card>

          {/* Notification Preferences */}
          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle className="text-base">Notifications</CardTitle>
              <CardDescription>Choose how you want to be notified</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                <div>
                  <p className="font-medium text-sm">Email Notifications</p>
                  <p className="text-xs text-muted-foreground">Receive updates via email</p>
                </div>
                <Switch checked={emailNotif} onCheckedChange={setEmailNotif} />
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                <div>
                  <p className="font-medium text-sm">Push Notifications</p>
                  <p className="text-xs text-muted-foreground">Receive push notifications on your device</p>
                </div>
                <Switch checked={pushNotif} onCheckedChange={setPushNotif} />
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                <div>
                  <p className="font-medium text-sm">Event Reminders</p>
                  <p className="text-xs text-muted-foreground">Get reminded 2 hours before events</p>
                </div>
                <Switch checked={reminders} onCheckedChange={setReminders} />
              </div>
            </CardContent>
          </Card>

          {/* Gym Settings (for owners only) */}
          {profile?.role === "owner" && gym && (
            <>
              <Card className="rounded-xl">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <IconBuilding className="h-5 w-5" />
                    Gym Settings
                  </CardTitle>
                  <CardDescription>Manage your gym information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Gym Logo Section */}
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      {gymLogoPreview || gym.logoUrl ? (
                        <img
                          src={gymLogoPreview || gym.logoUrl || ""}
                          alt="Gym logo"
                          className="h-24 w-24 rounded-xl border-4 border-background shadow-lg object-cover"
                        />
                      ) : (
                        <div className="h-24 w-24 rounded-xl border-4 border-background shadow-lg bg-muted flex items-center justify-center">
                          <span className="text-3xl font-bold">
                            {gymName[0]?.toUpperCase() || "G"}
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

                  {/* Gym Name */}
                  <div className="space-y-2">
                    <Label htmlFor="gymName" className="text-sm">Gym Name</Label>
                    <Input
                      id="gymName"
                      value={gymName}
                      onChange={(e) => setGymName(e.target.value)}
                      placeholder="Gym Name"
                      className="rounded-xl h-11"
                      required
                    />
                  </div>
                </CardContent>
              </Card>
              <Separator className="my-6" />
            </>
          )}

        </div>
      </div>
    </div>
  );
}

