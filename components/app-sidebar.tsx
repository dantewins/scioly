"use client";

import * as React from "react";
import {
  IconAtom,
  IconDashboard,
  IconCalendarEvent,
  IconFileCheck,
  IconReport,
  IconTrophy,
  IconUsers,
  IconUser,
  IconPencil,
  IconSchool,
} from "@tabler/icons-react";

import { NavMain } from "@/components/nav-main";
import { NavUser, type NavUserData } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useAuth } from "@/context/AuthContext";


// Builds the user object expected by NavUser from the auth context shape.
function buildSidebarUser(
  user: {
    email: string;
    displayName: string | null;
    firstName: string | null;
    lastName: string | null;
    avatarUrl?: string | null;
  } | null
): NavUserData | null {
  if (!user) return null;

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();

  return {
    name: user.displayName || fullName || user.email,
    email: user.email,
    avatarUrl: user.avatarUrl ?? null,
  };
}

export function AppSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const { user, signOut, loading, canAccessAdmin } = useAuth();

  const sidebarUser = React.useMemo(
    () => buildSidebarUser(user),
    [user]
  );

  // Nav sections — built inside the component so we can gate on canAccessAdmin.
  const navSections = React.useMemo(() => [
    {
      label: "Management",
      items: [
        { title: "Dashboard",    url: "",             icon: IconDashboard },
        { title: "Events",       url: "/events",       icon: IconAtom },
        { title: "Competitions", url: "/competitions", icon: IconTrophy },
        { title: "Teams",        url: "/teams",        icon: IconUsers },
      ],
    },
    {
      label: "Club",
      items: [
        { title: "Club Events",  url: "/club-events",  icon: IconCalendarEvent },
        { title: "Members",      url: "/members",      icon: IconUser },
        { title: "Applications", url: "/applications", icon: IconFileCheck },
      ],
    },
    {
      label: "Tools",
      items: [
        ...(canAccessAdmin ? [{ title: "Tests", url: "/tests", icon: IconReport }] : []),
      ],
    },
    ...(canAccessAdmin ? [{
      label: "Preview",
      items: [
        { title: "Practice Tests", url: "/practice", icon: IconSchool },
      ],
    }] : []),
  ], [canAccessAdmin]);

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <IconAtom className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">Science Olympiad</span>
                  <span className="truncate text-xs">Club Management</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <NavMain sections={navSections} />
      </SidebarContent>

      <SidebarFooter className="!px-0 !pt-0">
        {sidebarUser ? (
          <NavUser
            user={sidebarUser}
            onSignOut={signOut}
            signingOut={loading}
          />
        ) : null}
      </SidebarFooter>
    </Sidebar>
  );
}
