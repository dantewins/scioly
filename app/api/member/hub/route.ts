import { withActiveMemberAuth, ok, err } from "@/lib/api"
import { getActiveSeason, getMemberSeason } from "@/lib/db"
import { prisma } from "@/lib/prisma"
import { getMemberPracticeFeed } from "@/lib/practice-assessments"
import { rateLimitErrorMessage, takeRateLimit } from "@/lib/rate-limit"

export const dynamic = "force-dynamic"

function centsToDollars(cents: number): number {
  return Math.round((cents / 100) * 100) / 100
}

function decimalToNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

function calculateDayStreak(isoDates: string[]): number {
  if (isoDates.length === 0) return 0

  const dayKeys = Array.from(
    new Set(
      isoDates.map((date) => {
        const dt = new Date(date)
        return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`
      }),
    ),
  ).sort((a, b) => (a > b ? -1 : 1))

  let streak = 0
  const cursor = new Date()
  cursor.setUTCHours(0, 0, 0, 0)

  const todayKey = `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, "0")}-${String(cursor.getUTCDate()).padStart(2, "0")}`
  const yesterday = new Date(cursor)
  yesterday.setUTCDate(yesterday.getUTCDate() - 1)
  const yesterdayKey = `${yesterday.getUTCFullYear()}-${String(yesterday.getUTCMonth() + 1).padStart(2, "0")}-${String(yesterday.getUTCDate()).padStart(2, "0")}`

  if (dayKeys[0] !== todayKey && dayKeys[0] !== yesterdayKey) return 0

  for (const key of dayKeys) {
    const cursorKey = `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, "0")}-${String(cursor.getUTCDate()).padStart(2, "0")}`
    if (key !== cursorKey) break
    streak += 1
    cursor.setUTCDate(cursor.getUTCDate() - 1)
  }

  return streak
}

export const GET = withActiveMemberAuth(async (_req, _ctx, user) => {
  const limiter = await takeRateLimit(`member:hub:${user.id}`, 90, 60_000)
  if (!limiter.allowed) return err(rateLimitErrorMessage("member hub", limiter.retryAfterMs), 429)

  const season = await getActiveSeason(user.clubId)
  if (!season) return err("No active season.", 400)

  const memberSeason = await getMemberSeason(user.id, user.clubId)
  if (!memberSeason) return err("Not a member this season.", 403)

  const now = new Date()
  const upcomingCutoff = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const [
    member,
    seasonRecord,
    enrollments,
    formTypes,
    openInvoices,
    hourApproved,
    hourPending,
    requiredHourCategories,
    recentHourEntries,
    upcomingClubEvents,
    recentFormSubmissions,
    recentAttemptDates,
    attemptsLast7Days,
    practiceFeed,
    memberSeasonRecord,
    rosterMemberships,
    competitionAssignments,
    announcementRows,
    resourceRows,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        displayName: true,
        email: true,
        gradeLevel: true,
        graduationYear: true,
      },
    }),
    prisma.season.findUnique({
      where: { id: season.id },
      select: {
        id: true,
        name: true,
        schoolYear: true,
        startsAt: true,
        endsAt: true,
      },
    }),
    prisma.eventEnrollment.findMany({
      where: {
        memberSeasonId: memberSeason.id,
      },
      select: {
        status: true,
        preferenceRank: true,
        event: {
          select: {
            id: true,
            name: true,
            code: true,
            isTrialEvent: true,
          },
        },
      },
      orderBy: [
        { status: "asc" },
        { preferenceRank: "asc" },
        { event: { sortOrder: "asc" } },
      ],
    }),
    prisma.formType.findMany({
      where: { seasonId: season.id },
      select: {
        id: true,
        name: true,
        isRequired: true,
        dueAt: true,
        submissions: {
          where: { memberSeasonId: memberSeason.id },
          select: {
            id: true,
            status: true,
            submittedAt: true,
            verifiedAt: true,
            rejectionReason: true,
          },
          take: 1,
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.duesInvoice.findMany({
      where: {
        seasonId: season.id,
        memberSeasonId: memberSeason.id,
        status: { in: ["OPEN", "OVERDUE", "PARTIALLY_PAID"] },
      },
      select: {
        id: true,
        title: true,
        status: true,
        amountCents: true,
        amountPaidCents: true,
        dueAt: true,
      },
      orderBy: [{ dueAt: "asc" }, { issuedAt: "desc" }],
    }),
    prisma.hourEntry.aggregate({
      where: {
        memberSeasonId: memberSeason.id,
        status: "APPROVED",
      },
      _sum: { totalHours: true },
    }),
    prisma.hourEntry.aggregate({
      where: {
        memberSeasonId: memberSeason.id,
        status: "PENDING",
      },
      _sum: { totalHours: true },
    }),
    prisma.hourCategory.findMany({
      where: {
        seasonId: season.id,
        requiredHours: { not: null },
      },
      select: {
        id: true,
        name: true,
        requiredHours: true,
      },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.hourEntry.findMany({
      where: { memberSeasonId: memberSeason.id },
      select: {
        id: true,
        title: true,
        status: true,
        totalHours: true,
        submittedAt: true,
        category: { select: { id: true, name: true } },
      },
      orderBy: { submittedAt: "desc" },
      take: 10,
    }),
    prisma.clubEvent.findMany({
      where: {
        seasonId: season.id,
        startsAt: { gte: now, lte: upcomingCutoff },
      },
      select: {
        id: true,
        name: true,
        type: true,
        location: true,
        startsAt: true,
        endsAt: true,
        hoursValue: true,
      },
      orderBy: { startsAt: "asc" },
      take: 12,
    }),
    prisma.formSubmission.findMany({
      where: {
        memberSeasonId: memberSeason.id,
        submittedAt: { not: null },
      },
      select: {
        id: true,
        status: true,
        submittedAt: true,
        formType: { select: { id: true, name: true } },
      },
      orderBy: { submittedAt: "desc" },
      take: 8,
    }),
    prisma.assessmentAttempt.findMany({
      where: {
        memberSeasonId: memberSeason.id,
        submittedAt: { not: null },
      },
      select: { submittedAt: true },
      orderBy: { submittedAt: "desc" },
      take: 120,
    }),
    prisma.assessmentAttempt.count({
      where: {
        memberSeasonId: memberSeason.id,
        status: { in: ["SUBMITTED", "SCORED"] },
        submittedAt: { gte: weekAgo },
      },
    }),
    getMemberPracticeFeed(season.id, memberSeason.id),
    prisma.memberSeason.findUnique({
      where: { id: memberSeason.id },
      select: { expectedHours: true },
    }),
    prisma.seasonRosterMember.findMany({
      where: { memberSeasonId: memberSeason.id },
      select: {
        rosterId: true,
        role: true,
        roster: {
          select: {
            id: true,
            name: true,
            division: true,
          },
        },
      },
      orderBy: { assignedAt: "asc" },
    }),
    prisma.competitionAssignmentParticipant.findMany({
      where: { memberSeasonId: memberSeason.id },
      select: {
        id: true,
        role: true,
        seatNumber: true,
        notes: true,
        assignedAt: true,
        competitionEventAssignment: {
          select: {
            id: true,
            status: true,
            entryLabel: true,
            room: true,
            block: true,
            notes: true,
            event: {
              select: {
                id: true,
                name: true,
                code: true,
                isTrialEvent: true,
              },
            },
            schedule: {
              select: {
                id: true,
                slotLabel: true,
                room: true,
                startsAt: true,
                endsAt: true,
              },
            },
            slot: {
              select: {
                id: true,
                label: true,
                room: true,
                startsAt: true,
                endsAt: true,
              },
            },
            competitionRoster: {
              select: {
                id: true,
                label: true,
                division: true,
                competition: {
                  select: {
                    id: true,
                    name: true,
                    type: true,
                    startsAt: true,
                    endsAt: true,
                  },
                },
                seasonRoster: {
                  select: {
                    id: true,
                    name: true,
                    division: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { assignedAt: "desc" },
      take: 40,
    }),
    prisma.announcement.findMany({
      where: {
        seasonId: season.id,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        publishedAt: { not: null, lte: now },
      },
      select: { id: true, title: true, body: true, isPinned: true, publishedAt: true },
      orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }],
      take: 10,
    }),
    prisma.resource.findMany({
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
          // Event-scoped resources for events this member is enrolled in.
          {
            eventId: {
              in: (
                await prisma.eventEnrollment.findMany({
                  where: { memberSeasonId: memberSeason.id },
                  select: { eventId: true },
                })
              ).map((e) => e.eventId),
            },
          },
        ],
      },
      select: {
        id: true,
        title: true,
        type: true,
        url: true,
        event: { select: { name: true, code: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
  ])

  const approvedHours = decimalToNumber(hourApproved._sum.totalHours) ?? 0
  const pendingHours = decimalToNumber(hourPending._sum.totalHours) ?? 0
  const expectedHours = decimalToNumber(memberSeasonRecord?.expectedHours ?? null)
  const remainingHours = expectedHours === null ? null : Math.max(0, expectedHours - approvedHours)

  const requiredForms = formTypes.filter((formType) => formType.isRequired)
  const completedRequiredForms = requiredForms.filter((formType) => {
    const submission = formType.submissions[0]
    return submission && ["SUBMITTED", "VERIFIED"].includes(submission.status)
  })
  const pendingRequiredForms = requiredForms.filter((formType) => {
    const submission = formType.submissions[0]
    if (!submission) return true
    return !["SUBMITTED", "VERIFIED"].includes(submission.status)
  })

  const outstandingBalanceCents = openInvoices.reduce(
    (sum, invoice) => sum + Math.max(0, invoice.amountCents - invoice.amountPaidCents),
    0,
  )

  const practiceStreakDays = calculateDayStreak(
    recentAttemptDates
      .map((attempt) => attempt.submittedAt?.toISOString() ?? null)
      .filter((date): date is string => Boolean(date)),
  )

  const enrollmentByEvent = new Map(
    enrollments.map((enrollment) => [enrollment.event.id, enrollment]),
  )
  const eventInsights = enrollments.map((enrollment) => {
    const recommendedCount = practiceFeed.recommendedAssessments.filter(
      (assessment) => assessment.eventId === enrollment.event.id,
    ).length
    const attemptsForEvent = practiceFeed.assessments
      .filter((assessment) => assessment.eventId === enrollment.event.id)
      .flatMap((assessment) => assessment.attempts)
      .filter((attempt) => attempt.status === "SUBMITTED" || attempt.status === "SCORED").length
    return {
      eventId: enrollment.event.id,
      eventName: enrollment.event.name,
      eventCode: enrollment.event.code,
      status: enrollment.status,
      preferenceRank: enrollment.preferenceRank,
      recommendedAssessments: recommendedCount,
      completedAttempts: attemptsForEvent,
    }
  })

  const competitionAssignmentInsights = competitionAssignments.map((participant) => {
    const assignment = participant.competitionEventAssignment
    const competition = assignment.competitionRoster.competition
    const derivedStartsAt =
      assignment.schedule?.startsAt ??
      assignment.slot?.startsAt ??
      competition.startsAt ??
      null
    const derivedEndsAt =
      assignment.schedule?.endsAt ??
      assignment.slot?.endsAt ??
      competition.endsAt ??
      null

    return {
      participantId: participant.id,
      assignmentId: assignment.id,
      role: participant.role,
      seatNumber: participant.seatNumber,
      status: assignment.status,
      event: assignment.event,
      roster: {
        id: assignment.competitionRoster.id,
        label: assignment.competitionRoster.label,
        division: assignment.competitionRoster.division,
        seasonRosterId: assignment.competitionRoster.seasonRoster?.id ?? null,
        seasonRosterName: assignment.competitionRoster.seasonRoster?.name ?? null,
      },
      competition: competition,
      schedule: {
        scheduleId: assignment.schedule?.id ?? null,
        slotId: assignment.slot?.id ?? null,
        startsAt: derivedStartsAt,
        endsAt: derivedEndsAt,
        room: assignment.room ?? assignment.schedule?.room ?? assignment.slot?.room ?? null,
        slotLabel:
          assignment.schedule?.slotLabel ??
          assignment.slot?.label ??
          assignment.entryLabel ??
          null,
        block: assignment.block ?? null,
      },
      notes: participant.notes ?? assignment.notes ?? null,
      assignedAt: participant.assignedAt,
    }
  })

  const upcomingCompetitionAssignments = competitionAssignmentInsights
    .filter((assignment) => assignment.schedule.startsAt && assignment.schedule.startsAt >= now)
    .sort((a, b) => {
      const aTime = a.schedule.startsAt?.getTime() ?? Number.MAX_SAFE_INTEGER
      const bTime = b.schedule.startsAt?.getTime() ?? Number.MAX_SAFE_INTEGER
      return aTime - bTime
    })

  const suggestions = [
    practiceFeed.continueAttempts.length > 0
      ? {
          type: "continue_practice",
          title: "Resume your in-progress assessment",
          description: `${practiceFeed.continueAttempts.length} attempt(s) are waiting.`,
        }
      : null,
    pendingRequiredForms.length > 0
      ? {
          type: "forms",
          title: "Submit required forms",
          description: `${pendingRequiredForms.length} required form(s) are incomplete.`,
        }
      : null,
    outstandingBalanceCents > 0
      ? {
          type: "dues",
          title: "Resolve outstanding dues",
          description: `$${centsToDollars(outstandingBalanceCents).toFixed(2)} is still unpaid.`,
        }
      : null,
    remainingHours !== null && remainingHours > 0
      ? {
          type: "hours",
          title: "Log progress hours",
          description: `${remainingHours.toFixed(2)} hour(s) remain to your target.`,
        }
      : null,
    upcomingCompetitionAssignments.length > 0
      ? {
          type: "competition",
          title: "Review your competition assignments",
          description: `${upcomingCompetitionAssignments.length} upcoming assigned event(s).`,
        }
      : null,
    practiceFeed.assessments.length > 0 && attemptsLast7Days === 0
      ? {
          type: "practice_start",
          title: "Start a practice assessment this week",
          description: "No submitted assessments in the last 7 days.",
        }
      : null,
  ].filter((item): item is { type: string; title: string; description: string } => item !== null)

  return ok({
    member: member
      ? {
          ...member,
          displayName: member.displayName ?? `${member.firstName} ${member.lastName}`.trim(),
        }
      : null,
    season: seasonRecord
      ? {
          id: seasonRecord.id,
          name: seasonRecord.name,
          schoolYear: seasonRecord.schoolYear,
          startsAt: seasonRecord.startsAt.toISOString(),
          endsAt: seasonRecord.endsAt.toISOString(),
        }
      : null,
    tasks: {
      suggestions,
      requiredFormsPending: pendingRequiredForms.map((formType) => ({
        id: formType.id,
        name: formType.name,
        dueAt: formType.dueAt?.toISOString() ?? null,
        status: formType.submissions[0]?.status ?? "NOT_STARTED",
      })),
      openInvoices: openInvoices.map((invoice) => ({
        id: invoice.id,
        title: invoice.title,
        status: invoice.status,
        dueAt: invoice.dueAt?.toISOString() ?? null,
        outstandingCents: Math.max(0, invoice.amountCents - invoice.amountPaidCents),
        outstandingDollars: centsToDollars(Math.max(0, invoice.amountCents - invoice.amountPaidCents)),
      })),
    },
    practice: {
      ...practiceFeed,
      stats: {
        totalAssessments: practiceFeed.assessments.length,
        continueCount: practiceFeed.continueAttempts.length,
        recommendedCount: practiceFeed.recommendedAssessments.length,
        submittedLast7Days: attemptsLast7Days,
        streakDays: practiceStreakDays,
      },
    },
    hours: {
      approvedHours,
      pendingHours,
      expectedHours,
      remainingHours,
      categoryTargets: requiredHourCategories.map((category) => ({
        id: category.id,
        name: category.name,
        requiredHours: decimalToNumber(category.requiredHours) ?? 0,
      })),
      recentEntries: recentHourEntries.map((entry) => ({
        id: entry.id,
        title: entry.title,
        status: entry.status,
        totalHours: decimalToNumber(entry.totalHours) ?? 0,
        submittedAt: entry.submittedAt.toISOString(),
        category: entry.category,
      })),
    },
    forms: {
      requiredCount: requiredForms.length,
      completedRequiredCount: completedRequiredForms.length,
      pendingRequiredCount: pendingRequiredForms.length,
      recentSubmissions: recentFormSubmissions.map((submission) => ({
        id: submission.id,
        status: submission.status,
        submittedAt: submission.submittedAt?.toISOString() ?? null,
        formType: submission.formType,
      })),
    },
    finances: {
      outstandingBalanceCents,
      outstandingBalanceDollars: centsToDollars(outstandingBalanceCents),
      openInvoiceCount: openInvoices.length,
    },
    events: {
      enrollments: eventInsights.map((insight) => ({
        ...insight,
        eventStatus: enrollmentByEvent.get(insight.eventId)?.status ?? "INTERESTED",
      })),
      upcomingClubEvents: upcomingClubEvents.map((clubEvent) => ({
        id: clubEvent.id,
        name: clubEvent.name,
        type: clubEvent.type,
        location: clubEvent.location ?? null,
        startsAt: clubEvent.startsAt.toISOString(),
        endsAt: clubEvent.endsAt?.toISOString() ?? null,
        hoursValue: decimalToNumber(clubEvent.hoursValue) ?? 0,
      })),
      rosters: rosterMemberships.map((membership) => ({
        rosterId: membership.roster.id,
        rosterName: membership.roster.name,
        division: membership.roster.division,
        role: membership.role,
      })),
    },
    competition: {
      assignments: competitionAssignmentInsights.map((assignment) => ({
        participantId: assignment.participantId,
        assignmentId: assignment.assignmentId,
        role: assignment.role,
        seatNumber: assignment.seatNumber,
        status: assignment.status,
        event: assignment.event,
        roster: assignment.roster,
        competition: {
          ...assignment.competition,
          startsAt: assignment.competition.startsAt?.toISOString() ?? null,
          endsAt: assignment.competition.endsAt?.toISOString() ?? null,
        },
        schedule: {
          ...assignment.schedule,
          startsAt: assignment.schedule.startsAt?.toISOString() ?? null,
          endsAt: assignment.schedule.endsAt?.toISOString() ?? null,
        },
        notes: assignment.notes,
        assignedAt: assignment.assignedAt.toISOString(),
      })),
      upcomingAssignments: upcomingCompetitionAssignments.slice(0, 12).map((assignment) => ({
        assignmentId: assignment.assignmentId,
        event: assignment.event,
        roster: assignment.roster,
        competition: {
          id: assignment.competition.id,
          name: assignment.competition.name,
          type: assignment.competition.type,
        },
        startsAt: assignment.schedule.startsAt?.toISOString() ?? null,
        endsAt: assignment.schedule.endsAt?.toISOString() ?? null,
        room: assignment.schedule.room,
        slotLabel: assignment.schedule.slotLabel,
        status: assignment.status,
      })),
    },
    announcements: announcementRows.map((a) => ({
      id: a.id,
      title: a.title,
      body: a.body,
      isPinned: a.isPinned,
      publishedAt: a.publishedAt?.toISOString() ?? null,
    })),
    resources: resourceRows.map((r) => ({
      id: r.id,
      title: r.title,
      type: r.type,
      url: r.url,
      eventName: r.event?.name ?? null,
      eventCode: r.event?.code ?? null,
    })),
    meta: {
      generatedAt: now.toISOString(),
    },
  })
})
