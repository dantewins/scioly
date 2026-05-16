import { prisma } from "@/lib/prisma"
import { withActiveMemberAuth, ok } from "@/lib/api"
import { getActiveSeason, getMemberSeason } from "@/lib/db"

export const dynamic = "force-dynamic"

// GET — list resources visible to the current member.
//
// Visibility rules:
// - All season-wide resources (no event / competition / roster scope).
// - Event-scoped resources where the member has an EventEnrollment.
// - Competition-scoped resources where the member is on a roster
//   participating in that competition.
// - Roster-scoped resources for rosters the member belongs to.
export const GET = withActiveMemberAuth(async (_req, _ctx, user) => {
  const season = await getActiveSeason(user.clubId)
  if (!season) return ok([])
  const memberSeason = await getMemberSeason(user.id, user.clubId)
  if (!memberSeason) return ok([])

  const [enrollments, rosterMemberships, competitionAssignments] = await Promise.all([
    prisma.eventEnrollment.findMany({
      where: { memberSeasonId: memberSeason.id },
      select: { eventId: true },
    }),
    prisma.seasonRosterMember.findMany({
      where: { memberSeasonId: memberSeason.id },
      select: { rosterId: true },
    }),
    prisma.competitionAssignmentParticipant.findMany({
      where: { memberSeasonId: memberSeason.id },
      select: {
        competitionEventAssignment: {
          select: {
            competitionRosterId: true,
            competitionRoster: { select: { competitionId: true } },
          },
        },
      },
    }),
  ])

  const eventIds = enrollments.map((e) => e.eventId)
  const seasonRosterIds = rosterMemberships.map((r) => r.rosterId)
  const competitionIds = competitionAssignments.map(
    (p) => p.competitionEventAssignment.competitionRoster.competitionId,
  )
  const competitionRosterIds = competitionAssignments.map(
    (p) => p.competitionEventAssignment.competitionRosterId,
  )

  const resources = await prisma.resource.findMany({
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
        eventIds.length > 0 ? { eventId: { in: eventIds } } : { id: "__none__" },
        competitionIds.length > 0 ? { competitionId: { in: competitionIds } } : { id: "__none__" },
        seasonRosterIds.length > 0 ? { seasonRosterId: { in: seasonRosterIds } } : { id: "__none__" },
        competitionRosterIds.length > 0
          ? { competitionRosterId: { in: competitionRosterIds } }
          : { id: "__none__" },
      ],
    },
    select: {
      id: true,
      title: true,
      description: true,
      type: true,
      url: true,
      createdAt: true,
      event: { select: { id: true, name: true, code: true } },
      competition: { select: { id: true, name: true } },
    },
    orderBy: [{ eventId: "asc" }, { createdAt: "desc" }],
  })

  return ok(resources)
})
