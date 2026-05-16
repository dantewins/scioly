import { redirect } from "next/navigation"
import { IconLink } from "@tabler/icons-react"
import { getCurrentUser } from "@/lib/auth"
import { canView, canEdit } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { getActiveSeason, getMemberSeason } from "@/lib/db"
import { PageHeader } from "@/components/ui/page-header"
import { EmptyState } from "@/components/empty-state"
import {
  ResourcesManager,
  type ResourceRow,
} from "@/features/resources/components/resources-manager"

export const dynamic = "force-dynamic"

export default async function ResourcesPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")

  // "Resources" is gated on view_practice — same audience that sees the
  // practice feed (admins + active members).
  if (!canView(user.permissions, "practice")) redirect("/dashboard")

  const season = await getActiveSeason(user.clubId)
  if (!season) {
    return (
      <div className="layout-page">
        <PageHeader title="Resources" description="Study materials and references." />
        <EmptyState icon={IconLink} title="No active season" />
      </div>
    )
  }

  const isManager = canEdit(user.permissions, "practice")

  // Managers see everything for the season. Members see season-wide + their
  // enrolled-event + their roster-scoped resources.
  let resources: ResourceRow[] = []
  if (isManager) {
    const rows = await prisma.resource.findMany({
      where: { seasonId: season.id },
      select: {
        id: true,
        title: true,
        description: true,
        type: true,
        url: true,
        eventId: true,
        competitionId: true,
        event: { select: { id: true, name: true, code: true } },
        competition: { select: { id: true, name: true } },
      },
      orderBy: [{ eventId: "asc" }, { createdAt: "desc" }],
    })
    resources = rows
  } else {
    const ms = await getMemberSeason(user.id, user.clubId)
    if (ms) {
      const [enrollments, seasonRosterMemberships, competitionAssignments] = await Promise.all([
        prisma.eventEnrollment.findMany({
          where: { memberSeasonId: ms.id },
          select: { eventId: true },
        }),
        prisma.seasonRosterMember.findMany({
          where: { memberSeasonId: ms.id },
          select: { rosterId: true },
        }),
        prisma.competitionAssignmentParticipant.findMany({
          where: { memberSeasonId: ms.id },
          select: {
            competitionEventAssignment: {
              select: {
                competitionRosterId: true,
                competitionRoster: { select: { competitionId: true } },
              },
            },
          },
        }),
      ])

      const eventIds = enrollments.map((e) => e.eventId)
      const seasonRosterIds = seasonRosterMemberships.map((r) => r.rosterId)
      const competitionIds = competitionAssignments.map(
        (p) => p.competitionEventAssignment.competitionRoster.competitionId,
      )
      const competitionRosterIds = competitionAssignments.map(
        (p) => p.competitionEventAssignment.competitionRosterId,
      )

      const rows = await prisma.resource.findMany({
        where: {
          seasonId: season.id,
          OR: [
            {
              AND: [
                { eventId: null },
                { competitionId: null },
                { seasonRosterId: null },
                { competitionRosterId: null },
              ],
            },
            eventIds.length > 0 ? { eventId: { in: eventIds } } : { id: "__none__" },
            competitionIds.length > 0 ? { competitionId: { in: competitionIds } } : { id: "__none__" },
            seasonRosterIds.length > 0 ? { seasonRosterId: { in: seasonRosterIds } } : { id: "__none__" },
            competitionRosterIds.length > 0
              ? { competitionRosterId: { in: competitionRosterIds } }
              : { id: "__none__" },
          ],
        },
        select: {
          id: true,
          title: true,
          description: true,
          type: true,
          url: true,
          eventId: true,
          competitionId: true,
          event: { select: { id: true, name: true, code: true } },
          competition: { select: { id: true, name: true } },
        },
        orderBy: [{ eventId: "asc" }, { createdAt: "desc" }],
      })
      resources = rows
    }
  }

  const events = await prisma.event.findMany({
    where: { seasonId: season.id },
    select: { id: true, name: true, code: true },
    orderBy: { sortOrder: "asc" },
  })

  return (
    <div className="layout-page">
      <PageHeader
        title="Resources"
        kicker={season.name}
        description={
          isManager
            ? "Add and manage study materials. Members see resources scoped to their events + rosters."
            : "Study materials and references your admin has shared."
        }
      />
      <ResourcesManager initial={resources} events={events} canManage={isManager} />
    </div>
  )
}
