import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { parse } from "papaparse";
import { Resend } from "resend";
import { gyms, users } from "@/drizzle/schema";
import { WelcomeEmail } from "@/emails/welcome";
import { db } from "@/lib/db";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [dbUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    if (!dbUser || !dbUser.gymId) {
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

    // Only head coaches can import roster
    if (dbUser.role !== "owner") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    const text = await file.text();
    let data: Array<Record<string, string>> = [];

    // Parse file based on extension
    if (file.name.endsWith(".json")) {
      data = JSON.parse(text);
    } else if (file.name.endsWith(".csv")) {
      const result = parse(text, {
        header: true,
        skipEmptyLines: true,
      });
      data = result.data as Array<Record<string, string>>;
    } else {
      return NextResponse.json(
        { error: "Unsupported file format. Use CSV or JSON." },
        { status: 400 },
      );
    }

    const supabaseAdmin = createAdminClient();
    const createdUsers: Array<{ email: string; userId: string }> = [];
    const errors: Array<{
      row?: Record<string, string>;
      email?: string;
      error: string;
    }> = [];

    for (const row of data) {
      try {
        // Extract data from row
        const email =
          row.email ||
          row.Email ||
          row["email address"] ||
          row["Email Address"];
        const name = row.name || row.Name || row["full name"] || row["Full Name"];
        const phone = row.phone || row.Phone || row["phone number"];
        const address = row.address || row.Address;
        const roleRaw =
          row.role ||
          row.Role ||
          row["user role"] ||
          row["User Role"] ||
          "athlete";

        if (!email) {
          errors.push({
            row,
            error: "Email is required",
          });
          continue;
        }

        // Normalize role
        const role =
          roleRaw.toLowerCase() === "coach" ||
          roleRaw.toLowerCase() === "head coach"
            ? "coach"
            : "athlete";

        // Check if user already exists in database
        const [existingUser] = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        if (existingUser) {
          errors.push({ email, error: "User already exists" });
          continue;
        }

        // Generate random password (32 characters)
        const randomPassword = randomBytes(16).toString("hex");

        // Create user in Supabase Auth with admin client
        const { data: authData, error: authError } =
          await supabaseAdmin.auth.admin.createUser({
            email,
            password: randomPassword,
            email_confirm: true, // Auto-confirm email so they can login
            user_metadata: {
              name: name || null,
            },
          });

        if (authError || !authData.user) {
          errors.push({
            email,
            error: authError?.message || "Failed to create user in auth",
          });
          continue;
        }

        // Create user record in database first
        await db.insert(users).values({
          id: authData.user.id,
          email,
          name: name || null,
          phone: phone || null,
          address: address || null,
          role: role as "coach" | "athlete",
          gymId: dbUser.gymId,
          onboarded: false, // They need to complete onboarding
        });

        // Generate password reset token for setup link
        const { data: resetData, error: resetError } =
          await supabaseAdmin.auth.admin.generateLink({
            type: "recovery",
            email,
          });

        if (resetError || !resetData.properties?.hashed_token) {
          errors.push({
            email,
            error: `Failed to generate password setup link: ${resetError?.message || "Unknown error"}`,
          });
          // Continue anyway - user is created, they can use password reset
        }

        // Send welcome email with password setup link
        const setupUrl = resetData?.properties?.hashed_token
          ? `${process.env.NEXT_PUBLIC_APP_URL}/setup-password?token=${resetData.properties.hashed_token}&email=${encodeURIComponent(email)}`
          : `${process.env.NEXT_PUBLIC_APP_URL}/setup-password?email=${encodeURIComponent(email)}`;

        await resend.emails.send({
          from: `${process.env.RESEND_FROM_NAME} <${process.env.RESEND_FROM_EMAIL}>`,
          to: email,
          subject: "Welcome to TOM App",
          react: WelcomeEmail({
            gymName: gym.name,
            gymLogoUrl: gym.logoUrl,
            userName: name || email,
            setupUrl,
          }),
        });

        createdUsers.push({ email, userId: authData.user.id });
      } catch (error) {
        errors.push({
          row,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({
      success: true,
      created: createdUsers.length,
      errors: errors.length,
      details: {
        users: createdUsers,
        errors: errors.length > 0 ? errors : undefined,
      },
    });
  } catch (error) {
    console.error("Roster import error:", error);
    return NextResponse.json(
      { error: "Failed to import roster" },
      { status: 500 },
    );
  }
}
