// app/dashboard/competitions/page.tsx
import { redirect } from "next/navigation"
import { IconTrophy } from "@tabler/icons-react"
import { getCurrentUser } from "@/lib/auth"
import { canView, canCreate, canEdit } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { getActiveSeason, getMemberSeason } from "@/lib/db"
import { PageHeader } from "@/components/ui/page-header"
import { EmptyState } from "@/components/empty-state"
import { CompetitionCard } from "@/components/cards/competition-card"
import { CreateCompetitionDialog } from "./create-competition-dialog"


export default async function CompetitionsPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  if (!canView(user.permissions, "competitions")) redirect("/dashboard")

  const season = await getActiveSeason(user.clubId)
  const canManage = canEdit(user.permissions, "competitions") || canCreate(user.permissions, "competitions")

  let competitions: Array<{
    id: string
    name: string
    type: string
    location: string | null
    startsAt: Date
    isPublished: boolean
    _count: { rosters: number; eventSchedules: number }
  }> = []

  if (season) {
    if (canManage) {
      competitions = await prisma.competition.findMany({
        where: { seasonId: season.id },
        include: { _count: { select: { rosters: true, eventSchedules: true } } },
        orderBy: { startsAt: "asc" },
      })
    } else {
      const ms = await getMemberSeason(user.id, user.clubId)
      if (ms) {
        competitions = await prisma.competition.findMany({
          where: {
            seasonId: season.id,
            isPublished: true,
            rosters: {
              some: {
                assignments: {
                  some: { participants: { some: { memberSeasonId: ms.id } } },
                },
              },
            },
          },
          include: { _count: { select: { rosters: true, eventSchedules: true } } },
          orderBy: { startsAt: "asc" },
        })
      }
    }
  }

  return (
    <div className="layout-page">
      <PageHeader title="Competitions" description={`${competitions.length} competition${competitions.length !== 1 ? "s" : ""}`}>
        {canManage && season && <CreateCompetitionDialog />}
      </PageHeader>

      {!season ? (
        <EmptyState icon={IconTrophy} title="No active season" description="Create a season in Settings first." />
      ) : competitions.length === 0 ? (
        canManage ? (
          <EmptyState icon={IconTrophy} title="No competitions yet" description="Add your first competition for this season." />
        ) : (
          <EmptyState icon={IconTrophy} title="No competitions assigned" description="Talk to your admin to be added to a competition roster." />
        )
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {competitions.map((comp) => (
            <CompetitionCard
              key={comp.id}
              id={comp.id}
              name={comp.name}
              type={comp.type}
              location={comp.location}
              startsAt={comp.startsAt}
              isPublished={comp.isPublished}
              rosterCount={comp._count.rosters}
              eventCount={comp._count.eventSchedules}
            />
          ))}
        </div>
      )}
    </div>
  )
}
