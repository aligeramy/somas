import { eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { gyms, users } from "@/drizzle/schema";
import { LoginCredentialsEmail } from "@/emails/login-credentials";
import { db } from "@/lib/db";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getAppUrl } from "@/lib/utils";

const resend = new Resend(process.env.RESEND_API_KEY);

// Password mapping for non-onboarded users (simple phrases)
const USER_PASSWORDS: Record<string, string> = {
  "b866a793-d050-4440-ab01-fa76a5502249": "admin123", // Pascal Tyrrell
  "4edfaa2a-02c4-4ebb-b5e6-408973be66a1": "coach123", // Sabrina
  "1dd9d2cb-54ce-4113-9d76-0776d2d4aa79": "volunteer123", // Alex Gaul
  "a8543e21-c1fa-4f0f-ba0c-17359d866008": "athlete123", // Timea Dancisinova
  "ae15e708-9aeb-4215-92f8-25af062f4b55": "peter123", // Peter Smith
  "09c69b09-1b66-47dc-9393-32c436f4c734": "jack123", // Jack Ellery
  "c9c4542e-ad41-40d1-a24c-50b51e84c9de": "lauren123", // Lauren Maquis
  "6832441b-8005-4480-89b7-4160ed5773a8": "ali123", // Ali
};

interface EmailResult {
  email: string;
  success: boolean;
  error?: string;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get current user from database
    const [dbUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    if (!(dbUser && isOwnerOrManager(dbUser.role))) {
      return NextResponse.json(
        { error: "Forbidden - Admin only" },
        { status: 403 }
      );
    }

    if (!dbUser.gymId) {
      return NextResponse.json(
        { error: "User must belong to a gym" },
        { status: 400 }
      );
    }

    // Get gym info
    const [gym] = await db
      .select()
      .from(gyms)
      .where(eq(gyms.id, dbUser.gymId))
      .limit(1);

    if (!gym) {
      return NextResponse.json({ error: "Gym not found" }, { status: 400 });
    }

    const { userIds, testEmail } = await request.json();

    if (!(userIds && Array.isArray(userIds)) || userIds.length === 0) {
      return NextResponse.json({ error: "No users selected" }, { status: 400 });
    }

    // For test emails, only allow single user
    if (testEmail && userIds.length > 1) {
      return NextResponse.json(
        { error: "Test email can only be sent for one user at a time" },
        { status: 400 }
      );
    }

    // Get selected users (only from same gym for security)
    const selectedUsers = await db
      .select()
      .from(users)
      .where(inArray(users.id, userIds));

    // Filter to only users in the same gym
    const gymUsers = selectedUsers.filter((u) => u.gymId === dbUser.gymId);

    const supabaseAdmin = createAdminClient();
    const results: EmailResult[] = [];

    // Validate app URL
    let appUrl: string;
    try {
      appUrl = getAppUrl();
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Invalid app URL configuration",
        },
        { status: 400 }
      );
    }

    // Helper function to delay between requests (Resend rate limit: 2 requests/second)
    const delay = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));

    for (let i = 0; i < gymUsers.length; i++) {
      const targetUser = gymUsers[i];
      try {
        // Get password for this user
        const password = USER_PASSWORDS[targetUser.id];
        if (!password) {
          results.push({
            email: targetUser.email,
            success: false,
            error: "No password assigned for this user",
          });
          continue;
        }

        // Check if user exists in Supabase Auth
        const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
        const authUser = authUsers?.users?.find(
          (u) => u.email === targetUser.email
        );

        if (authUser) {
          // Update existing user's password
          const { error: updateError } =
            await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
              password,
            });

          if (updateError) {
            results.push({
              email: targetUser.email,
              success: false,
              error: `Failed to update password: ${updateError.message}`,
            });
            continue;
          }
        } else {
          // Create user in Supabase Auth if doesn't exist
          const { error: createError } =
            await supabaseAdmin.auth.admin.createUser({
              email: targetUser.email,
              password,
              email_confirm: true,
              user_metadata: { name: targetUser.name || null },
            });

          if (createError) {
            results.push({
              email: targetUser.email,
              success: false,
              error: `Failed to create auth user: ${createError.message}`,
            });
            continue;
          }
        }

        // Send email with credentials
        const loginUrl = `${appUrl}/login`;
        const messageId = `${Date.now()}-${targetUser.id}-${Math.random().toString(36).substring(7)}`;

        // Use test email if provided, otherwise use user's email
        const recipientEmail = testEmail || targetUser.email;
        const emailSubject = testEmail
          ? `[TEST] Welcome to ${gym.name} - Your Login Credentials`
          : `Welcome to ${gym.name} - Your Login Credentials`;

        const emailResult = await resend.emails.send({
          from: `${process.env.RESEND_FROM_NAME} <${process.env.RESEND_FROM_EMAIL}>`,
          to: recipientEmail,
          subject: emailSubject,
          react: LoginCredentialsEmail({
            gymName: gym.name,
            gymLogoUrl: gym.logoUrl,
            userName: targetUser.name || targetUser.email,
            email: targetUser.email, // Always show the actual user's email in the email content
            password,
            loginUrl,
          }),
          headers: {
            "Message-ID": `<${messageId}@titansofmississauga.ca>`,
            "X-Entity-Ref-ID": messageId,
          },
        });

        if (emailResult.error) {
          results.push({
            email: recipientEmail,
            success: false,
            error: emailResult.error.message,
          });
        } else {
          results.push({
            email: recipientEmail,
            success: true,
          });
        }

        // Rate limit: wait 600ms between requests
        if (i < gymUsers.length - 1) {
          await delay(600);
        }
      } catch (error) {
        results.push({
          email: targetUser.email,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        // Still delay even on error to respect rate limits
        if (i < gymUsers.length - 1) {
          await delay(600);
        }
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: failCount === 0,
      sent: successCount,
      failed: failCount,
      results,
    });
  } catch (error) {
    console.error("Error sending credentials:", error);
    return NextResponse.json(
      { error: "Failed to send credentials" },
      { status: 500 }
    );
  }
}
