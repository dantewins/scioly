import { prisma } from "@/lib/prisma"
import { getActiveSeason, getMemberSeason } from "@/lib/db"
import { getMemberPracticeFeed } from "@/features/practice/lib"
import type { CurrentUser } from "@/lib/auth"

function decimalToNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

export interface MemberDashboardData {
  season: { id: string; name: string } | null
  memberSeasonId: string | null
  hours: {
    approved: number
    pending: number
    expected: number | null
    remaining: number | null
  }
  finances: {
    outstandingDollars: number
    openInvoiceCount: number
  }
  forms: {
    pendingRequiredCount: number
    completedRequiredCount: number
    totalRequiredCount: number
  }
  practice: {
    inProgress: Array<{
      attemptId: string
      assessmentId: string
      title: string
      eventName: string | null
      progressPercent: number
      promptCount: number
      answeredCount: number
    }>
    recommended: Array<{
      id: string
      title: string
      eventName: string | null
      submittedAttempts: number
    }>
    recentScored: Array<{
      attemptId: string
      title: string
      eventName: string | null
      score: number | null
      scorePossible: number | null
      submittedAt: string
    }>
    streakDays: number
  }
  upcomingCompetitions: Array<{
    assignmentId: string
    competitionId: string
    competitionName: string
    competitionType: string
    eventName: string
    rosterLabel: string | null
    division: string | null
    startsAt: string | null
    room: string | null
  }>
  upcomingClubEvents: Array<{
    id: string
    name: string
    type: string
    location: string | null
    startsAt: string
    hoursValue: number
  }>
  announcements: Array<{
    id: string
    title: string
    body: string
    isPinned: boolean
    publishedAt: Date | null
  }>
}

