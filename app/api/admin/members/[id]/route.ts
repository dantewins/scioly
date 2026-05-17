// app/api/admin/members/[id]/route.ts
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withPermission, ok, err } from "@/lib/api"
import { clearSeasonLookupCaches, getActiveSeason } from "@/lib/db"
import { clearCurrentUserCache } from "@/lib/auth"
import { formatZodError } from "@/lib/zod-errors"

export const dynamic = "force-dynamic"

// GET — full member detail for the active season
export const GET = withPermission("view_members", async (_req, ctx: { params: Promise<{ id: string }> }, user) => {
  const { id: targetUserId } = await ctx.params

  const season = await getActiveSeason(user.clubId)
  if (!season) return err("No active season.", 400)

  // Ensure target user belongs to this club
  const targetUser = await prisma.user.findFirst({
    where: { id: targetUserId, clubId: user.clubId },
    select: {
      id: true, firstName: true, lastName: true, email: true,
      phone: true, gradeLevel: true, graduationYear: true,
      studentNumber: true, role: true, imageUrl: true,
    },
  })
  if (!targetUser) return err("Member not found.", 404)

  const ms = await prisma.memberSeason.findUnique({
    where: { userId_seasonId: { userId: targetUserId, seasonId: season.id } },
    include: {
      roles: { include: { clubRole: { select: { id: true, name: true } } } },
      eventEnrollments: {
        include: { event: { select: { id: true, name: true, code: true } } },
        orderBy: { event: { sortOrder: "asc" } },
      },
      hourEntries: {
        where: { status: "APPROVED" },
        select: { totalHours: true, categoryId: true },
      },
      invoices: {
        select: { id: true, title: true, amountCents: true, amountPaidCents: true, status: true, dueAt: true },
        orderBy: { issuedAt: "desc" },
      },
      formSubmissions: {
        include: { formType: { select: { id: true, name: true, category: true } } },
        orderBy: { formType: { name: "asc" } },
      },
      application: {
        select: {
          id: true,
          submittedAt: true,
          isReturning: true,
          canTravel: true,
          whyJoin: true,
          contributionIdeas: true,
          previousEvents: true,
          scienceClasses: true,
          mathClasses: true,
          questions: true,
          eventChoices: {
            orderBy: { preferenceRank: "asc" },
            select: {
              event: { select: { id: true, name: true, code: true } },
            },
          },
        },
      },
    },
  })

  return ok({ user: targetUser, memberSeason: ms })
})

const statusSchema = z
  .object({
    membershipStatus: z.enum(["ACTIVE", "INACTIVE", "ALUMNI", "REMOVED"]).optional(),
    statusReason: z.string().max(500).optional(),
  })
  // Refuse a noop / standalone statusReason patch — it would silently
  // succeed but write nothing (the previous code's `if(status)` guard
  // skipped over statusReason on its own).
  .refine(
    (d) => d.membershipStatus !== undefined || d.statusReason === undefined,
    {
      message: "statusReason can't be set without membershipStatus.",
      path: ["statusReason"],
    },
  )

// PATCH — update member status
export const PATCH = withPermission("edit_members", async (req, ctx: { params: Promise<{ id: string }> }, user) => {
  const { id: targetUserId } = await ctx.params
  const body = await req.json().catch(() => null)
  const parsed = statusSchema.safeParse(body)
  if (!parsed.success) return err(formatZodError(parsed.error), 400)

  const season = await getActiveSeason(user.clubId)
  if (!season) return err("No active season.", 400)

  const ms = await prisma.memberSeason.findFirst({
    where: { userId: targetUserId, seasonId: season.id, user: { clubId: user.clubId } },
  })
  if (!ms) return err("Member not found.", 404)

  if (!parsed.data.membershipStatus) {
    return err("Nothing to update.", 400)
  }

  const updated = await prisma.memberSeason.update({
    where: { id: ms.id },
    data: {
      membershipStatus: parsed.data.membershipStatus,
      statusChangedAt: new Date(),
      statusReason: parsed.data.statusReason ?? null,
    },
  })

  clearSeasonLookupCaches()
  clearCurrentUserCache(targetUserId)
  return ok(updated)
})
