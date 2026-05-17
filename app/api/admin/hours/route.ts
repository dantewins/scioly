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
  // Require a non-empty trimmed reason when rejecting. Schema-level
  // min(1) lets "   " through; refine handles whitespace.
  rejectionReason: z
    .string()
    .max(500)
    .refine((s) => s.trim().length > 0, { message: "Reason can't be blank." })
    .optional(),
})

export const PATCH = withPermission("edit_hours", async (req, _ctx, user) => {
  const body = await req.json().catch(() => null)
  const parsed = reviewSchema.safeParse(body)
  if (!parsed.success) return err(formatZodError(parsed.error), 400)

  const { entryIds, action, rejectionReason } = parsed.data

  // Only act on entries currently in PENDING (or REJECTED→approve /
  // APPROVED→reject reversals — both meaningful). Skipping already-in-
  // target-state entries keeps approvedAt + approvedById from being
  // overwritten on repeated clicks.
  const targetStatus = action === "approve" ? "APPROVED" : "REJECTED"

  const entries = await prisma.hourEntry.findMany({
    where: {
      id: { in: entryIds },
      memberSeason: { season: { clubId: user.clubId } },
    },
    select: {
      id: true,
      title: true,
      totalHours: true,
      status: true,
      memberSeason: {
        select: { user: { select: { email: true, firstName: true } } },
      },
    },
  })
  if (entries.length !== entryIds.length) {
    return err("One or more hour entries not found.", 404)
  }

  // Skip entries that are already in the target state — idempotent.
  const toChange = entries.filter((e) => e.status !== targetStatus)
  const result =
    toChange.length === 0
      ? { count: 0 }
      : await prisma.hourEntry.updateMany({
          where: { id: { in: toChange.map((e) => e.id) } },
          data:
            action === "approve"
              ? { status: "APPROVED", approvedAt: new Date(), approvedById: user.id, rejectionReason: null }
              : { status: "REJECTED", rejectionReason: rejectionReason ?? "No reason provided." },
        })

  // Best-effort notification per entry that actually changed.
  await Promise.allSettled(
    toChange.map((entry) =>
      sendHoursReviewedEmail(
        entry.memberSeason.user.email,
        entry.memberSeason.user.firstName,
        entry.title,
        Number(entry.totalHours),
        targetStatus,
        action === "reject" ? rejectionReason ?? null : null,
      ).catch((e) => {
        console.error(`[hours:${action}] Email send failed for ${entry.id}:`, e)
      }),
    ),
  )

  return ok({ count: result.count, skipped: entries.length - toChange.length })
})
