// app/api/admin/hours/route.ts
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withPermission, ok, err } from "@/lib/api"
import { getActiveSeason } from "@/lib/db"

export const dynamic = "force-dynamic"

export const GET = withPermission("view_hours", async (req, _ctx, user) => {
  const season = await getActiveSeason(user.clubId)
  if (!season) return err("No active season.", 400)

  const url = new URL(req.url)
  const status = url.searchParams.get("status") as "PENDING" | "APPROVED" | "REJECTED" | null
  const categoryId = url.searchParams.get("category") ?? undefined

  const entries = await prisma.hourEntry.findMany({
    where: {
      memberSeason: { seasonId: season.id, user: { clubId: user.clubId } },
      ...(status && { status }),
      ...(categoryId && { categoryId }),
    },
    include: {
      memberSeason: {
        include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
      },
      category: { select: { id: true, name: true } },
    },
    orderBy: { submittedAt: "desc" },
  })
  return ok(entries)
})

const reviewSchema = z.object({
  entryId: z.string(),
  action: z.enum(["approve", "reject"]),
  rejectionReason: z.string().max(500).optional(),
})

export const PATCH = withPermission("edit_hours", async (req, _ctx, user) => {
  const body = await req.json()
  const parsed = reviewSchema.safeParse(body)
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input.", 400)

  const { entryId, action, rejectionReason } = parsed.data

  // Verify entry belongs to this club
  const entry = await prisma.hourEntry.findFirst({
    where: { id: entryId, memberSeason: { season: { clubId: user.clubId } } },
  })
  if (!entry) return err("Hour entry not found.", 404)

  const updated = await prisma.hourEntry.update({
    where: { id: entryId },
    data:
      action === "approve"
        ? { status: "APPROVED", approvedAt: new Date(), approvedById: user.id, rejectionReason: null }
        : { status: "REJECTED", rejectionReason: rejectionReason ?? "No reason provided." },
  })
  return ok(updated)
})
