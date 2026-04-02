// app/dashboard/teams/page.tsx
import { redirect } from "next/navigation"
import Link from "next/link"
import { IconChartBar } from "@tabler/icons-react"
import { getCurrentUser } from "@/lib/auth"
import { canView, canCreate } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { getActiveSeason } from "@/lib/db"
import { PageHeader } from "@/components/page-header"
import { EmptyState } from "@/components/empty-state"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { CreateTeamButton } from "./create-team-button"

export const dynamic = "force-dynamic"

export default async function TeamsPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  if (!canView(user.permissions, "teams")) redirect("/dashboard")

  const season = await getActiveSeason(user.clubId)

  const [teams, competitions, events] = season ? await Promise.all([
    prisma.team.findMany({
      where: { seasonId: season.id },
      include: {
        competition: { select: { id: true, name: true } },
        event: { select: { id: true, name: true, code: true } },
        _count: { select: { assignments: true } },
      },
      orderBy: { label: "asc" },
    }),
    prisma.competition.findMany({
      where: { seasonId: season.id },
      select: { id: true, name: true },
      orderBy: { startsAt: "asc" },
    }),
    prisma.event.findMany({
      where: { seasonId: season.id },
      select: { id: true, name: true, code: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]) : [[], [], []]

  const canManage = canCreate(user.permissions, "teams")

  return (
    <div className="flex flex-col gap-6 py-4 lg:px-6 md:py-6 sm:px-4 px-0">
      <PageHeader title="Teams" description={`${teams.length} team${teams.length !== 1 ? "s" : ""} this season`}>
        {canManage && season && (
          <CreateTeamButton competitions={competitions} events={events} />
        )}
      </PageHeader>

      {!season ? (
        <EmptyState icon={IconChartBar} title="No active season" />
      ) : teams.length === 0 ? (
        <EmptyState icon={IconChartBar} title="No teams yet" description="Create teams and assign members." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <Link key={team.id} href={`/dashboard/teams/${team.id}`}>
              <Card className="hover:bg-muted/30 transition-colors cursor-pointer">
                <CardContent className="pt-4 space-y-1.5">
                  <p className="font-medium text-sm">{team.label}</p>
                  <div className="flex flex-wrap gap-1">
                    {team.competition && <Badge variant="secondary" className="text-xs">{team.competition.name}</Badge>}
                    {team.event && <Badge variant="outline" className="text-xs">{team.event.name}</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">{team._count.assignments} members assigned</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
