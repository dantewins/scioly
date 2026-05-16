// app/api/admin/applicants/route.ts
import { z } from "zod"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { withPermission, ok, err } from "@/lib/api"
import {
  sendApplicationRejectedEmail,
  sendApplicationWaitlistedEmail,
  sendPasswordSetupEmail,
} from "@/lib/email"
import { clearSeasonLookupCaches, getActiveSeason } from "@/lib/db"
import { listPendingApplicants } from "@/lib/applications"
import { clearCurrentUserCache } from "@/lib/auth"
import { formatZodError } from "@/lib/zod-errors"

export const dynamic = "force-dynamic"

async function syncApplicationDecision(
  db: Prisma.TransactionClient,
  memberSeasonId: string,
  seasonId: string,
  userId: string,
  email: string,
  reviewedById: string,
  data: {
    status: "APPROVED" | "DENIED" | "WAITLISTED"
    reviewedAt: Date
    decisionNotes: string | null
  },
) {
  const updated = await db.membershipApplication.updateMany({
    where: { memberSeasonId },
    data: {
      ...data,
      reviewedById,
    },
  })

  if (updated.count > 0) return

  await db.membershipApplication.updateMany({
    where: {
      seasonId,
      OR: [{ userId }, { email }],
    },
    data: {
      ...data,
      reviewedById,
    },
  })
}

// GET — list all pending applicants for the active season
export const GET = withPermission("view_members", async (_req, _ctx, user) => {
  const season = await getActiveSeason(user.clubId)
  if (!season) return err("No active season.", 400)

  const applicants = await listPendingApplicants(user.clubId, season.id)
  return ok(applicants)
})

const patchSchema = z
  .object({
    memberSeasonId: z.string().optional(),
    memberSeasonIds: z.array(z.string()).min(1).max(200).optional(),
    action: z.enum(["approve", "deny", "waitlist"]),
    reason: z.string().optional(),
  })
  .refine((d) => Boolean(d.memberSeasonId) || (d.memberSeasonIds && d.memberSeasonIds.length > 0), {
    message: "memberSeasonId or memberSeasonIds is required.",
  })

type Action = "approve" | "deny" | "waitlist"

interface ProcessResult {
  memberSeasonId: string
  ok: boolean
  error?: string
}

async function processOne(
  memberSeasonId: string,
  action: Action,
  reason: string | undefined,
  reviewerId: string,
  reviewerClubId: string,
): Promise<ProcessResult> {
  const ms = await prisma.memberSeason.findFirst({
    where: { id: memberSeasonId, season: { clubId: reviewerClubId } },
    include: {
      user: { select: { id: true, email: true, firstName: true, role: true } },
      season: { select: { club: { select: { name: true } } } },
    },
  })
  if (!ms) return { memberSeasonId, ok: false, error: "Applicant not found." }
  if (ms.membershipStatus !== "PENDING") {
    return { memberSeasonId, ok: false, error: "Not pending." }
  }

  const clubName = ms.season.club.name
  const reviewedAt = new Date()
  const decisionNotes = reason ?? null

  if (action === "deny") {
    await prisma.$transaction(async (tx) => {
      await tx.memberSeason.update({
        where: { id: memberSeasonId },
        data: {
          membershipStatus: "REMOVED",
          statusChangedAt: reviewedAt,
          statusReason: reason ?? "Application denied.",
        },
      })
      await syncApplicationDecision(
        tx,
        memberSeasonId,
        ms.seasonId,
        ms.user.id,
        ms.user.email,
        reviewerId,
        {
          status: "DENIED",
          reviewedAt,
          decisionNotes: decisionNotes ?? "Application denied.",
        },
      )
    })
    clearSeasonLookupCaches()
    clearCurrentUserCache(ms.user.id)

    try {
      await sendApplicationRejectedEmail(ms.user.email, ms.user.firstName, clubName, decisionNotes)
    } catch (e) {
      console.error("[applicants:deny] Email send failed:", e)
    }
    return { memberSeasonId, ok: true }
  }

  if (action === "waitlist") {
    await prisma.$transaction(async (tx) => {
      await syncApplicationDecision(
        tx,
        memberSeasonId,
        ms.seasonId,
        ms.user.id,
        ms.user.email,
        reviewerId,
        { status: "WAITLISTED", reviewedAt, decisionNotes },
      )
    })

    try {
      await sendApplicationWaitlistedEmail(ms.user.email, ms.user.firstName, clubName, decisionNotes)
    } catch (e) {
      console.error("[applicants:waitlist] Email send failed:", e)
    }
    return { memberSeasonId, ok: true }
  }

  // approve
  const setupToken = await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: ms.user.id },
      data: { role: "MEMBER" },
    })
    await tx.memberSeason.update({
      where: { id: memberSeasonId },
      data: { membershipStatus: "ACTIVE", statusChangedAt: reviewedAt },
    })
    await syncApplicationDecision(
      tx,
      memberSeasonId,
      ms.seasonId,
      ms.user.id,
      ms.user.email,
      reviewerId,
      { status: "APPROVED", reviewedAt, decisionNotes },
    )
    return tx.passwordSetupToken.create({
      data: {
        userId: ms.user.id,
        expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
      },
    })
  })

  try {
    await sendPasswordSetupEmail(ms.user.email, setupToken.token, ms.user.firstName)
  } catch (e) {
    console.error("[applicants:approve] Email send failed:", e)
  }

  clearSeasonLookupCaches()
  clearCurrentUserCache(ms.user.id)
  return { memberSeasonId, ok: true }
}

// PATCH — approve/deny/waitlist single OR bulk
export const PATCH = withPermission("edit_members", async (req, _ctx, user) => {
  const body = await req.json().catch(() => null)
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return err(formatZodError(parsed.error), 400)

  const { memberSeasonId, memberSeasonIds, action, reason } = parsed.data
  const ids = memberSeasonIds ?? [memberSeasonId as string]

  // Sequential to keep DB writes ordered + email logs predictable. Bulk is
  // bounded to 200 by zod; if you need more, chunk on the client.
  const results: ProcessResult[] = []
  for (const id of ids) {
    try {
      results.push(await processOne(id, action, reason, user.id, user.clubId))
    } catch (e) {
      console.error(`[applicants:${action}] Failed for ${id}:`, e)
      results.push({ memberSeasonId: id, ok: false, error: "Internal error." })
    }
  }

  const succeeded = results.filter((r) => r.ok).length
  const failed = results.filter((r) => !r.ok)

  return ok({
    ok: succeeded,
    failed: failed.length,
    failures: failed,
  })
})
