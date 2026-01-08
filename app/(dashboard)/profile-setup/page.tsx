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
    
    console.log("[ProfileSetup] Component mounted, setting up auth listener...");
    
    // Check initial session state
    const checkSession = async () => {
      console.log("[ProfileSetup] Checking initial session...");
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error("[ProfileSetup] Error getting session:", error);
      }
      
      if (session) {
        console.log("[ProfileSetup] Session found on mount:", session.user.email);
        setSessionReady(true);
      } else {
        console.log("[ProfileSetup] No session on mount, waiting for auth state change...");
      }
    };
    
    checkSession();
    
    // Listen for auth state changes - this is crucial for post-login redirects
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("[ProfileSetup] Auth state changed:", event, session?.user?.email || "no user");
      
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION") {
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
      console.log("[ProfileSetup] Session not ready yet, skipping profile load");
      return;
    }
    
    console.log("[ProfileSetup] Loading user profile...");
    
    try {
      setLoadingProfile(true);
      const response = await fetch("/api/profile");
      
      console.log("[ProfileSetup] Profile API response status:", response.status);

      if (response.status === 401) {
        console.log("[ProfileSetup] Got 401, retry count:", retryCountRef.current);
        if (retryCountRef.current < 3) {
          // Session not ready yet, retry after a short delay
          retryCountRef.current += 1;
          console.log("[ProfileSetup] Retrying profile load in 500ms...");
          setTimeout(() => {
            loadUserProfile();
          }, 500);
          return;
        } else {
          // After retries exhausted, redirect to login
          console.log("[ProfileSetup] Retries exhausted, redirecting to login");
          router.push("/login");
          return;
        }
      }

      if (response.ok) {
        const data = await response.json();
        console.log("[ProfileSetup] Profile loaded successfully:", data.user?.name || "no name");
        
        // Pre-populate fields if user already has data (from invitation)
        if (data.user.name) setName(data.user.name);
        if (data.user.phone) setPhone(data.user.phone);
        if (data.user.address) setAddress(data.user.address);
        if (data.user.altEmail) setAltEmail(data.user.altEmail);
        if (data.user.homePhone) setHomePhone(data.user.homePhone);
        if (data.user.workPhone) setWorkPhone(data.user.workPhone);
        if (data.user.cellPhone) setCellPhone(data.user.cellPhone);
        if (data.user.emergencyContactName)
          setEmergencyContactName(data.user.emergencyContactName);
        if (data.user.emergencyContactPhone)
          setEmergencyContactPhone(data.user.emergencyContactPhone);
        if (data.user.emergencyContactRelationship)
          setEmergencyContactRelationship(
            data.user.emergencyContactRelationship,
          );
        if (data.user.emergencyContactEmail)
          setEmergencyContactEmail(data.user.emergencyContactEmail);
        if (data.user.medicalConditions)
          setMedicalConditions(data.user.medicalConditions);
        if (data.user.medications) setMedications(data.user.medications);
        if (data.user.allergies) setAllergies(data.user.allergies);
        if (data.user.dateOfBirth)
          setDateOfBirth(
            new Date(data.user.dateOfBirth).toISOString().split("T")[0],
          );
        if (data.user.avatarUrl) setAvatarPreview(data.user.avatarUrl);
        retryCountRef.current = 0; // Reset on success
      } else if (response.status === 404) {
        // User not found in database - this is okay, they can still fill out the form
        // The API will create the user when they submit
        console.log("[ProfileSetup] User not found in DB (404), form will be empty");
        retryCountRef.current = 0;
      } else {
        console.log("[ProfileSetup] Unexpected response status:", response.status);
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
      console.log("[ProfileSetup] Could not load existing profile - form will still be available");
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
        if (!value || value.trim() === "") return null;
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
      <div className="flex flex-1 flex-col min-h-0 h-full overflow-hidden items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <IconLoader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading your session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col min-h-0 h-full overflow-hidden">
      <PageHeader
        title="Complete Your Profile"
        description={
          loadingProfile
            ? "Loading your existing profile..."
            : "Set up your profile to get started with SOMAS. You can edit any pre-filled information."
        }
      >
        <Button
          onClick={(e) => {
            e.preventDefault();
            const form = document.getElementById(
              "profile-setup-form",
            ) as HTMLFormElement;
            form?.requestSubmit();
          }}
          disabled={loading || !name}
          className="gap-2 rounded-sm md:rounded-xl"
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

      <div className="flex-1 overflow-auto min-h-0">
        <div className="max-w-4xl mx-auto space-y-4 md:space-y-6 px-4 py-3 md:px-6 md:py-4 pb-24 md:pb-8">
          <form
            id="profile-setup-form"
            onSubmit={handleSubmit}
            className="space-y-4 md:space-y-6 mb-4 md:mb-8"
          >
            {error && (
              <div className="bg-destructive/10 text-destructive rounded-xl p-3 md:p-4 text-sm">
                {error}
              </div>
            )}

            {/* Profile Picture Section */}
            <div className="flex flex-col items-center justify-center w-full py-4 md:py-6">
              <div className="flex flex-col items-center justify-center gap-3 md:gap-4 w-full">
                <button
                  type="button"
                  onClick={handleAvatarClick}
                  className="relative group cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-full mx-auto"
                >
                  <div className="relative h-24 w-24 md:h-28 md:w-28 rounded-full overflow-hidden border-2 border-border bg-muted flex items-center justify-center shadow-lg">
                    {avatarPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={avatarPreview}
                        alt="Profile"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <IconUserCircle className="h-12 w-12 md:h-14 md:w-14 text-muted-foreground" />
                    )}
                    <div className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity flex items-center justify-center">
                      <IconCamera className="h-6 w-6 md:h-7 md:w-7 text-white" />
                    </div>
                  </div>
                </button>
                <div className="text-center w-full">
                  <p className="text-sm md:text-base font-medium">Upload Profile Picture</p>
                  <p className="text-xs md:text-sm text-muted-foreground mt-1">Tap to change</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </div>
            </div>

            {/* Basic Information */}
            <div className="space-y-3 md:space-y-4 py-4 md:py-6">
              <div className="flex items-center gap-2 md:gap-3">
                <hr className="w-6 md:w-8 border-border" />
                <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Basic Information
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                <div className="space-y-1.5 md:space-y-2">
                  <Label htmlFor="name" className="flex items-center gap-1.5 md:gap-2 text-sm md:text-base">
                    <IconUser className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    Name *
                  </Label>
                  <div className="relative">
                    <IconUser className="absolute left-2.5 md:left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" />
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your name"
                      className="pl-8 md:pl-9 h-11 md:h-11 text-sm md:text-base"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5 md:space-y-2">
                  <Label
                    htmlFor="dateOfBirth"
                    className="flex items-center gap-1.5 md:gap-2 text-sm md:text-base"
                  >
                    <IconCalendar className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    Date of Birth
                  </Label>
                  <DatePicker
                    id="dateOfBirth"
                    value={dateOfBirth}
                    onChange={setDateOfBirth}
                    placeholder="Select date of birth"
                    className="w-full h-11 md:h-11 text-sm md:text-base"
                  />
                </div>

                <div className="space-y-1.5 md:space-y-2 lg:col-start-1">
                  <Label htmlFor="altEmail" className="flex items-center gap-1.5 md:gap-2 text-sm md:text-base">
                    <IconMail className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    Alternate Email
                  </Label>
                  <div className="relative">
                    <IconMail className="absolute left-2.5 md:left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" />
                    <Input
                      id="altEmail"
                      value={altEmail}
                      onChange={(e) => setAltEmail(e.target.value)}
                      placeholder="Enter alternate email (optional)"
                      type="email"
                      className="pl-8 md:pl-9 h-11 md:h-11 text-sm md:text-base"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 md:space-y-2 md:col-span-2 lg:col-span-2">
                  <Label htmlFor="address" className="flex items-center gap-1.5 md:gap-2 text-sm md:text-base">
                    <IconMapPin className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    Address
                  </Label>
                  <div className="relative">
                    <IconMapPin className="absolute left-2.5 md:left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground z-10" />
                    <Input
                      ref={addressInputRef}
                      id="address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Enter your address"
                      className="pl-8 md:pl-9 h-11 md:h-11 text-sm md:text-base"
                      autoComplete="off"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-3 md:space-y-4 py-4 md:py-6">
              <div className="flex items-center gap-2 md:gap-3">
                <hr className="w-6 md:w-8 border-border" />
                <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Contact Information
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                <div className="space-y-1.5 md:space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-1.5 md:gap-2 text-sm md:text-base">
                    <IconPhone className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    Phone
                  </Label>
                  <div className="relative">
                    <IconPhone className="absolute left-2.5 md:left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Enter your phone number"
                      type="tel"
                      className="pl-8 md:pl-9 h-11 md:h-11 text-sm md:text-base"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 md:space-y-2">
                  <Label
                    htmlFor="homePhone"
                    className="flex items-center gap-1.5 md:gap-2 text-sm md:text-base"
                  >
                    <IconHome className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    Home Phone
                  </Label>
                  <div className="relative">
                    <IconHome className="absolute left-2.5 md:left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" />
                    <Input
                      id="homePhone"
                      value={homePhone}
                      onChange={(e) => setHomePhone(e.target.value)}
                      placeholder="Enter your home phone"
                      type="tel"
                      className="pl-8 md:pl-9 h-11 md:h-11 text-sm md:text-base"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 md:space-y-2">
                  <Label
                    htmlFor="workPhone"
                    className="flex items-center gap-1.5 md:gap-2 text-sm md:text-base"
                  >
                    <IconPhone className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    Work Phone
                  </Label>
                  <div className="relative">
                    <IconPhone className="absolute left-2.5 md:left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" />
                    <Input
                      id="workPhone"
                      value={workPhone}
                      onChange={(e) => setWorkPhone(e.target.value)}
                      placeholder="Enter your work phone"
                      type="tel"
                      className="pl-8 md:pl-9 h-11 md:h-11 text-sm md:text-base"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 md:space-y-2">
                  <Label
                    htmlFor="cellPhone"
                    className="flex items-center gap-1.5 md:gap-2 text-sm md:text-base"
                  >
                    <IconDeviceMobile className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    Cell Phone
                  </Label>
                  <div className="relative">
                    <IconDeviceMobile className="absolute left-2.5 md:left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" />
                    <Input
                      id="cellPhone"
                      value={cellPhone}
                      onChange={(e) => setCellPhone(e.target.value)}
                      placeholder="Enter your cell phone"
                      type="tel"
                      className="pl-8 md:pl-9 h-11 md:h-11 text-sm md:text-base"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="space-y-3 md:space-y-4 py-4 md:py-6">
              <div className="flex items-center gap-2 md:gap-3">
                <hr className="w-6 md:w-8 border-border" />
                <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <IconAlertCircle className="h-3 w-3 text-destructive" />
                  Emergency Contact
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <div className="space-y-1.5 md:space-y-2">
                  <Label
                    htmlFor="emergencyContactName"
                    className="flex items-center gap-1.5 md:gap-2 text-sm md:text-base"
                  >
                    <IconUser className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    Contact Name
                  </Label>
                  <div className="relative">
                    <IconUser className="absolute left-2.5 md:left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" />
                    <Input
                      id="emergencyContactName"
                      value={emergencyContactName}
                      onChange={(e) => setEmergencyContactName(e.target.value)}
                      placeholder="Enter emergency contact name"
                      className="pl-8 md:pl-9 h-11 md:h-11 text-sm md:text-base"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 md:space-y-2">
                  <Label
                    htmlFor="emergencyContactRelationship"
                    className="flex items-center gap-1.5 md:gap-2 text-sm md:text-base"
                  >
                    <IconUser className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    Relationship
                  </Label>
                  <div className="relative">
                    <IconUser className="absolute left-2.5 md:left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" />
                    <Input
                      id="emergencyContactRelationship"
                      value={emergencyContactRelationship}
                      onChange={(e) =>
                        setEmergencyContactRelationship(e.target.value)
                      }
                      placeholder="e.g., Parent, Spouse, Friend"
                      className="pl-8 md:pl-9 h-11 md:h-11 text-sm md:text-base"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 md:space-y-2">
                  <Label
                    htmlFor="emergencyContactPhone"
                    className="flex items-center gap-1.5 md:gap-2 text-sm md:text-base"
                  >
                    <IconPhone className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    Phone
                  </Label>
                  <div className="relative">
                    <IconPhone className="absolute left-2.5 md:left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" />
                    <Input
                      id="emergencyContactPhone"
                      value={emergencyContactPhone}
                      onChange={(e) => setEmergencyContactPhone(e.target.value)}
                      placeholder="Enter emergency contact phone"
                      type="tel"
                      className="pl-8 md:pl-9 h-11 md:h-11 text-sm md:text-base"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 md:space-y-2">
                  <Label
                    htmlFor="emergencyContactEmail"
                    className="flex items-center gap-1.5 md:gap-2 text-sm md:text-base"
                  >
                    <IconMail className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    Email
                  </Label>
                  <div className="relative">
                    <IconMail className="absolute left-2.5 md:left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" />
                    <Input
                      id="emergencyContactEmail"
                      value={emergencyContactEmail}
                      onChange={(e) => setEmergencyContactEmail(e.target.value)}
                      placeholder="Enter emergency contact email"
                      type="email"
                      className="pl-8 md:pl-9 h-11 md:h-11 text-sm md:text-base"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Medical Information */}
            <div className="space-y-3 md:space-y-4 py-4 md:py-6">
              <div className="flex items-center gap-2 md:gap-3">
                <hr className="w-6 md:w-8 border-border" />
                <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <IconMedicalCross className="h-3 w-3 text-destructive" />
                  Medical Information
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                <div className="space-y-1.5 md:space-y-2">
                  <Label
                    htmlFor="medicalConditions"
                    className="flex items-center gap-1.5 md:gap-2 text-sm md:text-base"
                  >
                    <IconMedicalCross className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    Medical Conditions
                  </Label>
                  <div className="relative">
                    <IconMedicalCross className="absolute left-2.5 md:left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" />
                    <Input
                      id="medicalConditions"
                      value={medicalConditions}
                      onChange={(e) => setMedicalConditions(e.target.value)}
                      placeholder="List any medical conditions"
                      className="pl-8 md:pl-9 h-11 md:h-11 text-sm md:text-base"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 md:space-y-2">
                  <Label
                    htmlFor="medications"
                    className="flex items-center gap-1.5 md:gap-2 text-sm md:text-base"
                  >
                    <IconPill className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    Medications
                  </Label>
                  <div className="relative">
                    <IconPill className="absolute left-2.5 md:left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" />
                    <Input
                      id="medications"
                      value={medications}
                      onChange={(e) => setMedications(e.target.value)}
                      placeholder="List any medications you are taking"
                      className="pl-8 md:pl-9 h-11 md:h-11 text-sm md:text-base"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 md:space-y-2">
                  <Label
                    htmlFor="allergies"
                    className="flex items-center gap-1.5 md:gap-2 text-sm md:text-base"
                  >
                    <IconAlertCircle className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    Allergies
                  </Label>
                  <div className="relative">
                    <IconAlertCircle className="absolute left-2.5 md:left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" />
                    <Input
                      id="allergies"
                      value={allergies}
                      onChange={(e) => setAllergies(e.target.value)}
                      placeholder="List any allergies"
                      className="pl-8 md:pl-9 h-11 md:h-11 text-sm md:text-base"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile Save Button - Fixed at bottom */}
            <div className="md:hidden fixed bottom-16 left-0 right-0 p-3 bg-background/95 backdrop-blur border-t shadow-lg z-50" style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0))" }}>
              <Button
                type="submit"
                disabled={loading || !name}
                className="w-full h-11 md:h-12 gap-2 rounded-sm md:rounded-xl text-base font-semibold"
                size="lg"
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
