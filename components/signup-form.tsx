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
              <span className="sr-only">SOMAS</span>
            </div>
            <h1 className="font-bold text-xl">Welcome to SOMAS</h1>
            <FieldDescription>
              Already have an account?{" "}
              <a className="underline" href="/login">
                Sign in
              </a>
            </FieldDescription>
          </div>
          {error && <div className="text-destructive text-sm">{error}</div>}
          {token && (
            <div className="rounded-md bg-muted p-3 text-muted-foreground text-sm">
              You&apos;ve been invited! Complete your registration below.
            </div>
          )}
          <Field>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              defaultValue={email || ""}
              disabled={!!email}
              id="email"
              name="email"
              placeholder="m@example.com"
              required
              type="email"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <Input
              id="password"
              name="password"
              placeholder="Create a password"
              required
              type="password"
            />
          </Field>
          <Field>
            <Button disabled={loading} type="submit">
              {loading ? "Creating account..." : "Create Account"}
            </Button>
          </Field>
        </FieldGroup>
      </form>
      <FieldDescription className="px-6 text-center">
        By clicking continue, you agree to our{" "}
        <button className="underline" type="button">
          Terms of Service
        </button>{" "}
        and{" "}
        <button className="underline" type="button">
          Privacy Policy
        </button>
        .
      </FieldDescription>
    </div>
  );
}
