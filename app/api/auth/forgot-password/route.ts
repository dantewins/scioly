import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { sendPasswordResetEmail } from "@/lib/email"
import { buildRateLimitKey, rateLimitErrorMessage, takeRateLimit } from "@/lib/rate-limit"

export const dynamic = "force-dynamic"

const schema = z.object({
  email: z.email(),
})

// One-hour token TTL on reset (shorter than the 72-hour onboarding token).
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000

export async function POST(req: Request) {
  try {
    // Per-IP and per-email rate limits to prevent enumeration + abuse.
    const ipLimiter = await takeRateLimit(
      buildRateLimitKey("auth:forgot-password:ip", req),
      20,
      60_000,
    )
    if (!ipLimiter.allowed) {
      return NextResponse.json(
        { error: rateLimitErrorMessage("password reset", ipLimiter.retryAfterMs) },
        { status: 429 },
      )
    }

    const body = await req.json().catch(() => null)
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      // Keep error generic so the form doesn't leak whether an email is valid.
      return NextResponse.json({ ok: true })
    }

    const email = parsed.data.email.trim().toLowerCase()

    const emailLimiter = await takeRateLimit(
      buildRateLimitKey("auth:forgot-password:email", req, email),
      5,
      60 * 60_000,
    )
    if (!emailLimiter.allowed) {
      // Still return ok so timing doesn't differ from the success path.
      return NextResponse.json({ ok: true })
    }

    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { id: true, email: true, firstName: true },
    })

    // Always return ok — don't leak whether the email exists.
    if (!user) {
      return NextResponse.json({ ok: true })
    }

    const setupToken = await prisma.passwordSetupToken.create({
      data: {
        userId: user.id,
        expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      },
    })

    try {
      await sendPasswordResetEmail(user.email, setupToken.token, user.firstName)
    } catch (e) {
      console.error("[forgot-password] email send failed:", e)
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("[forgot-password]", e)
    // Don't surface the error to the client — same "ok" response.
    return NextResponse.json({ ok: true })
  }
}
