import { randomBytes } from "node:crypto";
import { eq, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { gyms, users } from "@/drizzle/schema";
import { WelcomeEmail } from "@/emails/welcome";
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
      return NextResponse.json({ error: "User not found" }, { status: 404 });
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

    let setupUrl = `${appUrl}/setup-password?email=${encodeURIComponent(authEmail)}`;

    if (!authUser) {
      // Create user in Supabase Auth if doesn't exist
      const randomPassword = randomBytes(16).toString("hex");
      const { error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: authEmail,
        password: randomPassword,
        email_confirm: true,
        user_metadata: { name: dbUser.name || null },
      });

      if (createError) {
        return NextResponse.json(
          { error: `Failed to create auth user: ${createError.message}` },
          { status: 500 },
        );
      }

      // Generate magic link for new user
      const { data: linkData, error: linkError } =
        await supabaseAdmin.auth.admin.generateLink({
          type: "magiclink",
          email: authEmail,
        });

      if (linkError) {
        console.error("Magic link error:", linkError);
      } else if (linkData?.properties?.hashed_token) {
        setupUrl = `${appUrl}/setup-password?token=${linkData.properties.hashed_token}&type=magiclink&email=${encodeURIComponent(authEmail)}`;
      }
    } else {
      // User exists - generate recovery link
      const { data: linkData, error: linkError } =
        await supabaseAdmin.auth.admin.generateLink({
          type: "recovery",
          email: authEmail,
        });

      if (linkError) {
        console.error("Recovery link error:", linkError);
      } else if (linkData?.properties?.hashed_token) {
        setupUrl = `${appUrl}/setup-password?token=${linkData.properties.hashed_token}&type=recovery&email=${encodeURIComponent(authEmail)}`;
      }
    }

    // Add unique message ID to prevent email threading
    const messageId = `${Date.now()}-${dbUser.id}-${Math.random().toString(36).substring(7)}`;

    // Send welcome email
    const emailResult = await resend.emails.send({
      from: `${process.env.RESEND_FROM_NAME} <${process.env.RESEND_FROM_EMAIL}>`,
      to: authEmail,
      subject: `Get Started with ${gym.name} - Account Setup`,
      react: WelcomeEmail({
        gymName: gym.name,
        gymLogoUrl: gym.logoUrl,
        userName: dbUser.name || authEmail,
        setupUrl,
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
      message: "Welcome email sent successfully",
      email: authEmail,
    });
  } catch (error) {
    console.error("Send welcome email error:", error);
    return NextResponse.json(
      { error: "Failed to send welcome email" },
      { status: 500 },
    );
  }
}
