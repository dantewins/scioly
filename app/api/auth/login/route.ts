// app/api/auth/login/route.ts
import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { signSession } from "@/lib/auth"
import { setSessionCookie } from "@/lib/cookies"
import { err, ok } from "@/lib/api"

export const dynamic = "force-dynamic"

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return err("Invalid email or password.", 400)

    const { email, password } = parsed.data

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || !user.passwordHash) return err("Invalid email or password.", 401)

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) return err("Invalid email or password.", 401)

    // Domain enforcement — WEBSITE_OWNER bypasses
    if (user.role !== "WEBSITE_OWNER") {
      const club = await prisma.club.findUnique({
        where: { id: user.clubId },
        select: { schoolDomain: true },
      })
      if (club?.schoolDomain) {
        const emailDomain = email.split("@")[1]?.toLowerCase()
        if (emailDomain !== club.schoolDomain.toLowerCase()) {
          return err("Your email domain does not match this club's school domain.", 403)
        }
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
