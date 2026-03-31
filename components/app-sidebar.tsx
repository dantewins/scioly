// components/app-sidebar.tsx
"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  IconAtom,
  IconCalendarEvent,
  IconChartBar,
  IconClock,
  IconFileCheck,
  IconSettings,
  IconTrophy,
  IconUsers,
  IconUserCheck,
  IconWallet,
  IconBooks,
} from "@tabler/icons-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/components/ui/sidebar"
import { NavUser, type NavUserData } from "@/components/nav-user"
import { useAuth } from "@/context/AuthContext"

function buildNavUser(user: { email: string; displayName: string | null; firstName: string; lastName: string } | null): NavUserData | null {
  if (!user) return null
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ")
  return {
    name: user.displayName || fullName || user.email,
    email: user.email,
    avatarUrl: null,
  }
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user, signOut, canView, canEdit, isOwner } = useAuth()
  const pathname = usePathname()
  const navUser = React.useMemo(() => buildNavUser(user), [user])

  function active(href: string) {
    return pathname === href || pathname.startsWith(href + "/")
  }

  const managementItems = [
    canView("members") && {
      href: "/dashboard/applications",
      label: "Applications",
      icon: IconUserCheck,
    },
    canView("members") && {
      href: "/dashboard/members",
      label: "Members",
      icon: IconUsers,
    },
    canView("events") && {
      href: "/dashboard/events",
      label: "Events",
      icon: IconAtom,
    },
    canView("competitions") && {
      href: "/dashboard/competitions",
      label: "Competitions",
      icon: IconTrophy,
    },
    canView("teams") && {
      href: "/dashboard/teams",
      label: "Teams",
      icon: IconChartBar,
    },
  ].filter(Boolean) as { href: string; label: string; icon: React.ElementType }[]

  const activityItems = [
    canView("hours") && {
      href: "/dashboard/hours",
      label: "Hours",
      icon: IconClock,
    },
    canView("finances") && {
      href: "/dashboard/finances",
      label: "Finances",
      icon: IconWallet,
    },
    canView("club_events") && {
      href: "/dashboard/club-events",
      label: "Club Events",
      icon: IconCalendarEvent,
    },
    canView("forms") && {
      href: "/dashboard/forms",
      label: "Forms",
      icon: IconFileCheck,
    },
    canView("practice") && {
      href: "/dashboard/practice",
      label: "Practice Tests",
      icon: IconBooks,
    },
  ].filter(Boolean) as { href: string; label: string; icon: React.ElementType }[]

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <IconAtom className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold text-sm">Science Olympiad</span>
                  <span className="text-xs text-muted-foreground truncate max-w-[130px]">
                    {user?.email ?? ""}
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {managementItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Management</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {managementItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={active(item.href)}>
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {activityItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Activity</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {activityItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={active(item.href)}>
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {(isOwner || canEdit("club_settings")) && (
          <SidebarGroup>
            <SidebarGroupLabel>Club</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={active("/dashboard/settings")}>
                    <Link href="/dashboard/settings">
                      <IconSettings />
                      <span>Settings</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        {navUser && <NavUser user={navUser} onSignOut={signOut} />}
      </SidebarFooter>
    </Sidebar>
  )
}
