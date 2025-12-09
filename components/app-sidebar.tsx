"use client"

import * as React from "react"
import {
  IconCalendar,
  IconDashboard,
  IconHelp,
  IconListCheck,
  IconSettings,
  IconUsers,
  IconBuilding,
} from "@tabler/icons-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

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
  }
  gymName: string | null
  gymLogo: string | null
}

export function AppSidebar({ user, gymName, gymLogo, ...props }: AppSidebarProps) {
  const pathname = usePathname()

  const navMain = [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: IconDashboard,
    },
    {
      title: "Events",
      url: "/events",
      icon: IconCalendar,
    },
    {
      title: "Roster",
      url: "/roster",
      icon: IconUsers,
    },
    {
      title: "RSVP",
      url: "/rsvp",
      icon: IconListCheck,
    },
  ]

  const navSecondary = [
    {
      title: "Settings",
      url: "/settings",
      icon: IconSettings,
    },
    {
      title: "Help",
      url: "/help",
      icon: IconHelp,
    },
  ]

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    }
    return email[0].toUpperCase()
  }

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <Link href="/dashboard">
                {gymLogo ? (
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={gymLogo} alt={gymName || "Gym"} />
                    <AvatarFallback className="rounded-lg">
                      <IconBuilding className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <IconBuilding className="!size-5" />
                )}
                <span className="text-base font-semibold">
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
