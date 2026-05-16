import { z } from "zod"
import { SciolyDivision } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { withPermission, ok, err } from "@/lib/api"
import { getCanonicalCompetitionRoster } from "@/lib/competition-ontology"
import { formatZodError } from "@/lib/zod-errors"

export const dynamic = "force-dynamic"

const patchSchema = z.object({
  label: z.string().min(1).max(80).optional(),
  notes: z.string().max(1000).nullable().optional(),
  division: z.nativeEnum(SciolyDivision).nullable().optional(),
  seasonRosterId: z.string().nullable().optional(),
})

async function resolveRoster(rosterId: string, competitionId: string, clubId: string) {
  return prisma.competitionRoster.findFirst({
    where: {
      id: rosterId,
      competitionId,
      competition: { season: { clubId } },
    },
    select: {
      id: true,
      seasonId: true,
    },
  })
}

export const PATCH = withPermission(
  "edit_competitions",
  async (req, ctx: { params: Promise<{ id: string; rosterId: string }> }, user) => {
    const { id: competitionId, rosterId } = await ctx.params
    const body = await req.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) return err(formatZodError(parsed.error), 400)

    const roster = await resolveRoster(rosterId, competitionId, user.clubId)
    if (!roster) return err("Roster not found.", 404)

    if (parsed.data.seasonRosterId) {
      const seasonRoster = await prisma.seasonRoster.findFirst({
        where: {
          id: parsed.data.seasonRosterId,
          seasonId: roster.seasonId,
        },
        select: { id: true },
      })
      if (!seasonRoster) return err("Season roster not found.", 404)
    }

    await prisma.competitionRoster.update({
      where: { id: rosterId },
      data: {
        label: parsed.data.label?.trim(),
        notes: parsed.data.notes === undefined ? undefined : parsed.data.notes?.trim() || null,
        division: parsed.data.division,
        seasonRosterId: parsed.data.seasonRosterId,
      },
    })

    const updated = await getCanonicalCompetitionRoster(rosterId)
    return ok(updated)
  },
)

export const DELETE = withPermission(
  "edit_competitions",
  async (_req, ctx: { params: Promise<{ id: string; rosterId: string }> }, user) => {
    const { id: competitionId, rosterId } = await ctx.params
    const roster = await resolveRoster(rosterId, competitionId, user.clubId)
    if (!roster) return err("Roster not found.", 404)

    await prisma.competitionRoster.delete({
      where: { id: rosterId },
    })

    return ok({ ok: true })
  },
)
