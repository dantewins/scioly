"use client"

import { usePathname } from "next/navigation"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { DensityToggle } from "@/components/ui/density-toggle"

const ROUTE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  members: "Members",
  applications: "Applications",
  events: "Events",
  competitions: "Competitions",
  hours: "Hours",
  finances: "Finances",
  forms: "Forms",
  "club-events": "Club Events",
  practice: "Assessments",
  settings: "Settings",
}

function resolveTitle(pathname: string): string {
  const segs = pathname.split("/").filter(Boolean)
  // /dashboard/competitions/[id] → "Competition"
  for (let i = segs.length - 1; i >= 0; i--) {
    const seg = segs[i]
    if (ROUTE_LABELS[seg]) return ROUTE_LABELS[seg]
  }
  return "Dashboard"
}

export function SiteHeader() {
  const pathname = usePathname()
  const title = resolveTitle(pathname)

  return (
    <header
      className="relative flex shrink-0 items-center gap-2 border-b border-border/70 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70 px-4"
      style={{ height: "var(--topbar-h)" }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-azure-300/60 to-transparent"
      />
      <SidebarTrigger className="size-8 text-muted-foreground hover:text-foreground" />
      <Separator orientation="vertical" className="h-4 mx-1" />
      <span className="text-sm font-medium text-foreground flex-1 tracking-tight">{title}</span>
      <div className="flex items-center gap-0.5">
        <DensityToggle />
        <ThemeToggle />
      </div>
    </header>
  )
}
