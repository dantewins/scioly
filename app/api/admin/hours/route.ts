// app/api/admin/hours/route.ts
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withPermission, ok, err } from "@/lib/api"
import { getActiveSeason } from "@/lib/db"
import { sendHoursReviewedEmail } from "@/lib/email"
import { formatZodError } from "@/lib/zod-errors"

export const dynamic = "force-dynamic"

export const GET = withPermission("view_hours", async (req, _ctx, user) => {
  const season = await getActiveSeason(user.clubId)
  if (!season) return err("No active season.", 400)

  const url = new URL(req.url)
  const statusParam = url.searchParams.get("status")
  const status = ["PENDING", "APPROVED", "REJECTED"].includes(statusParam ?? "")
    ? (statusParam as "PENDING" | "APPROVED" | "REJECTED")
    : null
  const categoryId = url.searchParams.get("category") ?? undefined
  const takeParam = Number(url.searchParams.get("take") ?? 100)
  const take = Number.isFinite(takeParam) ? Math.min(Math.max(Math.trunc(takeParam), 1), 250) : 100

  const entries = await prisma.hourEntry.findMany({
    where: {
      memberSeason: { seasonId: season.id, user: { clubId: user.clubId } },
      ...(status && { status }),
      ...(categoryId && { categoryId }),
    },
    include: {
      memberSeason: {
        select: {
          id: true,
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      },
      category: { select: { id: true, name: true } },
    },
    orderBy: { submittedAt: "desc" },
    take,
  })
  return ok(entries)
})

const reviewSchema = z.object({
  entryIds: z.array(z.string().min(1)).min(1).max(200),
  action: z.enum(["approve", "reject"]),
  rejectionReason: z.string().max(500).optional(),
})

export const PATCH = withPermission("edit_hours", async (req, _ctx, user) => {
  const body = await req.json()
  const parsed = reviewSchema.safeParse(body)
  if (!parsed.success) return err(formatZodError(parsed.error), 400)

  const { entryIds, action, rejectionReason } = parsed.data

  const entries = await prisma.hourEntry.findMany({
    where: { id: { in: entryIds }, memberSeason: { season: { clubId: user.clubId } } },
    select: {
      id: true,
      title: true,
      totalHours: true,
      memberSeason: {
        select: { user: { select: { email: true, firstName: true } } },
      },
    },
  })
  if (entries.length !== entryIds.length) {
    return err("One or more hour entries not found.", 404)
  }

  const result = await prisma.hourEntry.updateMany({
    where: { id: { in: entryIds } },
    data:
      action === "approve"
        ? { status: "APPROVED", approvedAt: new Date(), approvedById: user.id, rejectionReason: null }
        : { status: "REJECTED", rejectionReason: rejectionReason ?? "No reason provided." },
  })

  // Best-effort notification per entry; mutation already succeeded.
  const status = action === "approve" ? "APPROVED" : "REJECTED"
  await Promise.allSettled(
    entries.map((entry) =>
      sendHoursReviewedEmail(
        entry.memberSeason.user.email,
        entry.memberSeason.user.firstName,
        entry.title,
        Number(entry.totalHours),
        status,
        action === "reject" ? rejectionReason ?? null : null,
      ).catch((e) => {
        console.error(`[hours:${action}] Email send failed for ${entry.id}:`, e)
      }),
    ),
  )

  return ok({ count: result.count })
})
