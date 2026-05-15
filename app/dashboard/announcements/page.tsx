import { redirect } from "next/navigation"
import { IconSpeakerphone } from "@tabler/icons-react"
import { getCurrentUser } from "@/lib/auth"
import { canView, canEdit } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { getActiveSeason } from "@/lib/db"
import { PageHeader } from "@/components/ui/page-header"
import { EmptyState } from "@/components/empty-state"
import {
  AnnouncementsManager,
  type AnnouncementRow,
} from "@/features/announcements/components/announcements-manager"

export const dynamic = "force-dynamic"

export default async function AnnouncementsPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")

  // Members can see published announcements via /dashboard already.
  // This page is for managers (and view-only roles) to manage them.
  if (!canView(user.permissions, "club_settings") && !canEdit(user.permissions, "club_settings")) {
    redirect("/dashboard")
  }

  const season = await getActiveSeason(user.clubId)
  if (!season) {
    return (
      <div className="layout-page">
        <PageHeader title="Announcements" description="Post and manage announcements for the active season." />
        <EmptyState icon={IconSpeakerphone} title="No active season" />
      </div>
    )
  }

  const rows = await prisma.announcement.findMany({
    where: { seasonId: season.id },
    select: {
      id: true,
      title: true,
      body: true,
      isPinned: true,
      publishedAt: true,
      expiresAt: true,
      createdAt: true,
    },
    orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }, { createdAt: "desc" }],
  })

  const canManage = canEdit(user.permissions, "club_settings")

  const serialized: AnnouncementRow[] = rows.map((r) => ({
    id: r.id,
    title: r.title,
    body: r.body,
    isPinned: r.isPinned,
    publishedAt: r.publishedAt?.toISOString() ?? null,
    expiresAt: r.expiresAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
  }))

  return (
    <div className="layout-page">
      <PageHeader
        title="Announcements"
        kicker={season.name}
        description="Pinned announcements show up first on every member's dashboard."
      />
      <AnnouncementsManager initial={serialized} canManage={canManage} />
    </div>
  )
}
