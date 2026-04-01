// app/api/public/club/[slug]/route.ts
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params

  const club = await prisma.club.findUnique({
    where: { slug },
    select: { id: true, name: true, schoolName: true, slug: true },
  })
  if (!club) {
    return NextResponse.json({ error: "Club not found." }, { status: 404 })
  }

  const season = await prisma.season.findFirst({
    where: { clubId: club.id, isActive: true },
    select: {
      id: true,
      name: true,
      schoolYear: true,
      events: {
        select: { id: true, name: true, code: true, isTrialEvent: true, sortOrder: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  })

  return NextResponse.json({ club, season })
}
