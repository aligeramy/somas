"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
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

export default function OnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const addressInputRef = useRef<HTMLInputElement>(null);

  useGooglePlacesAutocomplete(addressInputRef, (address) => {
    setAddress(address);
  });
  const [loading, setLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Update user profile
      const response = await fetch("/api/profile-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone: phone || null,
          address: address || null,
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
