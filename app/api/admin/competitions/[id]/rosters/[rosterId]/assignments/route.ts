import { z } from "zod"
import { CompetitionEntryStatus } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { withPermission, ok, err } from "@/lib/api"
import { getCanonicalCompetitionRoster } from "@/lib/competition-ontology"
import { getCanonicalCompetitionEventPlacement } from "@/lib/competition-event-sync"
import { formatZodError } from "@/lib/zod-errors"

export const dynamic = "force-dynamic"

const createSchema = z.object({
  eventId: z.string(),
  scheduleId: z.string().nullable().optional(),
  slotId: z.string().nullable().optional(),
  room: z.string().max(100).nullable().optional(),
  block: z.string().max(100).nullable().optional(),
  entryLabel: z.string().max(100).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  status: z.nativeEnum(CompetitionEntryStatus).default(CompetitionEntryStatus.PLANNED),
})

async function resolveRoster(rosterId: string, competitionId: string, clubId: string) {
  return prisma.competitionRoster.findFirst({
    where: {
      id: rosterId,
      competitionId,
      competition: { season: { clubId } },
    },
    select: { id: true, competitionId: true, seasonId: true },
  })
}

export const POST = withPermission(
  "edit_competitions",
  async (req, ctx: { params: Promise<{ id: string; rosterId: string }> }, user) => {
    const { id: competitionId, rosterId } = await ctx.params
    const body = await req.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) return err(formatZodError(parsed.error), 400)

    const roster = await resolveRoster(rosterId, competitionId, user.clubId)
    if (!roster) return err("Roster not found.", 404)

    const event = await prisma.event.findFirst({
      where: { id: parsed.data.eventId, seasonId: roster.seasonId },
      select: { id: true },
    })
    if (!event) return err("Event not found.", 404)

    const canonicalPlacement = await getCanonicalCompetitionEventPlacement(competitionId, parsed.data.eventId)
    let scheduleId = canonicalPlacement?.scheduleId ?? null
    let slotId = canonicalPlacement?.slotId ?? null
    let room = canonicalPlacement?.room ?? null
    let block = canonicalPlacement?.block ?? null

    if (parsed.data.scheduleId !== undefined) scheduleId = parsed.data.scheduleId
    if (parsed.data.slotId !== undefined) slotId = parsed.data.slotId
    if (parsed.data.room !== undefined) room = parsed.data.room
    if (parsed.data.block !== undefined) block = parsed.data.block

    if (slotId) {
      const slot = await prisma.competitionEventSlot.findFirst({
        where: { id: slotId, competitionId, OR: [{ eventId: parsed.data.eventId }, { eventId: null }] },
        select: { id: true, scheduleId: true, room: true, label: true },
      })
      if (!slot) return err("Slot not found.", 404)
      scheduleId = slot.scheduleId ?? scheduleId
      room = slot.room ?? room
      block = slot.label ?? block
    } else if (scheduleId) {
      const schedule = await prisma.eventSchedule.findFirst({
        where: { id: scheduleId, competitionId, eventId: parsed.data.eventId },
        select: { id: true, room: true, slotLabel: true },
      })
      if (!schedule) return err("Schedule slot not found.", 404)
      room = schedule.room ?? room
      block = schedule.slotLabel ?? block
    } else if (!scheduleId) {
      scheduleId = canonicalPlacement?.scheduleId ?? null
      slotId = canonicalPlacement?.slotId ?? null
      room = canonicalPlacement?.room ?? room
      block = canonicalPlacement?.block ?? block
    }

    const assignment = await prisma.competitionEventAssignment.create({
      data: {
        competitionRosterId: rosterId,
        eventId: parsed.data.eventId,
        scheduleId,
        slotId,
        room,
        block,
        entryLabel: parsed.data.entryLabel?.trim() || null,
        notes: parsed.data.notes?.trim() || null,
        status: parsed.data.status,
      },
      select: { id: true },
    })

    const nextRoster = await getCanonicalCompetitionRoster(roster.id)
    if (!nextRoster) return err("Roster not found.", 404)
    return ok(
      nextRoster.assignments.find((item) => item.id === assignment.id) ?? null,
      201,
    )
  },
)
