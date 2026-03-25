import type { User } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { withAdminAuth, ok, err } from "@/lib/api"
import { getActiveSeason } from "@/lib/db"

export const dynamic = "force-dynamic"

export const GET = withAdminAuth(
  async (request: Request, ctx: { params: Promise<{ id: string }> }, currentUser: User) => {
    const { id: userId } = await ctx.params

    if (!userId) return err("User ID is required.", 400)

    const activeSeason = await getActiveSeason(currentUser.clubId)
    if (!activeSeason) return err("No active season.", 400)

    const memberSeason = await prisma.memberSeason.findFirst({
      where: { userId, seasonId: activeSeason.id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            gradeLevel: true,
            phone: true,
            role: true,
            imageUrl: true,
          },
        },
        hourEntries: {
          include: {
            category: { select: { id: true, name: true } },
            approvedBy: { select: { firstName: true, lastName: true } },
          },
          orderBy: { submittedAt: "desc" },
        },
        invoices: {
          include: {
            payments: {
              include: {
                recordedBy: { select: { firstName: true, lastName: true } },
              },
              orderBy: { paidAt: "desc" },
            },
          },
          orderBy: { issuedAt: "desc" },
        },
        formSubmissions: {
          include: {
            formType: true,
            verifiedBy: { select: { firstName: true, lastName: true } },
          },
        },
        eventEnrollments: {
          include: { event: { select: { id: true, name: true } } },
          orderBy: { preferenceRank: "asc" },
        },
      },
    })

    if (!memberSeason) return err("Member not found in active season.", 404)

    // Load hour categories and form types for the season (for dropdowns)
    const [hourCategories, formTypes] = await Promise.all([
      prisma.hourCategory.findMany({
        where: { seasonId: activeSeason.id },
        orderBy: { name: "asc" },
      }),
      prisma.formType.findMany({
        where: { seasonId: activeSeason.id },
        orderBy: { createdAt: "asc" },
      }),
    ])

    return ok({ memberSeason, hourCategories, formTypes })
  },
  "fetch member detail"
)
