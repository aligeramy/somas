import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { users } from "@/drizzle/schema";
import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

// GET - Get single roster member
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
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

    const [member] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        phone: users.phone,
        address: users.address,
        homePhone: users.homePhone,
        workPhone: users.workPhone,
        cellPhone: users.cellPhone,
        emergencyContactName: users.emergencyContactName,
        emergencyContactPhone: users.emergencyContactPhone,
        emergencyContactRelationship: users.emergencyContactRelationship,
        emergencyContactEmail: users.emergencyContactEmail,
        role: users.role,
        avatarUrl: users.avatarUrl,
        onboarded: users.onboarded,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(and(eq(users.id, id), eq(users.gymId, dbUser.gymId)))
      .limit(1);

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Athletes can only access coaches/owners, not other athletes
    if (dbUser.role === "athlete" && member.role === "athlete") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    return NextResponse.json({ member });
  } catch (error) {
    console.error("Get member error:", error);
    return NextResponse.json(
      { error: "Failed to get member" },
      { status: 500 },
    );
  }
}

// PUT - Update roster member
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
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

    // Only head coaches can edit members (coaches can only edit themselves or athletes)
    if (dbUser.role !== "owner") {
      // Check if editing self or an athlete
      if (id !== user.id) {
        const [targetMember] = await db
          .select()
          .from(users)
          .where(and(eq(users.id, id), eq(users.gymId, dbUser.gymId)))
          .limit(1);

        if (
          !targetMember ||
          (dbUser.role === "coach" && targetMember.role !== "athlete")
        ) {
          return NextResponse.json(
            { error: "Not authorized to edit this member" },
            { status: 403 },
          );
        }
      }
    }

    const body = await request.json();
    const {
      name,
      phone,
      address,
      homePhone,
      workPhone,
      cellPhone,
      emergencyContactName,
      emergencyContactPhone,
      emergencyContactRelationship,
      emergencyContactEmail,
      role,
    } = body;

    // Validate role change
    if (role) {
      // Only head coaches can change roles
      if (dbUser.role !== "owner") {
        return NextResponse.json(
          { error: "Only head coaches can change member roles" },
          { status: 403 },
        );
      }

      const [targetMember] = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      if (!targetMember) {
        return NextResponse.json(
          { error: "Member not found" },
          { status: 404 },
        );
      }

      // If demoting a head coach to coach, ensure at least one head coach remains
      if (targetMember.role === "owner" && role === "coach") {
        // Count current head coaches in the gym
        const headCoachCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(users)
          .where(and(eq(users.gymId, dbUser.gymId), eq(users.role, "owner")));

        const count = Number(headCoachCount[0]?.count || 0);

        // Must have at least one head coach remaining
        if (count <= 1) {
          return NextResponse.json(
            {
              error:
                "Cannot demote the last head coach. At least one head coach must remain.",
            },
            { status: 400 },
          );
        }
      }
    }

    const [updatedMember] = await db
      .update(users)
      .set({
        name: name ?? undefined,
        phone: phone ?? undefined,
        address: address ?? undefined,
        homePhone: homePhone ?? undefined,
        workPhone: workPhone ?? undefined,
        cellPhone: cellPhone ?? undefined,
        emergencyContactName: emergencyContactName ?? undefined,
        emergencyContactPhone: emergencyContactPhone ?? undefined,
        emergencyContactRelationship: emergencyContactRelationship ?? undefined,
        emergencyContactEmail: emergencyContactEmail ?? undefined,
        role: role ?? undefined,
        updatedAt: new Date(),
      })
      .where(and(eq(users.id, id), eq(users.gymId, dbUser.gymId)))
      .returning();

    if (!updatedMember) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    return NextResponse.json({ member: updatedMember });
  } catch (error) {
    console.error("Update member error:", error);
    return NextResponse.json(
      { error: "Failed to update member" },
      { status: 500 },
    );
  }
}

// DELETE - Remove member from gym
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
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

    // Only head coaches can remove members
    if (dbUser.role !== "owner") {
      return NextResponse.json(
        { error: "Only head coaches can remove members" },
        { status: 403 },
      );
    }

    // Can't remove yourself
    if (id === user.id) {
      return NextResponse.json(
        { error: "Cannot remove yourself" },
        { status: 400 },
      );
    }

    // Verify member belongs to gym
    const [member] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, id), eq(users.gymId, dbUser.gymId)))
      .limit(1);

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Remove member from gym (set gymId to null, don't delete user)
    await db
      .update(users)
      .set({
        gymId: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Remove member error:", error);
    return NextResponse.json(
      { error: "Failed to remove member" },
      { status: 500 },
    );
  }
}
