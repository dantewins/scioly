import type { CSSProperties, ReactNode } from "react"
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { AuthProvider } from "@/context/AuthContext"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import NextTopLoader from "nextjs-toploader"

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser()
  if (!user) redirect("/login")

  return (
    <AuthProvider initialUser={user}>
      <SidebarProvider
        style={
          {
            "--sidebar-width": "14rem",
            "--sidebar-width-icon": "3rem",
          } as CSSProperties
        }
      >
        <NextTopLoader height={2} color="#0085C7" showSpinner={false} shadow={false} />
        <AppSidebar variant="inset" />
        <SidebarInset className="flex min-h-screen flex-col">
          <SiteHeader />
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-screen-xl px-[var(--page-px)] py-[var(--page-py)]">
              {children}
            </div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </AuthProvider>
  )
}
