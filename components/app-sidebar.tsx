"use client"

import * as React from "react"
import {
  IconCalendar,
  IconDashboard,
  IconHelp,
  IconListCheck,
  IconUsers,
  IconBuilding,
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
}

export function AppSidebar({ user, gymName, gymLogo, ...props }: AppSidebarProps) {
  const navMain = [
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
    <Sidebar collapsible="offcanvas" variant="floating" {...props}>
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
