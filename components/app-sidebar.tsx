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
    if (!name) {
      return "SOMAS";
    }
    const initials = name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
    // Return up to 5 characters to allow "SOMAS"
    return initials.slice(0, 5);
  };

  return (
    <Sidebar
      className="hidden lg:flex"
      collapsible="offcanvas"
      suppressHydrationWarning
      variant="floating"
      {...props}
    >
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-2 h-auto"
            >
              <Link className="flex items-center gap-3" href="/dashboard">
                <Avatar className="h-9 w-9 rounded-xl">
                  {gymLogo ? (
                    <AvatarImage alt={gymName || "Club"} src={gymLogo} />
                  ) : null}
                  <AvatarFallback className="rounded-xl bg-primary font-semibold text-primary-foreground">
                    {getGymInitials(gymName)}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate font-semibold text-base">
                  {gymName || "SOMAS"}
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
        <NavSecondary className="mt-auto" items={navSecondary} />
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
