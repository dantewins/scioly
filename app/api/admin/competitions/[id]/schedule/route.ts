// app/api/admin/competitions/[id]/schedule/route.ts
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withPermission, ok, err } from "@/lib/api"
import { formatZodError } from "@/lib/zod-errors"
import {
  resetCompetitionEventSchedule,
  syncCompetitionEventsForCompetition,
} from "@/lib/competition-event-sync"

export const dynamic = "force-dynamic"

const addSchema = z.object({
  eventId: z.string(),
  timeSlot: z.number().int().min(1),
  startsAt: z.string().datetime().optional(),
})

export const POST = withPermission(
  "edit_competitions",
  async (req, ctx: { params: Promise<{ id: string }> }, user) => {
    const { id: competitionId } = await ctx.params
    const body = await req.json()
    const parsed = addSchema.safeParse(body)
    if (!parsed.success) return err(formatZodError(parsed.error), 400)

    // Verify competition belongs to this club
    const comp = await prisma.competition.findFirst({
      where: { id: competitionId, season: { clubId: user.clubId } },
      select: { id: true, seasonId: true },
    })
    if (!comp) return err("Competition not found.", 404)

    const event = await prisma.event.findFirst({
      where: { id: parsed.data.eventId, seasonId: comp.seasonId },
      select: { id: true },
    })
    if (!event) return err("Event not found.", 404)

    const startsAt = parsed.data.startsAt ? new Date(parsed.data.startsAt) : null
    const slotLabel = startsAt
      ? startsAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
      : `Slot ${parsed.data.timeSlot}`

    const schedule = await prisma.$transaction(async (tx) => {
      await syncCompetitionEventsForCompetition(competitionId, tx)

      const nextSchedule = await tx.eventSchedule.upsert({
        where: { competitionId_eventId: { competitionId, eventId: parsed.data.eventId } },
        create: {
          competitionId,
          eventId: parsed.data.eventId,
          timeSlot: parsed.data.timeSlot,
          startsAt,
        },
        update: {
          timeSlot: parsed.data.timeSlot,
          startsAt,
        },
      })

      try {
        await tx.competitionEventSlot.upsert({
          where: { scheduleId: nextSchedule.id },
          create: {
            competitionId,
            eventId: parsed.data.eventId,
            scheduleId: nextSchedule.id,
            label: slotLabel,
            startsAt,
          },
          update: {
            eventId: parsed.data.eventId,
            label: slotLabel,
            startsAt,
          },
        })
      } catch (error) {
        if (!(error instanceof Error) || !error.message.includes("CompetitionEventSlot")) {
          throw error
        }
      }

      return nextSchedule
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
      select: { id: true, seasonId: true },
    })
    if (!comp) return err("Competition not found.", 404)

    const targetEvent = await prisma.event.findFirst({
      where: { id: eventId, seasonId: comp.seasonId },
      select: { id: true },
    })
    if (!targetEvent) return err("Event not found.", 404)

    const schedule = await prisma.$transaction(async (tx) => {
      return resetCompetitionEventSchedule(competitionId, eventId, tx)
    })

    return ok(schedule)
  },
)
