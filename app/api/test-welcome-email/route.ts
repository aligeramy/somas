import { NextResponse } from "next/server";
import { Resend } from "resend";
import { WelcomeEmail } from "@/emails/welcome";
import { createAdminClient } from "@/lib/supabase/admin";

const resend = new Resend(process.env.RESEND_API_KEY);

// Test endpoint - no auth required for testing
export async function POST(request: Request) {
  try {
    // Allow only in development or with a test token
    if (
      process.env.NODE_ENV === "production" &&
      request.headers.get("x-test-token") !== process.env.TEST_API_TOKEN
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // For testing, use default gym info
    const gymName = "Titans of Mississauga";
    const gymLogoUrl = null;
    const userName = email.split("@")[0];

    // Try to generate password reset link if service key is available
    let setupUrl = `${process.env.NEXT_PUBLIC_APP_URL}/setup-password?email=${encodeURIComponent(email)}`;

    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const supabaseAdmin = createAdminClient();
        const { data: resetData } = await supabaseAdmin.auth.admin.generateLink({
          type: "recovery",
          email: email,
        });

        if (resetData?.properties?.hashed_token) {
          setupUrl = `${process.env.NEXT_PUBLIC_APP_URL}/setup-password?token=${resetData.properties.hashed_token}&email=${encodeURIComponent(email)}`;
        }
      } catch (error) {
        console.log("Could not generate password reset link, using email-only URL");
      }
    }

    // Send welcome email
    const result = await resend.emails.send({
      from: `${process.env.RESEND_FROM_NAME} <${process.env.RESEND_FROM_EMAIL}>`,
      to: email,
      subject: `Welcome to ${gymName}!`,
      react: WelcomeEmail({
        gymName,
        gymLogoUrl,
        userName,
        setupUrl,
      }),
    });

    if (result.error) {
      return NextResponse.json(
        { error: `Failed to send email: ${result.error.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      emailId: result.data?.id,
      setupUrl,
    });
  } catch (error) {
    console.error("Test welcome email error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send email" },
      { status: 500 },
    );
  }
}

