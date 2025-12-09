import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { users, gyms } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { AppSidebarWrapper } from "@/components/app-sidebar-wrapper";
import { SiteHeader } from "@/components/site-header";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check if user exists in our database
  const [dbUser] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);

  // If user doesn't exist in DB, create them
  if (!dbUser) {
    // User will be created during registration flow
    // For now, redirect to register to complete profile
    redirect("/register");
  }

  // Check onboarding status
  // Owners go to onboarding, others go to profile-setup
  if (!dbUser.onboarded) {
    if (dbUser.role === "owner") {
      redirect("/onboarding");
    } else {
      redirect("/profile-setup");
    }
  }

  // Get gym info for header
  let gymName = null;
  if (dbUser.gymId) {
    const [gym] = await db.select().from(gyms).where(eq(gyms.id, dbUser.gymId)).limit(1);
    if (gym) {
      gymName = gym.name;
    }
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebarWrapper />
      <SidebarInset>
        <SiteHeader gymName={gymName} />
        <div className="flex flex-1 flex-col">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

