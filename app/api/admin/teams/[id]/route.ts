// app/api/admin/teams/[id]/route.ts
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withPermission, ok, err } from "@/lib/api"

export const dynamic = "force-dynamic"

async function resolveTeam(id: string, clubId: string) {
  return prisma.team.findFirst({ where: { id, season: { clubId } } })
}

export const GET = withPermission(
  "view_teams",
  async (_req, ctx: { params: Promise<{ id: string }> }, user) => {
    const { id } = await ctx.params
    const team = await prisma.team.findFirst({
      where: { id, season: { clubId: user.clubId } },
      include: {
        competition: { select: { id: true, name: true } },
        event: { select: { id: true, name: true, code: true } },
        assignments: {
          include: {
            memberSeason: {
              include: {
                user: { select: { id: true, firstName: true, lastName: true, email: true } },
              },
            },
          },
        },
      },
    })
    if (!team) return err("Team not found.", 404)
    return ok(team)
  },
)

const patchSchema = z.object({
  label: z.string().min(1).max(50).optional(),
  competitionId: z.string().nullable().optional(),
  eventId: z.string().nullable().optional(),
  notes: z.string().max(500).optional(),
})

export const PATCH = withPermission(
  "edit_teams",
  async (req, ctx: { params: Promise<{ id: string }> }, user) => {
    const { id } = await ctx.params
    const body = await req.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input.", 400)

    const team = await resolveTeam(id, user.clubId)
    if (!team) return err("Team not found.", 404)

    const updated = await prisma.team.update({ where: { id }, data: parsed.data })
    return ok(updated)
  },
)

export const DELETE = withPermission(
  "delete_teams",
  async (_req, ctx: { params: Promise<{ id: string }> }, user) => {
    const { id } = await ctx.params
    const team = await resolveTeam(id, user.clubId)
    if (!team) return err("Team not found.", 404)

    await prisma.team.delete({ where: { id } })
    return ok({ ok: true })
  },
)
