// app/api/admin/competitions/[id]/schedule/route.ts
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withPermission, ok, err } from "@/lib/api"

export const dynamic = "force-dynamic"

const addSchema = z.object({
  eventId: z.string(),
  timeSlot: z.number().int().min(1),
  slotLabel: z.string().max(50).optional(),
})

export const POST = withPermission(
  "edit_competitions",
  async (req, ctx: { params: Promise<{ id: string }> }, user) => {
    const { id: competitionId } = await ctx.params
    const body = await req.json()
    const parsed = addSchema.safeParse(body)
    if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input.", 400)

    // Verify competition belongs to this club
    const comp = await prisma.competition.findFirst({
      where: { id: competitionId, season: { clubId: user.clubId } },
    })
    if (!comp) return err("Competition not found.", 404)

    const schedule = await prisma.eventSchedule.upsert({
      where: { competitionId_eventId: { competitionId, eventId: parsed.data.eventId } },
      create: { competitionId, ...parsed.data },
      update: { timeSlot: parsed.data.timeSlot, slotLabel: parsed.data.slotLabel },
    })
    return ok(schedule, 201)
  },
)

export const DELETE = withPermission(
  "edit_competitions",
  async (req, ctx: { params: Promise<{ id: string }> }, user) => {
    const { id: competitionId } = await ctx.params
    const body = await req.json()
    const { eventId } = body as { eventId: string }

    const comp = await prisma.competition.findFirst({
      where: { id: competitionId, season: { clubId: user.clubId } },
    })
    if (!comp) return err("Competition not found.", 404)

    await prisma.eventSchedule.deleteMany({ where: { competitionId, eventId } })
    return ok({ ok: true })
  },
)
