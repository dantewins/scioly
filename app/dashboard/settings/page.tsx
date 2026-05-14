// app/dashboard/settings/page.tsx
import { redirect } from "next/navigation"
import { IconSettings, IconShield, IconCalendar } from "@tabler/icons-react"
import { getCurrentUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { canEdit, canView } from "@/lib/permissions"
import { getClubDomainConfig } from "@/lib/db"
import { ClubSettingsForm } from "@/features/settings/components/club-settings-form"
import { RolesManager } from "@/features/settings/components/roles-manager"
import { SeasonManager } from "@/features/settings/components/season-manager"
import { SettingsSection } from "@/features/settings/components/settings-section"


export default async function SettingsPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")

  const canEditSettings = user.role === "WEBSITE_OWNER" || canEdit(user.permissions, "club_settings")
  const canViewRoles = user.role === "WEBSITE_OWNER" || canView(user.permissions, "roles")

  if (!canEditSettings && !canViewRoles) redirect("/dashboard")

  const [club, rolesRaw, seasons, domainConfig] = await Promise.all([
    prisma.club.findUnique({
      where: { id: user.clubId },
      select: { id: true, name: true, schoolName: true, schoolDomain: true, slug: true },
    }),
    prisma.clubRole.findMany({
      where: { clubId: user.clubId },
      orderBy: { name: "asc" },
    }),
    prisma.season.findMany({
      where: { clubId: user.clubId },
      orderBy: { startsAt: "desc" },
      select: {
        id: true, name: true, schoolYear: true,
        startsAt: true, endsAt: true, isActive: true, createdAt: true,
        _count: { select: { members: true } },
      },
    }),
    getClubDomainConfig(user.clubId),
  ])

  const roles = rolesRaw.map((r) => ({
    ...r,
    permissions: (r.permissions ?? {}) as Record<string, boolean>,
  }))

  if (!club) redirect("/dashboard")

  return (
    <div className="layout-page">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage your club information and role permissions.
        </p>
      </div>

      {canEditSettings && (
        <SettingsSection icon={IconSettings} title="Club Information">
          <ClubSettingsForm
            club={club}
            initialDomains={domainConfig?.emailDomains ?? []}
            canManage={canEditSettings}
          />
        </SettingsSection>
      )}

      {canViewRoles && (
        <SettingsSection icon={IconShield} title="Roles & Permissions">
          <RolesManager
            roles={roles}
            canManage={user.role === "WEBSITE_OWNER" || canEdit(user.permissions, "roles")}
          />
        </SettingsSection>
      )}

      {canEditSettings && (
        <SettingsSection icon={IconCalendar} title="Seasons">
          <SeasonManager
            seasons={seasons.map(s => ({
              ...s,
              startsAt: s.startsAt.toISOString(),
              endsAt: s.endsAt.toISOString(),
            }))}
            canManage={canEditSettings}
          />
        </SettingsSection>
      )}
    </div>
  )
}
