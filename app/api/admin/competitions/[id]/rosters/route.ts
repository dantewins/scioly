import { z } from "zod"
import { SciolyDivision } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { withPermission, ok, err } from "@/lib/api"
import {
  getCanonicalCompetitionRoster,
  listCanonicalCompetitionRosters,
} from "@/lib/competition-ontology"

export const dynamic = "force-dynamic"

const createSchema = z.object({
  label: z.string().min(1).max(80),
  notes: z.string().max(1000).nullable().optional(),
  division: z.nativeEnum(SciolyDivision).nullable().optional(),
  seasonRosterId: z.string().nullable().optional(),
})

async function resolveCompetition(competitionId: string, clubId: string) {
  return prisma.competition.findFirst({
    where: { id: competitionId, season: { clubId } },
    select: { id: true, seasonId: true },
  })
}

export const GET = withPermission(
  "view_competitions",
  async (_req, ctx: { params: Promise<{ id: string }> }, user) => {
    const { id: competitionId } = await ctx.params
    const competition = await resolveCompetition(competitionId, user.clubId)
    if (!competition) return err("Competition not found.", 404)

    const rosters = await listCanonicalCompetitionRosters(competitionId)
    return ok(rosters)
  },
)

export const POST = withPermission(
  "edit_competitions",
  async (req, ctx: { params: Promise<{ id: string }> }, user) => {
    const { id: competitionId } = await ctx.params
    const body = await req.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input.", 400)

    const competition = await resolveCompetition(competitionId, user.clubId)
    if (!competition) return err("Competition not found.", 404)

    if (parsed.data.seasonRosterId) {
      const seasonRoster = await prisma.seasonRoster.findFirst({
        where: {
          id: parsed.data.seasonRosterId,
          seasonId: competition.seasonId,
        },
        select: { id: true },
      })
      if (!seasonRoster) return err("Season roster not found.", 404)
    }

    const created = await prisma.competitionRoster.create({
      data: {
        seasonId: competition.seasonId,
        competitionId,
        label: parsed.data.label.trim(),
        notes: parsed.data.notes?.trim() || null,
        division: parsed.data.division ?? null,
        seasonRosterId: parsed.data.seasonRosterId ?? null,
      },
      select: { id: true },
    })

    const roster = await getCanonicalCompetitionRoster(created.id)
    return ok(roster, 201)
  },
)
