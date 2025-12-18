"use client";

import {
  IconBell,
  IconBuilding,
  IconCalendar,
  IconDashboard,
  IconListCheck,
  IconMail,
  IconMessageCircle,
  IconNews,
  IconUserCircle,
  IconUsers,
  IconWorldWww,
} from "@tabler/icons-react";
import Link from "next/link";
import type * as React from "react";

import { NavMain } from "@/components/nav-main";
import { NavSecondary } from "@/components/nav-secondary";
import { NavUser } from "@/components/nav-user";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user: {
    name: string | null;
    email: string;
    avatar: string | null;
    role: string;
  };
  gymName: string | null;
  gymLogo: string | null;
  gymWebsite: string | null;
}

export function AppSidebar({
  user,
  gymName,
  gymLogo,
  gymWebsite,
  ...props
}: AppSidebarProps) {
  const navMain = [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: IconDashboard,
      roles: ["owner", "coach", "athlete"],
    },
    {
      title: "Calendar",
      url: "/calendar",
      icon: IconCalendar,
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
      title: "Members",
      url: "/roster",
      icon: IconUsers,
      roles: ["owner"],
    },
    {
      title: "Attendance",
      url: "/rsvp",
      icon: IconListCheck,
      roles: ["owner", "coach", "athlete"],
    },
  ].filter((item) => item.roles.includes(user.role));

  const navSecondary = [
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
      roles: ["owner", "coach", "athlete"],
    },
    {
      title: "Profile",
      url: "/profile",
      icon: IconUserCircle,
      roles: ["athlete"],
    },
    ...(gymWebsite
      ? [
          {
            title: "Club Website",
            url: gymWebsite,
            icon: IconWorldWww,
            roles: ["owner", "coach", "athlete"],
            external: true,
          },
        ]
      : []),
    {
      title: "Email Management",
      url: "/admin/emails",
      icon: IconMail,
      roles: ["owner"],
    },
    {
      title: "Club Settings",
      url: "/gym-settings",
      icon: IconBuilding,
      roles: ["owner"],
    },
  ].filter((item) => item.roles.includes(user.role));

  const getGymInitials = (name: string | null) => {
    if (!name) return "TOM";
    const initials = name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
    // Return up to 3 characters to allow "TOM"
    return initials.slice(0, 3);
  };

  return (
    <Sidebar
      collapsible="offcanvas"
      variant="floating"
      className="hidden lg:flex"
      suppressHydrationWarning
      {...props}
    >
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-2 h-auto"
            >
              <Link href="/dashboard" className="flex items-center gap-3">
                <Avatar className="h-9 w-9 rounded-xl">
                  {gymLogo ? (
                    <AvatarImage src={gymLogo} alt={gymName || "Club"} />
                  ) : null}
                  <AvatarFallback className="rounded-xl bg-primary text-primary-foreground font-semibold">
                    {getGymInitials(gymName)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-base font-semibold truncate">
                  {gymName || "TOM"}
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
        <NavSecondary items={navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser
          user={{
            name: user.name || undefined,
            email: user.email,
            avatar: user.avatar || undefined,
          }}
          userRole={user.role}
        />
      </SidebarFooter>
    </Sidebar>
  );
}
