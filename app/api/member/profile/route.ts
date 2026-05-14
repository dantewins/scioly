// app/api/member/profile/route.ts
import bcrypt from "bcryptjs"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { clearCurrentUserCache } from "@/lib/auth"
import { withMemberAuth, ok, err, readJsonBody } from "@/lib/api"
import { buildRateLimitKey, rateLimitErrorMessage, takeRateLimit } from "@/lib/rate-limit"

export const dynamic = "force-dynamic"

const profileSchema = z.object({
  firstName: z.string().min(1).max(80).optional(),
  lastName: z.string().min(1).max(80).optional(),
  displayName: z
    .string()
    .max(80)
    .optional()
    .transform((value) => (value === undefined ? undefined : value.trim())),
})

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
})

// GET — return the authenticated member's profile + active-season summary
export const GET = withMemberAuth(async (_req, _ctx, user) => {
  const record = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      displayName: true,
      graduationYear: true,
      gradeLevel: true,
      seasonMemberships: {
        where: { season: { isActive: true, clubId: user.clubId } },
        orderBy: { season: { startsAt: "desc" } },
        take: 1,
        select: {
          id: true,
          membershipStatus: true,
          season: { select: { id: true, name: true, schoolYear: true } },
        },
      },
    },
  })

  if (!record) return err("User not found.", 404)

  const active = record.seasonMemberships[0] ?? null
  return ok({
    id: record.id,
    email: record.email,
    firstName: record.firstName,
    lastName: record.lastName,
    displayName: record.displayName,
    graduationYear: record.graduationYear,
    gradeLevel: record.gradeLevel,
    activeMembership: active
      ? {
          memberSeasonId: active.id,
          membershipStatus: active.membershipStatus,
          season: active.season,
        }
      : null,
  })
})

// PATCH — update display name, first name, last name
export const PATCH = withMemberAuth(async (req, _ctx, user) => {
  const body = await readJsonBody(req)
  const parsed = profileSchema.safeParse(body)
  if (!parsed.success) return err("Invalid input.", 400)

  const data: { firstName?: string; lastName?: string; displayName?: string | null } = {}
  if (parsed.data.firstName !== undefined) data.firstName = parsed.data.firstName.trim()
  if (parsed.data.lastName !== undefined) data.lastName = parsed.data.lastName.trim()
  if (parsed.data.displayName !== undefined) {
    data.displayName = parsed.data.displayName.length > 0 ? parsed.data.displayName : null
  }

  if (Object.keys(data).length === 0) return err("No changes provided.", 400)

  const updated = await prisma.user.update({
    where: { id: user.id },
    data,
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      displayName: true,
    },
  })

  clearCurrentUserCache(user.id)

  return ok(updated)
})

// POST — change password (requires the user's current password)
export const POST = withMemberAuth(async (req, _ctx, user) => {
  const limiter = await takeRateLimit(
    buildRateLimitKey("auth:change-password", req, user.id),
    8,
    5 * 60_000,
  )
  if (!limiter.allowed) {
    return err(rateLimitErrorMessage("password change", limiter.retryAfterMs), 429)
  }

  const body = await readJsonBody(req)
  const parsed = passwordSchema.safeParse(body)
  if (!parsed.success) {
    if (
      parsed.error.issues.some(
        (issue) => issue.path[0] === "newPassword" && issue.code === "too_small",
      )
    ) {
      return err("New password must be at least 8 characters.", 400)
    }
    return err("Invalid input.", 400)
  }

  const record = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, passwordHash: true },
  })
  if (!record || !record.passwordHash) {
    return err("No password is set on this account.", 400)
  }

  const valid = await bcrypt.compare(parsed.data.currentPassword, record.passwordHash)
  if (!valid) return err("Current password is incorrect.", 401)

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12)
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  })

  return ok({ ok: true })
})
