"use client";

import { IconAlertCircle, IconArrowLeft, IconMail } from "@tabler/icons-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
  const [requestingLink, setRequestingLink] = useState(false);
  const [linkSent, setLinkSent] = useState(false);
  const [isLinkExpired, setIsLinkExpired] = useState(false);
  const supabase = createClient();

  // Auto-verify token on page load
  useEffect(() => {
    async function verifyToken() {
      if (!token) {
        setVerifying(false);
        // If no token but we have an email, show the request link screen
        if (email) {
          setIsLinkExpired(true);
          setError(
            "No valid link found. Please request a new password setup link."
          );
        }
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
          const errorMessage = `Invalid or expired link: ${verifyError.message}`;
          setError(errorMessage);
          setIsLinkExpired(true);
          setVerifying(false);
          return;
        }

        if (data?.session) {
          setIsAuthenticated(true);
          setIsLinkExpired(false); // Reset expired state when new link is successfully verified
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to verify link";
        setError(errorMessage);
        setIsLinkExpired(true);
      } finally {
        setVerifying(false);
      }
    }

    verifyToken();
  }, [token, tokenType, email, supabase.auth]);

  async function handleRequestNewLink() {
    if (!(email && email.trim())) {
      setError("Email address is required to request a new link");
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError("Please enter a valid email address");
      return;
    }

    setRequestingLink(true);
    // Don't clear the error here - we want to keep showing the expired link message
    // Only clear error messages that aren't related to expired links
    setLinkSent(false);

    try {
      // Use the same API endpoint that sends welcome emails
      const response = await fetch("/api/send-welcome-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send welcome email");
      }

      setLinkSent(true);
      setError(null); // Clear error when email is successfully sent
      // Keep isLinkExpired true so we stay on the error screen
      // The user should check their email for the new link
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to send new link. Please try again.";
      setError(errorMessage);
      setLinkSent(false);
      // Keep isLinkExpired true so we stay on the error screen
    } finally {
      setRequestingLink(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // If no password entered, don't submit (user might have clicked button by mistake)
    if (!password || password.trim().length === 0) {
      return;
    }

    if (password.length < 8) {
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
          password,
        });

        if (updateError) {
          throw updateError;
        }

        // Password updated successfully
        setSuccess(true);

        // Use window.location for full page reload to ensure session cookies are synced
        // Redirect to dashboard - the layout will handle onboarding redirects if needed
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 1500);
      } else {
        // If not authenticated and no token, user needs to use the "Request New Link" button
        setError(
          "Please use the 'Request New Link' button to receive a password setup link."
        );
        setLoading(false);
        return;
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to set password. Please try again."
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
            <CardDescription>
              Please wait while we verify your access.
            </CardDescription>
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

  // CRITICAL: Only show password form if user is authenticated
  // If not authenticated, always show the request link screen
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 md:p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="mb-2 flex items-center gap-2">
              {linkSent && !error ? (
                <IconMail className="h-5 w-5 text-green-600 dark:text-green-400" />
              ) : (
                <IconAlertCircle className="h-5 w-5 text-destructive" />
              )}
              <CardTitle>
                {linkSent && !error
                  ? "Email Sent"
                  : isLinkExpired || error
                    ? "Link Expired"
                    : "Password Setup Required"}
              </CardTitle>
            </div>
            <CardDescription
              className={
                linkSent && !error
                  ? "text-green-600 dark:text-green-400"
                  : error
                    ? "text-destructive"
                    : ""
              }
            >
              {linkSent && !error
                ? "Email sent! Please check your email for the password setup link."
                : error || "Please request a password setup link to continue."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {linkSent && !error ? null : email ? (
              <Button
                className="w-full"
                disabled={requestingLink}
                id="request-new-link-button"
                onClick={handleRequestNewLink}
                type="button"
                variant="default"
              >
                {requestingLink ? (
                  "Sending..."
                ) : (
                  <>
                    <IconMail className="mr-2 h-4 w-4" />
                    Request New Link
                  </>
                )}
              </Button>
            ) : (
              <p className="text-center text-muted-foreground text-sm">
                Please contact your coach to request a new welcome email.
              </p>
            )}

            <Button asChild className="w-full" variant="outline">
              <Link href="/">
                <IconArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // User is authenticated - show password form
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
            <p className="mt-2 text-green-600 text-sm">
              ✓ Link verified successfully
            </p>
          )}
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && !isLinkExpired && (
              <div className="rounded-md bg-destructive/10 p-3 text-destructive text-sm">
                {error}
              </div>
            )}

            {email && (
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  autoComplete="email"
                  className="bg-muted"
                  disabled
                  id="email"
                  readOnly
                  type="email"
                  value={email}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                autoComplete="new-password"
                id="password"
                minLength={8}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password (min. 8 characters)"
                required
                type="password"
                value={password}
              />
              <p className="text-muted-foreground text-xs">
                Must be at least 8 characters long
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password *</Label>
              <Input
                autoComplete="new-password"
                id="confirmPassword"
                minLength={8}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                required
                type="password"
                value={confirmPassword}
              />
            </div>

            <Button
              className="w-full"
              disabled={loading || !password || !confirmPassword}
              id="set-password-button"
              type="submit"
            >
              {loading ? "Setting up..." : "Set Password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// Force dynamic rendering since this page uses search params
export const dynamic = "force-dynamic";

export default function SetupPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center p-4 md:p-6">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Set Up Your Password</CardTitle>
              <CardDescription>Loading...</CardDescription>
            </CardHeader>
          </Card>
        </div>
      }
    >
      <SetupPasswordForm />
    </Suspense>
  );
}
