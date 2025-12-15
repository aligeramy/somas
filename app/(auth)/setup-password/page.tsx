"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
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
import { createClient } from "@/lib/supabase/client";

function SetupPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      if (token) {
        // Verify the recovery token hash to establish a session
        const { data: verifyData, error: verifyError } =
          await supabase.auth.verifyOtp({
            token_hash: token,
            type: "recovery",
          });

        if (verifyError) {
          throw new Error(
            verifyError.message || "Invalid or expired password setup link",
          );
        }

        // Now update the password (user is authenticated via the token)
        const { error: updateError } = await supabase.auth.updateUser({
          password: password,
        });

        if (updateError) {
          throw updateError;
        }
      } else if (email) {
        // If no token but email provided, request password reset email
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(
          email,
          {
            redirectTo: `${window.location.origin}/setup-password`,
          },
        );

        if (resetError) {
          throw resetError;
        }

        setSuccess(true);
        setError(
          "Password reset email sent. Please check your email to complete password setup.",
        );
        setLoading(false);
        return;
      } else {
        throw new Error("Missing email or token");
      }

      // Password updated successfully, redirect to onboarding
      setSuccess(true);
      setTimeout(() => {
        router.push("/onboarding");
      }, 2000);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to set password. Please try again.",
      );
      setLoading(false);
    }
  }

  if (success && !error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 md:p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Password Set Successfully! ✅</CardTitle>
            <CardDescription>
              Redirecting you to complete your profile...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 md:p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Set Up Your Password</CardTitle>
          <CardDescription>
            {email
              ? `Create a secure password for ${email}`
              : "Create a secure password for your account"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password (min. 8 characters)"
                required
                minLength={8}
                autoComplete="new-password"
              />
              <p className="text-xs text-muted-foreground">
                Must be at least 8 characters long
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password *</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>

            <Button
              type="submit"
              disabled={loading || !password || !confirmPassword}
              className="w-full"
            >
              {loading ? "Setting up..." : "Set Password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SetupPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center p-4 md:p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Set Up Your Password</CardTitle>
            <CardDescription>Loading...</CardDescription>
          </CardHeader>
        </Card>
      </div>
    }>
      <SetupPasswordForm />
    </Suspense>
  );
}
