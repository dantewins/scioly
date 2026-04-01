// app/api/admin/competitions/route.ts
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withPermission, ok, err } from "@/lib/api"
import { getActiveSeason } from "@/lib/db"

export const dynamic = "force-dynamic"

export const GET = withPermission("view_competitions", async (_req, _ctx, user) => {
  const season = await getActiveSeason(user.clubId)
  if (!season) return err("No active season.", 400)

  const competitions = await prisma.competition.findMany({
    where: { seasonId: season.id },
    include: {
      _count: { select: { teams: true, eventSchedules: true } },
    },
    orderBy: { startsAt: "asc" },
  })
  return ok(competitions)
})

const createSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(["PRACTICE", "INVITATIONAL", "REGIONAL", "STATE", "NATIONAL", "OTHER"]).default("OTHER"),
  location: z.string().max(200).optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().optional(),
  notes: z.string().max(1000).optional(),
  isPublished: z.boolean().default(false),
})

export const POST = withPermission("create_competitions", async (req, _ctx, user) => {
  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input.", 400)

  const season = await getActiveSeason(user.clubId)
  if (!season) return err("No active season.", 400)

  const competition = await prisma.competition.create({
    data: { seasonId: season.id, ...parsed.data },
  })
  return ok(competition, 201)
})
