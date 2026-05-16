// app/api/admin/events/route.ts
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withAnyPermission, withPermission, ok, err } from "@/lib/api"
import { getActiveSeason } from "@/lib/db"
import { syncCompetitionEventsForSeason } from "@/lib/competition-event-sync"
import { formatZodError } from "@/lib/zod-errors"

export const dynamic = "force-dynamic"

export const GET = withPermission("view_events", async (_req, _ctx, user) => {
  const season = await getActiveSeason(user.clubId)
  if (!season) return err("No active season.", 400)

  const events = await prisma.event.findMany({
    where: { seasonId: season.id },
    include: {
      _count: { select: { enrollments: true } },
    },
    orderBy: { sortOrder: "asc" },
  })
  return ok(events)
})

const createSchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().max(10).optional(),
  description: z.string().max(500).optional(),
  minParticipants: z.number().int().min(1).default(2),
  maxParticipants: z.number().int().min(1).default(2),
  isTrialEvent: z.boolean().default(false),
  sortOrder: z.number().int().optional(),
})

export const POST = withAnyPermission(["create_events", "edit_events"], async (req, _ctx, user) => {
  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return err(formatZodError(parsed.error), 400)

  const season = await getActiveSeason(user.clubId)
  if (!season) return err("No active season.", 400)

  const existing = await prisma.event.findUnique({
    where: { seasonId_name: { seasonId: season.id, name: parsed.data.name } },
  })
  if (existing) return err("An event with this name already exists.", 409)

  const event = await prisma.$transaction(async (tx) => {
    const created = await tx.event.create({
      data: { seasonId: season.id, ...parsed.data },
    })

    await syncCompetitionEventsForSeason(season.id, tx)
    return created
  })

  return ok(event, 201)
})
