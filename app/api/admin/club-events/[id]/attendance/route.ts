// app/api/admin/club-events/[id]/attendance/route.ts
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withPermission, ok, err } from "@/lib/api"

export const dynamic = "force-dynamic"

const memberSeasonSchema = z.object({
  memberSeasonId: z.string(),
})

export const GET = withPermission(
  "view_club_events",
  async (_req, ctx: { params: Promise<{ id: string }> }, user) => {
    const { id: clubEventId } = await ctx.params

    const event = await prisma.clubEvent.findFirst({
      where: { id: clubEventId, season: { clubId: user.clubId } },
      select: { id: true, seasonId: true },
    })
    if (!event) return err("Club event not found.", 404)

    const attendance = await prisma.clubEventAttendance.findMany({
      where: {
        clubEventId,
        memberSeason: {
          seasonId: event.seasonId,
          user: { clubId: user.clubId },
        },
      },
      include: {
        memberSeason: {
          include: { user: { select: { id: true, firstName: true, lastName: true } } },
        },
      },
    })
    return ok(attendance)
  },
)

export const POST = withPermission(
  "edit_club_events",
  async (req, ctx: { params: Promise<{ id: string }> }, user) => {
    const { id: clubEventId } = await ctx.params
    const body = await req.json()
    const parsed = memberSeasonSchema.safeParse(body)
    if (!parsed.success) return err("Invalid.", 400)

    const event = await prisma.clubEvent.findFirst({
      where: { id: clubEventId, season: { clubId: user.clubId } },
      select: {
        id: true,
        seasonId: true,
        name: true,
        hoursValue: true,
        categoryId: true,
      },
    })
    if (!event) return err("Club event not found.", 404)

    const memberSeason = await prisma.memberSeason.findFirst({
      where: {
        id: parsed.data.memberSeasonId,
        seasonId: event.seasonId,
        user: { clubId: user.clubId },
      },
      select: { id: true },
    })
    if (!memberSeason) return err("Member not found for this season.", 404)

    const result = await prisma.$transaction(async (tx) => {
      const attendance = await tx.clubEventAttendance.upsert({
        where: {
          clubEventId_memberSeasonId: {
            clubEventId,
            memberSeasonId: memberSeason.id,
          },
        },
        create: { clubEventId, memberSeasonId: memberSeason.id },
        update: {},
        select: { id: true, hourEntryId: true },
      })

      if (Number(event.hoursValue) > 0 && event.categoryId) {
        const hourEntryData = {
          memberSeasonId: memberSeason.id,
          categoryId: event.categoryId,
          title: `Attendance: ${event.name}`,
          totalHours: event.hoursValue,
          status: "APPROVED" as const,
          approvedAt: new Date(),
          approvedById: user.id,
        }

        const existingHourEntry = attendance.hourEntryId
          ? await tx.hourEntry.update({
              where: { id: attendance.hourEntryId },
              data: hourEntryData,
              select: { id: true },
            }).catch(() => null)
          : null

        const hourEntry = existingHourEntry ?? await tx.hourEntry.create({
          data: hourEntryData,
          select: { id: true },
        })

        if (attendance.hourEntryId !== hourEntry.id) {
          await tx.clubEventAttendance.update({
            where: { id: attendance.id },
            data: { hourEntryId: hourEntry.id },
          })
        }
      } else if (attendance.hourEntryId) {
        await tx.hourEntry.delete({ where: { id: attendance.hourEntryId } }).catch(() => null)
        await tx.clubEventAttendance.update({
          where: { id: attendance.id },
          data: { hourEntryId: null },
        })
      }

      return tx.clubEventAttendance.findUnique({
        where: { id: attendance.id },
        include: {
          memberSeason: {
            include: { user: { select: { id: true, firstName: true, lastName: true } } },
          },
        },
      })
    })

    return ok(result, 201)
  },
)

export const DELETE = withPermission(
  "edit_club_events",
  async (req, ctx: { params: Promise<{ id: string }> }, user) => {
    const { id: clubEventId } = await ctx.params
    const body = await req.json()
    const parsed = memberSeasonSchema.safeParse(body)
    if (!parsed.success) return err("Invalid.", 400)

    const event = await prisma.clubEvent.findFirst({
      where: { id: clubEventId, season: { clubId: user.clubId } },
      select: { id: true, seasonId: true },
    })
    if (!event) return err("Club event not found.", 404)

    const memberSeason = await prisma.memberSeason.findFirst({
      where: {
        id: parsed.data.memberSeasonId,
        seasonId: event.seasonId,
        user: { clubId: user.clubId },
      },
      select: { id: true },
    })
    if (!memberSeason) return err("Member not found for this season.", 404)

    const attendance = await prisma.clubEventAttendance.findUnique({
      where: {
        clubEventId_memberSeasonId: {
          clubEventId,
          memberSeasonId: memberSeason.id,
        },
      },
    })

    await prisma.$transaction(async (tx) => {
      if (attendance?.hourEntryId) {
        await tx.hourEntry.delete({ where: { id: attendance.hourEntryId } }).catch(() => null)
      }
      await tx.clubEventAttendance.deleteMany({
        where: {
          clubEventId,
          memberSeasonId: memberSeason.id,
        },
      })
    })

    return ok({ ok: true })
  },
)
