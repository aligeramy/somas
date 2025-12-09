import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { users, invitations, gyms } from "@/drizzle/schema";
import { eq, and, gt } from "drizzle-orm";
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

    const [dbUser] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);

    if (!dbUser || !dbUser.gymId) {
      return NextResponse.json(
        { error: "User must belong to a gym" },
        { status: 400 },
      );
    }

    // Get gym info
    const [gym] = await db.select().from(gyms).where(eq(gyms.id, dbUser.gymId)).limit(1);

    if (!gym) {
      return NextResponse.json(
        { error: "Gym not found" },
        { status: 400 },
      );
    }

    // Only owners and coaches can invite
    if (dbUser.role !== "owner" && dbUser.role !== "coach") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { emails, role, userInfo } = await request.json();

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

    const invitationsList = [];
    const errors = [];

    for (const email of emails) {
      try {
        // Check if user already exists
        const [existingUser] = await db.select().from(users).where(eq(users.email, email)).limit(1);

        if (existingUser) {
          errors.push({ email, error: "User already exists" });
          continue;
        }

        // Check for existing invitation
        const [existingInvitation] = await db.select()
          .from(invitations)
          .where(
            and(
              eq(invitations.email, email),
              eq(invitations.gymId, dbUser.gymId),
              eq(invitations.used, false),
              gt(invitations.expiresAt, new Date())
            )
          )
          .limit(1);

        if (existingInvitation) {
          errors.push({ email, error: "Invitation already sent" });
          continue;
        }

        // Generate token
        const token = randomBytes(32).toString("hex");
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

        // Create invitation with optional user info
        const [invitation] = await db.insert(invitations).values({
          gymId: dbUser.gymId,
          email,
          role: role as "coach" | "athlete",
          token,
          invitedById: user.id,
          expiresAt,
          name: userInfo?.name || null,
          phone: userInfo?.phone || null,
          address: userInfo?.address || null,
        }).returning();

        // Send email
        const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/register?token=${token}&email=${encodeURIComponent(email)}`;

        await resend.emails.send({
          from: `${process.env.RESEND_FROM_NAME} <${process.env.RESEND_FROM_EMAIL}>`,
          to: email,
          subject: `Invitation to join ${gym.name} on TOM`,
          react: InvitationEmail({
            gymName: gym.name,
            gymLogoUrl: gym.logoUrl,
            inviterName: dbUser.name || "A team member",
            inviteUrl,
            role,
          }),
        });

        invitationsList.push(invitation);
      } catch (error) {
        errors.push({
          email,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({
      success: true,
      invitations: invitationsList,
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

