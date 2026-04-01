// app/api/admin/club-events/[id]/route.ts
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withPermission, ok, err } from "@/lib/api"

export const dynamic = "force-dynamic"

const patchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  type: z.enum(["MEETING", "SUPER_SATURDAY", "FUNDRAISER", "WORKSHOP", "FIELD_TRIP", "OTHER"]).optional(),
  location: z.string().max(200).optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().nullable().optional(),
  hoursValue: z.number().min(0).max(24).optional(),
  categoryId: z.string().nullable().optional(),
  notes: z.string().max(500).optional(),
})

export const PATCH = withPermission(
  "edit_club_events",
  async (req, ctx: { params: Promise<{ id: string }> }, user) => {
    const { id } = await ctx.params
    const body = await req.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid.", 400)

    const event = await prisma.clubEvent.findFirst({
      where: { id, season: { clubId: user.clubId } },
    })
    if (!event) return err("Club event not found.", 404)

    const updated = await prisma.clubEvent.update({ where: { id }, data: parsed.data })
    return ok(updated)
  },
)

export const DELETE = withPermission(
  "delete_club_events",
  async (_req, ctx: { params: Promise<{ id: string }> }, user) => {
    const { id } = await ctx.params
    const event = await prisma.clubEvent.findFirst({
      where: { id, season: { clubId: user.clubId } },
    })
    if (!event) return err("Club event not found.", 404)

    await prisma.clubEvent.delete({ where: { id } })
    return ok({ ok: true })
  },
)
