// components/app-sidebar.tsx
"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  IconCalendarEvent,
  IconFileCheck,
  IconClock,
  IconWallet,
  IconTrophy,
  IconUsers,
  IconUserCheck,
  IconChartBar,
  IconBooks,
  IconSettings,
  IconLayoutDashboard,
} from "@tabler/icons-react"
import { AtomIcon, DotsThreeIcon, UserCircleIcon } from "@phosphor-icons/react"
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
import { useAuth } from "@/context/AuthContext"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user, signOut, canView, isOwner } = useAuth()
  const pathname = usePathname()

  function active(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard"
    return pathname.startsWith(href)
  }

  const navItems: NavItem[] = [
    { href: "/dashboard", label: "Overview", icon: IconLayoutDashboard },
    ...(canView("members") ? [
      { href: "/dashboard/applications", label: "Applications", icon: IconUserCheck },
      { href: "/dashboard/members", label: "Members", icon: IconUsers },
    ] : []),
    ...(canView("events") ? [{ href: "/dashboard/events", label: "Events", icon: AtomIcon }] : []),
    ...(canView("competitions") ? [{ href: "/dashboard/competitions", label: "Competitions", icon: IconTrophy }] : []),
    ...(canView("teams") ? [{ href: "/dashboard/teams", label: "Teams", icon: IconChartBar }] : []),
  ]

  const activityItems: NavItem[] = [
    ...(canView("hours") ? [{ href: "/dashboard/hours", label: "Hours", icon: IconClock }] : []),
    ...(canView("finances") ? [{ href: "/dashboard/finances", label: "Finances", icon: IconWallet }] : []),
    ...(canView("forms") ? [{ href: "/dashboard/forms", label: "Forms", icon: IconFileCheck }] : []),
    ...(canView("club_events") ? [{ href: "/dashboard/club-events", label: "Club Events", icon: IconCalendarEvent }] : []),
    ...(canView("practice") ? [{ href: "/dashboard/practice", label: "Practice Tests", icon: IconBooks }] : []),
  ]

  const initials = user
    ? `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase()
    : "?"

  const domainLabel = user?.clubDomain
    ? user.clubDomain.split(".")[0].charAt(0).toUpperCase() + user.clubDomain.split(".")[0].slice(1)
    : "Club Management"

  return (
    <Sidebar variant="inset" collapsible="icon" {...props}>
      {/* Logo */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="sm"
              asChild
              className="h-12 justify-start group-data-[collapsible=icon]:justify-center"
            >
              <Link
                href="/dashboard"
                className="flex w-full items-center gap-2 group-data-[collapsible=icon]:justify-center"
              >
                <div className="flex size-7 shrink-0 items-center justify-center rounded-[var(--radius)] bg-primary text-primary-foreground group-data-[collapsible=icon]:mx-auto">
                  <AtomIcon size={16} weight="bold" />
                </div>

                <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                  <span className="truncate font-semibold text-foreground">
                    Scioly
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {domainLabel}
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="py-2">
        {/* Main nav */}
        {navItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-[10px] uppercase tracking-wider text-muted-foreground/70 h-6">
              Management
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={active(item.href)}
                      className="h-8 text-sm"
                    >
                      <Link href={item.href}>
                        <item.icon className="size-4" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Activity nav */}
        {activityItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-[10px] uppercase tracking-wider text-muted-foreground/70 h-6">
              Activity
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {activityItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={active(item.href)}
                      className="h-8 text-sm"
                    >
                      <Link href={item.href}>
                        <item.icon className="size-4" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Settings */}
        {(isOwner || canView("club_settings")) && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-[10px] uppercase tracking-wider text-muted-foreground/70 h-6">
              Config
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={active("/dashboard/settings")}
                    className="h-8 text-sm"
                  >
                    <Link href="/dashboard/settings">
                      <IconSettings className="size-4" />
                      <span>Settings</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      {/* User footer */}
      <SidebarFooter className="py-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton className="h-8 data-[state=open]:bg-sidebar-accent">
                  <Avatar className="size-5 shrink-0">
                    <AvatarFallback className="text-[10px] bg-muted text-muted-foreground">{initials}</AvatarFallback>
                  </Avatar>
                  <span className="truncate text-sm text-foreground">
                    {user?.firstName} {user?.lastName}
                  </span>
                  <DotsThreeIcon size={16} className="ml-auto text-muted-foreground" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-52">
                <div className="px-2 py-1.5">
                  <p className="text-xs font-medium text-foreground">{user?.firstName} {user?.lastName}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
                  onClick={() => signOut()}
                >
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
