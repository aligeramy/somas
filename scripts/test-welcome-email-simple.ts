/**
 * Simple test script to send a welcome email (without password reset link generation)
 * For full functionality, add SUPABASE_SERVICE_ROLE_KEY to .env
 * 
 * Usage:
 *   npx tsx scripts/test-welcome-email-simple.ts ali@softxinnovations.ca
 */

// Load environment variables FIRST before any other imports
import { config } from "dotenv";
import { resolve } from "path";

// Try loading .env.local first, then .env
config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

import React from "react";
import { Resend } from "resend";
import { WelcomeEmail } from "../emails/welcome";

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendTestWelcomeEmail(email: string) {
  try {
    console.log(`Sending test welcome email to ${email}...\n`);

    // Check required env vars
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is required");
    }
    if (!process.env.RESEND_FROM_NAME || !process.env.RESEND_FROM_EMAIL) {
      throw new Error("RESEND_FROM_NAME and RESEND_FROM_EMAIL are required");
    }
    if (!process.env.NEXT_PUBLIC_APP_URL) {
      throw new Error("NEXT_PUBLIC_APP_URL is required");
    }

    // For testing, use default gym info
    const gymName = "Titans of Mississauga";
    const gymLogoUrl = null;
    const userName = email.split("@")[0];

    // Create a setup URL (user will need to use password reset)
    const setupUrl = `${process.env.NEXT_PUBLIC_APP_URL}/setup-password?email=${encodeURIComponent(email)}`;

    console.log(`Using gym: ${gymName}`);
    console.log(`Setup URL: ${setupUrl}\n`);

    // Send welcome email (Resend handles React components automatically)
    const result = await resend.emails.send({
      from: `${process.env.RESEND_FROM_NAME} <${process.env.RESEND_FROM_EMAIL}>`,
      to: email,
      subject: `Welcome to ${gymName}!`,
      react: WelcomeEmail({
        gymName,
        gymLogoUrl,
        userName,
        setupUrl,
      }) as React.ReactElement,
    });

    if (result.error) {
      throw new Error(`Failed to send email: ${result.error.message}`);
    }

    console.log(`✅ Successfully sent welcome email to ${email}`);
    console.log(`📧 Email ID: ${result.data?.id}`);
    console.log(`\nNote: The setup URL will require the user to request a password reset.`);
    console.log(`For full functionality with direct password setup links, add SUPABASE_SERVICE_ROLE_KEY to .env`);
  } catch (error) {
    console.error("❌ Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Get email from command line arguments
const email = process.argv[2];

if (!email) {
  console.error("❌ Please provide an email address");
  console.log("Usage: npx tsx scripts/test-welcome-email-simple.ts <email>");
  process.exit(1);
}

sendTestWelcomeEmail(email).catch((error) => {
  console.error("Script failed:", error);
  process.exit(1);
});
