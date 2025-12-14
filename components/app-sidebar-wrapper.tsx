import { eq } from "drizzle-orm";
import { Suspense } from "react";
import { gyms, users } from "@/drizzle/schema";
import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { AppSidebar } from "./app-sidebar";
import { SidebarSkeleton } from "./sidebar-skeleton";

async function AppSidebarContent() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return null;
  }

  // Get user from database
  const [dbUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, authUser.id))
    .limit(1);

  if (!dbUser) {
    return null;
  }

  // Get gym info if user has a gym
  let gymName = null;
  let gymLogo = null;
  let gymWebsite = null;
  if (dbUser.gymId) {
    const [gym] = await db
      .select()
      .from(gyms)
      .where(eq(gyms.id, dbUser.gymId))
      .limit(1);
    if (gym) {
      gymName = gym.name;
      gymLogo = gym.logoUrl;
      gymWebsite = gym.website;
    }
  }

  return (
    <AppSidebar
      user={{
        name: dbUser.name,
        email: dbUser.email,
        avatar: dbUser.avatarUrl,
        role: dbUser.role,
      }}
      gymName={gymName}
      gymLogo={gymLogo}
      gymWebsite={gymWebsite}
    />
  );
}

export function AppSidebarWrapper() {
  return (
    <Suspense fallback={<SidebarSkeleton />}>
      <AppSidebarContent />
    </Suspense>
  );
}
