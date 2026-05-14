// app/dashboard/settings/page.tsx
import { redirect } from "next/navigation"
import {
  IconSettings,
  IconShield,
  IconCalendar,
  IconUser,
} from "@tabler/icons-react"
import { getCurrentUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { canEdit, canView } from "@/lib/permissions"
import { getClubDomainConfig } from "@/lib/db"
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs"
import { ClubSettingsForm } from "@/features/settings/components/club-settings-form"
import { RolesManager } from "@/features/settings/components/roles-manager"
import { SeasonManager } from "@/features/settings/components/season-manager"
import { SettingsSection } from "@/features/settings/components/settings-section"
import {
  ProfileSection,
  type ProfileSectionData,
} from "@/features/settings/components/profile-section"


export default async function SettingsPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")

  const canEditSettings = user.role === "WEBSITE_OWNER" || canEdit(user.permissions, "club_settings")
  const canViewRoles = user.role === "WEBSITE_OWNER" || canView(user.permissions, "roles")

  const profileRecord = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      displayName: true,
      graduationYear: true,
      gradeLevel: true,
      passwordHash: true,
      seasonMemberships: {
        where: { season: { isActive: true, clubId: user.clubId } },
        orderBy: { season: { startsAt: "desc" } },
        take: 1,
        select: {
          membershipStatus: true,
          season: { select: { name: true, schoolYear: true } },
        },
      },
    },
  })

  if (!profileRecord) redirect("/dashboard")

  const activeMembership = profileRecord.seasonMemberships[0] ?? null
  const profileData: ProfileSectionData = {
    id: profileRecord.id,
    email: profileRecord.email,
    firstName: profileRecord.firstName,
    lastName: profileRecord.lastName,
    displayName: profileRecord.displayName,
    graduationYear: profileRecord.graduationYear,
    gradeLevel: profileRecord.gradeLevel,
    membershipStatus: activeMembership?.membershipStatus ?? null,
    seasonName: activeMembership?.season.name ?? null,
    seasonYear: activeMembership?.season.schoolYear ?? null,
    canChangePassword: Boolean(profileRecord.passwordHash),
  }

  const adminQueries =
    canEditSettings || canViewRoles
      ? await Promise.all([
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
      : null

  const [club, rolesRaw, seasons, domainConfig] = adminQueries ?? [null, [], [], null]

  const roles = rolesRaw.map((r) => ({
    ...r,
    permissions: (r.permissions ?? {}) as Record<string, boolean>,
  }))

  const tabs: { value: string; label: string }[] = [{ value: "profile", label: "Profile" }]
  if (canEditSettings && club) tabs.push({ value: "club", label: "Club" })
  if (canViewRoles) tabs.push({ value: "roles", label: "Roles" })
  if (canEditSettings) tabs.push({ value: "seasons", label: "Seasons" })

  return (
    <div className="layout-page">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage your account and club preferences.
        </p>
      </div>

      <Tabs defaultValue="profile" className="gap-4">
        <TabsList className="w-fit">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="profile">
          <SettingsSection icon={IconUser} title="Profile">
            <ProfileSection initial={profileData} />
          </SettingsSection>
        </TabsContent>

        {canEditSettings && club && (
          <TabsContent value="club">
            <SettingsSection icon={IconSettings} title="Club Information">
              <ClubSettingsForm
                club={club}
                initialDomains={domainConfig?.emailDomains ?? []}
                canManage={canEditSettings}
              />
            </SettingsSection>
          </TabsContent>
        )}

        {canViewRoles && (
          <TabsContent value="roles">
            <SettingsSection icon={IconShield} title="Roles & Permissions">
              <RolesManager
                roles={roles}
                canManage={user.role === "WEBSITE_OWNER" || canEdit(user.permissions, "roles")}
              />
            </SettingsSection>
          </TabsContent>
        )}

        {canEditSettings && (
          <TabsContent value="seasons">
            <SettingsSection icon={IconCalendar} title="Seasons">
              <SeasonManager
                seasons={seasons.map((s) => ({
                  ...s,
                  startsAt: s.startsAt.toISOString(),
                  endsAt: s.endsAt.toISOString(),
                }))}
                canManage={canEditSettings}
              />
            </SettingsSection>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
