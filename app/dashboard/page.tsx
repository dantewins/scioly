import Link from "next/link"
import { MembershipStatus } from "@prisma/client"
import {
  IconAtom,
  IconCalendar,
  IconChevronRight,
  IconFileCheck,
  IconMapPin,
  IconTrophy,
  IconUsers,
} from "@tabler/icons-react"

import { getCurrentUser } from "@/lib/auth"
import { getActiveSeason } from "@/lib/db"
import { prisma } from "@/lib/prisma"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card"
import { EmptyState } from "@/components/empty-state"

// Competition type badge colors (matches competitions page)
const TYPE_BADGE: Record<string, string> = {
  PRACTICE:     "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  INVITATIONAL: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  REGIONAL:     "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  STATE:        "bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  NATIONAL:     "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200",
  OTHER:        "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
}

const TYPE_LABELS: Record<string, string> = {
  PRACTICE:     "Practice",
  INVITATIONAL: "Invitational",
  REGIONAL:     "Regional",
  STATE:        "State",
  NATIONAL:     "National",
  OTHER:        "Other",
}

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

  const [season, memberCount, pendingCount, competitionCount] = await Promise.all([
    prisma.season.findUnique({ where: { id: activeSeason.id }, select: { name: true } }),
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
      hint: "this season",
      icon: IconUsers,
      href: "/dashboard/members",
      highlight: false,
    },
    {
      label: "Pending Applications",
      value: pendingCount,
      hint: pendingCount > 0 ? "awaiting review" : "all reviewed",
      icon: IconFileCheck,
      href: "/dashboard/applications",
      highlight: pendingCount > 0,
    },
    {
      label: "Competitions",
      value: competitionCount,
      hint: "this season",
      icon: IconTrophy,
      href: "/dashboard/competitions",
      highlight: false,
    },
  ]

  const quickActions = [
    { label: "Review Applications", href: "/dashboard/applications", icon: IconFileCheck },
    { label: "Manage Members",      href: "/dashboard/members",      icon: IconUsers },
    { label: "Competitions",        href: "/dashboard/competitions", icon: IconTrophy },
  ]

  return (
    <div className="flex flex-col gap-8 px-4 py-4 lg:px-6 md:py-6">
      {/* Season context */}
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">{season?.name}</p>
        <h1 className="text-2xl font-semibold mt-0.5">Dashboard</h1>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {stats.map(stat => (
          <Link
            key={stat.label}
            href={stat.href}
            className={`group rounded-xl border bg-card transition-all hover:border-primary/40 hover:shadow-sm overflow-hidden ${
              stat.highlight ? "border-l-4 border-l-amber-400 dark:border-l-amber-500" : ""
            }`}
          >
            <div className="flex flex-col gap-3 px-5 py-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
                <stat.icon className="size-4 text-muted-foreground shrink-0" />
              </div>
              <div>
                <p className={`text-3xl font-bold tabular-nums leading-none ${
                  stat.highlight ? "text-amber-600 dark:text-amber-400" : ""
                }`}>
                  {stat.value}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{stat.hint}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Upcoming competitions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Upcoming Competitions</h2>
          <Link
            href="/dashboard/competitions"
            className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            View all <IconChevronRight className="size-3.5" />
          </Link>
        </div>

        {upcomingCompetitions.length === 0 ? (
          <div className="rounded-xl border border-dashed py-8 text-center text-sm text-muted-foreground">
            No upcoming competitions scheduled.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {upcomingCompetitions.map(c => (
              <Link key={c.id} href={`/dashboard/competitions/${c.id}`} className="group">
                <Card className="h-full transition-all group-hover:border-primary/40 group-hover:shadow-sm gap-3">
                  <CardHeader className="pb-0">
                    <span className={`w-fit rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_BADGE[c.type] ?? TYPE_BADGE.OTHER}`}>
                      {TYPE_LABELS[c.type] ?? c.type}
                    </span>
                    <p className="font-semibold text-sm leading-tight">{c.name}</p>
                  </CardHeader>
                  <CardContent className="space-y-1 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <IconCalendar className="size-3.5 shrink-0" />
                      {c.startsAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </div>
                    {c.location && (
                      <div className="flex items-center gap-1.5">
                        <IconMapPin className="size-3.5 shrink-0" />
                        {c.location}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold">Quick Actions</h2>
        <div className="grid grid-cols-3 gap-3">
          {quickActions.map(action => (
            <Link
              key={action.href}
              href={action.href}
              className="flex flex-col items-center justify-center gap-2 rounded-xl border bg-card px-3 py-4 text-center transition-all hover:border-primary/40 hover:bg-muted/30 hover:shadow-sm"
            >
              <action.icon className="size-5 text-muted-foreground" />
              <span className="text-xs font-medium leading-tight">{action.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
