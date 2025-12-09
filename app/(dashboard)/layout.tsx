import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { users, gyms } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { AppSidebarWrapper } from "@/components/app-sidebar-wrapper";
import { MobileBottomNavWrapper } from "@/components/mobile-bottom-nav-wrapper";
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

  // Check if user exists in our database with retry logic
  let dbUser;
  let retries = 3;
  let lastError: any = null;
  
  while (retries > 0) {
    try {
      const result = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
      dbUser = result[0];
      break;
    } catch (error: any) {
      lastError = error;
      retries--;
      
      // Check if it's a retryable error
      const isRetryable = 
        error?.code === 'ECONNRESET' || 
        error?.code === 'ETIMEDOUT' ||
        error?.code === 'ECONNREFUSED' ||
        error?.message?.includes('timeout') ||
        error?.message?.includes('connection') ||
        error?.message?.includes('ECONN');
      
      if (!isRetryable || retries === 0) {
        console.error("Database query error in dashboard layout:", error);
        // If it's the last retry or not retryable, throw the error
        throw error;
      }
      
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 1000 * (4 - retries)));
    }
  }

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
        <div className="flex flex-1 flex-col min-h-0 h-full overflow-hidden pb-16 lg:pb-0">
          {children}
        </div>
      </SidebarInset>
      <MobileBottomNavWrapper userRole={dbUser.role} />
    </SidebarProvider>
  );
}
