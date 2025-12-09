import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check if user exists in our database
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
  });

  // If user doesn't exist in DB, create them
  if (!dbUser) {
    // User will be created during registration flow
    // For now, redirect to register to complete profile
    redirect("/register");
  }

  // Check onboarding status
  // Owners go to onboarding, others go to profile-setup
  if (!dbUser.onboarded) {
    if (dbUser.role === "owner") {
      redirect("/onboarding");
    } else {
      redirect("/profile-setup");
    }
  }

  return <>{children}</>;
}

