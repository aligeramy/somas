"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export async function registerAction(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const token = formData.get("token") as string | null;
  const role = formData.get("role") as string | null;

  // If token provided, validate invitation
  let invitation = null;
  if (token) {
    invitation = await prisma.invitation.findUnique({
      where: { token },
      include: { gym: true },
    });

    if (!invitation || invitation.used || invitation.expiresAt < new Date()) {
      return { error: "Invalid or expired invitation token" };
    }

    if (invitation.email !== email) {
      return { error: "Email does not match invitation" };
    }
  }

  // Sign up user
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (!data.user) {
    return { error: "Failed to create user" };
  }

  // Create user in database
  const userRole = role || invitation?.role || "athlete";
  const gymId = invitation?.gymId || null;

  await prisma.user.create({
    data: {
      id: data.user.id,
      email: data.user.email!,
      role: userRole as "owner" | "coach" | "athlete",
      gymId,
      onboarded: false,
    },
  });

  // Mark invitation as used
  if (invitation) {
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { used: true },
    });
  }

  // If user was invited, redirect to profile setup
  if (invitation) {
    redirect("/profile-setup");
  }

  // If owner, redirect to onboarding
  if (userRole === "owner") {
    redirect("/onboarding");
  }

  // For coaches/athletes without invitation, they need profile setup
  redirect("/profile-setup");
}

