// app/api/admin/teams/[id]/members/route.ts
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withPermission, ok, err } from "@/lib/api"

export const dynamic = "force-dynamic"

const addSchema = z.object({
  memberSeasonId: z.string(),
  role: z.enum(["MEMBER", "CAPTAIN", "ALTERNATE"]).default("MEMBER"),
  seatNumber: z.number().int().optional(),
})

export const POST = withPermission(
  "edit_teams",
  async (req, ctx: { params: Promise<{ id: string }> }, user) => {
    const { id: teamId } = await ctx.params
    const body = await req.json()
    const parsed = addSchema.safeParse(body)
    if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input.", 400)

    const team = await prisma.team.findFirst({
      where: { id: teamId, season: { clubId: user.clubId } },
    })
    if (!team) return err("Team not found.", 404)

    // Verify memberSeason is in same club
    const ms = await prisma.memberSeason.findFirst({
      where: { id: parsed.data.memberSeasonId, season: { clubId: user.clubId } },
    })
    if (!ms) return err("Member not found.", 404)

    const assignment = await prisma.teamAssignment.upsert({
      where: { teamId_memberSeasonId: { teamId, memberSeasonId: parsed.data.memberSeasonId } },
      create: { teamId, ...parsed.data },
      update: { role: parsed.data.role, seatNumber: parsed.data.seatNumber },
    })
    return ok(assignment, 201)
  },
)

const removeSchema = z.object({ memberSeasonId: z.string() })

export const DELETE = withPermission(
  "edit_teams",
  async (req, ctx: { params: Promise<{ id: string }> }, user) => {
    const { id: teamId } = await ctx.params
    const body = await req.json()
    const parsed = removeSchema.safeParse(body)
    if (!parsed.success) return err("Invalid input.", 400)

    const team = await prisma.team.findFirst({
      where: { id: teamId, season: { clubId: user.clubId } },
    })
    if (!team) return err("Team not found.", 404)

    await prisma.teamAssignment.deleteMany({
      where: { teamId, memberSeasonId: parsed.data.memberSeasonId },
    })
    return ok({ ok: true })
  },
)
