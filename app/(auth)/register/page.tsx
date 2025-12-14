import { Suspense } from "react";
import { SignupForm } from "@/components/signup-form";

function RegisterForm() {
  return (
    <div className="bg-background flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="w-full max-w-sm">
        <SignupForm />
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-svh items-center justify-center">
          Loading...
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
