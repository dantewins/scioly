import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"

import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const body = await request.json() as { token?: string; password?: string }
    const { token, password } = body

    if (!token || !password) {
      return NextResponse.json({ message: "Token and password are required." }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ message: "Password must be at least 8 characters." }, { status: 400 })
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const now = new Date()

    const result = await prisma.$transaction(async (tx) => {
      const setupToken = await tx.passwordSetupToken.findUnique({
        where: { token },
        select: { id: true, userId: true, usedAt: true, expiresAt: true },
      })

      if (!setupToken) return "INVALID" as const
      if (setupToken.usedAt) return "USED" as const
      if (setupToken.expiresAt < now) return "EXPIRED" as const

      const claimed = await tx.passwordSetupToken.updateMany({
        where: {
          id: setupToken.id,
          usedAt: null,
          expiresAt: { gt: now },
        },
        data: { usedAt: now },
      })

      if (claimed.count !== 1) return "USED" as const

      await tx.user.update({
        where: { id: setupToken.userId },
        data: { passwordHash },
      })

      return "OK" as const
    })

    if (result === "INVALID") {
      return NextResponse.json({ message: "Invalid or expired link." }, { status: 400 })
    }
    if (result === "USED") {
      return NextResponse.json({ message: "This link has already been used." }, { status: 400 })
    }
    if (result === "EXPIRED") {
      return NextResponse.json({ message: "This link has expired. Please contact an admin." }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to set password:", error)
    return NextResponse.json({ message: "Failed to set password." }, { status: 500 })
  }
}
