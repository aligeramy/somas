"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { invitations, users } from "@/drizzle/schema";
import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

export async function registerAction(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const token = formData.get("token") as string | null;
  const role = formData.get("role") as string | null;

  // If token provided, validate invitation
  let invitation = null;
  if (token) {
    const [invitationData] = await db
      .select()
      .from(invitations)
      .where(eq(invitations.token, token))
      .limit(1);

    if (
      !invitationData ||
      invitationData.used ||
      invitationData.expiresAt < new Date()
    ) {
      return { error: "Invalid or expired invitation token" };
    }

    if (invitationData.email !== email) {
      return { error: "Email does not match invitation" };
    }

    invitation = invitationData;
  }

  // Check if user already exists in database before attempting auth signup
  const [existingDbUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  // Sign up user in Supabase Auth
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
    },
  });

  // Handle auth errors
  if (error) {
    // If user already exists in auth, they should sign in instead
    if (
      error.message.includes("already registered") ||
      error.message.includes("already exists")
    ) {
      return {
        error:
          "An account with this email already exists. Please sign in instead.",
      };
    }
    return { error: error.message };
  }

  if (!data.user) {
    return { error: "Failed to create user" };
  }

  // Create or update user in database
  const userRole = role || invitation?.role || "athlete";
  const gymId = invitation?.gymId || null;

  // Use existingDbUser if available (we already checked above)
  if (existingDbUser) {
    // User exists, update with auth ID and any new information
    await db
      .update(users)
      .set({
        id: data.user.id, // Link to Supabase auth user
        role: userRole as "owner" | "coach" | "athlete",
        gymId: gymId || existingDbUser.gymId, // Preserve existing gymId if no invitation
        // Update with invitation info if available, otherwise preserve existing
        name: invitation?.name || existingDbUser.name,
        phone: invitation?.phone || existingDbUser.phone,
        address: invitation?.address || existingDbUser.address,
        updatedAt: new Date(),
      })
      .where(eq(users.email, email));
  } else {
    // User doesn't exist, create new record
    await db.insert(users).values({
      id: data.user.id,
      email,
      role: userRole as "owner" | "coach" | "athlete",
      gymId,
      onboarded: false,
      // Pre-populate with invitation info if available
      name: invitation?.name || null,
      phone: invitation?.phone || null,
      address: invitation?.address || null,
    });
  }

  // Mark invitation as used
  if (invitation) {
    await db
      .update(invitations)
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
