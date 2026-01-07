/**
 * Script to send welcome emails to all users who haven't completed onboarding
 *
 * Usage:
 *   npx tsx scripts/send-welcome-emails.ts
 *
 * Or with specific gym:
 *   npx tsx scripts/send-welcome-emails.ts --gym-id <gym-id>
 */

import { and, eq } from "drizzle-orm";
import { Resend } from "resend";
import { gyms, users } from "../drizzle/schema";
import { WelcomeEmail } from "../emails/welcome";
import { db } from "../lib/db";
import { createAdminClient } from "../lib/supabase/admin";

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendWelcomeEmails(gymId?: string) {
  try {
    console.log("Starting welcome email script...\n");

    // Get all users who haven't completed onboarding
    const usersToEmail = await db
      .select()
      .from(users)
      .where(
        gymId
          ? and(eq(users.onboarded, false), eq(users.gymId, gymId))
          : eq(users.onboarded, false),
      );

    if (usersToEmail.length === 0) {
      console.log("No users found that need welcome emails.");
      return;
    }

    console.log(`Found ${usersToEmail.length} users to email.\n`);

    const supabaseAdmin = createAdminClient();
    let sent = 0;
    let errors = 0;

    // Helper function to delay between requests (Resend rate limit: 2 requests/second)
    const delay = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));

    for (let i = 0; i < usersToEmail.length; i++) {
      const user = usersToEmail[i];
      try {
        if (!user.email || !user.gymId) {
          console.log(`⚠ Skipping user ${user.id}: missing email or gymId`);
          continue;
        }

        // Get gym info
        const [gym] = await db
          .select()
          .from(gyms)
          .where(eq(gyms.id, user.gymId))
          .limit(1);

        if (!gym) {
          console.log(`⚠ Skipping user ${user.email}: gym not found`);
          continue;
        }

        // Generate password reset token for setup link
        const { data: resetData, error: resetError } =
          await supabaseAdmin.auth.admin.generateLink({
            type: "recovery",
            email: user.email,
          });

        if (resetError || !resetData.properties?.hashed_token) {
          console.error(
            `✗ Failed to generate link for ${user.email}:`,
            resetError?.message || "Unknown error",
          );
          errors++;
          continue;
        }

        const setupUrl = `${process.env.NEXT_PUBLIC_APP_URL}/setup-password?token=${resetData.properties.hashed_token}&email=${encodeURIComponent(user.email)}`;

        // Add unique message ID to prevent email threading
        const messageId = `${Date.now()}-${user.id}-${Math.random().toString(36).substring(7)}`;
        // Send welcome email
        await resend.emails.send({
          from: `${process.env.RESEND_FROM_NAME} <${process.env.RESEND_FROM_EMAIL}>`,
          to: user.email,
          subject: `Get Started with ${gym.name} - Account Setup`,
          react: WelcomeEmail({
            gymName: gym.name,
            gymLogoUrl: gym.logoUrl,
            userName: user.name || user.email,
            setupUrl,
          }),
          headers: {
            "Message-ID": `<${messageId}@titansofmississauga.ca>`,
            "X-Entity-Ref-ID": messageId,
          },
        });

        console.log(`✓ Sent welcome email to ${user.email}`);
        sent++;

        // Rate limit: wait 600ms between requests (allows max 1.67 req/sec, safely under 2/sec limit)
        // Skip delay on last iteration
        if (i < usersToEmail.length - 1) {
          await delay(600);
        }
      } catch (error) {
        console.error(`✗ Error sending email to ${user.email}:`, error);
        errors++;
        // Still delay even on error to respect rate limits
        if (i < usersToEmail.length - 1) {
          await delay(600);
        }
      }
    }

    console.log(`\n✅ Complete! Sent ${sent} emails, ${errors} errors.`);
  } catch (error) {
    console.error("Fatal error:", error);
    process.exit(1);
  }
}

// Run script
const gymId = process.argv
  .find((arg) => arg.startsWith("--gym-id="))
  ?.split("=")[1];

sendWelcomeEmails(gymId).catch((error) => {
  console.error("Script failed:", error);
  process.exit(1);
});
