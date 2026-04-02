// app/dashboard/teams/[teamId]/page.tsx
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { IconArrowLeft } from "@tabler/icons-react"
import { getCurrentUser } from "@/lib/auth"
import { canView, canEdit } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { getActiveSeason } from "@/lib/db"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TeamMemberManager } from "./team-member-manager"

export const dynamic = "force-dynamic"

interface Props { params: Promise<{ teamId: string }> }

export default async function TeamDetailPage({ params }: Props) {
  const { teamId } = await params
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  if (!canView(user.permissions, "teams")) redirect("/dashboard")

  const season = await getActiveSeason(user.clubId)
  if (!season) redirect("/dashboard/teams")

  const [team, allMembers] = await Promise.all([
    prisma.team.findFirst({
      where: { id: teamId, season: { clubId: user.clubId } },
      include: {
        competition: { select: { id: true, name: true } },
        event: { select: { id: true, name: true } },
        assignments: {
          include: {
            memberSeason: {
              include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
            },
          },
        },
      },
    }),
    prisma.memberSeason.findMany({
      where: { seasonId: season.id, membershipStatus: "ACTIVE", user: { clubId: user.clubId } },
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: [{ user: { lastName: "asc" } }, { user: { firstName: "asc" } }],
    }),
  ])

  if (!team) notFound()

  const canManage = canEdit(user.permissions, "teams")

  return (
    <div className="flex flex-col gap-6 py-4 lg:px-6 md:py-6 sm:px-4 px-0">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/teams"><IconArrowLeft className="size-4" /></Link>
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">{team.label}</h1>
            {team.competition && <Badge variant="secondary">{team.competition.name}</Badge>}
            {team.event && <Badge variant="outline">{team.event.name}</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">{team.assignments.length} members</p>
        </div>
      </div>

      <TeamMemberManager
        teamId={teamId}
        assignments={team.assignments}
        allMembers={allMembers}
        canManage={canManage}
      />
    </div>
  )
}
