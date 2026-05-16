// app/api/admin/members/[id]/roles/route.ts
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withPermission, ok, err } from "@/lib/api"
import { clearCurrentUserCache } from "@/lib/auth"

export const dynamic = "force-dynamic"

// POST body: { roleId, seasonId }
const assignSchema = z.object({
  roleId: z.string(),
  seasonId: z.string(),
})

export const POST = withPermission(
  "edit_roles",
  async (req, ctx: { params: Promise<{ id: string }> }, user) => {
    const { id: targetUserId } = await ctx.params
    const body = await req.json().catch(() => null)
    const parsed = assignSchema.safeParse(body)
    if (!parsed.success) return err("Invalid input.", 400)

    const { roleId, seasonId } = parsed.data

    // Verify role belongs to this club
    const role = await prisma.clubRole.findFirst({
      where: { id: roleId, clubId: user.clubId },
    })
    if (!role) return err("Role not found.", 404)

    // Find member season
    const ms = await prisma.memberSeason.findFirst({
      where: { userId: targetUserId, seasonId, season: { clubId: user.clubId } },
    })
    if (!ms) return err("Member season not found.", 404)

    const memberRole = await prisma.memberRole.upsert({
      where: { memberSeasonId_clubRoleId: { memberSeasonId: ms.id, clubRoleId: roleId } },
      create: { memberSeasonId: ms.id, clubRoleId: roleId },
      update: {},
    })
    clearCurrentUserCache(targetUserId)
    return ok(memberRole, 201)
  },
)

// DELETE body: { roleId, seasonId }
export const DELETE = withPermission(
  "edit_roles",
  async (req, ctx: { params: Promise<{ id: string }> }, user) => {
    const { id: targetUserId } = await ctx.params
    const body = await req.json().catch(() => null)
    const parsed = assignSchema.safeParse(body)
    if (!parsed.success) return err("Invalid input.", 400)

    const { roleId, seasonId } = parsed.data

    const ms = await prisma.memberSeason.findFirst({
      where: { userId: targetUserId, seasonId, season: { clubId: user.clubId } },
    })
    if (!ms) return err("Member season not found.", 404)

    await prisma.memberRole.deleteMany({
      where: { memberSeasonId: ms.id, clubRoleId: roleId },
    })
    clearCurrentUserCache(targetUserId)
    return ok({ ok: true })
  },
)
