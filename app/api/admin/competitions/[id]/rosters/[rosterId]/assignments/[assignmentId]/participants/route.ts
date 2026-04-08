import { z } from "zod"
import { RosterMemberRole } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { withPermission, ok, err } from "@/lib/api"
import { getCanonicalCompetitionRoster } from "@/lib/competition-ontology"

export const dynamic = "force-dynamic"

const addSchema = z.object({
  memberSeasonId: z.string(),
  role: z.nativeEnum(RosterMemberRole).default(RosterMemberRole.MEMBER),
  seatNumber: z.number().int().min(1).nullable().optional(),
})

const removeSchema = z.object({
  participantId: z.string().optional(),
  memberSeasonId: z.string().optional(),
})

async function resolveAssignment(
  assignmentId: string,
  rosterId: string,
  competitionId: string,
  clubId: string,
) {
  return prisma.competitionEventAssignment.findFirst({
    where: {
      id: assignmentId,
      competitionRosterId: rosterId,
      competitionRoster: {
        competitionId,
        competition: { season: { clubId } },
      },
    },
    select: {
      id: true,
      competitionRosterId: true,
      competitionRoster: {
        select: {
          seasonId: true,
        },
      },
    },
  })
}

export const POST = withPermission(
  "edit_competitions",
  async (req, ctx: { params: Promise<{ id: string; rosterId: string; assignmentId: string }> }, user) => {
    const { id: competitionId, rosterId, assignmentId } = await ctx.params
    const body = await req.json()
    const parsed = addSchema.safeParse(body)
    if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input.", 400)

    const assignment = await resolveAssignment(assignmentId, rosterId, competitionId, user.clubId)
    if (!assignment) return err("Assignment not found.", 404)

    const member = await prisma.memberSeason.findFirst({
      where: {
        id: parsed.data.memberSeasonId,
        seasonId: assignment.competitionRoster.seasonId,
        season: { clubId: user.clubId },
      },
      select: { id: true },
    })
    if (!member) return err("Member not found.", 404)

    await prisma.competitionAssignmentParticipant.upsert({
      where: {
        competitionEventAssignmentId_memberSeasonId: {
          competitionEventAssignmentId: assignment.id,
          memberSeasonId: parsed.data.memberSeasonId,
        },
      },
      create: {
        competitionEventAssignmentId: assignment.id,
        memberSeasonId: parsed.data.memberSeasonId,
        role: parsed.data.role,
        seatNumber: parsed.data.seatNumber ?? null,
      },
      update: {
        role: parsed.data.role,
        seatNumber: parsed.data.seatNumber ?? null,
      },
    })

    const nextRoster = await getCanonicalCompetitionRoster(rosterId)
    if (!nextRoster) return err("Roster not found.", 404)
    const nextAssignment = nextRoster.assignments.find((item) => item.id === assignmentId) ?? null
    return ok(nextAssignment)
  },
)

export const DELETE = withPermission(
  "edit_competitions",
  async (req, ctx: { params: Promise<{ id: string; rosterId: string; assignmentId: string }> }, user) => {
    const { id: competitionId, rosterId, assignmentId } = await ctx.params
    const body = await req.json()
    const parsed = removeSchema.safeParse(body)
    if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input.", 400)

    const assignment = await resolveAssignment(assignmentId, rosterId, competitionId, user.clubId)
    if (!assignment) return err("Assignment not found.", 404)

    if (!parsed.data.participantId && !parsed.data.memberSeasonId) {
      return err("Participant is required.", 400)
    }

    await prisma.competitionAssignmentParticipant.deleteMany({
      where: {
        competitionEventAssignmentId: assignment.id,
        ...(parsed.data.participantId ? { id: parsed.data.participantId } : {}),
        ...(parsed.data.memberSeasonId ? { memberSeasonId: parsed.data.memberSeasonId } : {}),
      },
    })

    return ok({ ok: true })
  },
)
