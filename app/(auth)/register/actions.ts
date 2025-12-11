"use server";

import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { users, invitations } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
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
    const [invitationData] = await db.select().from(invitations).where(eq(invitations.token, token)).limit(1);

    if (!invitationData || invitationData.used || invitationData.expiresAt < new Date()) {
      return { error: "Invalid or expired invitation token" };
    }

    if (invitationData.email !== email) {
      return { error: "Email does not match invitation" };
    }

    invitation = invitationData;
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

  await db.insert(users).values({
    id: data.user.id,
    email: data.user.email!,
    role: userRole as "owner" | "coach" | "athlete",
    gymId,
    onboarded: false,
    // Pre-populate with invitation info if available
    name: invitation?.name || null,
    phone: invitation?.phone || null,
    address: invitation?.address || null,
  });

  // Mark invitation as used
  if (invitation) {
    await db.update(invitations)
      .set({ used: true })
      .where(eq(invitations.id, invitation.id));
  }

  // If user was invited, redirect to profile setup
  if (invitation) {
    redirect("/profile-setup");
  }

  // If head coach, redirect to onboarding
  if (userRole === "owner") {
    redirect("/onboarding");
  }

  // For coaches/athletes without invitation, they need profile setup
  redirect("/profile-setup");
}

