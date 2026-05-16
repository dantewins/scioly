// app/api/admin/competitions/route.ts
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withAnyPermission, withPermission, ok, err } from "@/lib/api"
import { getActiveSeason } from "@/lib/db"
import { syncCompetitionEventsForCompetition } from "@/lib/competition-event-sync"
import { formatZodError } from "@/lib/zod-errors"

export const dynamic = "force-dynamic"

export const GET = withPermission("view_competitions", async (_req, _ctx, user) => {
  const season = await getActiveSeason(user.clubId)
  if (!season) return err("No active season.", 400)

  const competitions = await prisma.competition.findMany({
    where: { seasonId: season.id },
    include: {
      _count: { select: { rosters: true, eventSchedules: true } },
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

export const POST = withAnyPermission(["create_competitions", "edit_competitions"], async (req, _ctx, user) => {
  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return err(formatZodError(parsed.error), 400)

  const season = await getActiveSeason(user.clubId)
  if (!season) return err("No active season.", 400)

  const competition = await prisma.$transaction(async (tx) => {
    const created = await tx.competition.create({
      data: { seasonId: season.id, ...parsed.data },
    })

    await syncCompetitionEventsForCompetition(created.id, tx)
    return created
  })

  return ok(competition, 201)
})
