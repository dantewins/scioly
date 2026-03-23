"use client"

import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

import { usePathname } from "next/navigation"

const PAGE_TITLES: Record<string, string> = {
  dashboard: "Dashboard",
  events: "Events",
  teams: "Teams",
  members: "Members",
  applications: "Applications",
  tests: "Tests",
}

function getPageTitle(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean)
  const last = segments[segments.length - 1] ?? ""
  const secondLast = segments[segments.length - 2] ?? ""

  // /dashboard/teams/[uuid] → "Team Builder"
  if (secondLast === "teams" && last !== "teams") {
    return "Team Builder"
  }

  return PAGE_TITLES[last] ?? (last.charAt(0).toUpperCase() + last.slice(1))
}

export function SiteHeader() {
  const pathname = usePathname()
  const title = getPageTitle(pathname)

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <h1 className="text-base font-medium">{title}</h1>
      </div>
    </header>
  )
}
