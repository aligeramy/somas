import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { users, gyms } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { AppSidebar } from "./app-sidebar";

export async function AppSidebarWrapper() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return null;
  }

  // Get user from database
  const [dbUser] = await db.select().from(users).where(eq(users.id, authUser.id)).limit(1);

  if (!dbUser) {
    return null;
  }

  // Get gym info if user has a gym
  let gymName = null;
  let gymLogo = null;
  if (dbUser.gymId) {
    const [gym] = await db.select().from(gyms).where(eq(gyms.id, dbUser.gymId)).limit(1);
    if (gym) {
      gymName = gym.name;
      gymLogo = gym.logoUrl;
    }
  }

  return (
    <AppSidebar
      user={{
        name: dbUser.name,
        email: dbUser.email,
        avatar: dbUser.avatarUrl,
      }}
      gymName={gymName}
      gymLogo={gymLogo}
    />
  );
}

