"use client";

import { GalleryVerticalEnd } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { registerAction } from "@/app/(auth)/register/actions";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const email = searchParams.get("email");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    if (token) formData.append("token", token);
    if (email) formData.set("email", email);

    const result = await registerAction(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <form onSubmit={handleSubmit}>
        <FieldGroup>
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex flex-col items-center gap-2 font-medium">
              <div className="flex size-8 items-center justify-center rounded-md">
                <GalleryVerticalEnd className="size-6" />
              </div>
              <span className="sr-only">Titans of Mississauga</span>
            </div>
            <h1 className="text-xl font-bold">
              Welcome to Titans of Mississauga
            </h1>
            <FieldDescription>
              Already have an account?{" "}
              <a href="/login" className="underline">
                Sign in
              </a>
            </FieldDescription>
          </div>
          {error && <div className="text-destructive text-sm">{error}</div>}
          {token && (
            <div className="bg-muted text-muted-foreground rounded-md p-3 text-sm">
              You&apos;ve been invited! Complete your registration below.
            </div>
          )}
          <Field>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="m@example.com"
              defaultValue={email || ""}
              required
              disabled={!!email}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="Create a password"
              required
            />
          </Field>
          <Field>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating account..." : "Create Account"}
            </Button>
          </Field>
        </FieldGroup>
      </form>
      <FieldDescription className="px-6 text-center">
        By clicking continue, you agree to our{" "}
        <button type="button" className="underline">
          Terms of Service
        </button>{" "}
        and{" "}
        <button type="button" className="underline">
          Privacy Policy
        </button>
        .
      </FieldDescription>
    </div>
  );
}
