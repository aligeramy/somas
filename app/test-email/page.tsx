"use client";

import { useState } from "react";
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

export default function TestEmailPage() {
  const [email, setEmail] = useState("ali@softxinnovations.ca");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/test-welcome-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send email");
      }

      setResult(`✅ Email sent successfully! Email ID: ${data.emailId}`);
      if (data.setupUrl) {
        setResult(
          (prev) =>
            `${prev}\n\nSetup URL: ${data.setupUrl}\n\nCheck ${email} inbox for the welcome email.`
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 md:p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Test Welcome Email</CardTitle>
          <CardDescription>
            Send a test welcome email to verify the email template
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              type="email"
              value={email}
            />
          </div>

          <Button
            className="w-full"
            disabled={loading || !email}
            onClick={handleSend}
          >
            {loading ? "Sending..." : "Send Test Email"}
          </Button>

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-destructive text-sm">
              {error}
            </div>
          )}

          {result && (
            <div className="whitespace-pre-line rounded-md bg-green-50 p-3 text-green-900 text-sm">
              {result}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
