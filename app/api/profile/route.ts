import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { users } from "@/drizzle/schema";
import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  console.log("[API /profile GET] Request received");

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      console.log("[API /profile GET] Auth error:", authError.message);
    }

    if (!user) {
      console.log("[API /profile GET] No user in session, returning 401");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[API /profile GET] User authenticated:", user.email);

    const [dbUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    if (!dbUser) {
      console.log("[API /profile GET] User not found in DB:", user.id);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    console.log(
      "[API /profile GET] User found:",
      dbUser.name,
      "| onboarded:",
      dbUser.onboarded
    );

    return NextResponse.json({
      user: {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        phone: dbUser.phone,
        address: dbUser.address,
        altEmail: dbUser.altEmail,
        homePhone: dbUser.homePhone,
        workPhone: dbUser.workPhone,
        cellPhone: dbUser.cellPhone,
        emergencyContactName: dbUser.emergencyContactName,
        emergencyContactPhone: dbUser.emergencyContactPhone,
        emergencyContactRelationship: dbUser.emergencyContactRelationship,
        emergencyContactEmail: dbUser.emergencyContactEmail,
        medicalConditions: dbUser.medicalConditions,
        medications: dbUser.medications,
        allergies: dbUser.allergies,
        dateOfBirth: dbUser.dateOfBirth,
        avatarUrl: dbUser.avatarUrl,
        role: dbUser.role,
        notifPreferences: dbUser.notifPreferences || {},
      },
    });
  } catch (error) {
    console.error("Profile fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      phone,
      address,
      altEmail,
      homePhone,
      workPhone,
      cellPhone,
      emergencyContactName,
      emergencyContactPhone,
      emergencyContactRelationship,
      emergencyContactEmail,
      medicalConditions,
      medications,
      allergies,
      notifPreferences,
      avatarUrl,
    } = body;

    const [updatedUser] = await db
      .update(users)
      .set({
        name: name || null,
        phone: phone || null,
        address: address || null,
        altEmail: altEmail || null,
        homePhone: homePhone || null,
        workPhone: workPhone || null,
        cellPhone: cellPhone || null,
        emergencyContactName: emergencyContactName || null,
        emergencyContactPhone: emergencyContactPhone || null,
        emergencyContactRelationship: emergencyContactRelationship || null,
        emergencyContactEmail: emergencyContactEmail || null,
        medicalConditions: medicalConditions || null,
        medications: medications || null,
        allergies: allergies || null,
        avatarUrl: avatarUrl !== undefined ? avatarUrl || null : undefined,
        notifPreferences: notifPreferences || {},
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id))
      .returning();

    return NextResponse.json({
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        phone: updatedUser.phone,
        address: updatedUser.address,
        altEmail: updatedUser.altEmail,
        homePhone: updatedUser.homePhone,
        workPhone: updatedUser.workPhone,
        cellPhone: updatedUser.cellPhone,
        emergencyContactName: updatedUser.emergencyContactName,
        emergencyContactPhone: updatedUser.emergencyContactPhone,
        emergencyContactRelationship: updatedUser.emergencyContactRelationship,
        emergencyContactEmail: updatedUser.emergencyContactEmail,
        medicalConditions: updatedUser.medicalConditions,
        medications: updatedUser.medications,
        allergies: updatedUser.allergies,
        avatarUrl: updatedUser.avatarUrl,
        role: updatedUser.role,
        notifPreferences: updatedUser.notifPreferences,
      },
    });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
