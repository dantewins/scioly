import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { canView, canCreate, canEdit } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { getActiveSeason } from "@/lib/db"
import { ClubEventsManager } from "@/features/club-events/components/club-events-manager"
import { PageHeader } from "@/components/ui/page-header"


export default async function ClubEventsPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  if (!canView(user.permissions, "club_events")) redirect("/dashboard")

  const season = await getActiveSeason(user.clubId)
  const [events, categories] = season ? await Promise.all([
    prisma.clubEvent.findMany({
      where: { seasonId: season.id },
      include: {
        category: { select: { id: true, name: true } },
        _count: { select: { attendance: true } },
      },
      orderBy: { startsAt: "asc" },
    }),
    prisma.hourCategory.findMany({
      where: { seasonId: season.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]) : [[], []]

  return (
    <div className="layout-page">
      <PageHeader
        title="Club Events"
        description={season ? `${events.length} event${events.length !== 1 ? "s" : ""} this season` : "No active season"}
      />
      <ClubEventsManager
        initialEvents={events.map(e => ({
          ...e,
          hoursValue: Number(e.hoursValue),
          startsAt: e.startsAt.toISOString(),
          endsAt: e.endsAt?.toISOString() ?? null,
          createdAt: e.createdAt.toISOString(),
          updatedAt: e.updatedAt.toISOString(),
        }))}
        categories={categories}
        canManage={canEdit(user.permissions, "club_events")}
        canCreate={canEdit(user.permissions, "club_events") || canCreate(user.permissions, "club_events")}
      />
    </div>
  )
}
