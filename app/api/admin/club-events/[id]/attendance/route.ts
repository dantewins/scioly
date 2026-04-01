// app/api/admin/club-events/[id]/attendance/route.ts
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withPermission, ok, err } from "@/lib/api"

export const dynamic = "force-dynamic"

export const GET = withPermission(
  "view_club_events",
  async (_req, ctx: { params: Promise<{ id: string }> }, user) => {
    const { id: clubEventId } = await ctx.params

    const event = await prisma.clubEvent.findFirst({
      where: { id: clubEventId, season: { clubId: user.clubId } },
    })
    if (!event) return err("Club event not found.", 404)

    const attendance = await prisma.clubEventAttendance.findMany({
      where: { clubEventId },
      include: {
        memberSeason: {
          include: { user: { select: { id: true, firstName: true, lastName: true } } },
        },
      },
    })
    return ok(attendance)
  },
)

const markSchema = z.object({
  memberSeasonId: z.string(),
})

export const POST = withPermission(
  "edit_club_events",
  async (req, ctx: { params: Promise<{ id: string }> }, user) => {
    const { id: clubEventId } = await ctx.params
    const body = await req.json()
    const parsed = markSchema.safeParse(body)
    if (!parsed.success) return err("Invalid.", 400)

    const event = await prisma.clubEvent.findFirst({
      where: { id: clubEventId, season: { clubId: user.clubId } },
      include: { category: true },
    })
    if (!event) return err("Club event not found.", 404)

    const result = await prisma.$transaction(async (tx) => {
      // Create attendance record
      const attendance = await tx.clubEventAttendance.upsert({
        where: { clubEventId_memberSeasonId: { clubEventId, memberSeasonId: parsed.data.memberSeasonId } },
        create: { clubEventId, memberSeasonId: parsed.data.memberSeasonId },
        update: {},
      })

      // Auto-create approved hour entry if hoursValue > 0 and category is set
      if (Number(event.hoursValue) > 0 && event.categoryId) {
        const hourEntry = await tx.hourEntry.create({
          data: {
            memberSeasonId: parsed.data.memberSeasonId,
            categoryId: event.categoryId,
            title: `Attendance: ${event.name}`,
            totalHours: event.hoursValue,
            status: "APPROVED",
            approvedAt: new Date(),
            approvedById: user.id,
          },
        })
        // Link the attendance to the hour entry
        await tx.clubEventAttendance.update({
          where: { id: attendance.id },
          data: { hourEntryId: hourEntry.id },
        })
      }

      return attendance
    })

    return ok(result, 201)
  },
)

export const DELETE = withPermission(
  "edit_club_events",
  async (req, ctx: { params: Promise<{ id: string }> }, user) => {
    const { id: clubEventId } = await ctx.params
    const body = await req.json()
    const { memberSeasonId } = body as { memberSeasonId: string }

    const event = await prisma.clubEvent.findFirst({
      where: { id: clubEventId, season: { clubId: user.clubId } },
    })
    if (!event) return err("Club event not found.", 404)

    // Get attendance to find linked hour entry
    const attendance = await prisma.clubEventAttendance.findUnique({
      where: { clubEventId_memberSeasonId: { clubEventId, memberSeasonId } },
    })

    await prisma.$transaction(async (tx) => {
      if (attendance?.hourEntryId) {
        await tx.hourEntry.delete({ where: { id: attendance.hourEntryId } }).catch(() => null)
      }
      await tx.clubEventAttendance.deleteMany({ where: { clubEventId, memberSeasonId } })
    })

    return ok({ ok: true })
  },
)
