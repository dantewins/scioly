import { RosterMemberRole } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { withPermission, ok, err } from "@/lib/api"
import { getCanonicalCompetitionRoster } from "@/lib/competition-ontology"

export const dynamic = "force-dynamic"

export const POST = withPermission(
  "edit_competitions",
  async (_req, ctx: { params: Promise<{ id: string; rosterId: string }> }, user) => {
    const { id: competitionId, rosterId } = await ctx.params

    const roster = await prisma.competitionRoster.findFirst({
      where: {
        id: rosterId,
        competitionId,
        competition: { season: { clubId: user.clubId } },
      },
      include: {
        seasonRoster: {
          include: {
            members: {
              where: { memberSeason: { membershipStatus: "ACTIVE" } },
              select: { memberSeasonId: true },
            },
          },
        },
        assignments: {
          include: {
            event: { select: { id: true, maxParticipants: true } },
            schedule: { select: { startsAt: true } },
            slot: { select: { startsAt: true } },
            participants: { select: { memberSeasonId: true } },
          },
        },
      },
    })
    if (!roster) return err("Roster not found.", 404)

    if (roster.assignments.length === 0) {
      return ok({ added: 0, message: "No event assignments to fill yet." })
    }

    // Member pool: prefer base SeasonRoster's members; otherwise all active members in season
    let memberPoolIds: string[]
    if (roster.seasonRoster && roster.seasonRoster.members.length > 0) {
      memberPoolIds = roster.seasonRoster.members.map((m) => m.memberSeasonId)
    } else {
      const allMembers = await prisma.memberSeason.findMany({
        where: { seasonId: roster.seasonId, membershipStatus: "ACTIVE" },
        select: { id: true },
      })
      memberPoolIds = allMembers.map((m) => m.id)
    }

    const eventIds = [...new Set(roster.assignments.map((a) => a.eventId))]
    const enrollments = await prisma.eventEnrollment.findMany({
      where: { memberSeasonId: { in: memberPoolIds }, eventId: { in: eventIds } },
      select: { memberSeasonId: true, eventId: true, preferenceRank: true, skillRating: true },
    })

    type Candidate = { memberSeasonId: string; rank: number }
    const candidatesByEvent = new Map<string, Candidate[]>()
    for (const eventId of eventIds) {
      const filtered = enrollments
        .filter((e) => e.eventId === eventId)
        .map<Candidate>((e) => ({
          memberSeasonId: e.memberSeasonId,
          // Higher skill = better, lower preferenceRank = better. Build a single sortable rank.
          rank:
            -1 * (e.skillRating ?? 0) * 1000 +
            (e.preferenceRank ?? Number.MAX_SAFE_INTEGER / 2),
        }))
        .sort((a, b) => a.rank - b.rank)
      candidatesByEvent.set(eventId, filtered)
    }

    type AssignmentInfo = NonNullable<typeof roster>["assignments"][number]
    function getAssignmentTime(a: AssignmentInfo): number | null {
      if (a.schedule?.startsAt) return new Date(a.schedule.startsAt).getTime()
      if (a.slot?.startsAt) return new Date(a.slot.startsAt).getTime()
      return null
    }

    // Track current member -> set of times this roster already assigns them
    const memberTimes = new Map<string, Set<number>>()
    for (const a of roster.assignments) {
      const t = getAssignmentTime(a)
      if (t == null) continue
      for (const p of a.participants) {
        if (!memberTimes.has(p.memberSeasonId)) memberTimes.set(p.memberSeasonId, new Set())
        memberTimes.get(p.memberSeasonId)!.add(t)
      }
    }

    // Process assignments in time order so earlier slots get priority pick
    const ordered = [...roster.assignments].sort((a, b) => {
      const at = getAssignmentTime(a) ?? Number.MAX_SAFE_INTEGER
      const bt = getAssignmentTime(b) ?? Number.MAX_SAFE_INTEGER
      return at - bt
    })

    const additions: { assignmentId: string; memberSeasonId: string }[] = []
    for (const a of ordered) {
      const time = getAssignmentTime(a)
      const max = a.event.maxParticipants
      const taken = new Set(a.participants.map((p) => p.memberSeasonId))
      let needed = max - taken.size
      if (needed <= 0) continue

      const candidates = candidatesByEvent.get(a.eventId) ?? []
      for (const candidate of candidates) {
        if (needed <= 0) break
        if (taken.has(candidate.memberSeasonId)) continue
        if (time != null && memberTimes.get(candidate.memberSeasonId)?.has(time)) continue
        additions.push({ assignmentId: a.id, memberSeasonId: candidate.memberSeasonId })
        taken.add(candidate.memberSeasonId)
        if (time != null) {
          if (!memberTimes.has(candidate.memberSeasonId)) memberTimes.set(candidate.memberSeasonId, new Set())
          memberTimes.get(candidate.memberSeasonId)!.add(time)
        }
        needed--
      }
    }

    if (additions.length > 0) {
      await prisma.$transaction(
        additions.map((add) =>
          prisma.competitionAssignmentParticipant.upsert({
            where: {
              competitionEventAssignmentId_memberSeasonId: {
                competitionEventAssignmentId: add.assignmentId,
                memberSeasonId: add.memberSeasonId,
              },
            },
            create: {
              competitionEventAssignmentId: add.assignmentId,
              memberSeasonId: add.memberSeasonId,
              role: RosterMemberRole.MEMBER,
            },
            update: {},
          }),
        ),
      )
    }

    const updated = await getCanonicalCompetitionRoster(rosterId)
    if (!updated) return err("Roster not found.", 404)
    return ok({ roster: updated, added: additions.length })
  },
)
