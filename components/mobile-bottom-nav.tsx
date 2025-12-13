"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  IconDashboard,
  IconCalendar,
  IconMessageCircle,
  IconUsers,
  IconSettings,
  IconDots,
  IconListCheck,
  IconHelp,
  IconNews,
  IconBell,
  IconWorldWww,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface MobileBottomNavProps {
  userRole: string;
  gymWebsite: string | null;
}

export function MobileBottomNav({ userRole, gymWebsite }: MobileBottomNavProps) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

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
      roles: ["owner", "coach"],
    },
    {
      title: "Chat",
      url: "/chat",
      icon: IconMessageCircle,
      roles: ["owner", "coach", "athlete"],
    },
    {
      title: "Notices",
      url: "/notices",
      icon: IconBell,
      roles: ["owner", "coach", "athlete"],
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
      title: "Attendance",
      url: "/rsvp",
      icon: IconListCheck,
      roles: ["owner", "coach", "athlete"],
    },
    {
      title: "Help",
      url: "/help",
      icon: IconHelp,
      roles: ["owner", "coach", "athlete"],
    },
  ].filter((item) => item.roles.includes(userRole));

  const isMoreActive = moreItems.some(
    (item) => pathname === item.url || pathname.startsWith(item.url + "/")
  );

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:hidden">
      <div className="flex h-16 items-center justify-around">
        {mainNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.url || pathname.startsWith(item.url + "/");
          return (
            <Link
              key={item.url}
              href={item.url}
              className={cn(
                "flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
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
              className={cn(
                "flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors",
                isMoreActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <IconDots className="h-5 w-5" />
              <span className="text-xs font-medium">More</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[50vh] rounded-t-xl">
            <SheetHeader>
              <SheetTitle>More</SheetTitle>
              <SheetDescription>Additional options and settings</SheetDescription>
            </SheetHeader>
            <div className="mt-6 space-y-2">
              {moreItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.url || pathname.startsWith(item.url + "/");
                return (
                  <Link
                    key={item.url}
                    href={item.url}
                    onClick={() => setMoreOpen(false)}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-muted"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="font-medium">{item.title}</span>
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
                    "flex items-center gap-3 p-3 rounded-xl transition-colors hover:bg-muted"
                  )}
                >
                  <IconWorldWww className="h-5 w-5" />
                  <span className="font-medium">Club Website</span>
                </a>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}

