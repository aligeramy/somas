"use client";

import { IconArrowLeft, IconAlertCircle, IconMail } from "@tabler/icons-react";
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

  async function handleRequestNewLink() {
    if (!email || !email.trim()) {
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
    setError(null);
    setLinkSent(false);

    try {
      // Check if email is altEmail and resolve to primary email
      let authEmail = email.trim();
      
      try {
        const response = await fetch(`/api/user-info?email=${encodeURIComponent(email.trim())}`);
        if (response.ok) {
          const data = await response.json();
          if (data?.primaryEmail?.trim()) {
            authEmail = data.primaryEmail.trim();
          }
        }
      } catch {
        // If lookup fails, continue with original email
        console.log("Could not resolve altEmail, using provided email");
      }

      // Ensure authEmail is valid before calling Supabase
      if (!authEmail || !emailRegex.test(authEmail)) {
        throw new Error("Invalid email address");
      }

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        authEmail,
        {
          redirectTo: `${window.location.origin}/setup-password?type=recovery&email=${encodeURIComponent(authEmail)}`,
        },
      );

      if (resetError) {
        throw resetError;
      }

      setLinkSent(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to send new link. Please try again.",
      );
    } finally {
      setRequestingLink(false);
    }
  }

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
      } else if (email?.trim()) {
        // No valid token - request password reset email
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
          setError("Please enter a valid email address");
          setLoading(false);
          return;
        }

        // Check if email is altEmail and resolve to primary email
        let authEmail = email.trim();
        
        try {
          const response = await fetch(`/api/user-info?email=${encodeURIComponent(email.trim())}`);
          if (response.ok) {
            const data = await response.json();
            if (data?.primaryEmail?.trim()) {
              authEmail = data.primaryEmail.trim();
            }
          }
        } catch {
          // If lookup fails, continue with original email
          console.log("Could not resolve altEmail, using provided email");
        }

        // Ensure authEmail is valid before calling Supabase
        if (!authEmail || !emailRegex.test(authEmail)) {
          setError("Invalid email address");
          setLoading(false);
          return;
        }

        const { error: resetError } = await supabase.auth.resetPasswordForEmail(
          authEmail,
          {
            redirectTo: `${window.location.origin}/setup-password?type=recovery&email=${encodeURIComponent(authEmail)}`,
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
              <CardTitle>Link Expired</CardTitle>
            </div>
            <CardDescription className="text-destructive">
              {error}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This link may be invalid, expired, or already used. You can request a new password setup link below.
            </p>
            
            {email && (
              <div className="space-y-2">
                <Label htmlFor="expired-email">Email</Label>
                <Input
                  id="expired-email"
                  type="email"
                  value={email}
                  readOnly
                  disabled
                  className="bg-muted"
                />
              </div>
            )}

            {linkSent ? (
              <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-md p-3 text-sm text-green-800 dark:text-green-200">
                <div className="flex items-center gap-2">
                  <IconMail className="h-4 w-4" />
                  <span>New link sent! Please check your email ({email}) for the password setup link.</span>
                </div>
              </div>
            ) : (
              <>
                {error && !linkSent && (
                  <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
                    {error}
                  </div>
                )}
                
                {email ? (
                  <Button
                    onClick={handleRequestNewLink}
                    disabled={requestingLink}
                    className="w-full"
                    variant="default"
                  >
                    {requestingLink ? (
                      "Sending..."
                    ) : (
                      <>
                        <IconMail className="h-4 w-4 mr-2" />
                        Request New Link
                      </>
                    )}
                  </Button>
                ) : (
                  <p className="text-sm text-muted-foreground text-center">
                    Please contact your coach to request a new welcome email.
                  </p>
                )}
              </>
            )}

            <Button asChild className="w-full" variant="outline">
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

            {email && (
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  readOnly
                  disabled
                  autoComplete="email"
                  className="bg-muted"
                />
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

