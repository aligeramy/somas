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

// Password mapping for non-onboarded users (all wrestler names)
const USER_PASSWORDS: Record<string, string> = {
  "2bb0fc74-0d3a-4ca1-bc56-960cce122e7c": "therock", // Fariba Akbar
  "7f7e141c-ee02-47f7-a136-8e931715a423": "johncena", // Tatiana Bell
  "f294fb66-4c84-49b0-b602-b3d1c8b82d2b": "hulkhogan", // Mitra Jabbour
  "0be52ade-8fb3-4140-a338-726a1ffcfac2": "austin", // Luke Drummond
  "c2d420f0-e398-4be9-8dab-1c4d4388cd0b": "undertaker", // Mazin Turki
  "3265fb61-ad5a-4a6c-b9ec-b6ed9b4c1535": "goldberg", // Erik Singer
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

    if (!dbUser || dbUser.role !== "owner") {
      return NextResponse.json(
        { error: "Forbidden - Admin only" },
        { status: 403 },
      );
    }

    if (!dbUser.gymId) {
      return NextResponse.json(
        { error: "User must belong to a gym" },
        { status: 400 },
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

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: "No users selected" }, { status: 400 });
    }

    // For test emails, only allow single user
    if (testEmail && userIds.length > 1) {
      return NextResponse.json(
        { error: "Test email can only be sent for one user at a time" },
        { status: 400 },
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
        { status: 400 },
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
          (u) => u.email === targetUser.email,
        );

        if (!authUser) {
          // Create user in Supabase Auth if doesn't exist
          const { error: createError } =
            await supabaseAdmin.auth.admin.createUser({
              email: targetUser.email,
              password: password,
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
        } else {
          // Update existing user's password
          const { error: updateError } =
            await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
              password: password,
            });

          if (updateError) {
            results.push({
              email: targetUser.email,
              success: false,
              error: `Failed to update password: ${updateError.message}`,
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
            password: password,
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
      { status: 500 },
    );
  }
}
