// app/api/admin/events/[id]/route.ts
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withPermission, ok, err } from "@/lib/api"
import { syncCompetitionEventsForSeason } from "@/lib/competition-event-sync"

export const dynamic = "force-dynamic"

async function resolveEvent(eventId: string, clubId: string) {
  return prisma.event.findFirst({
    where: { id: eventId, season: { clubId } },
  })
}

const patchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  code: z.string().max(10).optional(),
  description: z.string().max(500).optional(),
  minParticipants: z.number().int().min(1).optional(),
  maxParticipants: z.number().int().min(1).optional(),
  isTrialEvent: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
})

export const PATCH = withPermission(
  "edit_events",
  async (req, ctx: { params: Promise<{ id: string }> }, user) => {
    const { id } = await ctx.params
    const body = await req.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input.", 400)

    const event = await resolveEvent(id, user.clubId)
    if (!event) return err("Event not found.", 404)

    const updated = await prisma.event.update({
      where: { id },
      data: parsed.data,
    })
    return ok(updated)
  },
)

export const DELETE = withPermission(
  "delete_events",
  async (_req, ctx: { params: Promise<{ id: string }> }, user) => {
    const { id } = await ctx.params
    const event = await resolveEvent(id, user.clubId)
    if (!event) return err("Event not found.", 404)

    await prisma.$transaction(async (tx) => {
      await tx.event.delete({ where: { id } })
      await syncCompetitionEventsForSeason(event.seasonId, tx)
    })

    return ok({ ok: true })
  },
)
