"use client"

import type * as React from "react"
import {
  IconCalendar,
  IconDashboard,
  IconHelp,
  IconListCheck,
  IconUsers,
  IconBuilding,
  IconMessageCircle,
  IconNews,
  IconBell,
  IconWorldWww,
} from "@tabler/icons-react"
import Link from "next/link"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupContent,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user: {
    name: string | null
    email: string
    avatar: string | null
    role: string
  }
  gymName: string | null
  gymLogo: string | null
  gymWebsite: string | null
}

export function AppSidebar({ user, gymName, gymLogo, gymWebsite, ...props }: AppSidebarProps) {
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
      roles: ["owner", "coach"],
    },
    {
      title: "Gym Settings",
      url: "/gym-settings",
      icon: IconBuilding,
      roles: ["owner"],
    },
    {
      title: "Help",
      url: "/help",
      icon: IconHelp,
      roles: ["owner", "coach", "athlete"],
    },
  ].filter((item) => item.roles.includes(user.role));

  const getGymInitials = (name: string | null) => {
    if (!name) return "T"
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
  }

  return (
    <Sidebar collapsible="offcanvas" variant="floating" className="hidden lg:flex" {...props}>
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
                    <AvatarImage src={gymLogo} alt={gymName || "Gym"} />
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
        {gymWebsite && (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    tooltip="Gym Website"
                    asChild
                  >
                    <a
                      href={gymWebsite}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2"
                    >
                      <IconWorldWww />
                      <span>Gym Website</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={{
          name: user.name || undefined,
          email: user.email,
          avatar: user.avatar || undefined,
        }} />
      </SidebarFooter>
    </Sidebar>
  )
}
