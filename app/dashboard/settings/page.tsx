// app/dashboard/settings/page.tsx
import { redirect } from "next/navigation"
import { IconSettings, IconShield } from "@tabler/icons-react"
import { getCurrentUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { canEdit, canView } from "@/lib/permissions"
import { ClubSettingsForm } from "./club-settings-form"
import { RolesManager } from "./roles-manager"

export const dynamic = "force-dynamic"

export default async function SettingsPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")

  const canEditSettings = user.role === "WEBSITE_OWNER" || canEdit(user.permissions, "club_settings")
  const canViewRoles = user.role === "WEBSITE_OWNER" || canView(user.permissions, "roles")

  if (!canEditSettings && !canViewRoles) redirect("/dashboard")

  const [club, rolesRaw] = await Promise.all([
    prisma.club.findUnique({
      where: { id: user.clubId },
      select: { id: true, name: true, schoolName: true, schoolDomain: true, slug: true },
    }),
    prisma.clubRole.findMany({
      where: { clubId: user.clubId },
      orderBy: { name: "asc" },
    }),
  ])

  const roles = rolesRaw.map((r) => ({
    ...r,
    permissions: (r.permissions ?? {}) as Record<string, boolean>,
  }))

  if (!club) redirect("/dashboard")

  return (
    <div className="flex flex-col gap-8 px-4 py-4 lg:px-6 md:py-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage your club information and role permissions.
        </p>
      </div>

      {canEditSettings && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <IconSettings className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Club Information</h2>
          </div>
          <ClubSettingsForm club={club} />
        </section>
      )}

      {canViewRoles && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <IconShield className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Roles & Permissions</h2>
          </div>
          <RolesManager
            roles={roles}
            canManage={user.role === "WEBSITE_OWNER" || canEdit(user.permissions, "roles")}
          />
        </section>
      )}
    </div>
  )
}
