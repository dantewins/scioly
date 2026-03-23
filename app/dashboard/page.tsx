import Link from "next/link"
import { MembershipStatus } from "@prisma/client"
import {
  IconAtom,
  IconCalendar,
  IconFileCheck,
  IconMapPin,
  IconTrophy,
  IconUsers,
} from "@tabler/icons-react"

import { getCurrentUser } from "@/lib/auth"
import { getActiveSeason } from "@/lib/db"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { EmptyState } from "@/components/empty-state"

export default async function DashboardPage() {
  const user = await getCurrentUser()
  if (!user) return null

  const activeSeason = await getActiveSeason(user.clubId)

  if (!activeSeason) {
    return (
      <div className="px-4 py-4 lg:px-6 md:py-6">
        <EmptyState
          icon={IconAtom}
          title="No active season"
          description="An active season is required to manage members, teams, and competitions."
        />
      </div>
    )
  }

  const [memberCount, pendingCount, competitionCount] = await Promise.all([
    prisma.memberSeason.count({
      where: { seasonId: activeSeason.id, membershipStatus: MembershipStatus.ACTIVE },
    }),
    prisma.memberSeason.count({
      where: {
        seasonId: activeSeason.id,
        membershipStatus: MembershipStatus.PENDING,
        applicationSubmittedAt: { not: null },
      },
    }),
    prisma.competition.count({ where: { seasonId: activeSeason.id } }),
  ])

  const upcomingCompetitions = await prisma.competition.findMany({
    where: {
      seasonId: activeSeason.id,
      startsAt: { gte: new Date() },
    },
    orderBy: { startsAt: "asc" },
    take: 3,
    select: {
      id: true,
      name: true,
      type: true,
      location: true,
      startsAt: true,
    },
  })

  const stats = [
    {
      label: "Active Members",
      value: memberCount,
      icon: IconUsers,
      href: "/dashboard/members",
    },
    {
      label: "Pending Applications",
      value: pendingCount,
      icon: IconFileCheck,
      href: "/dashboard/applications",
      highlight: pendingCount > 0,
    },
    {
      label: "Competitions",
      value: competitionCount,
      icon: IconTrophy,
      href: "/dashboard/teams",
    },
  ]

  return (
    <div className="flex flex-col gap-6 px-4 py-4 lg:px-6 md:py-6">
      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map(stat => (
          <Link key={stat.label} href={stat.href} className="group">
            <Card className="transition-colors group-hover:border-primary/40">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardDescription>{stat.label}</CardDescription>
                <stat.icon className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold tabular-nums ${stat.highlight ? "text-amber-600 dark:text-amber-400" : ""}`}>
                  {stat.value}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Upcoming competitions */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Upcoming Competitions
        </h2>
        {upcomingCompetitions.length === 0 ? (
          <div className="rounded-xl border border-dashed py-8 text-center text-sm text-muted-foreground">
            No upcoming competitions scheduled.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {upcomingCompetitions.map(c => (
              <Card key={c.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{c.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1.5 text-sm text-muted-foreground">
                  {c.location && (
                    <div className="flex items-center gap-1.5">
                      <IconMapPin className="size-3.5 shrink-0" />
                      {c.location}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <IconCalendar className="size-3.5 shrink-0" />
                    {c.startsAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Quick Actions
        </h2>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/applications">Review Applications</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/members">Manage Members</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/teams">Team Builder</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
