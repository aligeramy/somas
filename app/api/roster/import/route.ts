import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { parse } from "papaparse";
import { randomBytes } from "crypto";
import { Resend } from "resend";
import { InvitationEmail } from "@/emails/invitation";

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

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { gym: true },
    });

    if (!dbUser || !dbUser.gym) {
      return NextResponse.json(
        { error: "User must belong to a gym" },
        { status: 400 },
      );
    }

    // Only owners can import roster
    if (dbUser.role !== "owner") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "File is required" },
        { status: 400 },
      );
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

    const invitations = [];
    const errors = [];

    for (const row of data) {
      try {
        // Extract email and role from row
        // Support both "email" and "Email" keys, and "role" and "Role"
        const email =
          row.email || row.Email || row["email address"] || row["Email Address"];
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

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
          where: { email },
        });

        if (existingUser) {
          errors.push({ email, error: "User already exists" });
          continue;
        }

        // Check for existing invitation
        const existingInvitation = await prisma.invitation.findFirst({
          where: {
            email,
            gymId: dbUser.gymId!,
            used: false,
            expiresAt: { gt: new Date() },
          },
        });

        if (existingInvitation) {
          errors.push({ email, error: "Invitation already sent" });
          continue;
        }

        // Generate token
        const token = randomBytes(32).toString("hex");
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

        // Create invitation
        const invitation = await prisma.invitation.create({
          data: {
            gymId: dbUser.gymId!,
            email,
            role: role as "coach" | "athlete",
            token,
            invitedById: user.id,
            expiresAt,
          },
        });

        // Send email
        const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/register?token=${token}&email=${encodeURIComponent(email)}`;

        await resend.emails.send({
          from: `${process.env.RESEND_FROM_NAME} <${process.env.RESEND_FROM_EMAIL}>`,
          to: email,
          subject: `Invitation to join ${dbUser.gym.name} on TOM`,
          react: InvitationEmail({
            gymName: dbUser.gym.name,
            inviteUrl,
            role,
          }),
        });

        invitations.push(invitation);
      } catch (error) {
        errors.push({
          row,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({
      success: true,
      invitations: invitations.length,
      errors: errors.length,
      details: {
        invitations,
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

