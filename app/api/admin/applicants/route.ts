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

const patchSchema = z.object({
  memberSeasonId: z.string(),
  action: z.enum(["approve", "deny", "waitlist"]),
  reason: z.string().optional(),
})

// PATCH — approve or deny a single applicant
export const PATCH = withPermission("edit_members", async (req, _ctx, user) => {
  const body = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input.", 400)

  const { memberSeasonId, action, reason } = parsed.data

  const ms = await prisma.memberSeason.findFirst({
    where: {
      id: memberSeasonId,
      season: { clubId: user.clubId },
    },
    include: {
      user: { select: { id: true, email: true, firstName: true, role: true } },
      season: { select: { club: { select: { name: true } } } },
    },
  })
  if (!ms) return err("Applicant not found.", 404)
  if (ms.membershipStatus !== "PENDING") return err("Applicant is not in pending status.", 400)

  const clubName = ms.season.club.name

  if (action === "deny") {
    const reviewedAt = new Date()
    const decisionNotes = reason ?? null

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
        user.id,
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

    return ok({ ok: true })
  }

  if (action === "waitlist") {
    const reviewedAt = new Date()
    const decisionNotes = reason ?? null

    await prisma.$transaction(async (tx) => {
      // MemberSeason stays PENDING — they're still under consideration.
      await syncApplicationDecision(
        tx,
        memberSeasonId,
        ms.seasonId,
        ms.user.id,
        ms.user.email,
        user.id,
        {
          status: "WAITLISTED",
          reviewedAt,
          decisionNotes,
        },
      )
    })

    try {
      await sendApplicationWaitlistedEmail(ms.user.email, ms.user.firstName, clubName, decisionNotes)
    } catch (e) {
      console.error("[applicants:waitlist] Email send failed:", e)
    }

    return ok({ ok: true })
  }

  // Approve: update role + status, create token, send email
  const token = await prisma.$transaction(async (tx) => {
    const reviewedAt = new Date()

    await tx.user.update({
      where: { id: ms.user.id },
      data: { role: "MEMBER" },
    })

    await tx.memberSeason.update({
      where: { id: memberSeasonId },
      data: {
        membershipStatus: "ACTIVE",
        statusChangedAt: reviewedAt,
      },
    })

    await syncApplicationDecision(
      tx,
      memberSeasonId,
        ms.seasonId,
        ms.user.id,
        ms.user.email,
        user.id,
        {
          status: "APPROVED",
          reviewedAt,
        decisionNotes: reason ?? null,
      },
    )

    const setupToken = await tx.passwordSetupToken.create({
      data: {
        userId: ms.user.id,
        expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000), // 72 hours
      },
    })

    return setupToken
  })

  // Send welcome email (outside transaction — non-critical)
  try {
    await sendPasswordSetupEmail(ms.user.email, token.token, ms.user.firstName)
  } catch (e) {
    console.error("[applicants:approve] Email send failed:", e)
    // Don't fail the approval if email fails
  }

  clearSeasonLookupCaches()
  clearCurrentUserCache(ms.user.id)
  return ok({ ok: true })
})
