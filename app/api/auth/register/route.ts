// app/api/auth/register/route.ts
import bcrypt from "bcryptjs"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { signSession } from "@/lib/auth"
import { setSessionCookie } from "@/lib/cookies"
import { err, ok } from "@/lib/api"
import { isEmailAllowedForDomains, normalizeDomain } from "@/lib/email-domains"
import { syncPrimaryClubDomain } from "@/lib/db"
import {
  adminPermissions,
  boardMemberPermissions,
  memberPermissions,
} from "@/lib/permissions"
import { buildRateLimitKey, rateLimitErrorMessage, takeRateLimit } from "@/lib/rate-limit"

export const dynamic = "force-dynamic"

const schema = z.object({
  clubName: z.string().min(2).max(100),
  schoolName: z.string().min(2).max(100).optional(),
  schoolDomain: z
    .string()
    .regex(/^[a-z0-9]+([\-\.][a-z0-9]+)*\.[a-z]{2,}$/, "Invalid domain format")
    .toLowerCase(),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  email: z.email(),
  password: z.string().min(8),
})

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60)
}

export async function POST(req: Request) {
  try {
    const ipLimiter = await takeRateLimit(buildRateLimitKey("auth:register:ip", req), 10, 60 * 60_000)
    if (!ipLimiter.allowed) {
      return err(rateLimitErrorMessage("registration", ipLimiter.retryAfterMs), 429)
    }

    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return err(parsed.error.issues[0]?.message ?? "Invalid input.", 400)
    }

    const { clubName, schoolName, schoolDomain, firstName, lastName, password } =
      parsed.data
    const email = parsed.data.email.trim().toLowerCase()
    const normalizedDomain = normalizeDomain(schoolDomain)
    if (!isEmailAllowedForDomains(email, [normalizedDomain])) {
      return err(`Email must end in @${normalizedDomain}.`, 400)
    }

    // Check email not already registered
    const existing = await prisma.user.findFirst({
      where: {
        email: {
          equals: email,
          mode: "insensitive",
        },
      },
    })
    if (existing) return err("An account with this email already exists.", 409)

    const passwordHash = await bcrypt.hash(password, 12)

    // Generate a unique slug
    const baseSlug = toSlug(clubName)
    let slug = baseSlug
    let attempt = 0
    while (await prisma.club.findUnique({ where: { slug } })) {
      attempt++
      slug = `${baseSlug}-${attempt}`
    }

    const result = await prisma.$transaction(async (tx) => {
      const club = await tx.club.create({
        data: {
          name: clubName,
          slug,
          schoolName,
          schoolDomain: normalizedDomain,
        },
      })

      const user = await tx.user.create({
        data: {
          clubId: club.id,
          email,
          passwordHash,
          role: "WEBSITE_OWNER",
          firstName,
          lastName,
        },
      })

      // Create default club roles
      await tx.clubRole.createMany({
        data: [
          {
            clubId: club.id,
            name: "Admin",
            description: "Full access to all club management features.",
            permissions: adminPermissions(),
          },
          {
            clubId: club.id,
            name: "Board Member",
            description: "Can view, create, and edit most content. Cannot delete.",
            permissions: boardMemberPermissions(),
          },
          {
            clubId: club.id,
            name: "Member",
            description: "View access plus ability to submit hours and attempt practice assessments.",
            permissions: memberPermissions(),
          },
        ],
      })

      return { club, user }
    })

    await syncPrimaryClubDomain(result.club.id, normalizedDomain, {
      label: schoolName ?? "Primary school domain",
    })

    const token = await signSession({ sub: result.user.id })
    const response = ok({ ok: true, clubSlug: result.club.slug })
    setSessionCookie(token, response)
    return response
  } catch (e) {
    console.error("[register]", e)
    return err("Registration failed.", 500)
  }
}
