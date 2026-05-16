// app/api/admin/seasons/route.ts
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withPermission, ok, err } from "@/lib/api"
import { formatZodError } from "@/lib/zod-errors"

export const dynamic = "force-dynamic"

export const GET = withPermission("view_club_settings", async (_req, _ctx, user) => {
  const seasons = await prisma.season.findMany({
    where: { clubId: user.clubId },
    orderBy: { startsAt: "desc" },
    select: {
      id: true, name: true, schoolYear: true,
      startsAt: true, endsAt: true, isActive: true, createdAt: true,
      _count: { select: { members: true } },
    },
  })
  return ok(seasons)
})

const createSchema = z.object({
  name: z.string().min(1).max(100),
  schoolYear: z.string().regex(/^\d{4}-\d{4}$/, "Use format YYYY-YYYY"),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
})

export const POST = withPermission("edit_club_settings", async (req, _ctx, user) => {
  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return err(formatZodError(parsed.error), 400)

  const existing = await prisma.season.findUnique({
    where: { clubId_schoolYear: { clubId: user.clubId, schoolYear: parsed.data.schoolYear } },
  })
  if (existing) return err("A season for this school year already exists.", 409)

  const season = await prisma.season.create({
    data: { clubId: user.clubId, ...parsed.data, isActive: false },
  })
  return ok(season, 201)
})
