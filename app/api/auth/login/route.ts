// app/api/auth/login/route.ts
import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { signSession } from "@/lib/auth"
import { setSessionCookie } from "@/lib/cookies"
import { err, ok } from "@/lib/api"
import { isEmailAllowedForDomains } from "@/lib/email-domains"
import { getAllowedClubDomains } from "@/lib/db"
import { buildRateLimitKey, rateLimitErrorMessage, takeRateLimit } from "@/lib/rate-limit"

export const dynamic = "force-dynamic"

const schema = z.object({
  email: z.email(),
  password: z.string().min(1),
})

export async function POST(req: Request) {
  try {
    const ipLimiter = await takeRateLimit(buildRateLimitKey("auth:login:ip", req), 40, 60_000)
    if (!ipLimiter.allowed) return err(rateLimitErrorMessage("login", ipLimiter.retryAfterMs), 429)

    const body = await req.json().catch(() => null)
    const parsed = schema.safeParse(body)
    if (!parsed.success) return err("Invalid email or password.", 400)

    const { password } = parsed.data
    const email = parsed.data.email.trim().toLowerCase()

    const accountLimiter = await takeRateLimit(
      buildRateLimitKey("auth:login:account", req, email),
      12,
      5 * 60_000,
    )
    if (!accountLimiter.allowed) {
      return err(rateLimitErrorMessage("login", accountLimiter.retryAfterMs), 429)
    }

    const user = await prisma.user.findFirst({
      where: {
        email: {
          equals: email,
          mode: "insensitive",
        },
      },
    })
    if (!user || !user.passwordHash) return err("Invalid email or password.", 401)

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) return err("Invalid email or password.", 401)

    // Domain enforcement — WEBSITE_OWNER bypasses
    if (user.role !== "WEBSITE_OWNER") {
      const allowedDomains = await getAllowedClubDomains(user.clubId)
      if (!isEmailAllowedForDomains(email, allowedDomains)) {
        const domainLabel = allowedDomains[0] ?? "your school's domain"
        return err(`Your email domain does not match ${domainLabel}.`, 403)
      }
    }

    const token = await signSession({ sub: user.id })
    const response = ok({ ok: true }) as ReturnType<typeof NextResponse.json>
    setSessionCookie(token, response)
    return response
  } catch (e) {
    console.error("[login]", e)
    return err("Login failed.", 500)
  }
}
