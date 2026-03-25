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

    const setupToken = await prisma.passwordSetupToken.findUnique({
      where: { token },
      include: { user: { select: { id: true } } },
    })

    if (!setupToken) {
      return NextResponse.json({ message: "Invalid or expired link." }, { status: 400 })
    }

    if (setupToken.usedAt) {
      return NextResponse.json({ message: "This link has already been used." }, { status: 400 })
    }

    if (setupToken.expiresAt < new Date()) {
      return NextResponse.json({ message: "This link has expired. Please contact an admin." }, { status: 400 })
    }

    const passwordHash = await bcrypt.hash(password, 12)

    await prisma.$transaction([
      prisma.user.update({
        where: { id: setupToken.userId },
        data: { passwordHash },
      }),
      prisma.passwordSetupToken.update({
        where: { id: setupToken.id },
        data: { usedAt: new Date() },
      }),
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to set password:", error)
    return NextResponse.json({ message: "Failed to set password." }, { status: 500 })
  }
}
