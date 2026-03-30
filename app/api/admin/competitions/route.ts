import { CompetitionType } from "@prisma/client"
import type { User } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { withAdminAuth, ok, err } from "@/lib/api"
import { getActiveSeason } from "@/lib/db"
import { formatDate, formatDateOnly } from "@/lib/format"

export const dynamic = "force-dynamic"

function toLocalDatetimeInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export const GET = withAdminAuth(
  async (request: Request, _ctx: unknown, currentUser: User) => {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")?.trim()

    const activeSeason = await getActiveSeason(currentUser.clubId)
    if (!activeSeason) return ok(id ? null : [])

    if (id) {
      const competition = await prisma.competition.findFirst({
        where: { id, seasonId: activeSeason.id },
        select: {
          id: true,
          name: true,
          type: true,
          location: true,
          startsAt: true,
          endsAt: true,
          isPublished: true,
          eventSchedules: {
            select: {
              timeSlot: true,
              slotLabel: true,
              event: { select: { id: true, name: true, maxParticipants: true } },
            },
            orderBy: [{ timeSlot: "asc" }, { event: { sortOrder: "asc" } }],
          },
          teams: {
            select: {
              id: true,
              eventId: true,
              label: true,
              status: true,
              event: { select: { id: true, name: true, maxParticipants: true } },
              assignments: {
                select: {
                  id: true,
                  memberSeasonId: true,
                  role: true,
                  memberSeason: {
                    select: {
                      id: true,
                      user: { select: { firstName: true, lastName: true, gradeLevel: true } },
                      eventEnrollments: {
                        select: { eventId: true, skillRating: true, preferenceRank: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      })

      if (!competition) return err("Competition not found.", 404)

      const members = await prisma.memberSeason.findMany({
        where: {
          seasonId: activeSeason.id,
          membershipStatus: "ACTIVE",
        },
        select: {
          id: true,
          user: { select: { firstName: true, lastName: true, gradeLevel: true } },
          eventEnrollments: {
            select: {
              eventId: true,
              preferenceRank: true,
              skillRating: true,
              partnerPreference: true,
              partnerNames: true,
              event: { select: { name: true } },
            },
            orderBy: { preferenceRank: "asc" },
          },
          teamAssignments: {
            where: { team: { competitionId: id } },
            select: {
              team: {
                select: {
                  eventId: true,
                  event: {
                    select: {
                      eventSchedules: {
                        where: { competitionId: id },
                        select: { timeSlot: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      })

      const slotMap = new Map<number, { slotLabel: string | null; events: { id: string; name: string; maxParticipants: number }[] }>()
      for (const es of competition.eventSchedules) {
        if (!slotMap.has(es.timeSlot)) {
          slotMap.set(es.timeSlot, { slotLabel: es.slotLabel, events: [] })
        }
        slotMap.get(es.timeSlot)!.events.push(es.event)
      }
      const eventSchedules = Array.from(slotMap.entries())
        .sort(([a], [b]) => a - b)
        .map(([timeSlot, { slotLabel, events }]) => ({ timeSlot, slotLabel, events }))

      const isEnded = competition.endsAt != null && competition.endsAt < new Date()

      return ok({
        id: competition.id,
        name: competition.name,
        type: competition.type,
        location: competition.location ?? "",
        startsAt: formatDate(competition.startsAt),
        endsAt: competition.endsAt ? formatDate(competition.endsAt) : "",
        isPublished: competition.isPublished,
        isEnded,
        eventSchedules,
        teams: competition.teams.map(t => ({
          id: t.id,
          eventId: t.eventId,
          eventName: t.event?.name ?? "Unknown event",
          maxParticipants: t.event?.maxParticipants ?? 0,
          label: t.label ?? "A",
          status: t.status,
          assignments: t.assignments.map(a => {
            const name = `${a.memberSeason.user.firstName} ${a.memberSeason.user.lastName}`.trim()
            const grade = a.memberSeason.user.gradeLevel ? String(a.memberSeason.user.gradeLevel) : ""
            const enrollment = a.memberSeason.eventEnrollments.find(e => e.eventId === t.eventId)
            return {
              id: a.id,
              memberSeasonId: a.memberSeasonId,
              role: a.role,
              name,
              grade,
              skillRating: enrollment?.skillRating ?? null,
              preferenceRank: enrollment?.preferenceRank ?? null,
            }
          }),
        })),
        members: members.map(m => {
          const assignedSlots = new Set<number>()
          for (const ta of m.teamAssignments) {
            const slot = ta.team.event.eventSchedules[0]?.timeSlot
            if (slot != null) assignedSlots.add(slot)
          }
          return {
            id: m.id,
            name: `${m.user.firstName} ${m.user.lastName}`.trim(),
            grade: m.user.gradeLevel ? String(m.user.gradeLevel) : "",
            assignedSlots: Array.from(assignedSlots),
            enrollments: m.eventEnrollments.map(e => ({
              eventId: e.eventId,
              eventName: e.event.name,
              preferenceRank: e.preferenceRank,
              skillRating: e.skillRating,
              partnerPreference: e.partnerPreference,
              partnerNames: e.partnerNames,
            })),
          }
        }),
      })
    }

    const competitions = await prisma.competition.findMany({
      where: { seasonId: activeSeason.id },
      select: {
        id: true,
        name: true,
        type: true,
        location: true,
        startsAt: true,
        endsAt: true,
        isPublished: true,
        teams: {
          select: {
            id: true,
            label: true,
            assignments: { select: { id: true } },
          },
        },
      },
      orderBy: { startsAt: "asc" },
    })

    return ok(
      competitions.map(c => ({
        id: c.id,
        name: c.name,
        type: c.type,
        location: c.location ?? "",
        startsAt: toLocalDatetimeInput(c.startsAt),
        endsAt: c.endsAt ? toLocalDatetimeInput(c.endsAt) : "",
        isPublished: c.isPublished,
        squadCount: new Set(c.teams.map(t => t.label ?? "A")).size,
        teamCount: c.teams.length,
        isEnded: c.endsAt != null && c.endsAt < new Date(),
      }))
    )
  },
  "fetch competitions"
)

function parseDateRange(startsAt: string, endsAt?: string) {
  const start = new Date(startsAt)
  if (!endsAt) return { start, end: null }
  return { start, end: new Date(endsAt) }
}

export const POST = withAdminAuth(
  async (request: Request, _ctx: unknown, currentUser: User) => {
    const activeSeason = await getActiveSeason(currentUser.clubId)
    if (!activeSeason) return err("No active season.", 400)

    const body = await request.json() as {
      action?: "create" | "edit" | "delete"
      id?: string
      name?: string
      type?: CompetitionType
      location?: string
      startsAt?: string
      endsAt?: string
    }

    const action = body.action ?? "create"

    if (action === "edit") {
      const { id, name, type, location, startsAt, endsAt } = body
      if (!id || !name?.trim() || !startsAt) return err("Missing required fields.", 400)
      const { start, end } = parseDateRange(startsAt, endsAt)
      await prisma.competition.update({
        where: { id },
        data: {
          name: name.trim(),
          type: type ?? "OTHER",
          location: location?.trim() || null,
          startsAt: start,
          endsAt: end,
        },
      })
      return ok({ success: true })
    }

    if (action === "delete") {
      const { id } = body
      if (!id) return err("Missing id.", 400)
      await prisma.competition.delete({ where: { id } })
      return ok({ success: true })
    }

    // create
    if (!body.name?.trim() || !body.startsAt) return err("Name and start date are required.", 400)
    const { start: compStart, end: compEnd } = parseDateRange(body.startsAt, body.endsAt)
    const competition = await prisma.competition.create({
      data: {
        seasonId: activeSeason.id,
        name: body.name.trim(),
        type: body.type ?? "OTHER",
        location: body.location?.trim() || null,
        startsAt: compStart,
        endsAt: compEnd,
        isPublished: true,
      },
    })

    return ok({ id: competition.id, name: competition.name })
  },
  "manage competition"
)

export const PATCH = withAdminAuth(
  async (request: Request, _ctx: unknown, _currentUser: User) => {
    const body = await request.json() as {
      action: "add-event" | "remove-event"
      competitionId: string
      eventId: string
      timeSlot?: number
      slotLabel?: string
    }

    const { action, competitionId, eventId } = body
    if (!competitionId || !eventId) return err("Missing competitionId or eventId.", 400)

    if (action === "add-event") {
      await prisma.eventSchedule.upsert({
        where: { competitionId_eventId: { competitionId, eventId } },
        create: { competitionId, eventId, timeSlot: body.timeSlot ?? 1, slotLabel: body.slotLabel ?? null },
        update: { timeSlot: body.timeSlot ?? 1, slotLabel: body.slotLabel ?? null },
      })
      return ok({ success: true })
    }

    if (action === "remove-event") {
      const hasAssignments = await prisma.teamAssignment.findFirst({
        where: { team: { competitionId, eventId } },
      })
      if (hasAssignments) return err("Cannot remove event with existing team assignments.", 409)

      await prisma.eventSchedule.delete({
        where: { competitionId_eventId: { competitionId, eventId } },
      })
      return ok({ success: true })
    }

    return err("Invalid action.", 400)
  },
  "schedule competition event"
)
