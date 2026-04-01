import type { CSSProperties, ReactNode } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "14rem",
          "--sidebar-width-icon": "3rem",
        } as CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset className="flex flex-col min-h-screen">
        <SiteHeader />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-screen-xl px-[var(--page-px)] py-[var(--page-py)]">
            {children}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
