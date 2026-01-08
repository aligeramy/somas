"use client";

import {
  IconBell,
  IconCalendar,
  IconDashboard,
  IconDots,
  IconListCheck,
  IconLogout,
  IconMail,
  IconMessageCircle,
  IconNews,
  IconSettings,
  IconUsers,
  IconWorldWww,
} from "@tabler/icons-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface MobileBottomNavProps {
  userRole: string;
  gymWebsite: string | null;
}

export function MobileBottomNav({
  userRole,
  gymWebsite,
}: MobileBottomNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  // Main nav items (max 4 for admin, 5 for users)
  const mainNavItems = [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: IconDashboard,
      roles: ["owner", "coach", "athlete"],
    },
    {
      title: "Events",
      url: "/events",
      icon: IconCalendar,
      roles: ["owner", "coach", "athlete"],
    },
    {
      title: "Chat",
      url: "/chat",
      icon: IconMessageCircle,
      roles: ["owner", "coach", "athlete"],
    },
    {
      title: "Attendance",
      url: "/rsvp",
      icon: IconListCheck,
      roles: ["athlete"],
    },
    ...(userRole === "owner"
      ? [
          {
            title: "Members",
            url: "/roster",
            icon: IconUsers,
            roles: ["owner"],
          },
        ]
      : []),
  ].filter((item) => item.roles.includes(userRole));

  // More menu items
  const moreItems = [
    {
      title: "Settings",
      url: "/profile",
      icon: IconSettings,
      roles: ["owner", "coach", "athlete"],
    },
    {
      title: "Blog Posts",
      url: "/blog",
      icon: IconNews,
      roles: ["owner", "coach", "athlete"],
    },
    {
      title: "Notices",
      url: "/notices",
      icon: IconBell,
      roles: ["owner", "coach", "athlete"], // All roles see notices in more menu
    },
    {
      title: "Attendance",
      url: "/rsvp",
      icon: IconListCheck,
      roles: ["owner", "coach"], // Only owners/coaches see attendance in more menu (athletes have it in main nav)
    },
    {
      title: "Email Management",
      url: "/admin/emails",
      icon: IconMail,
      roles: ["owner"], // Only owners can access email management
    },
  ].filter((item) => item.roles.includes(userRole));

  const isMoreActive = moreItems.some(
    (item) => pathname === item.url || pathname.startsWith(`${item.url}/`),
  );

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:hidden"
      style={{
        paddingBottom: "env(safe-area-inset-bottom, 0)",
        paddingLeft: "env(safe-area-inset-left, 0)",
        paddingRight: "env(safe-area-inset-right, 0)",
      }}
    >
      <div className="flex h-16 items-center justify-around">
        {mainNavItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.url || pathname.startsWith(`${item.url}/`);
          return (
            <Link
              key={item.url}
              href={item.url}
              className={cn(
                "flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium">{item.title}</span>
            </Link>
          );
        })}

        {/* More Menu */}
        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              suppressHydrationWarning
              className={cn(
                "flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors",
                isMoreActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <IconDots className="h-5 w-5" />
              <span className="text-xs font-medium">More</span>
            </button>
          </SheetTrigger>
          <SheetContent
            side="bottom"
            className="h-[60vh] rounded-t-xl p-0"
            style={{
              paddingTop: "calc(0.5rem + env(safe-area-inset-top, 0))",
              paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom, 0))",
              paddingLeft: "env(safe-area-inset-left, 0)",
              paddingRight: "env(safe-area-inset-right, 0)",
            }}
          >
            <SheetTitle className="sr-only">Settings</SheetTitle>
            <div className="pt-2">
              {moreItems.map((item, index) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.url || pathname.startsWith(`${item.url}/`);
                return (
                  <Link
                    key={item.url}
                    href={item.url}
                    onClick={() => setMoreOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-6 py-4 transition-colors border-b",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-muted/50",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-sm font-medium">{item.title}</span>
                  </Link>
                );
              })}
              {gymWebsite && (
                <a
                  href={gymWebsite}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-6 py-4 transition-colors hover:bg-muted/50 border-b",
                  )}
                >
                  <IconWorldWww className="h-4 w-4" />
                  <span className="text-sm font-medium">Club Website</span>
                </a>
              )}
              <button
                onClick={() => {
                  setMoreOpen(false);
                  handleLogout();
                }}
                className={cn(
                  "flex items-center gap-3 px-6 py-4 transition-colors hover:bg-muted/50 text-destructive w-full text-left border-b",
                )}
              >
                <IconLogout className="h-4 w-4" />
                <span className="text-sm font-medium">Log out</span>
              </button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
