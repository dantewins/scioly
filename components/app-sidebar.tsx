"use client";

import * as React from "react";
import {
  IconCamera,
  IconDashboard,
  IconDatabase,
  IconFileAi,
  IconFileDescription,
  IconFileWord,
  IconFileCheck,
  IconHelp,
  IconCalendarWeek,
  IconReport,
  IconSearch,
  IconSettings,
  IconUsers,
  IconUser,
} from "@tabler/icons-react";
import { Command } from "lucide-react";

import { NavDocuments } from "@/components/nav-documents";
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

const data = {
  navMain: [
    {
      title: "Dashboard",
      url: "",
      icon: IconDashboard,
    },
    {
      title: "Events",
      url: "/events",
      icon: IconCalendarWeek,
    },
    {
      title: "Teams",
      url: "/teams",
      icon: IconUsers,
    },
    {
      title: "Members",
      url: "/members",
      icon: IconUser,
    },
    {
      title: "Applications",
      url: "/applications",
      icon: IconFileCheck,
    },
  ],
  navClouds: [
    {
      title: "Capture",
      icon: IconCamera,
      isActive: true,
      url: "#",
      items: [
        { title: "Active Proposals", url: "#" },
        { title: "Archived", url: "#" },
      ],
    },
    {
      title: "Proposal",
      icon: IconFileDescription,
      url: "#",
      items: [
        { title: "Active Proposals", url: "#" },
        { title: "Archived", url: "#" },
      ],
    },
    {
      title: "Prompts",
      icon: IconFileAi,
      url: "#",
      items: [
        { title: "Active Proposals", url: "#" },
        { title: "Archived", url: "#" },
      ],
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "#",
      icon: IconSettings,
    },
    {
      title: "Get Help",
      url: "#",
      icon: IconHelp,
    },
    {
      title: "Search",
      url: "#",
      icon: IconSearch,
    },
  ],
  documents: [
    {
      name: "Data Library",
      url: "#",
      icon: IconDatabase,
    },
    {
      name: "Reports",
      url: "#",
      icon: IconReport,
    },
    {
      name: "Word Assistant",
      url: "#",
      icon: IconFileWord,
    },
  ],
};

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
  const { user, signOut, loading } = useAuth();

  const sidebarUser = React.useMemo(
    () => buildSidebarUser(user),
    [user]
  );

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <Command className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">Acme Inc</span>
                  <span className="truncate text-xs">Enterprise</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavDocuments items={data.documents} />
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