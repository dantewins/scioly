// app/api/member/hours/[id]/route.ts
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withMemberAuth, ok, err } from "@/lib/api"
import { hasPermission } from "@/lib/permissions"
import { getActiveSeason, getMemberSeason } from "@/lib/db"

export const dynamic = "force-dynamic"

const patchSchema = z.object({
  categoryId: z.string().optional(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).nullable().optional(),
  totalHours: z.number().min(0.25).max(24).optional(),
  proofUrl: z.string().url().nullable().optional(),
})

async function resolveOwnedPendingEntry(entryId: string, memberSeasonId: string) {
  return prisma.hourEntry.findFirst({
    where: { id: entryId, memberSeasonId, status: "PENDING" },
    select: { id: true },
  })
}

export const PATCH = withMemberAuth(
  async (req, ctx: { params: Promise<{ id: string }> }, user) => {
    if (!hasPermission(user.permissions, "create_hours")) {
      return err("Forbidden.", 403)
    }

    const { id } = await ctx.params
    const body = await req.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input.", 400)

    const season = await getActiveSeason(user.clubId)
    if (!season) return err("No active season.", 400)

    const ms = await getMemberSeason(user.id, user.clubId)
    if (!ms) return err("Not a member this season.", 403)

    const entry = await resolveOwnedPendingEntry(id, ms.id)
    if (!entry) return err("Entry not found or already reviewed.", 404)

    if (parsed.data.categoryId) {
      const category = await prisma.hourCategory.findFirst({
        where: { id: parsed.data.categoryId, seasonId: season.id },
        select: { id: true },
      })
      if (!category) return err("Category not found.", 404)
    }

    const updated = await prisma.hourEntry.update({
      where: { id },
      data: parsed.data,
      include: { category: { select: { id: true, name: true } } },
    })
    return ok(updated)
  },
)

export const DELETE = withMemberAuth(
  async (_req, ctx: { params: Promise<{ id: string }> }, user) => {
    const { id } = await ctx.params
    const ms = await getMemberSeason(user.id, user.clubId)
    if (!ms) return err("Not a member this season.", 403)

    const entry = await resolveOwnedPendingEntry(id, ms.id)
    if (!entry) return err("Entry not found or already reviewed.", 404)

    await prisma.hourEntry.delete({ where: { id } })
    return ok({ ok: true })
  },
)
