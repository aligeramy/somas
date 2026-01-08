"use client";

import { IconLoader2 } from "@tabler/icons-react";
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
import { createClient } from "@/lib/supabase/client";

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
  const [sessionReady, setSessionReady] = useState(false);
  const supabaseRef = useRef(createClient());
  const retryCountRef = useRef(0);

  // Wait for Supabase session to be ready before doing anything
  useEffect(() => {
    const supabase = supabaseRef.current;
    let timeoutId: NodeJS.Timeout;
    let hasSetReady = false;

    // Check initial session state immediately
    const checkSession = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error("[Onboarding] Error getting session:", error);
          // If there's an error but we have a session, proceed anyway
          if (session && !hasSetReady) {
            hasSetReady = true;
            clearTimeout(timeoutId);
            setSessionReady(true);
          }
          return;
        }

        if (session && !hasSetReady) {
          hasSetReady = true;
          clearTimeout(timeoutId);
          setSessionReady(true);
        }
      } catch (err) {
        console.error("[Onboarding] Exception checking session:", err);
      }
    };

    // Check session immediately
    checkSession();

    // Set a shorter timeout - if session isn't ready after 2 seconds, show form anyway
    // This prevents infinite waiting if there's an issue
    timeoutId = setTimeout(() => {
      if (!hasSetReady) {
        console.log("[Onboarding] Session check timeout, proceeding anyway");
        hasSetReady = true;
        setSessionReady(true);
      }
    }, 2000);

    // Listen for auth state changes - this is crucial for post-login redirects
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (
        event === "SIGNED_IN" ||
        event === "TOKEN_REFRESHED" ||
        event === "INITIAL_SESSION"
      ) {
        if (session && !hasSetReady) {
          hasSetReady = true;
          clearTimeout(timeoutId);
          setSessionReady(true);
        }
      } else if (event === "SIGNED_OUT") {
        // Only redirect if we're sure the user is signed out
        // Don't redirect during initial load to prevent false positives
        if (hasSetReady) {
          clearTimeout(timeoutId);
          router.push("/login");
        }
      }
    });

    return () => {
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [router]);

  const loadUserProfile = useCallback(async () => {
    if (!sessionReady) {
      return;
    }

    try {
      setLoadingProfile(true);
      const response = await fetch("/api/profile");

      if (response.status === 401) {
        if (retryCountRef.current < 5) {
          // Session not ready yet, retry after a short delay
          retryCountRef.current += 1;
          setTimeout(() => {
            loadUserProfile();
          }, 1000);
          return;
        }
        // After retries exhausted, just show the form anyway
        // The user can still submit - session should be ready by then
        console.log(
          "[Onboarding] Could not load profile after retries, showing form anyway"
        );
        retryCountRef.current = 0;
        setLoadingProfile(false);
        return;
      }

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
        retryCountRef.current = 0; // Reset on success
      } else if (response.status === 404) {
        // User not found in database - this is okay, they can still fill out the form
        retryCountRef.current = 0;
      }
    } catch (_err) {
      // Retry on error if we haven't exceeded retry limit
      if (retryCountRef.current < 5) {
        retryCountRef.current += 1;
        setTimeout(() => {
          loadUserProfile();
        }, 1000);
        return;
      }
      // After retries, just show the form - user can still submit
      console.log(
        "[Onboarding] Could not load existing profile, showing form anyway"
      );
      retryCountRef.current = 0;
    } finally {
      setLoadingProfile(false);
    }
  }, [sessionReady, router]);

  // Load profile when session becomes ready
  useEffect(() => {
    if (sessionReady) {
      loadUserProfile();
    }
  }, [sessionReady, loadUserProfile]);

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

  // Show loading state while waiting for session
  if (!sessionReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <IconLoader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading your session...</p>
        </div>
      </div>
    );
  }

  if (loadingProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <IconLoader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
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
