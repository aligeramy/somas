"use client";

import {
  IconAlertCircle,
  IconCalendar,
  IconCamera,
  IconCheck,
  IconDeviceFloppy,
  IconDeviceMobile,
  IconHome,
  IconLoader2,
  IconMail,
  IconMapPin,
  IconMedicalCross,
  IconPhone,
  IconPill,
  IconUser,
  IconUserCircle,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useGooglePlacesAutocomplete } from "@/hooks/use-google-places-autocomplete";
import { createClient } from "@/lib/supabase/client";

export default function ProfileSetupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [altEmail, setAltEmail] = useState("");
  const [homePhone, setHomePhone] = useState("");
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
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true); // Start as true to show loading state immediately
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addressInputRef = useRef<HTMLInputElement>(null);
  const retryCountRef = useRef(0);
  const supabaseRef = useRef(createClient());

  useGooglePlacesAutocomplete(addressInputRef, (address) => {
    setAddress(address);
  });

  // Wait for Supabase session to be ready before doing anything
  useEffect(() => {
    const supabase = supabaseRef.current;

    console.log(
      "[ProfileSetup] Component mounted, setting up auth listener..."
    );

    // Check initial session state
    const checkSession = async () => {
      console.log("[ProfileSetup] Checking initial session...");
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.error("[ProfileSetup] Error getting session:", error);
      }

      if (session) {
        console.log(
          "[ProfileSetup] Session found on mount:",
          session.user.email
        );
        setSessionReady(true);
      } else {
        console.log(
          "[ProfileSetup] No session on mount, waiting for auth state change..."
        );
      }
    };

    checkSession();

    // Listen for auth state changes - this is crucial for post-login redirects
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(
        "[ProfileSetup] Auth state changed:",
        event,
        session?.user?.email || "no user"
      );

      if (
        event === "SIGNED_IN" ||
        event === "TOKEN_REFRESHED" ||
        event === "INITIAL_SESSION"
      ) {
        if (session) {
          console.log("[ProfileSetup] Session ready via auth state change");
          setSessionReady(true);
        }
      } else if (event === "SIGNED_OUT") {
        console.log("[ProfileSetup] User signed out, redirecting to login");
        router.push("/login");
      }
    });

    return () => {
      console.log("[ProfileSetup] Cleaning up auth listener");
      subscription.unsubscribe();
    };
  }, [router]);

  const loadUserProfile = useCallback(async () => {
    if (!sessionReady) {
      console.log(
        "[ProfileSetup] Session not ready yet, skipping profile load"
      );
      return;
    }

    console.log("[ProfileSetup] Loading user profile...");

    try {
      setLoadingProfile(true);
      const response = await fetch("/api/profile");

      console.log(
        "[ProfileSetup] Profile API response status:",
        response.status
      );

      if (response.status === 401) {
        console.log(
          "[ProfileSetup] Got 401, retry count:",
          retryCountRef.current
        );
        if (retryCountRef.current < 3) {
          // Session not ready yet, retry after a short delay
          retryCountRef.current += 1;
          console.log("[ProfileSetup] Retrying profile load in 500ms...");
          setTimeout(() => {
            loadUserProfile();
          }, 500);
          return;
        }
        // After retries exhausted, redirect to login
        console.log("[ProfileSetup] Retries exhausted, redirecting to login");
        router.push("/login");
        return;
      }

      if (response.ok) {
        const data = await response.json();
        console.log(
          "[ProfileSetup] Profile loaded successfully:",
          data.user?.name || "no name"
        );

        // Pre-populate fields if user already has data (from invitation)
        if (data.user.name) {
          setName(data.user.name);
        }
        if (data.user.phone) {
          setPhone(data.user.phone);
        }
        if (data.user.address) {
          setAddress(data.user.address);
        }
        if (data.user.altEmail) {
          setAltEmail(data.user.altEmail);
        }
        if (data.user.homePhone) {
          setHomePhone(data.user.homePhone);
        }
        if (data.user.workPhone) {
          setWorkPhone(data.user.workPhone);
        }
        if (data.user.cellPhone) {
          setCellPhone(data.user.cellPhone);
        }
        if (data.user.emergencyContactName) {
          setEmergencyContactName(data.user.emergencyContactName);
        }
        if (data.user.emergencyContactPhone) {
          setEmergencyContactPhone(data.user.emergencyContactPhone);
        }
        if (data.user.emergencyContactRelationship) {
          setEmergencyContactRelationship(
            data.user.emergencyContactRelationship
          );
        }
        if (data.user.emergencyContactEmail) {
          setEmergencyContactEmail(data.user.emergencyContactEmail);
        }
        if (data.user.medicalConditions) {
          setMedicalConditions(data.user.medicalConditions);
        }
        if (data.user.medications) {
          setMedications(data.user.medications);
        }
        if (data.user.allergies) {
          setAllergies(data.user.allergies);
        }
        if (data.user.dateOfBirth) {
          setDateOfBirth(
            new Date(data.user.dateOfBirth).toISOString().split("T")[0]
          );
        }
        if (data.user.avatarUrl) {
          setAvatarPreview(data.user.avatarUrl);
        }
        retryCountRef.current = 0; // Reset on success
      } else if (response.status === 404) {
        // User not found in database - this is okay, they can still fill out the form
        // The API will create the user when they submit
        console.log(
          "[ProfileSetup] User not found in DB (404), form will be empty"
        );
        retryCountRef.current = 0;
      } else {
        console.log(
          "[ProfileSetup] Unexpected response status:",
          response.status
        );
        if (retryCountRef.current < 3) {
          // If response is not ok, try retrying once after a delay
          retryCountRef.current += 1;
          console.log("[ProfileSetup] Retrying profile load in 1000ms...");
          setTimeout(() => {
            loadUserProfile();
          }, 1000);
          return;
        }
      }
    } catch (err) {
      console.error("[ProfileSetup] Error loading profile:", err);
      // Retry on error if we haven't exceeded retry limit
      if (retryCountRef.current < 3) {
        retryCountRef.current += 1;
        console.log("[ProfileSetup] Retrying after error in 1000ms...");
        setTimeout(() => {
          loadUserProfile();
        }, 1000);
        return;
      }
      console.log(
        "[ProfileSetup] Could not load existing profile - form will still be available"
      );
    } finally {
      setLoadingProfile(false);
    }
  }, [sessionReady, router]);

  // Load profile when session becomes ready
  useEffect(() => {
    if (sessionReady) {
      console.log("[ProfileSetup] Session ready, triggering profile load");
      loadUserProfile();
    }
  }, [sessionReady, loadUserProfile]);

  function handleAvatarClick() {
    fileInputRef.current?.click();
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    console.log("[ProfileSetup] Submitting profile...");

    try {
      const supabase = supabaseRef.current;
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      let avatarUrl = null;

      // Upload avatar if provided
      if (avatarFile) {
        const fileExt = avatarFile.name.split(".").pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const filePath = `avatars/${fileName}`;

        console.log("[ProfileSetup] Uploading avatar:", filePath);

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

      // Helper to convert empty strings to null
      const toNull = (value: string | null | undefined) => {
        if (!value || value.trim() === "") {
          return null;
        }
        return value.trim();
      };

      // Update user profile
      const response = await fetch("/api/profile-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: toNull(phone),
          address: toNull(address),
          altEmail: toNull(altEmail),
          homePhone: toNull(homePhone),
          workPhone: toNull(workPhone),
          cellPhone: toNull(cellPhone),
          emergencyContactName: toNull(emergencyContactName),
          emergencyContactPhone: toNull(emergencyContactPhone),
          emergencyContactRelationship: toNull(emergencyContactRelationship),
          emergencyContactEmail: toNull(emergencyContactEmail),
          medicalConditions: toNull(medicalConditions),
          medications: toNull(medications),
          allergies: toNull(allergies),
          dateOfBirth: toNull(dateOfBirth),
          avatarUrl: toNull(avatarUrl),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to update profile");
      }

      console.log("[ProfileSetup] Profile saved successfully");
      setSuccess(true);
      setTimeout(() => {
        router.push("/dashboard");
      }, 1000);
    } catch (err) {
      console.error("[ProfileSetup] Error saving profile:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
      setLoading(false);
      setSuccess(false);
    }
  }

  // Show loading state while waiting for session
  if (!sessionReady) {
    console.log("[ProfileSetup] Rendering: waiting for session");
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col items-center justify-center overflow-hidden">
        <div className="flex flex-col items-center gap-4">
          <IconLoader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading your session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <PageHeader
        description={
          loadingProfile
            ? "Loading your existing profile..."
            : "Set up your profile to get started with SOMAS. You can edit any pre-filled information."
        }
        title="Complete Your Profile"
      >
        <Button
          className="gap-2 rounded-sm md:rounded-xl"
          disabled={loading || !name}
          onClick={(e) => {
            e.preventDefault();
            const form = document.getElementById(
              "profile-setup-form"
            ) as HTMLFormElement;
            form?.requestSubmit();
          }}
        >
          {loading ? (
            <>
              <IconDeviceFloppy className="h-4 w-4" />
              <span className="hidden md:inline">Saving...</span>
            </>
          ) : success ? (
            <>
              <IconCheck className="h-4 w-4" />
              <span className="hidden md:inline">Saved</span>
            </>
          ) : (
            <>
              <IconDeviceFloppy className="h-4 w-4" />
              <span className="hidden md:inline">Complete Profile</span>
            </>
          )}
        </Button>
      </PageHeader>

      <div className="min-h-0 flex-1 overflow-auto">
        <div className="mx-auto max-w-4xl space-y-4 px-4 py-3 pb-24 md:space-y-6 md:px-6 md:py-4 md:pb-8">
          <form
            className="mb-4 space-y-4 md:mb-8 md:space-y-6"
            id="profile-setup-form"
            onSubmit={handleSubmit}
          >
            {error && (
              <div className="rounded-xl bg-destructive/10 p-3 text-destructive text-sm md:p-4">
                {error}
              </div>
            )}

            {/* Profile Picture Section */}
            <div className="flex w-full flex-col items-center justify-center py-4 md:py-6">
              <div className="flex w-full flex-col items-center justify-center gap-3 md:gap-4">
                <button
                  className="group relative mx-auto cursor-pointer rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  onClick={handleAvatarClick}
                  type="button"
                >
                  <div className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-border bg-muted shadow-lg md:h-28 md:w-28">
                    {avatarPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        alt="Profile"
                        className="h-full w-full object-cover"
                        src={avatarPreview}
                      />
                    ) : (
                      <IconUserCircle className="h-12 w-12 text-muted-foreground md:h-14 md:w-14" />
                    )}
                    <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60 opacity-0 transition-opacity group-hover:opacity-100 group-active:opacity-100">
                      <IconCamera className="h-6 w-6 text-white md:h-7 md:w-7" />
                    </div>
                  </div>
                </button>
                <div className="w-full text-center">
                  <p className="font-medium text-sm md:text-base">
                    Upload Profile Picture
                  </p>
                  <p className="mt-1 text-muted-foreground text-xs md:text-sm">
                    Tap to change
                  </p>
                </div>
                <input
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                  ref={fileInputRef}
                  type="file"
                />
              </div>
            </div>

            {/* Basic Information */}
            <div className="space-y-3 py-4 md:space-y-4 md:py-6">
              <div className="flex items-center gap-2 md:gap-3">
                <hr className="w-6 border-border md:w-8" />
                <h3 className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
                  Basic Information
                </h3>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-3">
                <div className="space-y-1.5 md:space-y-2">
                  <Label
                    className="flex items-center gap-1.5 text-sm md:gap-2 md:text-base"
                    htmlFor="name"
                  >
                    <IconUser className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    Name *
                  </Label>
                  <div className="relative">
                    <IconUser className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground md:left-3 md:h-4 md:w-4" />
                    <Input
                      className="h-11 pl-8 text-sm md:h-11 md:pl-9 md:text-base"
                      id="name"
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your name"
                      required
                      value={name}
                    />
                  </div>
                </div>

                <div className="space-y-1.5 md:space-y-2">
                  <Label
                    className="flex items-center gap-1.5 text-sm md:gap-2 md:text-base"
                    htmlFor="dateOfBirth"
                  >
                    <IconCalendar className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    Date of Birth
                  </Label>
                  <DatePicker
                    className="h-11 w-full text-sm md:h-11 md:text-base"
                    id="dateOfBirth"
                    onChange={setDateOfBirth}
                    placeholder="Select date of birth"
                    value={dateOfBirth}
                  />
                </div>

                <div className="space-y-1.5 md:space-y-2 lg:col-start-1">
                  <Label
                    className="flex items-center gap-1.5 text-sm md:gap-2 md:text-base"
                    htmlFor="altEmail"
                  >
                    <IconMail className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    Alternate Email
                  </Label>
                  <div className="relative">
                    <IconMail className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground md:left-3 md:h-4 md:w-4" />
                    <Input
                      className="h-11 pl-8 text-sm md:h-11 md:pl-9 md:text-base"
                      id="altEmail"
                      onChange={(e) => setAltEmail(e.target.value)}
                      placeholder="Enter alternate email (optional)"
                      type="email"
                      value={altEmail}
                    />
                  </div>
                </div>

                <div className="space-y-1.5 md:col-span-2 md:space-y-2 lg:col-span-2">
                  <Label
                    className="flex items-center gap-1.5 text-sm md:gap-2 md:text-base"
                    htmlFor="address"
                  >
                    <IconMapPin className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    Address
                  </Label>
                  <div className="relative">
                    <IconMapPin className="absolute top-1/2 left-2.5 z-10 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground md:left-3 md:h-4 md:w-4" />
                    <Input
                      autoComplete="off"
                      className="h-11 pl-8 text-sm md:h-11 md:pl-9 md:text-base"
                      id="address"
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Enter your address"
                      ref={addressInputRef}
                      value={address}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-3 py-4 md:space-y-4 md:py-6">
              <div className="flex items-center gap-2 md:gap-3">
                <hr className="w-6 border-border md:w-8" />
                <h3 className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
                  Contact Information
                </h3>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-4">
                <div className="space-y-1.5 md:space-y-2">
                  <Label
                    className="flex items-center gap-1.5 text-sm md:gap-2 md:text-base"
                    htmlFor="phone"
                  >
                    <IconPhone className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    Phone
                  </Label>
                  <div className="relative">
                    <IconPhone className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground md:left-3 md:h-4 md:w-4" />
                    <Input
                      className="h-11 pl-8 text-sm md:h-11 md:pl-9 md:text-base"
                      id="phone"
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Enter your phone number"
                      type="tel"
                      value={phone}
                    />
                  </div>
                </div>

                <div className="space-y-1.5 md:space-y-2">
                  <Label
                    className="flex items-center gap-1.5 text-sm md:gap-2 md:text-base"
                    htmlFor="homePhone"
                  >
                    <IconHome className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    Home Phone
                  </Label>
                  <div className="relative">
                    <IconHome className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground md:left-3 md:h-4 md:w-4" />
                    <Input
                      className="h-11 pl-8 text-sm md:h-11 md:pl-9 md:text-base"
                      id="homePhone"
                      onChange={(e) => setHomePhone(e.target.value)}
                      placeholder="Enter your home phone"
                      type="tel"
                      value={homePhone}
                    />
                  </div>
                </div>

                <div className="space-y-1.5 md:space-y-2">
                  <Label
                    className="flex items-center gap-1.5 text-sm md:gap-2 md:text-base"
                    htmlFor="workPhone"
                  >
                    <IconPhone className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    Work Phone
                  </Label>
                  <div className="relative">
                    <IconPhone className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground md:left-3 md:h-4 md:w-4" />
                    <Input
                      className="h-11 pl-8 text-sm md:h-11 md:pl-9 md:text-base"
                      id="workPhone"
                      onChange={(e) => setWorkPhone(e.target.value)}
                      placeholder="Enter your work phone"
                      type="tel"
                      value={workPhone}
                    />
                  </div>
                </div>

                <div className="space-y-1.5 md:space-y-2">
                  <Label
                    className="flex items-center gap-1.5 text-sm md:gap-2 md:text-base"
                    htmlFor="cellPhone"
                  >
                    <IconDeviceMobile className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    Cell Phone
                  </Label>
                  <div className="relative">
                    <IconDeviceMobile className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground md:left-3 md:h-4 md:w-4" />
                    <Input
                      className="h-11 pl-8 text-sm md:h-11 md:pl-9 md:text-base"
                      id="cellPhone"
                      onChange={(e) => setCellPhone(e.target.value)}
                      placeholder="Enter your cell phone"
                      type="tel"
                      value={cellPhone}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="space-y-3 py-4 md:space-y-4 md:py-6">
              <div className="flex items-center gap-2 md:gap-3">
                <hr className="w-6 border-border md:w-8" />
                <h3 className="flex items-center gap-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                  <IconAlertCircle className="h-3 w-3 text-destructive" />
                  Emergency Contact
                </h3>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
                <div className="space-y-1.5 md:space-y-2">
                  <Label
                    className="flex items-center gap-1.5 text-sm md:gap-2 md:text-base"
                    htmlFor="emergencyContactName"
                  >
                    <IconUser className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    Contact Name
                  </Label>
                  <div className="relative">
                    <IconUser className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground md:left-3 md:h-4 md:w-4" />
                    <Input
                      className="h-11 pl-8 text-sm md:h-11 md:pl-9 md:text-base"
                      id="emergencyContactName"
                      onChange={(e) => setEmergencyContactName(e.target.value)}
                      placeholder="Enter emergency contact name"
                      value={emergencyContactName}
                    />
                  </div>
                </div>

                <div className="space-y-1.5 md:space-y-2">
                  <Label
                    className="flex items-center gap-1.5 text-sm md:gap-2 md:text-base"
                    htmlFor="emergencyContactRelationship"
                  >
                    <IconUser className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    Relationship
                  </Label>
                  <div className="relative">
                    <IconUser className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground md:left-3 md:h-4 md:w-4" />
                    <Input
                      className="h-11 pl-8 text-sm md:h-11 md:pl-9 md:text-base"
                      id="emergencyContactRelationship"
                      onChange={(e) =>
                        setEmergencyContactRelationship(e.target.value)
                      }
                      placeholder="e.g., Parent, Spouse, Friend"
                      value={emergencyContactRelationship}
                    />
                  </div>
                </div>

                <div className="space-y-1.5 md:space-y-2">
                  <Label
                    className="flex items-center gap-1.5 text-sm md:gap-2 md:text-base"
                    htmlFor="emergencyContactPhone"
                  >
                    <IconPhone className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    Phone
                  </Label>
                  <div className="relative">
                    <IconPhone className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground md:left-3 md:h-4 md:w-4" />
                    <Input
                      className="h-11 pl-8 text-sm md:h-11 md:pl-9 md:text-base"
                      id="emergencyContactPhone"
                      onChange={(e) => setEmergencyContactPhone(e.target.value)}
                      placeholder="Enter emergency contact phone"
                      type="tel"
                      value={emergencyContactPhone}
                    />
                  </div>
                </div>

                <div className="space-y-1.5 md:space-y-2">
                  <Label
                    className="flex items-center gap-1.5 text-sm md:gap-2 md:text-base"
                    htmlFor="emergencyContactEmail"
                  >
                    <IconMail className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    Email
                  </Label>
                  <div className="relative">
                    <IconMail className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground md:left-3 md:h-4 md:w-4" />
                    <Input
                      className="h-11 pl-8 text-sm md:h-11 md:pl-9 md:text-base"
                      id="emergencyContactEmail"
                      onChange={(e) => setEmergencyContactEmail(e.target.value)}
                      placeholder="Enter emergency contact email"
                      type="email"
                      value={emergencyContactEmail}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Medical Information */}
            <div className="space-y-3 py-4 md:space-y-4 md:py-6">
              <div className="flex items-center gap-2 md:gap-3">
                <hr className="w-6 border-border md:w-8" />
                <h3 className="flex items-center gap-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                  <IconMedicalCross className="h-3 w-3 text-destructive" />
                  Medical Information
                </h3>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-3">
                <div className="space-y-1.5 md:space-y-2">
                  <Label
                    className="flex items-center gap-1.5 text-sm md:gap-2 md:text-base"
                    htmlFor="medicalConditions"
                  >
                    <IconMedicalCross className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    Medical Conditions
                  </Label>
                  <div className="relative">
                    <IconMedicalCross className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground md:left-3 md:h-4 md:w-4" />
                    <Input
                      className="h-11 pl-8 text-sm md:h-11 md:pl-9 md:text-base"
                      id="medicalConditions"
                      onChange={(e) => setMedicalConditions(e.target.value)}
                      placeholder="List any medical conditions"
                      value={medicalConditions}
                    />
                  </div>
                </div>

                <div className="space-y-1.5 md:space-y-2">
                  <Label
                    className="flex items-center gap-1.5 text-sm md:gap-2 md:text-base"
                    htmlFor="medications"
                  >
                    <IconPill className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    Medications
                  </Label>
                  <div className="relative">
                    <IconPill className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground md:left-3 md:h-4 md:w-4" />
                    <Input
                      className="h-11 pl-8 text-sm md:h-11 md:pl-9 md:text-base"
                      id="medications"
                      onChange={(e) => setMedications(e.target.value)}
                      placeholder="List any medications you are taking"
                      value={medications}
                    />
                  </div>
                </div>

                <div className="space-y-1.5 md:space-y-2">
                  <Label
                    className="flex items-center gap-1.5 text-sm md:gap-2 md:text-base"
                    htmlFor="allergies"
                  >
                    <IconAlertCircle className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    Allergies
                  </Label>
                  <div className="relative">
                    <IconAlertCircle className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground md:left-3 md:h-4 md:w-4" />
                    <Input
                      className="h-11 pl-8 text-sm md:h-11 md:pl-9 md:text-base"
                      id="allergies"
                      onChange={(e) => setAllergies(e.target.value)}
                      placeholder="List any allergies"
                      value={allergies}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile Save Button - Fixed at bottom */}
            <div
              className="fixed right-0 bottom-16 left-0 z-50 border-t bg-background/95 p-3 shadow-lg backdrop-blur md:hidden"
              style={{
                paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0))",
              }}
            >
              <Button
                className="h-11 w-full gap-2 rounded-sm font-semibold text-base md:h-12 md:rounded-xl"
                disabled={loading || !name}
                size="lg"
                type="submit"
              >
                {loading ? (
                  <>
                    <IconDeviceFloppy className="h-5 w-5" />
                    Saving...
                  </>
                ) : success ? (
                  <>
                    <IconCheck className="h-5 w-5" />
                    Saved!
                  </>
                ) : (
                  <>
                    <IconDeviceFloppy className="h-5 w-5" />
                    Save Profile
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
