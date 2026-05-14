import { Prisma, type PrismaClient } from "@prisma/client"
import { prisma } from "@/lib/prisma"

type DbClient = PrismaClient | Prisma.TransactionClient

export async function syncClubEventAttendanceHourEntries(
  clubEventId: string,
  approvedById: string,
  db: DbClient = prisma,
) {
  const event = await db.clubEvent.findUnique({
    where: { id: clubEventId },
    select: {
      id: true,
      name: true,
      hoursValue: true,
      categoryId: true,
      attendance: {
        select: {
          id: true,
          memberSeasonId: true,
          hourEntryId: true,
        },
      },
    },
  })

  if (!event) return

  for (const attendance of event.attendance) {
    if (Number(event.hoursValue) > 0 && event.categoryId) {
      const hourEntryData = {
        memberSeasonId: attendance.memberSeasonId,
        categoryId: event.categoryId,
        title: `Attendance: ${event.name}`,
        totalHours: event.hoursValue,
        status: "APPROVED" as const,
        approvedAt: new Date(),
        approvedById,
        rejectionReason: null,
      }

      const existingHourEntry = attendance.hourEntryId
        ? await db.hourEntry
            .update({
              where: { id: attendance.hourEntryId },
              data: hourEntryData,
              select: { id: true },
            })
            .catch(() => null)
        : null

      const hourEntry =
        existingHourEntry ??
        (await db.hourEntry.create({
          data: hourEntryData,
          select: { id: true },
        }))

      if (attendance.hourEntryId !== hourEntry.id) {
        await db.clubEventAttendance.update({
          where: { id: attendance.id },
          data: { hourEntryId: hourEntry.id },
        })
      }
      continue
    }

    if (attendance.hourEntryId) {
      await db.hourEntry.delete({ where: { id: attendance.hourEntryId } }).catch(() => null)
      await db.clubEventAttendance.update({
        where: { id: attendance.id },
        data: { hourEntryId: null },
      })
    }
  }
}
