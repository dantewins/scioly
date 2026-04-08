import { Prisma, type PrismaClient } from "@prisma/client"
import { prisma } from "@/lib/prisma"

type DbClient = PrismaClient | Prisma.TransactionClient

type SeasonEventRecord = {
  id: string
  name: string
  code: string | null
  sortOrder: number | null
}

type ExistingScheduleRecord = {
  id: string
  eventId: string
}

type ExistingSlotRecord = {
  id: string
  eventId: string | null
  scheduleId: string | null
}

function orderCompetitionEvents<T extends SeasonEventRecord>(events: T[]) {
  return [...events].sort((a, b) => {
    const sortA = a.sortOrder ?? Number.MAX_SAFE_INTEGER
    const sortB = b.sortOrder ?? Number.MAX_SAFE_INTEGER
    if (sortA !== sortB) return sortA - sortB
    return a.name.localeCompare(b.name)
  })
}

function defaultTimeSlot(event: { sortOrder: number | null }, index: number) {
  return (event.sortOrder ?? index) + 1
}

function defaultSlotLabel(event: { code: string | null; name: string }) {
  return event.code?.trim() || event.name
}

export async function syncCompetitionEventsForCompetition(
  competitionId: string,
  db: DbClient = prisma,
) {
  const competition = await db.competition.findUnique({
    where: { id: competitionId },
    select: { id: true, seasonId: true },
  })
  if (!competition) return

  const [seasonEvents, existingSchedules, existingSlots]: [
    SeasonEventRecord[],
    ExistingScheduleRecord[],
    ExistingSlotRecord[],
  ] = await Promise.all([
    db.event.findMany({
      where: { seasonId: competition.seasonId },
      select: { id: true, name: true, code: true, sortOrder: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    db.eventSchedule.findMany({
      where: { competitionId },
      select: { id: true, eventId: true },
    }),
    db.competitionEventSlot.findMany({
      where: { competitionId },
      select: { id: true, eventId: true, scheduleId: true },
    }),
  ])

  const orderedEvents = orderCompetitionEvents(seasonEvents)
  const seasonEventIds = new Set(orderedEvents.map((event) => event.id))
  const scheduleByEventId = new Map<string, ExistingScheduleRecord>(
    existingSchedules.map((schedule) => [schedule.eventId, schedule]),
  )
  const slotByScheduleId = new Map(
    existingSlots
      .filter((slot) => slot.scheduleId)
      .map((slot) => [slot.scheduleId as string, slot] as const),
  )

  const orphanSlotIds = existingSlots
    .filter((slot) => !slot.eventId || !seasonEventIds.has(slot.eventId))
    .map((slot) => slot.id)

  const orphanScheduleIds = existingSchedules
    .filter((schedule) => !seasonEventIds.has(schedule.eventId))
    .map((schedule) => schedule.id)

  if (orphanSlotIds.length > 0) {
    await db.competitionEventSlot.deleteMany({
      where: { id: { in: orphanSlotIds } },
    })
  }

  if (orphanScheduleIds.length > 0) {
    await db.eventSchedule.deleteMany({
      where: { id: { in: orphanScheduleIds } },
    })
  }

  for (const [index, event] of orderedEvents.entries()) {
    const schedule = scheduleByEventId.get(event.id)
      ? await db.eventSchedule.update({
          where: { id: scheduleByEventId.get(event.id)!.id },
          data: {},
          select: { id: true },
        })
      : await db.eventSchedule.create({
          data: {
            competitionId,
            eventId: event.id,
            timeSlot: defaultTimeSlot(event, index),
          },
          select: { id: true },
        })

    const slot = slotByScheduleId.get(schedule.id)
    if (!slot) {
      await db.competitionEventSlot.create({
        data: {
          competitionId,
          eventId: event.id,
          scheduleId: schedule.id,
          label: defaultSlotLabel(event),
        },
      })
      continue
    }

    if (slot.eventId !== event.id) {
      await db.competitionEventSlot.update({
        where: { id: slot.id },
        data: { eventId: event.id },
      })
    }
  }
}

export async function syncCompetitionEventsForSeason(
  seasonId: string,
  db: DbClient = prisma,
) {
  const competitions = await db.competition.findMany({
    where: { seasonId },
    select: { id: true },
  })

  for (const competition of competitions) {
    await syncCompetitionEventsForCompetition(competition.id, db)
  }
}

export async function getCanonicalCompetitionEventPlacement(
  competitionId: string,
  eventId: string,
  db: DbClient = prisma,
) {
  const schedule = await db.eventSchedule.findUnique({
    where: { competitionId_eventId: { competitionId, eventId } },
    select: {
      id: true,
      room: true,
      slotLabel: true,
      eventSlot: {
        select: {
          id: true,
          room: true,
          label: true,
        },
      },
    },
  })

  if (!schedule) return null

  return {
    scheduleId: schedule.id,
    slotId: schedule.eventSlot?.id ?? null,
    room: schedule.eventSlot?.room ?? schedule.room ?? null,
    block: schedule.eventSlot?.label ?? schedule.slotLabel ?? null,
  }
}

export async function resetCompetitionEventSchedule(
  competitionId: string,
  eventId: string,
  db: DbClient = prisma,
) {
  const event = await db.event.findUnique({
    where: { id: eventId },
    select: { id: true, name: true, code: true, sortOrder: true },
  })
  if (!event) return null

  const orderedEvents = orderCompetitionEvents(
    await db.event.findMany({
      where: { season: { competitions: { some: { id: competitionId } } } },
      select: { id: true, name: true, code: true, sortOrder: true },
    }),
  )
  const index = orderedEvents.findIndex((item) => item.id === eventId)
  const timeSlot = defaultTimeSlot(event, index >= 0 ? index : orderedEvents.length)

  const schedule = await db.eventSchedule.upsert({
    where: { competitionId_eventId: { competitionId, eventId } },
    create: {
      competitionId,
      eventId,
      timeSlot,
    },
    update: {
      timeSlot,
      slotLabel: null,
      room: null,
      startsAt: null,
      endsAt: null,
      notes: null,
    },
    select: { id: true },
  })

  await db.competitionEventSlot.upsert({
    where: { scheduleId: schedule.id },
    create: {
      competitionId,
      eventId,
      scheduleId: schedule.id,
      label: defaultSlotLabel(event),
    },
    update: {
      eventId,
      label: defaultSlotLabel(event),
      room: null,
      startsAt: null,
      endsAt: null,
      notes: null,
    },
  })

  return schedule
}
