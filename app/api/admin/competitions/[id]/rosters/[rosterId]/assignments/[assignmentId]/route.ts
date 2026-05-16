import { z } from "zod"
import { CompetitionEntryStatus } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { withPermission, ok, err } from "@/lib/api"
import { getCanonicalCompetitionRoster } from "@/lib/competition-ontology"
import { getCanonicalCompetitionEventPlacement } from "@/lib/competition-event-sync"
import { formatZodError } from "@/lib/zod-errors"

export const dynamic = "force-dynamic"

const patchSchema = z.object({
  eventId: z.string().optional(),
  scheduleId: z.string().nullable().optional(),
  slotId: z.string().nullable().optional(),
  room: z.string().max(100).nullable().optional(),
  block: z.string().max(100).nullable().optional(),
  entryLabel: z.string().max(100).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  status: z.nativeEnum(CompetitionEntryStatus).optional(),
})

async function resolveAssignment(
  assignmentId: string,
  rosterId: string,
  competitionId: string,
  clubId: string,
) {
  return prisma.competitionEventAssignment.findFirst({
    where: {
      id: assignmentId,
      competitionRosterId: rosterId,
      competitionRoster: {
        competitionId,
        competition: { season: { clubId } },
      },
    },
    select: {
      id: true,
      eventId: true,
      scheduleId: true,
      slotId: true,
      room: true,
      block: true,
      competitionRosterId: true,
      competitionRoster: { select: { seasonId: true } },
    },
  })
}

export const PATCH = withPermission(
  "edit_competitions",
  async (req, ctx: { params: Promise<{ id: string; rosterId: string; assignmentId: string }> }, user) => {
    const { id: competitionId, rosterId, assignmentId } = await ctx.params
    const body = await req.json().catch(() => null)
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) return err(formatZodError(parsed.error), 400)

    const assignment = await resolveAssignment(assignmentId, rosterId, competitionId, user.clubId)
    if (!assignment) return err("Assignment not found.", 404)

    const eventId = parsed.data.eventId ?? assignment.eventId
    if (parsed.data.eventId) {
      const event = await prisma.event.findFirst({
        where: { id: parsed.data.eventId, seasonId: assignment.competitionRoster.seasonId },
        select: { id: true },
      })
      if (!event) return err("Event not found.", 404)
    }

    const canonicalPlacement = await getCanonicalCompetitionEventPlacement(competitionId, eventId)
    let scheduleId = parsed.data.scheduleId === undefined ? assignment.scheduleId : parsed.data.scheduleId
    let slotId = parsed.data.slotId === undefined ? assignment.slotId : parsed.data.slotId
    let room = parsed.data.room === undefined ? assignment.room : parsed.data.room
    let block = parsed.data.block === undefined ? assignment.block : parsed.data.block

    if (slotId) {
      const slot = await prisma.competitionEventSlot.findFirst({
        where: { id: slotId, competitionId, OR: [{ eventId }, { eventId: null }] },
        select: { id: true, scheduleId: true, room: true, label: true },
      })
      if (!slot) return err("Slot not found.", 404)
      scheduleId = slot.scheduleId ?? scheduleId
      room = slot.room ?? room
      block = slot.label ?? block
    } else if (scheduleId) {
      const schedule = await prisma.eventSchedule.findFirst({
        where: { id: scheduleId, competitionId, eventId },
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

    await prisma.competitionEventAssignment.update({
      where: { id: assignmentId },
      data: {
        eventId,
        scheduleId,
        slotId,
        room,
        block,
        entryLabel: parsed.data.entryLabel === undefined ? undefined : parsed.data.entryLabel?.trim() || null,
        notes: parsed.data.notes === undefined ? undefined : parsed.data.notes?.trim() || null,
        status: parsed.data.status,
      },
    })

    const nextRoster = await getCanonicalCompetitionRoster(rosterId)
    if (!nextRoster) return err("Roster not found.", 404)
    return ok(nextRoster.assignments.find((item) => item.id === assignmentId) ?? null)
  },
)

export const DELETE = withPermission(
  "edit_competitions",
  async (_req, ctx: { params: Promise<{ id: string; rosterId: string; assignmentId: string }> }, user) => {
    const { id: competitionId, rosterId, assignmentId } = await ctx.params
    const assignment = await resolveAssignment(assignmentId, rosterId, competitionId, user.clubId)
    if (!assignment) return err("Assignment not found.", 404)

    await prisma.competitionEventAssignment.delete({
      where: { id: assignmentId },
    })

    return ok({ ok: true })
  },
)
