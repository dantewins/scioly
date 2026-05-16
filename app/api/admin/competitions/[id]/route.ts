// app/api/admin/competitions/[id]/route.ts
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withPermission, ok, err } from "@/lib/api"
import { listCanonicalCompetitionRosters } from "@/lib/competition-ontology"
import { formatZodError } from "@/lib/zod-errors"

export const dynamic = "force-dynamic"

async function resolveComp(id: string, clubId: string) {
  return prisma.competition.findFirst({
    where: { id, season: { clubId } },
  })
}

export const GET = withPermission(
  "view_competitions",
  async (_req, ctx: { params: Promise<{ id: string }> }, user) => {
    const { id } = await ctx.params
    const competition = await prisma.competition.findFirst({
      where: { id, season: { clubId: user.clubId } },
      include: {
        eventSchedules: {
          include: { event: { select: { id: true, name: true, code: true } } },
          orderBy: { timeSlot: "asc" },
        },
      },
    })
    if (!competition) return err("Competition not found.", 404)
    const rosters = await listCanonicalCompetitionRosters(competition.id)
    return ok({ ...competition, rosters })
  },
)

const patchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  type: z.enum(["PRACTICE", "INVITATIONAL", "REGIONAL", "STATE", "NATIONAL", "OTHER"]).optional(),
  location: z.string().max(200).optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  notes: z.string().max(1000).optional(),
  isPublished: z.boolean().optional(),
})

export const PATCH = withPermission(
  "edit_competitions",
  async (req, ctx: { params: Promise<{ id: string }> }, user) => {
    const { id } = await ctx.params
    const body = await req.json().catch(() => null)
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) return err(formatZodError(parsed.error), 400)

    const comp = await resolveComp(id, user.clubId)
    if (!comp) return err("Competition not found.", 404)

    const updated = await prisma.competition.update({ where: { id }, data: parsed.data })
    return ok(updated)
  },
)

export const DELETE = withPermission(
  "delete_competitions",
  async (_req, ctx: { params: Promise<{ id: string }> }, user) => {
    const { id } = await ctx.params
    const comp = await resolveComp(id, user.clubId)
    if (!comp) return err("Competition not found.", 404)

    await prisma.competition.delete({ where: { id } })
    return ok({ ok: true })
  },
)
