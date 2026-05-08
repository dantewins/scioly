// app/api/member/hours/route.ts
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withMemberAuth, ok, err } from "@/lib/api"
import { hasPermission } from "@/lib/permissions"
import { getActiveSeason, getMemberSeason } from "@/lib/db"

export const dynamic = "force-dynamic"

// GET — current member's own hour entries
export const GET = withMemberAuth(async (_req, _ctx, user) => {
  const ms = await getMemberSeason(user.id, user.clubId)
  if (!ms) return err("Not a member this season.", 403)

  const entries = await prisma.hourEntry.findMany({
    where: { memberSeasonId: ms.id },
    include: { category: { select: { id: true, name: true } } },
    orderBy: { submittedAt: "desc" },
    take: 100,
  })
  return ok(entries)
})

const submitSchema = z.object({
  categoryId: z.string(),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  totalHours: z.number().min(0.25).max(24),
  proofUrl: z.string().url().optional(),
})

// POST — submit a new hour entry (requires create_hours permission)
export const POST = withMemberAuth(async (req, _ctx, user) => {
  if (!hasPermission(user.permissions, "create_hours")) {
    return err("Forbidden.", 403)
  }

  const body = await req.json()
  const parsed = submitSchema.safeParse(body)
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input.", 400)

  const season = await getActiveSeason(user.clubId)
  if (!season) return err("No active season.", 400)

  const ms = await getMemberSeason(user.id, user.clubId)
  if (!ms) return err("Not a member this season.", 403)

  // Verify category belongs to this season
  const category = await prisma.hourCategory.findFirst({
    where: { id: parsed.data.categoryId, seasonId: season.id },
  })
  if (!category) return err("Category not found.", 404)

  const entry = await prisma.hourEntry.create({
    data: {
      memberSeasonId: ms.id,
      ...parsed.data,
      // If category doesn't require approval, auto-approve
      status: category.requiresApproval ? "PENDING" : "APPROVED",
      ...(category.requiresApproval ? {} : { approvedAt: new Date(), approvedById: user.id }),
    },
    include: { category: { select: { id: true, name: true } } },
  })
  return ok(entry, 201)
})
