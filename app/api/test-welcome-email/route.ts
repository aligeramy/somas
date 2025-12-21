import { randomBytes } from "node:crypto";
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

    let setupUrl = `${process.env.NEXT_PUBLIC_APP_URL}/setup-password?email=${encodeURIComponent(email)}`;
    let userCreated = false;
    let userId: string | null = null;

    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const supabaseAdmin = createAdminClient();

        // Check if user already exists
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = existingUsers?.users?.find(u => u.email === email);

        if (existingUser) {
          // User exists - generate recovery link
          const { data: resetData, error: resetError } = await supabaseAdmin.auth.admin.generateLink({
            type: "recovery",
            email: email,
          });

          if (resetError) {
            console.error("Recovery link error:", resetError);
          } else if (resetData?.properties?.hashed_token) {
            setupUrl = `${process.env.NEXT_PUBLIC_APP_URL}/setup-password?token=${resetData.properties.hashed_token}&type=recovery&email=${encodeURIComponent(email)}`;
          }
          userId = existingUser.id;
        } else {
          // Create new user with random password
          const randomPassword = randomBytes(16).toString("hex");
          const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password: randomPassword,
            email_confirm: true, // Auto-confirm so they can use magic link
            user_metadata: { name: userName },
          });

          if (createError) {
            console.error("Create user error:", createError);
            return NextResponse.json(
              { error: `Failed to create user: ${createError.message}` },
              { status: 500 },
            );
          }

          userCreated = true;
          userId = authData.user?.id || null;

          // Generate invite/magic link for new user
          const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.generateLink({
            type: "magiclink",
            email: email,
          });

          if (inviteError) {
            console.error("Invite link error:", inviteError);
          } else if (inviteData?.properties?.hashed_token) {
            setupUrl = `${process.env.NEXT_PUBLIC_APP_URL}/setup-password?token=${inviteData.properties.hashed_token}&type=magiclink&email=${encodeURIComponent(email)}`;
          }
        }
      } catch (error) {
        console.error("Supabase admin error:", error);
      }
    }

    // Add unique message ID to prevent email threading
    const messageId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
    // Send welcome email
    const result = await resend.emails.send({
      from: `${process.env.RESEND_FROM_NAME} <${process.env.RESEND_FROM_EMAIL}>`,
      to: email,
      subject: `Get Started with ${gymName || "TOM"} - Account Setup`,
      react: WelcomeEmail({
        gymName,
        gymLogoUrl,
        userName,
        setupUrl,
      }),
      headers: {
        "Message-ID": `<${messageId}@titansofmississauga.ca>`,
        "X-Entity-Ref-ID": messageId,
      },
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
      userCreated,
      userId,
    });
  } catch (error) {
    console.error("Test welcome email error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send email" },
      { status: 500 },
    );
  }
}

