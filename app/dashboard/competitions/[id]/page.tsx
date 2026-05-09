// app/dashboard/competitions/[id]/page.tsx
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { IconArrowLeft } from "@tabler/icons-react"
import { getCurrentUser } from "@/lib/auth"
import { canView, canEdit } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { listCanonicalCompetitionRosters } from "@/lib/competition-ontology"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatDateOnly } from "@/lib/format"
import { CompetitionScheduleTable } from "@/components/tables/competition-schedule-table"
import { CompetitionRosterManager } from "./competition-roster-manager"


const TYPE_LABELS: Record<string, string> = {
  INVITATIONAL: "Invitational",
  REGIONAL: "Regional",
  STATE: "State",
  NATIONAL: "National",
  PRACTICE: "Practice",
  OTHER: "Other",
}

interface Props { params: Promise<{ id: string }> }

export default async function CompetitionDetailPage({ params }: Props) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  if (!canView(user.permissions, "competitions")) redirect("/dashboard")

  const competition = await prisma.competition.findFirst({
    where: { id, season: { clubId: user.clubId } },
    select: {
      id: true,
      seasonId: true,
      name: true,
      type: true,
      location: true,
      startsAt: true,
      isPublished: true,
    },
  })
  if (!competition) notFound()

  const canManage = canEdit(user.permissions, "competitions")

  const [rosters, seasonRosters, activeMembers, slots, events, eventSchedules] = await Promise.all([
    listCanonicalCompetitionRosters(competition.id),
    prisma.seasonRoster.findMany({
      where: { seasonId: competition.seasonId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    canManage
      ? prisma.memberSeason.findMany({
          where: {
            seasonId: competition.seasonId,
            membershipStatus: "ACTIVE",
            user: { clubId: user.clubId },
          },
          select: {
            id: true,
            user: { select: { firstName: true, lastName: true, email: true } },
          },
          orderBy: [{ user: { lastName: "asc" } }, { user: { firstName: "asc" } }],
        })
      : Promise.resolve([]),
    prisma.competitionEventSlot.findMany({
      where: { competitionId: competition.id },
      select: {
        id: true,
        eventId: true,
        label: true,
        room: true,
      },
      orderBy: { label: "asc" },
    }),
    prisma.event.findMany({
      where: { seasonId: competition.seasonId },
      select: { id: true, name: true, code: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.eventSchedule.findMany({
      where: { competitionId: competition.id },
      select: {
        id: true,
        timeSlot: true,
        slotLabel: true,
        event: { select: { id: true, name: true, code: true } },
      },
      orderBy: { timeSlot: "asc" },
    }),
  ])

  return (
    <div className="layout-page">
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/competitions"><IconArrowLeft className="size-4" /></Link>
        </Button>
        <div className="min-w-0 flex-1">
          <PageHeader
            title={competition.name}
            description={[
              competition.location ? `${competition.location}` : null,
              formatDateOnly(competition.startsAt),
            ].filter(Boolean).join(" · ")}
          >
            <Badge variant="outline">{TYPE_LABELS[competition.type] ?? competition.type}</Badge>
            {competition.isPublished && <Badge variant="secondary">Published</Badge>}
          </PageHeader>
        </div>
      </div>

      <Tabs defaultValue="rosters">
        <TabsList>
          <TabsTrigger value="rosters">Rosters ({rosters.length})</TabsTrigger>
          <TabsTrigger value="schedule">Schedule ({events.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="rosters" className="mt-4 space-y-3">
          <CompetitionRosterManager
            competitionId={competition.id}
            initialRosters={rosters.map((roster) => ({
              ...roster,
              assignments: roster.assignments.map((assignment) => ({
                ...assignment,
                schedule: assignment.schedule
                  ? {
                      ...assignment.schedule,
                      startsAt: assignment.schedule.startsAt?.toISOString() ?? null,
                      endsAt: assignment.schedule.endsAt?.toISOString() ?? null,
                    }
                  : null,
                slot: assignment.slot
                  ? {
                      ...assignment.slot,
                      startsAt: assignment.slot.startsAt?.toISOString() ?? null,
                      endsAt: assignment.slot.endsAt?.toISOString() ?? null,
                    }
                  : null,
              })),
            }))}
            events={events}
            seasonRosters={seasonRosters}
            members={activeMembers}
            slots={slots}
            canManage={canManage}
          />
        </TabsContent>

        {/* Schedule Tab */}
        <TabsContent value="schedule" className="mt-4">
          <CompetitionScheduleTable
              events={events}
              initialSchedules={eventSchedules.map((s) => ({
                id: s.id,
                timeSlot: s.timeSlot,
                slotLabel: s.slotLabel,
                eventId: s.event.id,
              }))}
              competitionId={competition.id}
              canManage={canManage}
            />
        </TabsContent>
      </Tabs>
    </div>
  )
}
