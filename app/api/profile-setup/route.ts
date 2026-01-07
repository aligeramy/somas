import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { users } from "@/drizzle/schema";
import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
      dateOfBirth,
      avatarUrl,
    } = await request.json();

    if (!name || name.trim() === "") {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Helper function to convert empty strings to null
    const toNull = (value: string | null | undefined) => {
      if (value === null || value === undefined || value.trim() === "") {
        return null;
      }
      return value;
    };

    // Convert dateOfBirth string to Date object if provided
    let dateOfBirthDate: Date | null = null;
    if (dateOfBirth && dateOfBirth.trim() !== "") {
      const parsedDate = new Date(dateOfBirth);
      if (!Number.isNaN(parsedDate.getTime())) {
        dateOfBirthDate = parsedDate;
      }
    }

    // Update user profile
    await db
      .update(users)
      .set({
        name: name.trim(),
        phone: toNull(phone),
        address: toNull(address),
        altEmail: toNull(altEmail),
        homePhone: toNull(homePhone),
        workPhone: toNull(workPhone),
        cellPhone: toNull(cellPhone),
        emergencyContactName: toNull(emergencyContactName),
        emergencyContactPhone: toNull(emergencyContactPhone),
        emergencyContactRelationship: toNull(emergencyContactRelationship),
        emergencyContactEmail: toNull(emergencyContactEmail),
        medicalConditions: toNull(medicalConditions),
        medications: toNull(medications),
        allergies: toNull(allergies),
        dateOfBirth: dateOfBirthDate,
        avatarUrl: toNull(avatarUrl),
        onboarded: true,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Profile setup error:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 },
    );
  }
}