export async function loadMemberDashboard(user: CurrentUser): Promise<MemberDashboardData> {
  const season = await getActiveSeason(user.clubId)
  if (!season) {
    return emptyData()
  }
  const memberSeason = await getMemberSeason(user.id, user.clubId)
  const memberSeasonId = memberSeason?.id ?? null
  const now = new Date()
  const upcomingCutoff = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)

  if (!memberSeasonId) {
    const [announcements] = await Promise.all([
      loadAnnouncements(season.id, now),
    ])
    return { ...emptyData(), season, announcements }
  }

  const [
    hourApproved,
    hourPending,
    memberSeasonRecord,
    openInvoices,
    formTypes,
    practiceFeed,
    upcomingAssignments,
    upcomingClubEvents,
    announcements,
  ] = await Promise.all([
    prisma.hourEntry.aggregate({
      where: { memberSeasonId, status: "APPROVED" },
      _sum: { totalHours: true },
    }),
    prisma.hourEntry.aggregate({
      where: { memberSeasonId, status: "PENDING" },
      _sum: { totalHours: true },
    }),
    prisma.memberSeason.findUnique({
      where: { id: memberSeasonId },
      select: { expectedHours: true },
    }),
    prisma.duesInvoice.findMany({
      where: {
        seasonId: season.id,
        memberSeasonId,
        status: { in: ["OPEN", "OVERDUE", "PARTIALLY_PAID"] },
      },
      select: { amountCents: true, amountPaidCents: true },
    }),
    prisma.formType.findMany({
      where: { seasonId: season.id, isRequired: true },
      select: {
        id: true,
        submissions: {
          where: { memberSeasonId },
          select: { status: true },
          take: 1,
        },
      },
    }),
    getMemberPracticeFeed(season.id, memberSeasonId),
    prisma.competitionAssignmentParticipant.findMany({
      where: {
        memberSeasonId,
        competitionEventAssignment: {
          competitionRoster: {
            competition: { isPublished: true, startsAt: { gte: now } },
          },
        },
      },
      select: {
        id: true,
        competitionEventAssignment: {
          select: {
            event: { select: { name: true } },
            room: true,
            schedule: { select: { startsAt: true, room: true } },
            slot: { select: { startsAt: true, room: true } },
            competitionRoster: {
              select: {
                label: true,
                division: true,
                competition: {
                  select: {
                    id: true,
                    name: true,
                    type: true,
                    startsAt: true,
                  },
                },
              },
            },
          },
        },
      },
      take: 8,
    }),
    prisma.clubEvent.findMany({
      where: { seasonId: season.id, startsAt: { gte: now, lte: upcomingCutoff } },
      select: { id: true, name: true, type: true, location: true, startsAt: true, hoursValue: true },
      orderBy: { startsAt: "asc" },
      take: 3,
    }),
    loadAnnouncements(season.id, now),
  ])

  const approved = decimalToNumber(hourApproved._sum.totalHours) ?? 0
  const pending = decimalToNumber(hourPending._sum.totalHours) ?? 0
  const expected = decimalToNumber(memberSeasonRecord?.expectedHours ?? null)
  const remaining = expected === null ? null : Math.max(0, expected - approved)

  const outstandingCents = openInvoices.reduce(
    (sum, inv) => sum + Math.max(0, inv.amountCents - inv.amountPaidCents),
    0,
  )

  const completedRequired = formTypes.filter((ft) => {
    const s = ft.submissions[0]?.status
    return s === "SUBMITTED" || s === "VERIFIED"
  }).length

  const competitionRows = upcomingAssignments
    .map((p) => {
      const a = p.competitionEventAssignment
      const startsAt =
        a.schedule?.startsAt ??
        a.slot?.startsAt ??
        a.competitionRoster.competition.startsAt ??
        null
      return {
        assignmentId: p.id,
        competitionId: a.competitionRoster.competition.id,
        competitionName: a.competitionRoster.competition.name,
        competitionType: a.competitionRoster.competition.type,
        eventName: a.event.name,
        rosterLabel: a.competitionRoster.label,
        division: a.competitionRoster.division,
        startsAt: startsAt?.toISOString() ?? null,
        room: a.room ?? a.schedule?.room ?? a.slot?.room ?? null,
      }
    })
    .sort((x, y) => {
      const xt = x.startsAt ? new Date(x.startsAt).getTime() : Infinity
      const yt = y.startsAt ? new Date(y.startsAt).getTime() : Infinity
      return xt - yt
    })
    .slice(0, 4)

  return {
    season,
    memberSeasonId,
    hours: { approved, pending, expected, remaining },
    finances: {
      outstandingDollars: Math.round(outstandingCents) / 100,
      openInvoiceCount: openInvoices.length,
    },
    forms: {
      pendingRequiredCount: formTypes.length - completedRequired,
      completedRequiredCount: completedRequired,
      totalRequiredCount: formTypes.length,
    },
    practice: {
      inProgress: practiceFeed.continueAttempts.slice(0, 3).map((c) => ({
        attemptId: c.attemptId,
        assessmentId: c.assessmentId,
        title: c.title,
        eventName: c.eventName,
        progressPercent: c.progressPercent,
        promptCount: c.promptCount,
        answeredCount: c.answeredCount,
      })),
      recommended: practiceFeed.recommendedAssessments.slice(0, 3).map((a) => ({
        id: a.id,
        title: a.title,
        eventName: a.event?.name ?? null,
        submittedAttempts: a.submittedAttempts,
      })),
      recentScored: practiceFeed.recentAttempts.slice(0, 3).map((r) => ({
        attemptId: r.attemptId,
        title: r.title,
        eventName: r.eventName,
        score: r.score,
        scorePossible: r.scorePossible,
        submittedAt: r.submittedAt,
      })),
      streakDays: 0,
    },
    upcomingCompetitions: competitionRows,
    upcomingClubEvents: upcomingClubEvents.map((e) => ({
      id: e.id,
      name: e.name,
      type: e.type,
      location: e.location ?? null,
      startsAt: e.startsAt.toISOString(),
      hoursValue: decimalToNumber(e.hoursValue) ?? 0,
    })),
    announcements,
  }
}

async function loadAnnouncements(seasonId: string, now: Date) {
  return prisma.announcement.findMany({
    where: {
      seasonId,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      publishedAt: { not: null, lte: now },
    },
    select: { id: true, title: true, body: true, isPinned: true, publishedAt: true },
    orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }],
    take: 5,
  })
}

function emptyData(): MemberDashboardData {
  return {
    season: null,
    memberSeasonId: null,
    hours: { approved: 0, pending: 0, expected: null, remaining: null },
    finances: { outstandingDollars: 0, openInvoiceCount: 0 },
    forms: { pendingRequiredCount: 0, completedRequiredCount: 0, totalRequiredCount: 0 },
    practice: { inProgress: [], recommended: [], recentScored: [], streakDays: 0 },
    upcomingCompetitions: [],
    upcomingClubEvents: [],
    announcements: [],
  }
}
