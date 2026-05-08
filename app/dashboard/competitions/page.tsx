// app/dashboard/competitions/page.tsx
import { redirect } from "next/navigation"
import Link from "next/link"
import { IconTrophy, IconMapPin, IconCalendar } from "@tabler/icons-react"
import { getCurrentUser } from "@/lib/auth"
import { canView, canCreate, canEdit } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { getActiveSeason } from "@/lib/db"
import { PageHeader } from "@/components/ui/page-header"
import { EmptyState } from "@/components/empty-state"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { formatDateOnly } from "@/lib/format"
import { CreateCompetitionDialog } from "./create-competition-dialog"


const TYPE_COLORS: Record<string, string> = {
  INVITATIONAL: "bg-blue-100 text-blue-800",
  REGIONAL: "bg-purple-100 text-purple-800",
  STATE: "bg-orange-100 text-orange-800",
  NATIONAL: "bg-red-100 text-red-800",
  PRACTICE: "bg-green-100 text-green-800",
  OTHER: "bg-gray-100 text-gray-800",
}

const TYPE_LABELS: Record<string, string> = {
  INVITATIONAL: "Invitational",
  REGIONAL: "Regional",
  STATE: "State",
  NATIONAL: "National",
  PRACTICE: "Practice",
  OTHER: "Other",
}

export default async function CompetitionsPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  if (!canView(user.permissions, "competitions")) redirect("/dashboard")

  const season = await getActiveSeason(user.clubId)
  const competitions = season
    ? await prisma.competition.findMany({
        where: { seasonId: season.id },
        include: { _count: { select: { rosters: true, eventSchedules: true } } },
        orderBy: { startsAt: "asc" },
      })
    : []

  const canManage = canEdit(user.permissions, "competitions") || canCreate(user.permissions, "competitions")

  return (
    <div className="layout-page">
      <PageHeader title="Competitions" description={`${competitions.length} competition${competitions.length !== 1 ? "s" : ""}`}>
        {canManage && season && <CreateCompetitionDialog />}
      </PageHeader>

      {!season ? (
        <EmptyState icon={IconTrophy} title="No active season" description="Create a season in Settings first." />
      ) : competitions.length === 0 ? (
        <EmptyState icon={IconTrophy} title="No competitions yet" description="Add your first competition for this season." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {competitions.map((comp) => (
            <Link key={comp.id} href={`/dashboard/competitions/${comp.id}`}>
              <Card className="hover:bg-muted/30 transition-colors cursor-pointer">
                <CardContent className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-sm leading-tight">{comp.name}</p>
                    <Badge className={TYPE_COLORS[comp.type] ?? ""} variant="outline">
                      {TYPE_LABELS[comp.type] ?? comp.type}
                    </Badge>
                  </div>
                  {comp.location && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <IconMapPin className="size-3" />
                      {comp.location}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <IconCalendar className="size-3" />
                    {formatDateOnly(comp.startsAt)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {comp._count.rosters} rosters and {comp._count.eventSchedules} events scheduled
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
