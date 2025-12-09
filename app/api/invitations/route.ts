import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { Resend } from "resend";
import { InvitationEmail } from "@/emails/invitation";
import { randomBytes } from "crypto";

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

    // Only owners and coaches can invite
    if (dbUser.role !== "owner" && dbUser.role !== "coach") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { emails, role } = await request.json();

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json(
        { error: "Emails array is required" },
        { status: 400 },
      );
    }

    if (!role || !["coach", "athlete"].includes(role)) {
      return NextResponse.json(
        { error: "Valid role (coach or athlete) is required" },
        { status: 400 },
      );
    }

    const invitations = [];
    const errors = [];

    for (const email of emails) {
      try {
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
          email,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({
      success: true,
      invitations,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Invitation error:", error);
    return NextResponse.json(
      { error: "Failed to send invitations" },
      { status: 500 },
    );
  }
}

