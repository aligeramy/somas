import { randomBytes } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { gyms, users } from "@/drizzle/schema";
import { WelcomeEmail } from "@/emails/welcome";
import { db } from "@/lib/db";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getAppUrl } from "@/lib/utils";

const resend = new Resend(process.env.RESEND_API_KEY);

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
      return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 });
    }

    if (!dbUser.gymId) {
      return NextResponse.json({ error: "User must belong to a gym" }, { status: 400 });
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

    const { userIds, type } = await request.json();

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: "No users selected" }, { status: 400 });
    }

    if (!type || !["welcome", "reset"].includes(type)) {
      return NextResponse.json({ error: "Invalid email type" }, { status: 400 });
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

    // Validate app URL - prevent localhost in production
    let appUrl: string;
    try {
      appUrl = getAppUrl();
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Invalid app URL configuration" },
        { status: 400 }
      );
    }

    // Helper function to delay between requests (Resend rate limit: 2 requests/second)
    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    for (let i = 0; i < gymUsers.length; i++) {
      const targetUser = gymUsers[i];
      try {
        let setupUrl = `${appUrl}/setup-password?email=${encodeURIComponent(targetUser.email)}`;

        // Check if user exists in Supabase Auth
        const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
        const authUser = authUsers?.users?.find((u) => u.email === targetUser.email);

        if (type === "welcome") {
          if (!authUser) {
            // Create user in Supabase Auth if doesn't exist
            const randomPassword = randomBytes(16).toString("hex");
            const { data: newAuthUser, error: createError } =
              await supabaseAdmin.auth.admin.createUser({
                email: targetUser.email,
                password: randomPassword,
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

            // Generate magic link for new user
            const { data: linkData, error: linkError } =
              await supabaseAdmin.auth.admin.generateLink({
                type: "magiclink",
                email: targetUser.email,
              });

            if (linkError) {
              console.error("Magic link error:", linkError);
            } else if (linkData?.properties?.hashed_token) {
              setupUrl = `${appUrl}/setup-password?token=${linkData.properties.hashed_token}&type=magiclink&email=${encodeURIComponent(targetUser.email)}`;
            }
          } else {
            // User exists - generate recovery link
            const { data: linkData, error: linkError } =
              await supabaseAdmin.auth.admin.generateLink({
                type: "recovery",
                email: targetUser.email,
              });

            if (linkError) {
              console.error("Recovery link error:", linkError);
            } else if (linkData?.properties?.hashed_token) {
              setupUrl = `${appUrl}/setup-password?token=${linkData.properties.hashed_token}&type=recovery&email=${encodeURIComponent(targetUser.email)}`;
            }
          }
        } else if (type === "reset") {
          // Password reset - user must exist
          if (!authUser) {
            results.push({
              email: targetUser.email,
              success: false,
              error: "User doesn't have an auth account yet",
            });
            continue;
          }

          const { data: linkData, error: linkError } =
            await supabaseAdmin.auth.admin.generateLink({
              type: "recovery",
              email: targetUser.email,
            });

          if (linkError) {
            results.push({
              email: targetUser.email,
              success: false,
              error: `Failed to generate reset link: ${linkError.message}`,
            });
            continue;
          }

          if (linkData?.properties?.hashed_token) {
            setupUrl = `${appUrl}/setup-password?token=${linkData.properties.hashed_token}&type=recovery&email=${encodeURIComponent(targetUser.email)}`;
          }
        }

        // For welcome/reset emails, only send to primary email
        // (password setup links are tied to primary email in Supabase Auth)
        // Alt emails will receive regular reminders/notifications, but not account setup emails
        const emailResult = await resend.emails.send({
          from: `${process.env.RESEND_FROM_NAME} <${process.env.RESEND_FROM_EMAIL}>`,
          to: targetUser.email,
          subject:
            type === "welcome"
              ? "Welcome to TOM App"
              : `Reset your password - ${gym.name}`,
          react: WelcomeEmail({
            gymName: gym.name,
            gymLogoUrl: gym.logoUrl,
            userName: targetUser.name || targetUser.email,
            setupUrl,
          }),
        });

        if (emailResult.error) {
          results.push({
            email: targetUser.email,
            success: false,
            error: emailResult.error.message,
          });
        } else {
          results.push({
            email: targetUser.email,
            success: true,
          });
        }

        // Rate limit: wait 600ms between requests (allows max 1.67 req/sec, safely under 2/sec limit)
        // Skip delay on last iteration
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
    console.error("Error sending emails:", error);
    return NextResponse.json(
      { error: "Failed to send emails" },
      { status: 500 }
    );
  }
}

