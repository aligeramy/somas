import { eq, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { gyms, users } from "@/drizzle/schema";
import { PasswordResetEmail } from "@/emails/password-reset";
import { db } from "@/lib/db";
import { createAdminClient } from "@/lib/supabase/admin";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || !email.trim()) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 },
      );
    }

    // Check if email matches primary email or altEmail
    const [dbUser] = await db
      .select()
      .from(users)
      .where(
        or(eq(users.email, email.trim()), eq(users.altEmail, email.trim())),
      )
      .limit(1);

    if (!dbUser) {
      // Don't reveal if user exists or not for security
      return NextResponse.json({
        success: true,
        message:
          "If an account exists with this email, a password reset link has been sent.",
      });
    }

    // Use primary email for auth operations
    const authEmail = dbUser.email;

    if (!dbUser.gymId) {
      return NextResponse.json(
        { error: "User is not associated with a gym" },
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
      return NextResponse.json({ error: "Gym not found" }, { status: 404 });
    }

    const supabaseAdmin = createAdminClient();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // Check if user exists in Supabase Auth
    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
    const authUser = authUsers?.users?.find((u) => u.email === authEmail);

    if (!authUser) {
      // User doesn't have an auth account yet - don't reveal this for security
      return NextResponse.json({
        success: true,
        message:
          "If an account exists with this email, a password reset link has been sent.",
      });
    }

    // Generate recovery link for password reset
    const { data: linkData, error: linkError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email: authEmail,
      });

    if (linkError) {
      console.error("Recovery link error:", linkError);
      return NextResponse.json(
        { error: `Failed to generate reset link: ${linkError.message}` },
        { status: 500 },
      );
    }

    const resetUrl = linkData?.properties?.hashed_token
      ? `${appUrl}/setup-password?token=${linkData.properties.hashed_token}&type=recovery&email=${encodeURIComponent(authEmail)}`
      : `${appUrl}/setup-password?email=${encodeURIComponent(authEmail)}`;

    // Add unique message ID to prevent email threading
    const messageId = `${Date.now()}-${dbUser.id}-${Math.random().toString(36).substring(7)}`;

    // Send password reset email
    const emailResult = await resend.emails.send({
      from: `${process.env.RESEND_FROM_NAME} <${process.env.RESEND_FROM_EMAIL}>`,
      to: authEmail,
      subject: `Reset Your Password - ${gym.name}`,
      react: PasswordResetEmail({
        gymName: gym.name,
        gymLogoUrl: gym.logoUrl,
        userName: dbUser.name || authEmail,
        resetUrl,
      }),
      headers: {
        "Message-ID": `<${messageId}@titansofmississauga.ca>`,
        "X-Entity-Ref-ID": messageId,
      },
    });

    if (emailResult.error) {
      return NextResponse.json(
        { error: `Failed to send email: ${emailResult.error.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "If an account exists with this email, a password reset link has been sent.",
    });
  } catch (error) {
    console.error("Password reset error:", error);
    return NextResponse.json(
      { error: "Failed to process password reset request" },
      { status: 500 },
    );
  }
}
