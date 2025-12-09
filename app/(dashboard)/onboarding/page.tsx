"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useDropzone } from "react-dropzone";
import { createClient } from "@/lib/supabase/client";

export default function OnboardingPage() {
  const router = useRouter();
  const [gymName, setGymName] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"],
    },
    maxFiles: 1,
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        setLogoFile(file);
        const reader = new FileReader();
        reader.onloadend = () => {
          setLogoPreview(reader.result as string);
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

      let logoUrl = null;

      // Upload logo if provided
      if (logoFile) {
        const fileExt = logoFile.name.split(".").pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const filePath = `logos/${fileName}`;

        const { error: uploadError, data } = await supabase.storage
          .from("logos")
          .upload(filePath, logoFile, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          throw new Error(`Failed to upload logo: ${uploadError.message}`);
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("logos").getPublicUrl(filePath);
        logoUrl = publicUrl;
      }

      // Create gym and update user
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gymName,
          logoUrl,
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

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Complete Your Gym Setup</CardTitle>
          <CardDescription>
            Set up your gym profile to get started with TOM
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="gymName">Gym Name *</Label>
              <Input
                id="gymName"
                value={gymName}
                onChange={(e) => setGymName(e.target.value)}
                placeholder="Enter your gym name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Logo (Optional)</Label>
              <div
                {...getRootProps()}
                className={`border border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragActive
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25 hover:border-muted-foreground/50"
                }`}
              >
                <input {...getInputProps()} />
                {logoPreview ? (
                  <div className="space-y-2">
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="mx-auto max-h-32"
                    />
                    <p className="text-sm text-muted-foreground">
                      Click or drag to replace
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      {isDragActive
                        ? "Drop the logo here"
                        : "Drag & drop a logo here, or click to select"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      PNG, JPG, GIF up to 5MB
                    </p>
                  </div>
                )}
              </div>
            </div>

            <Button type="submit" disabled={loading || !gymName}>
              {loading ? "Setting up..." : "Complete Setup"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}




