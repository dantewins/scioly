// app/api/admin/events/[id]/enrollments/route.ts
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withPermission, ok, err } from "@/lib/api"
import { getActiveSeason } from "@/lib/db"
import { formatZodError } from "@/lib/zod-errors"

export const dynamic = "force-dynamic"

export const GET = withPermission(
  "view_events",
  async (_req, ctx: { params: Promise<{ id: string }> }, user) => {
    const { id: eventId } = await ctx.params
    const season = await getActiveSeason(user.clubId)
    if (!season) return err("No active season.", 400)

    const enrollments = await prisma.eventEnrollment.findMany({
      where: { eventId, memberSeason: { seasonId: season.id, user: { clubId: user.clubId } } },
      include: {
        memberSeason: {
          select: {
            id: true,
            user: { select: { id: true, firstName: true, lastName: true, email: true, gradeLevel: true } },
          },
        },
      },
      orderBy: { memberSeason: { user: { lastName: "asc" } } },
    })
    return ok(enrollments)
  },
)

const patchSchema = z.object({
  memberSeasonId: z.string(),
  status: z.enum(["INTERESTED", "TRYOUT_PENDING", "ACTIVE", "WAITLISTED", "DROPPED"]),
})

export const PATCH = withPermission(
  "edit_events",
  async (req, ctx: { params: Promise<{ id: string }> }, user) => {
    const { id: eventId } = await ctx.params
    const body = await req.json().catch(() => null)
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) return err(formatZodError(parsed.error), 400)

    const enrollment = await prisma.eventEnrollment.findFirst({
      where: {
        eventId,
        memberSeasonId: parsed.data.memberSeasonId,
        event: { season: { clubId: user.clubId } },
      },
    })
    if (!enrollment) return err("Enrollment not found.", 404)

    const updated = await prisma.eventEnrollment.update({
      where: { id: enrollment.id },
      data: { status: parsed.data.status },
    })
    return ok(updated)
  },
)
