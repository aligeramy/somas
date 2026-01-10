"use client";

import {
  IconBuilding,
  IconCamera,
  IconCheck,
  IconDeviceFloppy,
  IconKey,
} from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useGooglePlacesAutocomplete } from "@/hooks/use-google-places-autocomplete";
import { useIsMobile } from "@/hooks/use-mobile";
import { createClient } from "@/lib/supabase/client";

interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  address: string | null;
  altEmail: string | null;
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
  const isMobile = useIsMobile();
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
  const [altEmail, setAltEmail] = useState("");
  const [homePhone, setHomePhone] = useState("");
  const addressInputRef = useRef<HTMLInputElement>(null);

  useGooglePlacesAutocomplete(addressInputRef, (address) => {
    setAddress(address);
  });
  const [workPhone, setWorkPhone] = useState("");
  const [cellPhone, setCellPhone] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");
  const [emergencyContactRelationship, setEmergencyContactRelationship] =
    useState("");
  const [emergencyContactEmail, setEmergencyContactEmail] = useState("");
  const [medicalConditions, setMedicalConditions] = useState("");
  const [medications, setMedications] = useState("");
  const [allergies, setAllergies] = useState("");
  const [emailNotif, setEmailNotif] = useState(true);
  const [pushNotif, setPushNotif] = useState(true);
  const [reminders, setReminders] = useState(true);

  // Password change modal
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  // Avatar upload
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Gym settings fields (for head coaches)
  const [gymName, setGymName] = useState("");
  const [gymLogoFile, setGymLogoFile] = useState<File | null>(null);
  const [gymLogoPreview, setGymLogoPreview] = useState<string | null>(null);

  const {
    getRootProps: getAvatarRootProps,
    getInputProps: getAvatarInputProps,
  } = useDropzone({
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

  useEffect(() => {
    loadProfile();
    loadGym();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadProfile() {
    try {
      setLoading(true);
      const response = await fetch("/api/profile");
      if (!response.ok) {
        throw new Error("Failed to load profile");
      }
      const data = await response.json();
      setProfile(data.user);
      setName(data.user.name || "");
      setPhone(data.user.phone || "");
      setAddress(data.user.address || "");
      setAltEmail(data.user.altEmail || "");
      setHomePhone(data.user.homePhone || "");
      setWorkPhone(data.user.workPhone || "");
      setCellPhone(data.user.cellPhone || "");
      setEmergencyContactName(data.user.emergencyContactName || "");
      setEmergencyContactPhone(data.user.emergencyContactPhone || "");
      setEmergencyContactRelationship(
        data.user.emergencyContactRelationship || ""
      );
      setEmergencyContactEmail(data.user.emergencyContactEmail || "");
      setMedicalConditions(data.user.medicalConditions || "");
      setMedications(data.user.medications || "");
      setAllergies(data.user.allergies || "");
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
    } catch (_err) {
      // Not an error if user is not head coach
      console.log("Gym not accessible (user may not be head coach)");
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSaving(true);

    // Dispatch event for SiteHeader
    window.dispatchEvent(new CustomEvent("profile-save-start"));

    try {
      let avatarUrl = profile?.avatarUrl || null;

      // Upload avatar if provided
      if (avatarFile) {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();
        if (!authUser) {
          throw new Error("Not authenticated");
        }

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
          altEmail,
          homePhone,
          workPhone,
          cellPhone,
          emergencyContactName,
          emergencyContactPhone,
          emergencyContactRelationship,
          emergencyContactEmail,
          medicalConditions,
          medications,
          allergies,
          avatarUrl,
          notifPreferences: {
            email: emailNotif,
            push: pushNotif,
            reminders,
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save profile");
      }

      // Update gym settings if user is head coach
      if (profile?.role === "owner" && gym) {
        let logoUrl = gym.logoUrl || null;

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
          }),
        });

        if (!gymResponse.ok) {
          throw new Error("Failed to save gym settings");
        }
        await loadGym();
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      await loadProfile(); // Reload to get updated data

      // Dispatch event for SiteHeader
      window.dispatchEvent(new CustomEvent("profile-save-success"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
      window.dispatchEvent(new CustomEvent("profile-save-error"));
    } finally {
      setSaving(false);
      window.dispatchEvent(new CustomEvent("profile-save-end"));
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

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();

    // Validation
    if (!(newPassword && confirmPassword)) {
      toast.error("Please fill in all fields");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters long");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    setChangingPassword(true);

    try {
      // Update password - Supabase handles authentication internally
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        toast.error(updateError.message);
        return;
      }

      // Success - close modal and reset form
      setIsPasswordModalOpen(false);
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password changed successfully");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to change password"
      );
    } finally {
      setChangingPassword(false);
    }
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
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <PageHeader
        description={isMobile ? undefined : "Manage your account settings"}
        title="Profile"
      >
        <Button
          className="gap-2 rounded-sm"
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
          className={`${isMobile ? "px-0 pb-4" : "mx-auto max-w-2xl space-y-6 p-4"}`}
          id="profile-form"
          onSubmit={handleSave}
        >
          {error && (
            <div
              className={`bg-destructive/10 text-destructive ${isMobile ? "mx-4 mt-4 rounded-lg" : "rounded-xl"} p-4 text-sm`}
            >
              {error}
            </div>
          )}

          {/* Avatar Section */}
          {isMobile ? (
            <div className="border-border border-b bg-background px-4 py-2">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar className="h-16 w-16 border-2 border-background">
                    <AvatarImage
                      src={avatarPreview || profile.avatarUrl || undefined}
                    />
                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-lg">
                      {getInitials(profile.name, profile.email)}
                    </AvatarFallback>
                  </Avatar>
                  <button
                    {...getAvatarRootProps()}
                    className="absolute right-0 bottom-0 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-colors hover:bg-primary/90"
                    type="button"
                  >
                    <input {...getAvatarInputProps()} />
                    <IconCamera className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-base">
                    {profile.name || "Unnamed"}
                  </p>
                  <p className="truncate text-muted-foreground text-sm">
                    {profile.email}
                  </p>
                  <p className="mt-0.5 text-muted-foreground text-xs capitalize">
                    {profile.role === "owner" ? "Head Coach" : profile.role}
                  </p>
                </div>
                <Button
                  className="gap-2 rounded-sm"
                  onClick={() => setIsPasswordModalOpen(true)}
                  type="button"
                  variant="outline"
                >
                  <IconKey className="h-4 w-4" />
                  Change Password
                </Button>
              </div>
            </div>
          ) : (
            <Card className="rounded-xl">
              <CardContent className="py-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <Avatar className="h-20 w-20 border-4 border-background shadow-lg">
                        <AvatarImage
                          src={avatarPreview || profile.avatarUrl || undefined}
                        />
                        <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-xl">
                          {getInitials(profile.name, profile.email)}
                        </AvatarFallback>
                      </Avatar>
                      <button
                        {...getAvatarRootProps()}
                        className="absolute right-0 bottom-0 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-colors hover:bg-primary/90"
                        type="button"
                      >
                        <input {...getAvatarInputProps()} />
                        <IconCamera className="h-4 w-4" />
                      </button>
                    </div>
                    <div>
                      <p className="font-semibold text-lg">
                        {profile.name || "Unnamed"}
                      </p>
                      <p className="text-muted-foreground text-sm">
                        {profile.email}
                      </p>
                      <p className="mt-1 text-muted-foreground text-xs capitalize">
                        {profile.role === "owner" ? "Head Coach" : profile.role}
                      </p>
                    </div>
                  </div>
                  <Button
                    className="gap-2 rounded-xl"
                    onClick={() => setIsPasswordModalOpen(true)}
                    type="button"
                    variant="outline"
                  >
                    <IconKey className="h-4 w-4" />
                    Change Password
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Gym Settings (for head coaches only) */}
          {profile?.role === "owner" && gym && (
            <>
              {isMobile ? (
                <div className="mt-4">
                  <div className="px-4 py-2">
                    <h3 className="flex items-center gap-2 font-semibold text-foreground text-sm">
                      <IconBuilding className="h-4 w-4" />
                      Club Settings
                    </h3>
                  </div>
                  <Separator />
                  <div className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        {gymLogoPreview || gym.logoUrl ? (
                          <img
                            alt="Club logo"
                            className="h-16 w-16 rounded-lg border-2 border-background object-cover"
                            src={gymLogoPreview || gym.logoUrl || ""}
                          />
                        ) : (
                          <div className="flex h-16 w-16 items-center justify-center rounded-lg border-2 border-background bg-muted">
                            <span className="font-bold text-2xl">
                              {gymName[0]?.toUpperCase() || "G"}
                            </span>
                          </div>
                        )}
                        <button
                          {...getLogoRootProps()}
                          className="absolute right-0 bottom-0 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-colors hover:bg-primary/90"
                          type="button"
                        >
                          <input {...getLogoInputProps()} />
                          <IconCamera className="h-3 w-3" />
                        </button>
                      </div>
                      <div className="flex-1 space-y-2">
                        <Label
                          className="text-muted-foreground text-xs"
                          htmlFor="gymName"
                        >
                          Club Name
                        </Label>
                        <Input
                          className="h-11 rounded-sm"
                          id="gymName"
                          onChange={(e) => setGymName(e.target.value)}
                          placeholder="Club Name"
                          required
                          value={gymName}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <Card className="rounded-xl">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <IconBuilding className="h-5 w-5" />
                      Club Settings
                    </CardTitle>
                    <CardDescription>
                      Manage your club information
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Gym Logo and Name Section */}
                    <div className="flex items-end gap-4">
                      <div className="relative">
                        {gymLogoPreview || gym.logoUrl ? (
                          <img
                            alt="Club logo"
                            className="h-24 w-24 rounded-xl border-4 border-background object-cover shadow-lg"
                            src={gymLogoPreview || gym.logoUrl || ""}
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
                      <div className="flex-1 space-y-2">
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
                    </div>
                  </CardContent>
                </Card>
              )}
              {!isMobile && <Separator className="my-6" />}
            </>
          )}

          {/* Personal Information */}
          {isMobile ? (
            <div className="mt-4">
              <div className="px-4 py-2">
                <h3 className="font-semibold text-foreground text-sm">
                  Personal Information
                </h3>
              </div>
              <Separator />
              <div className="space-y-4 px-4 py-4">
                <div className="space-y-2">
                  <Label
                    className="text-muted-foreground text-xs"
                    htmlFor="name"
                  >
                    Athlete Name
                  </Label>
                  <Input
                    className="h-11 rounded-sm"
                    id="name"
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    value={name}
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    className="text-muted-foreground text-xs"
                    htmlFor="address"
                  >
                    Athlete Address
                  </Label>
                  <Input
                    autoComplete="off"
                    className="h-11 rounded-sm"
                    id="address"
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="123 Main St, City, Country"
                    ref={addressInputRef}
                    value={address}
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    className="text-muted-foreground text-xs"
                    htmlFor="altEmail"
                  >
                    Alternate Email
                  </Label>
                  <Input
                    className="h-11 rounded-sm"
                    id="altEmail"
                    onChange={(e) => setAltEmail(e.target.value)}
                    placeholder="Enter alternate email (optional)"
                    type="email"
                    value={altEmail}
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    className="text-muted-foreground text-xs"
                    htmlFor="phone"
                  >
                    Main Phone
                  </Label>
                  <Input
                    className="h-11 rounded-sm"
                    id="phone"
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    type="tel"
                    value={phone}
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    className="text-muted-foreground text-xs"
                    htmlFor="homePhone"
                  >
                    Home Phone Number
                  </Label>
                  <Input
                    className="h-11 rounded-sm"
                    id="homePhone"
                    onChange={(e) => setHomePhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    type="tel"
                    value={homePhone}
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    className="text-muted-foreground text-xs"
                    htmlFor="workPhone"
                  >
                    Work Phone Number
                  </Label>
                  <Input
                    className="h-11 rounded-sm"
                    id="workPhone"
                    onChange={(e) => setWorkPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    type="tel"
                    value={workPhone}
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    className="text-muted-foreground text-xs"
                    htmlFor="cellPhone"
                  >
                    Cell Number
                  </Label>
                  <Input
                    className="h-11 rounded-sm"
                    id="cellPhone"
                    onChange={(e) => setCellPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    type="tel"
                    value={cellPhone}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs">
                    Email Address
                  </Label>
                  <Input
                    className="h-11 rounded-sm bg-muted"
                    disabled
                    value={profile.email}
                  />
                </div>
              </div>
            </div>
          ) : (
            <Card className="rounded-xl">
              <CardHeader>
                <CardTitle className="text-base">
                  Personal Information
                </CardTitle>
                <CardDescription>Update your personal details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm" htmlFor="name">
                    Athlete Name
                  </Label>
                  <Input
                    className="h-11 rounded-xl"
                    id="name"
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    value={name}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm" htmlFor="address">
                    Athlete Address
                  </Label>
                  <Input
                    autoComplete="off"
                    className="h-11 rounded-xl"
                    id="address"
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="123 Main St, City, Country"
                    ref={addressInputRef}
                    value={address}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm" htmlFor="altEmail">
                    Alternate Email
                  </Label>
                  <Input
                    className="h-11 rounded-xl"
                    id="altEmail"
                    onChange={(e) => setAltEmail(e.target.value)}
                    placeholder="Enter alternate email (optional)"
                    type="email"
                    value={altEmail}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-sm" htmlFor="phone">
                      Main Phone
                    </Label>
                    <Input
                      className="h-11 rounded-xl"
                      id="phone"
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      type="tel"
                      value={phone}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm" htmlFor="homePhone">
                      Home Phone Number
                    </Label>
                    <Input
                      className="h-11 rounded-xl"
                      id="homePhone"
                      onChange={(e) => setHomePhone(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      type="tel"
                      value={homePhone}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm" htmlFor="workPhone">
                      Work Phone Number
                    </Label>
                    <Input
                      className="h-11 rounded-xl"
                      id="workPhone"
                      onChange={(e) => setWorkPhone(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      type="tel"
                      value={workPhone}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm" htmlFor="cellPhone">
                      Cell Number
                    </Label>
                    <Input
                      className="h-11 rounded-xl"
                      id="cellPhone"
                      onChange={(e) => setCellPhone(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      type="tel"
                      value={cellPhone}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Email Address</Label>
                  <Input
                    className="h-11 rounded-xl bg-muted"
                    disabled
                    value={profile.email}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Emergency Contact Information */}
          {isMobile ? (
            <div className="mt-4">
              <div className="px-4 py-2">
                <h3 className="font-semibold text-foreground text-sm">
                  Emergency Contact
                </h3>
              </div>
              <Separator />
              <div className="space-y-4 px-4 py-4">
                <div className="space-y-2">
                  <Label
                    className="text-muted-foreground text-xs"
                    htmlFor="emergencyContactName"
                  >
                    Emergency Contact Name
                  </Label>
                  <Input
                    className="h-11 rounded-sm"
                    id="emergencyContactName"
                    onChange={(e) => setEmergencyContactName(e.target.value)}
                    placeholder="Jane Doe"
                    value={emergencyContactName}
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    className="text-muted-foreground text-xs"
                    htmlFor="emergencyContactPhone"
                  >
                    Emergency Contact Phone
                  </Label>
                  <Input
                    className="h-11 rounded-sm"
                    id="emergencyContactPhone"
                    onChange={(e) => setEmergencyContactPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    type="tel"
                    value={emergencyContactPhone}
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    className="text-muted-foreground text-xs"
                    htmlFor="emergencyContactRelationship"
                  >
                    Relationship to Athlete
                  </Label>
                  <Input
                    className="h-11 rounded-sm"
                    id="emergencyContactRelationship"
                    onChange={(e) =>
                      setEmergencyContactRelationship(e.target.value)
                    }
                    placeholder="Parent, Guardian, etc."
                    value={emergencyContactRelationship}
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    className="text-muted-foreground text-xs"
                    htmlFor="emergencyContactEmail"
                  >
                    Emergency Contact Email Address
                  </Label>
                  <Input
                    className="h-11 rounded-sm"
                    id="emergencyContactEmail"
                    onChange={(e) => setEmergencyContactEmail(e.target.value)}
                    placeholder="contact@example.com"
                    type="email"
                    value={emergencyContactEmail}
                  />
                </div>
              </div>
            </div>
          ) : (
            <Card className="rounded-xl">
              <CardHeader>
                <CardTitle className="text-base">Emergency Contact</CardTitle>
                <CardDescription>Emergency contact information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm" htmlFor="emergencyContactName">
                    Emergency Contact Name
                  </Label>
                  <Input
                    className="h-11 rounded-xl"
                    id="emergencyContactName"
                    onChange={(e) => setEmergencyContactName(e.target.value)}
                    placeholder="Jane Doe"
                    value={emergencyContactName}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-sm" htmlFor="emergencyContactPhone">
                      Emergency Contact Phone
                    </Label>
                    <Input
                      className="h-11 rounded-xl"
                      id="emergencyContactPhone"
                      onChange={(e) => setEmergencyContactPhone(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      type="tel"
                      value={emergencyContactPhone}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      className="text-sm"
                      htmlFor="emergencyContactRelationship"
                    >
                      Relationship to Athlete
                    </Label>
                    <Input
                      className="h-11 rounded-xl"
                      id="emergencyContactRelationship"
                      onChange={(e) =>
                        setEmergencyContactRelationship(e.target.value)
                      }
                      placeholder="Parent, Guardian, etc."
                      value={emergencyContactRelationship}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm" htmlFor="emergencyContactEmail">
                    Emergency Contact Email Address
                  </Label>
                  <Input
                    className="h-11 rounded-xl"
                    id="emergencyContactEmail"
                    onChange={(e) => setEmergencyContactEmail(e.target.value)}
                    placeholder="contact@example.com"
                    type="email"
                    value={emergencyContactEmail}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Medical Information */}
          {isMobile ? (
            <div className="mt-4">
              <div className="px-4 py-2">
                <h3 className="font-semibold text-foreground text-sm">
                  Medical Information
                </h3>
              </div>
              <Separator />
              <div className="space-y-4 px-4 py-4">
                <div className="space-y-2">
                  <Label
                    className="text-muted-foreground text-xs"
                    htmlFor="medicalConditions"
                  >
                    Medical Conditions
                  </Label>
                  <Input
                    className="h-11 rounded-sm"
                    id="medicalConditions"
                    onChange={(e) => setMedicalConditions(e.target.value)}
                    placeholder="e.g., Diabetes, Asthma, etc. (or None)"
                    value={medicalConditions}
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    className="text-muted-foreground text-xs"
                    htmlFor="medications"
                  >
                    Current Medications
                  </Label>
                  <Input
                    className="h-11 rounded-sm"
                    id="medications"
                    onChange={(e) => setMedications(e.target.value)}
                    placeholder="List any medications currently being taken (or None)"
                    value={medications}
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    className="text-muted-foreground text-xs"
                    htmlFor="allergies"
                  >
                    Allergies
                  </Label>
                  <Input
                    className="h-11 rounded-sm"
                    id="allergies"
                    onChange={(e) => setAllergies(e.target.value)}
                    placeholder="e.g., Latex, Peanuts, etc. (or None)"
                    value={allergies}
                  />
                </div>
              </div>
            </div>
          ) : (
            <Card className="rounded-xl">
              <CardHeader>
                <CardTitle className="text-base">Medical Information</CardTitle>
                <CardDescription>
                  Important health information for coaches and emergency
                  responders
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm" htmlFor="medicalConditions">
                    Medical Conditions
                  </Label>
                  <Input
                    className="h-11 rounded-xl"
                    id="medicalConditions"
                    onChange={(e) => setMedicalConditions(e.target.value)}
                    placeholder="e.g., Diabetes, Asthma, etc. (or None)"
                    value={medicalConditions}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm" htmlFor="medications">
                    Current Medications
                  </Label>
                  <Input
                    className="h-11 rounded-xl"
                    id="medications"
                    onChange={(e) => setMedications(e.target.value)}
                    placeholder="List any medications currently being taken (or None)"
                    value={medications}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm" htmlFor="allergies">
                    Allergies
                  </Label>
                  <Input
                    className="h-11 rounded-xl"
                    id="allergies"
                    onChange={(e) => setAllergies(e.target.value)}
                    placeholder="e.g., Latex, Peanuts, etc. (or None)"
                    value={allergies}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notification Preferences */}
          {isMobile ? (
            <div className="mt-4">
              <div className="px-4 py-2">
                <h3 className="font-semibold text-foreground text-sm">
                  Notifications
                </h3>
              </div>
              <Separator />
              <div className="space-y-0 divide-y divide-border">
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm">Email Notifications</p>
                    <p className="mt-0.5 text-muted-foreground text-xs">
                      Receive updates via email
                    </p>
                  </div>
                  <Switch
                    checked={emailNotif}
                    onCheckedChange={setEmailNotif}
                  />
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm">Push Notifications</p>
                    <p className="mt-0.5 text-muted-foreground text-xs">
                      Receive push notifications on your device
                    </p>
                  </div>
                  <Switch checked={pushNotif} onCheckedChange={setPushNotif} />
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm">Event Reminders</p>
                    <p className="mt-0.5 text-muted-foreground text-xs">
                      Get reminded 2 hours before events
                    </p>
                  </div>
                  <Switch checked={reminders} onCheckedChange={setReminders} />
                </div>
              </div>
            </div>
          ) : (
            <Card className="rounded-xl">
              <CardHeader>
                <CardTitle className="text-base">Notifications</CardTitle>
                <CardDescription>
                  Choose how you want to be notified
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-xl bg-muted/50 p-3">
                  <div>
                    <p className="font-medium text-sm">Email Notifications</p>
                    <p className="text-muted-foreground text-xs">
                      Receive updates via email
                    </p>
                  </div>
                  <Switch
                    checked={emailNotif}
                    onCheckedChange={setEmailNotif}
                  />
                </div>
                <div className="flex items-center justify-between rounded-xl bg-muted/50 p-3">
                  <div>
                    <p className="font-medium text-sm">Push Notifications</p>
                    <p className="text-muted-foreground text-xs">
                      Receive push notifications on your device
                    </p>
                  </div>
                  <Switch checked={pushNotif} onCheckedChange={setPushNotif} />
                </div>
                <div className="flex items-center justify-between rounded-xl bg-muted/50 p-3">
                  <div>
                    <p className="font-medium text-sm">Event Reminders</p>
                    <p className="text-muted-foreground text-xs">
                      Get reminded 2 hours before events
                    </p>
                  </div>
                  <Switch checked={reminders} onCheckedChange={setReminders} />
                </div>
              </CardContent>
            </Card>
          )}

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

      {/* Password Change Modal */}
      <Dialog onOpenChange={setIsPasswordModalOpen} open={isPasswordModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Enter a new password for your account (minimum 8 characters)
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleChangePassword}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  autoComplete="new-password"
                  className="h-11 rounded-xl"
                  id="newPassword"
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min. 8 characters)"
                  required
                  type="password"
                  value={newPassword}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  autoComplete="new-password"
                  className="h-11 rounded-xl"
                  id="confirmPassword"
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                  type="password"
                  value={confirmPassword}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                disabled={changingPassword}
                onClick={() => {
                  setIsPasswordModalOpen(false);
                  setNewPassword("");
                  setConfirmPassword("");
                }}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <Button disabled={changingPassword} type="submit">
                {changingPassword ? "Changing..." : "Change Password"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
