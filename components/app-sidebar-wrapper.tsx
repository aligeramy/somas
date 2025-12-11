import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { users, gyms } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { AppSidebar } from "./app-sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

function SidebarSkeleton() {
  return (
    <Sidebar collapsible="offcanvas" variant="floating">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton className="h-auto p-2">
              <Skeleton className="h-9 w-9 rounded-xl" />
              <Skeleton className="h-5 w-24 ml-3" />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <div className="p-2 space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-10 w-full rounded-md" />
          ))}
        </div>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" disabled>
              <Skeleton className="h-8 w-8 rounded-lg" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

async function AppSidebarContent() {
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
  let gymWebsite = null;
  if (dbUser.gymId) {
    const [gym] = await db.select().from(gyms).where(eq(gyms.id, dbUser.gymId)).limit(1);
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

