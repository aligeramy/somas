"use client";

import { IconArrowLeft, IconAlertCircle } from "@tabler/icons-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
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
  const tokenType = searchParams.get("type") || "recovery"; // magiclink or recovery

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(!!token);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const supabase = createClient();

  // Auto-verify token on page load
  useEffect(() => {
    async function verifyToken() {
      if (!token) {
        setVerifying(false);
        return;
      }

      try {
        // Determine the OTP type based on URL param
        const otpType = tokenType === "magiclink" ? "magiclink" : "recovery";
        
        const { data, error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: otpType,
        });

        if (verifyError) {
          setError(`Invalid or expired link: ${verifyError.message}`);
          setVerifying(false);
          return;
        }

        if (data?.session) {
          setIsAuthenticated(true);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to verify link");
      } finally {
        setVerifying(false);
      }
    }

    verifyToken();
  }, [token, tokenType, supabase.auth]);

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
      if (isAuthenticated) {
        // User is already authenticated via token, just update password
        const { error: updateError } = await supabase.auth.updateUser({
          password: password,
        });

        if (updateError) {
          throw updateError;
        }

        // Password updated successfully
        setSuccess(true);
        
        // Use window.location for full page reload to ensure session cookies are synced
        // This prevents blank page issues when redirecting to profile-setup
        setTimeout(() => {
          window.location.href = "/profile-setup";
        }, 1500);
      } else if (email) {
        // No valid token - request password reset email
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(
          email,
          {
            redirectTo: `${window.location.origin}/setup-password?type=recovery`,
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
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to set password. Please try again.",
      );
      setLoading(false);
    }
  }

  // Loading state while verifying token
  if (verifying) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 md:p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Verifying your link...</CardTitle>
            <CardDescription>Please wait while we verify your access.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (success && !error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 md:p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Password Set Successfully! ✅</CardTitle>
            <CardDescription>
              Redirecting you to your dashboard...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Error state - don't show password inputs if token verification failed or link is invalid/expired
  const isLinkError = error && (
    error.includes("Invalid or expired link") ||
    error.includes("invalid or has expired") ||
    error.includes("invalid") ||
    error.includes("expired") ||
    (!isAuthenticated && token && !verifying)
  );

  if (isLinkError) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 md:p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <IconAlertCircle className="h-5 w-5 text-destructive" />
              <CardTitle>Error</CardTitle>
            </div>
            <CardDescription className="text-destructive">
              {error}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This link may be invalid, expired, or already used. Please request a new password reset link.
            </p>
            <Button asChild className="w-full" variant="default">
              <Link href="/">
                <IconArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Link>
            </Button>
          </CardContent>
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
            {isAuthenticated
              ? `Create a secure password for ${email || "your account"}`
              : email
                ? `Create a secure password for ${email}`
                : "Create a secure password for your account"}
          </CardDescription>
          {isAuthenticated && (
            <p className="text-sm text-green-600 mt-2">✓ Link verified successfully</p>
          )}
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

