// app/dashboard/events/page.tsx
import { redirect } from "next/navigation"
import { IconAtom } from "@tabler/icons-react"
import { getCurrentUser } from "@/lib/auth"
import { canView, canCreate, canEdit } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { getActiveSeason } from "@/lib/db"
import { PageHeader } from "@/components/ui/page-header"
import { EmptyState } from "@/components/empty-state"
import { EventsManager } from "./events-manager"


export default async function EventsPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  if (!canView(user.permissions, "events")) redirect("/dashboard")

  const season = await getActiveSeason(user.clubId)
  const events = season
    ? await prisma.event.findMany({
        where: { seasonId: season.id },
        include: { _count: { select: { enrollments: true } } },
        orderBy: { sortOrder: "asc" },
      })
    : []

  const canManage = canEdit(user.permissions, "events")
  const canCreateEvents = canManage || canCreate(user.permissions, "events")

  return (
    <div className="layout-page">
      <PageHeader
        title="Events"
        description={season ? `${events.length} events this season` : "No active season"}
      />

      {!season ? (
        <EmptyState icon={IconAtom} title="No active season" description="Create a season in Settings to get started." />
      ) : (
        <>
          {events.length === 0 && !canManage && (
            <EmptyState icon={IconAtom} title="No events yet" description="Admins can add Science Olympiad events for this season." />
          )}
          <EventsManager
            initialEvents={events}
            canManage={canManage}
            canCreate={canCreateEvents}
          />
        </>
      )}
    </div>
  )
}
