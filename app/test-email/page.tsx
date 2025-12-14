"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
            `${prev}\n\nSetup URL: ${data.setupUrl}\n\nCheck ${email} inbox for the welcome email.`,
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
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
            />
          </div>

          <Button onClick={handleSend} disabled={loading || !email} className="w-full">
            {loading ? "Sending..." : "Send Test Email"}
          </Button>

          {error && (
            <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
              {error}
            </div>
          )}

          {result && (
            <div className="bg-green-50 text-green-900 rounded-md p-3 text-sm whitespace-pre-line">
              {result}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
