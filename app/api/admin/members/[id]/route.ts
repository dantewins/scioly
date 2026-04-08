// app/api/admin/members/[id]/route.ts
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withPermission, ok, err } from "@/lib/api"
import { getActiveSeason } from "@/lib/db"

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

const statusSchema = z.object({
  membershipStatus: z.enum(["ACTIVE", "INACTIVE", "ALUMNI", "REMOVED"]).optional(),
  statusReason: z.string().max(500).optional(),
})

// PATCH — update member status
export const PATCH = withPermission("edit_members", async (req, ctx: { params: Promise<{ id: string }> }, user) => {
  const { id: targetUserId } = await ctx.params
  const body = await req.json()
  const parsed = statusSchema.safeParse(body)
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input.", 400)

  const season = await getActiveSeason(user.clubId)
  if (!season) return err("No active season.", 400)

  const ms = await prisma.memberSeason.findFirst({
    where: { userId: targetUserId, seasonId: season.id, user: { clubId: user.clubId } },
  })
  if (!ms) return err("Member not found.", 404)

  const updated = await prisma.memberSeason.update({
    where: { id: ms.id },
    data: {
      ...(parsed.data.membershipStatus && {
        membershipStatus: parsed.data.membershipStatus,
        statusChangedAt: new Date(),
        statusReason: parsed.data.statusReason,
      }),
    },
  })

  return ok(updated)
})
