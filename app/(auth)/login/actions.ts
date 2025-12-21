"use server";

import { eq, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { users } from "@/drizzle/schema";
import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

export async function loginAction(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  // Check if email matches primary email or altEmail
  const [user] = await db
    .select()
    .from(users)
    .where(or(eq(users.email, email), eq(users.altEmail, email)))
    .limit(1);

  // If user found and email matches altEmail, use primary email for auth
  const authEmail = user?.altEmail === email ? user.email : email;

  const { error } = await supabase.auth.signInWithPassword({
    email: authEmail,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  // Revalidate paths to ensure fresh data
  revalidatePath("/dashboard");
  revalidatePath("/profile-setup");
  revalidatePath("/onboarding");
  
  return { success: true };
}

