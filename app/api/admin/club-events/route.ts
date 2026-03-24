import type { User } from "@prisma/client"
import { ClubEventType } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { withAdminAuth, ok, err } from "@/lib/api"
import { getActiveSeason } from "@/lib/db"
import { formatDateOnly } from "@/lib/format"

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
    if (!activeSeason) return ok(id ? null : { items: [], total: 0 })

    if (id) {
      const event = await prisma.clubEvent.findFirst({
        where: { id, seasonId: activeSeason.id },
        select: {
          id: true,
          name: true,
          type: true,
          location: true,
          startsAt: true,
          endsAt: true,
          hoursValue: true,
          categoryId: true,
          notes: true,
          category: { select: { id: true, name: true } },
          attendance: {
            select: {
              id: true,
              memberSeasonId: true,
              markedAt: true,
              hourEntryId: true,
            },
          },
        },
      })

      if (!event) return err("Club event not found.", 404)

      const members = await prisma.memberSeason.findMany({
        where: { seasonId: activeSeason.id, membershipStatus: "ACTIVE" },
        select: {
          id: true,
          user: { select: { firstName: true, lastName: true } },
        },
        orderBy: [{ user: { lastName: "asc" } }, { user: { firstName: "asc" } }],
      })

      const attendedSet = new Set(event.attendance.map(a => a.memberSeasonId))

      return ok({
        id: event.id,
        name: event.name,
        type: event.type,
        location: event.location ?? "",
        startsAt: toLocalDatetimeInput(event.startsAt),
        endsAt: event.endsAt ? toLocalDatetimeInput(event.endsAt) : "",
        hoursValue: Number(event.hoursValue),
        categoryId: event.categoryId ?? null,
        categoryName: event.category?.name ?? null,
        notes: event.notes ?? "",
        attendeeCount: event.attendance.length,
        members: members.map(m => ({
          id: m.id,
          name: `${m.user.firstName} ${m.user.lastName}`.trim(),
          attended: attendedSet.has(m.id),
        })),
      })
    }

    // ── Pagination, filtering & sorting ──
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10))
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") ?? "9", 10)))
    const typeFilter = searchParams.get("type")?.trim() ?? "ALL"
    const statusFilter = searchParams.get("status")?.trim() ?? "all"
    const sortOrder = searchParams.get("sort") === "desc" ? "desc" as const : "asc" as const

    const now = new Date()
    const baseWhere: Record<string, unknown> = { seasonId: activeSeason.id }

    if (typeFilter !== "ALL" && Object.values(ClubEventType).includes(typeFilter as ClubEventType)) {
      baseWhere.type = typeFilter as ClubEventType
    }

    if (statusFilter === "upcoming") {
      baseWhere.OR = [{ endsAt: null }, { endsAt: { gte: now } }]
    } else if (statusFilter === "ended") {
      baseWhere.endsAt = { not: null, lt: now }
    }

    const [total, events] = await Promise.all([
      prisma.clubEvent.count({ where: baseWhere }),
      prisma.clubEvent.findMany({
        where: baseWhere,
        select: {
          id: true,
          name: true,
          type: true,
          location: true,
          startsAt: true,
          endsAt: true,
          hoursValue: true,
          _count: { select: { attendance: true } },
        },
        orderBy: { startsAt: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ])

    return ok({
      items: events.map(e => ({
        id: e.id,
        name: e.name,
        type: e.type,
        location: e.location ?? "",
        startsAt: formatDateOnly(e.startsAt),
        endsAt: e.endsAt ? formatDateOnly(e.endsAt) : "",
        hoursValue: Number(e.hoursValue),
        attendeeCount: e._count.attendance,
        isEnded: e.endsAt != null && e.endsAt < now,
      })),
      total,
    })
  },
  "fetch club events"
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
      action: "create" | "edit" | "delete" | "mark-attendance" | "unmark-attendance"
      id?: string
      name?: string
      type?: ClubEventType
      location?: string
      startsAt?: string
      endsAt?: string
      hoursValue?: number
      categoryId?: string
      notes?: string
      clubEventId?: string
      memberSeasonId?: string
    }

    const { action } = body

    if (action === "create") {
      const { name, type, location, startsAt, endsAt, hoursValue, categoryId, notes } = body
      if (!name?.trim()) return err("Name is required.", 400)
      if (!startsAt) return err("Start date is required.", 400)

      const { start, end } = parseDateRange(startsAt, endsAt)
      const event = await prisma.clubEvent.create({
        data: {
          seasonId: activeSeason.id,
          name: name.trim(),
          type: type ?? "OTHER",
          location: location?.trim() || null,
          startsAt: start,
          endsAt: end,
          hoursValue: hoursValue ?? 0,
          categoryId: categoryId || null,
          notes: notes?.trim() || null,
        },
        select: { id: true, name: true },
      })

      return ok({ success: true, id: event.id })
    }

    if (action === "edit") {
      const { id, name, type, location, startsAt, endsAt, hoursValue, categoryId, notes } = body
      if (!id) return err("Missing id.", 400)
      if (!name?.trim()) return err("Name is required.", 400)
      if (!startsAt) return err("Start date is required.", 400)

      const { start: editStart, end: editEnd } = parseDateRange(startsAt, endsAt || undefined)
      await prisma.clubEvent.update({
        where: { id },
        data: {
          name: name.trim(),
          type: type ?? "OTHER",
          location: location?.trim() || null,
          startsAt: editStart,
          endsAt: editEnd,
          hoursValue: hoursValue ?? 0,
          categoryId: categoryId || null,
          notes: notes?.trim() || null,
        },
      })

      return ok({ success: true })
    }

    if (action === "delete") {
      const { id } = body
      if (!id) return err("Missing id.", 400)

      // Delete linked hour entries first (attendance records will cascade)
      const attendances = await prisma.clubEventAttendance.findMany({
        where: { clubEventId: id },
        select: { hourEntryId: true },
      })
      const hourEntryIds = attendances.map(a => a.hourEntryId).filter(Boolean) as string[]
      if (hourEntryIds.length > 0) {
        await prisma.hourEntry.deleteMany({ where: { id: { in: hourEntryIds } } })
      }

      await prisma.clubEvent.delete({ where: { id } })
      return ok({ success: true })
    }

    if (action === "mark-attendance") {
      const { clubEventId, memberSeasonId } = body
      if (!clubEventId || !memberSeasonId) return err("Missing clubEventId or memberSeasonId.", 400)

      const existing = await prisma.clubEventAttendance.findUnique({
        where: { clubEventId_memberSeasonId: { clubEventId, memberSeasonId } },
      })
      if (existing) return ok({ success: true, alreadyMarked: true })

      const event = await prisma.clubEvent.findUnique({
        where: { id: clubEventId },
        select: { hoursValue: true, categoryId: true, name: true, startsAt: true, endsAt: true },
      })
      if (!event) return err("Club event not found.", 404)

      const att = await prisma.clubEventAttendance.create({
        data: { clubEventId, memberSeasonId },
        select: { id: true },
      })

      const hoursValue = Number(event.hoursValue)
      if (hoursValue > 0 && event.categoryId) {
        const entry = await prisma.hourEntry.create({
          data: {
            memberSeasonId,
            categoryId: event.categoryId,
            title: event.name,
            totalHours: event.hoursValue,
            status: "APPROVED",
            approvedAt: new Date(),
            startsAt: event.startsAt,
            endsAt: event.endsAt,
          },
          select: { id: true },
        })
        await prisma.clubEventAttendance.update({
          where: { id: att.id },
          data: { hourEntryId: entry.id },
        })
      }

      return ok({ success: true })
    }

    if (action === "unmark-attendance") {
      const { clubEventId, memberSeasonId } = body
      if (!clubEventId || !memberSeasonId) return err("Missing clubEventId or memberSeasonId.", 400)

      const att = await prisma.clubEventAttendance.findUnique({
        where: { clubEventId_memberSeasonId: { clubEventId, memberSeasonId } },
        select: { id: true, hourEntryId: true },
      })
      if (!att) return ok({ success: true })

      if (att.hourEntryId) {
        await prisma.hourEntry.delete({ where: { id: att.hourEntryId } })
      }
      await prisma.clubEventAttendance.delete({ where: { id: att.id } })

      return ok({ success: true })
    }

    return err("Invalid action.", 400)
  },
  "manage club events"
)
