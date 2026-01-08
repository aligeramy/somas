"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useGooglePlacesAutocomplete } from "@/hooks/use-google-places-autocomplete";
import { createClient } from "@/lib/supabase/client";

export default function OnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const addressInputRef = useRef<HTMLInputElement>(null);

  useGooglePlacesAutocomplete(addressInputRef, (address) => {
    setAddress(address);
  });
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const loadUserProfile = useCallback(async () => {
    try {
      setLoadingProfile(true);
      const response = await fetch("/api/profile");
      if (response.ok) {
        const data = await response.json();

        // If user is already onboarded, redirect to dashboard
        if (data.user.onboarded) {
          router.push("/dashboard");
          return;
        }

        // Pre-populate fields if user already has data (from import)
        if (data.user.name) {
          setName(data.user.name);
        }
        if (data.user.phone) {
          setPhone(data.user.phone);
        }
        if (data.user.address) {
          setAddress(data.user.address);
        }
        if (data.user.avatarUrl) {
          setAvatarPreview(data.user.avatarUrl);
        }
      }
    } catch (_err) {
      // Ignore errors, user might not exist yet
      console.log("Could not load existing profile");
    } finally {
      setLoadingProfile(false);
    }
  }, [router]);

  useEffect(() => {
    loadUserProfile();
  }, [loadUserProfile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
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
      const response = await fetch("/api/profile-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone: phone || null,
          address: address || null,
          avatarUrl,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to complete onboarding");
      }

      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setLoading(false);
    }
  }

  if (loadingProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 md:p-6">
        <Card className="w-full max-w-2xl">
          <CardContent className="pt-6">
            <div className="animate-pulse text-center text-muted-foreground">
              Loading...
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 md:p-6">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Complete Your Profile</CardTitle>
          <CardDescription>
            Welcome! Please complete your profile to get started. You can edit
            any pre-filled information.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-destructive text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                required
                value={name}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter your phone number"
                type="tel"
                value={phone}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                autoComplete="off"
                id="address"
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter your address"
                ref={addressInputRef}
                value={address}
              />
            </div>

            <div className="space-y-2">
              <Label>Profile Photo (Optional)</Label>
              <div
                {...getRootProps()}
                className={`cursor-pointer rounded-lg border border-dashed p-6 text-center transition-colors md:p-8 ${
                  isDragActive
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25 hover:border-muted-foreground/50"
                }`}
              >
                <input {...getInputProps()} />
                {avatarPreview ? (
                  <div className="space-y-2">
                    <img
                      alt="Avatar preview"
                      className="mx-auto max-h-32 rounded-full"
                      src={avatarPreview}
                    />
                    <p className="text-muted-foreground text-sm">
                      Click or drag to replace
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-muted-foreground text-sm">
                      {isDragActive
                        ? "Drop the photo here"
                        : "Drag & drop a photo here, or click to select"}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      PNG, JPG, GIF up to 5MB
                    </p>
                  </div>
                )}
              </div>
            </div>

            <Button
              className="w-full"
              disabled={loading || !name}
              type="submit"
            >
              {loading ? "Saving..." : "Complete Profile"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
