import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { users, gyms } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { AppSidebarWrapper } from "@/components/app-sidebar-wrapper";
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
    redirect("/register");
  }

  // Check onboarding status
  if (!dbUser.onboarded) {
    if (dbUser.role === "owner") {
      redirect("/onboarding");
    } else {
      redirect("/profile-setup");
    }
  }

  return (
    <SidebarProvider
      className="p-4 lg:p-6 xl:p-4 h-[100dvh] overflow-hidden"
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 64)",
          "--header-height": "calc(var(--spacing) * 14)",
        } as React.CSSProperties
      }
    >
      <AppSidebarWrapper />
      <SidebarInset>
        <div className="flex flex-1 flex-col min-h-0 h-full overflow-hidden">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
