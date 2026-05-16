import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withPermission, ok, err } from "@/lib/api"
import { getCanonicalCompetitionRoster } from "@/lib/competition-ontology"
import { logActivity } from "@/lib/activity"
import { formatZodError } from "@/lib/zod-errors"

export const dynamic = "force-dynamic"

const resultSchema = z
  .object({
    placement: z.number().int().min(1).max(999).nullable().optional(),
    scoreEarned: z.number().min(0).max(99999.99).nullable().optional(),
    scorePossible: z.number().min(0).max(99999.99).nullable().optional(),
    medalNotes: z.string().max(500).nullable().optional(),
  })
  // Sanity: scoreEarned can't exceed scorePossible.
  .refine(
    (d) =>
      d.scoreEarned === null ||
      d.scoreEarned === undefined ||
      d.scorePossible === null ||
      d.scorePossible === undefined ||
      d.scoreEarned <= d.scorePossible,
    { message: "scoreEarned can't exceed scorePossible", path: ["scoreEarned"] },
  )
  // Reject {}: at least one result field must be non-null/non-undefined.
  .refine(
    (d) =>
      d.placement !== undefined ||
      d.scoreEarned !== undefined ||
      d.scorePossible !== undefined ||
      (d.medalNotes !== undefined && d.medalNotes !== null && d.medalNotes !== ""),
    { message: "Provide at least one result field (placement, score, or notes)." },
  )

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
    select: { id: true, eventId: true, competitionRosterId: true },
  })
}

// POST — record or update results for this event assignment.
export const POST = withPermission(
  "edit_competitions",
  async (req, ctx: { params: Promise<{ id: string; rosterId: string; assignmentId: string }> }, user) => {
    const { id: competitionId, rosterId, assignmentId } = await ctx.params
    const body = await req.json().catch(() => null)
    const parsed = resultSchema.safeParse(body)
    if (!parsed.success) return err(formatZodError(parsed.error), 400)

    const assignment = await resolveAssignment(assignmentId, rosterId, competitionId, user.clubId)
    if (!assignment) return err("Assignment not found.", 404)

    const { placement, scoreEarned, scorePossible, medalNotes } = parsed.data

    await prisma.competitionEventAssignment.update({
      where: { id: assignmentId },
      data: {
        placement: placement ?? null,
        scoreEarned: scoreEarned ?? null,
        scorePossible: scorePossible ?? null,
        medalNotes: medalNotes?.trim() || null,
        resultRecordedAt: new Date(),
        resultRecordedById: user.id,
      },
    })

    await logActivity({
      clubId: user.clubId,
      actorId: user.id,
      entityType: "CompetitionEventAssignment",
      entityId: assignmentId,
      action: "result.record",
      metadata: { placement, scoreEarned, scorePossible },
    })

    const nextRoster = await getCanonicalCompetitionRoster(rosterId)
    if (!nextRoster) return err("Roster not found.", 404)
    return ok(nextRoster.assignments.find((item) => item.id === assignmentId) ?? null)
  },
)

// DELETE — clear results.
export const DELETE = withPermission(
  "edit_competitions",
  async (_req, ctx: { params: Promise<{ id: string; rosterId: string; assignmentId: string }> }, user) => {
    const { id: competitionId, rosterId, assignmentId } = await ctx.params
    const assignment = await resolveAssignment(assignmentId, rosterId, competitionId, user.clubId)
    if (!assignment) return err("Assignment not found.", 404)

    await prisma.competitionEventAssignment.update({
      where: { id: assignmentId },
      data: {
        placement: null,
        scoreEarned: null,
        scorePossible: null,
        medalNotes: null,
        resultRecordedAt: null,
        resultRecordedById: null,
      },
    })

    await logActivity({
      clubId: user.clubId,
      actorId: user.id,
      entityType: "CompetitionEventAssignment",
      entityId: assignmentId,
      action: "result.clear",
    })

    const nextRoster = await getCanonicalCompetitionRoster(rosterId)
    if (!nextRoster) return err("Roster not found.", 404)
    return ok(nextRoster.assignments.find((item) => item.id === assignmentId) ?? null)
  },
)
