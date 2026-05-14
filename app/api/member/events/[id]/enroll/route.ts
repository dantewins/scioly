// app/api/member/events/[id]/enroll/route.ts
import { prisma } from "@/lib/prisma"
import { withActiveMemberAuth, ok, err } from "@/lib/api"
import { hasPermission } from "@/lib/permissions"
import { getActiveSeason, getMemberSeason } from "@/lib/db"

export const dynamic = "force-dynamic"

// POST — current member expresses interest in the given event.
// Idempotent: re-enrolling an already-INTERESTED member is a no-op.
// If the member was previously DROPPED, they're moved back to INTERESTED.
// If the admin has already advanced the member past INTERESTED (TRYOUT_PENDING,
// ACTIVE, WAITLISTED), the existing record is preserved and returned as-is.
export const POST = withActiveMemberAuth(async (_req, ctx: { params: Promise<{ id: string }> }, user) => {
  if (!hasPermission(user.permissions, "view_events")) {
    return err("Forbidden.", 403)
  }

  const { id: eventId } = await ctx.params

  const season = await getActiveSeason(user.clubId)
  if (!season) return err("No active season.", 400)

  const ms = await getMemberSeason(user.id, user.clubId)
  if (!ms) return err("Not a member this season.", 403)

  const event = await prisma.event.findFirst({
    where: { id: eventId, seasonId: season.id },
    select: { id: true },
  })
  if (!event) return err("Event not found.", 404)

  const existing = await prisma.eventEnrollment.findUnique({
    where: { memberSeasonId_eventId: { memberSeasonId: ms.id, eventId } },
    select: { id: true, status: true },
  })

  if (existing && existing.status !== "DROPPED") {
    return ok(existing)
  }

  const enrollment = existing
    ? await prisma.eventEnrollment.update({
        where: { id: existing.id },
        data: { status: "INTERESTED" },
        select: { id: true, status: true, eventId: true, memberSeasonId: true },
      })
    : await prisma.eventEnrollment.create({
        data: {
          memberSeasonId: ms.id,
          eventId,
          status: "INTERESTED",
        },
        select: { id: true, status: true, eventId: true, memberSeasonId: true },
      })

  return ok(enrollment, 201)
})

// DELETE — current member withdraws their own interest.
// Only allowed while the enrollment is still INTERESTED — once an admin moves
// the member into TRYOUT_PENDING / ACTIVE / WAITLISTED, withdrawal must go
// through the admin so the slot can be reassigned.
export const DELETE = withActiveMemberAuth(async (_req, ctx: { params: Promise<{ id: string }> }, user) => {
  if (!hasPermission(user.permissions, "view_events")) {
    return err("Forbidden.", 403)
  }

  const { id: eventId } = await ctx.params

  const ms = await getMemberSeason(user.id, user.clubId)
  if (!ms) return err("Not a member this season.", 403)

  const enrollment = await prisma.eventEnrollment.findUnique({
    where: { memberSeasonId_eventId: { memberSeasonId: ms.id, eventId } },
    select: { id: true, status: true },
  })
  if (!enrollment) return err("Enrollment not found.", 404)
  if (enrollment.status !== "INTERESTED") {
    return err("Talk to your club admin to withdraw — your enrollment has already been reviewed.", 409)
  }

  await prisma.eventEnrollment.delete({ where: { id: enrollment.id } })
  return ok({ ok: true })
})
