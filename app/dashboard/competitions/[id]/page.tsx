// app/dashboard/competitions/[id]/page.tsx
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { getCurrentUser } from "@/lib/auth"
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList,
  BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { canView, canEdit } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { getMemberSeason } from "@/lib/db"
import { listCanonicalCompetitionRosters } from "@/lib/competition-ontology"
import { PageHeader } from "@/components/ui/page-header"
import { StatusBadge } from "@/components/ui/status-badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatDateOnly } from "@/lib/format"
import { CompetitionScheduleTable } from "@/features/competitions/components/competition-schedule-table"
import { CompetitionRosterManager } from "@/features/competitions/components/competition-roster-manager"
import { MyCompetitionView } from "@/features/competitions/components/my-competition-view"


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

  // Non-managers (members) get a focused view of just their own assignments.
  if (!canManage) {
    const memberSeason = await getMemberSeason(user.id, user.clubId)
    const myParticipants = memberSeason
      ? await prisma.competitionAssignmentParticipant.findMany({
          where: {
            memberSeasonId: memberSeason.id,
            competitionEventAssignment: {
              competitionRoster: { competitionId: competition.id },
            },
          },
          select: {
            id: true,
            role: true,
            seatNumber: true,
            competitionEventAssignment: {
              select: {
                status: true,
                room: true,
                placement: true,
                scoreEarned: true,
                scorePossible: true,
                medalNotes: true,
                event: { select: { id: true, name: true, code: true } },
                schedule: { select: { slotLabel: true, room: true, startsAt: true, endsAt: true } },
                slot: { select: { label: true, room: true, startsAt: true, endsAt: true } },
                competitionRoster: {
                  select: { id: true, label: true, division: true },
                },
                participants: {
                  select: {
                    id: true,
                    role: true,
                    memberSeason: {
                      select: {
                        id: true,
                        user: { select: { firstName: true, lastName: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        })
      : []

    const myAssignments = myParticipants.map((p) => {
      const a = p.competitionEventAssignment
      return {
        id: p.id,
        role: p.role,
        seatNumber: p.seatNumber,
        event: a.event,
        rosterId: a.competitionRoster.id,
        rosterLabel: a.competitionRoster.label,
        division: a.competitionRoster.division,
        status: a.status,
        room: a.room ?? a.schedule?.room ?? a.slot?.room ?? null,
        slotLabel: a.schedule?.slotLabel ?? a.slot?.label ?? null,
        startsAt: (a.schedule?.startsAt ?? a.slot?.startsAt)?.toISOString() ?? null,
        endsAt: (a.schedule?.endsAt ?? a.slot?.endsAt)?.toISOString() ?? null,
        placement: a.placement,
        scoreEarned: a.scoreEarned !== null ? Number(a.scoreEarned) : null,
        scorePossible: a.scorePossible !== null ? Number(a.scorePossible) : null,
        medalNotes: a.medalNotes,
        partners: a.participants.map((part) => ({
          id: part.id,
          firstName: part.memberSeason.user.firstName,
          lastName: part.memberSeason.user.lastName,
          role: part.role,
          isSelf: part.memberSeason.id === memberSeason?.id,
        })),
      }
    })

    return (
      <div className="layout-page">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/dashboard">Dashboard</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/dashboard/competitions">Competitions</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{competition.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <PageHeader
          title={competition.name}
          kicker={TYPE_LABELS[competition.type] ?? competition.type}
          description={[
            competition.location ? competition.location : null,
            formatDateOnly(competition.startsAt),
          ].filter(Boolean).join(" · ")}
        >
          <StatusBadge status={competition.isPublished ? "Live" : "Draft"} withDot />
        </PageHeader>

        <MyCompetitionView
          myAssignments={myAssignments}
          competitionStartsAt={competition.startsAt?.toISOString() ?? null}
          isPublished={competition.isPublished}
        />
      </div>
    )
  }

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
        startsAt: true,
        event: { select: { id: true, name: true, code: true } },
      },
      orderBy: [{ startsAt: "asc" }, { timeSlot: "asc" }],
    }),
  ])

  return (
    <div className="layout-page">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/dashboard">Dashboard</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/dashboard/competitions">Competitions</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{competition.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <PageHeader
        title={competition.name}
        kicker={TYPE_LABELS[competition.type] ?? competition.type}
        description={[
          competition.location ? competition.location : null,
          formatDateOnly(competition.startsAt),
        ].filter(Boolean).join(" · ")}
      >
        <StatusBadge status={competition.isPublished ? "Live" : "Draft"} withDot />
      </PageHeader>

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
                scoreEarned: assignment.scoreEarned !== null ? Number(assignment.scoreEarned) : null,
                scorePossible: assignment.scorePossible !== null ? Number(assignment.scorePossible) : null,
                resultRecordedAt: assignment.resultRecordedAt?.toISOString() ?? null,
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
            schedules={eventSchedules.map((s) => ({
              id: s.id,
              timeSlot: s.timeSlot,
              startsAt: s.startsAt?.toISOString() ?? null,
              event: s.event,
            }))}
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
                startsAt: s.startsAt?.toISOString() ?? null,
                eventId: s.event.id,
              }))}
              competitionId={competition.id}
              competitionStartsAt={competition.startsAt.toISOString()}
              canManage={canManage}
            />
        </TabsContent>
      </Tabs>
    </div>
  )
}
