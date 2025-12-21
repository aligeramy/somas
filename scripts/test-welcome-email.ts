/**
 * Test script to send a welcome email to a specific email address
 * 
 * Usage:
 *   npx tsx scripts/test-welcome-email.ts ali@softxinnovations.ca
 */

// Load environment variables FIRST before any other imports
import { config } from "dotenv";
import { resolve } from "path";

// Try loading .env.local first, then .env
const envLocal = config({ path: resolve(process.cwd(), ".env.local") });
const env = config({ path: resolve(process.cwd(), ".env") });

// Verify required env vars
const requiredVars = [
  "RESEND_API_KEY",
  "RESEND_FROM_NAME",
  "RESEND_FROM_EMAIL",
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
];

const missingVars = requiredVars.filter((v) => !process.env[v]);

if (missingVars.length > 0) {
  console.error("❌ Missing required environment variables:");
  missingVars.forEach((v) => console.error(`   - ${v}`));
  console.error("\nPlease ensure these are set in your .env file.");
  process.exit(1);
}

// Now import other modules after env vars are loaded
import { Resend } from "resend";
import { WelcomeEmail } from "../emails/welcome";
import { createAdminClient } from "../lib/supabase/admin";

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendTestWelcomeEmail(email: string) {
  try {
    console.log(`Sending test welcome email to ${email}...\n`);

    const supabaseAdmin = createAdminClient();

    // For testing, use default gym info or get from Supabase
    // You can customize these values
    const gymName = process.env.TEST_GYM_NAME || "Titans of Mississauga";
    const gymLogoUrl = process.env.TEST_GYM_LOGO_URL || null;
    const userName = email.split("@")[0]; // Use email prefix as name

    console.log(`Using gym: ${gymName}`);

    // Generate password reset token for setup link
    const { data: resetData, error: resetError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email: email,
      });

    if (resetError || !resetData.properties?.hashed_token) {
      throw new Error(
        `Failed to generate password setup link: ${resetError?.message || "Unknown error"}`,
      );
    }

    const setupUrl = `${process.env.NEXT_PUBLIC_APP_URL}/setup-password?token=${resetData.properties.hashed_token}&email=${encodeURIComponent(email)}`;

    // Add unique message ID to prevent email threading
    const messageId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
    // Send welcome email
    const result = await resend.emails.send({
      from: `${process.env.RESEND_FROM_NAME} <${process.env.RESEND_FROM_EMAIL}>`,
      to: email,
      subject: `Get Started with ${gymName || "TOM"} - Account Setup`,
      react: WelcomeEmail({
        gymName: gymName,
        gymLogoUrl: gymLogoUrl,
        userName: userName,
        setupUrl,
      }),
      headers: {
        "Message-ID": `<${messageId}@titansofmississauga.ca>`,
        "X-Entity-Ref-ID": messageId,
      },
    });

    if (result.error) {
      throw new Error(`Failed to send email: ${result.error.message}`);
    }

    console.log(`✅ Successfully sent welcome email to ${email}`);
    console.log(`📧 Email ID: ${result.data?.id}`);
    console.log(`🔗 Setup URL: ${setupUrl}`);
  } catch (error) {
    console.error("❌ Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Get email from command line arguments
const email = process.argv[2];

if (!email) {
  console.error("❌ Please provide an email address");
  console.log("Usage: npx tsx scripts/test-welcome-email.ts <email>");
  process.exit(1);
}

sendTestWelcomeEmail(email).catch((error) => {
  console.error("Script failed:", error);
  process.exit(1);
});

