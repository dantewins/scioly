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

const createSchema = z
  .object({
    name: z.string().min(1).max(100),
    type: z.enum(["PRACTICE", "INVITATIONAL", "REGIONAL", "STATE", "NATIONAL", "OTHER"]).default("OTHER"),
    location: z.string().max(200).optional(),
    division: z.enum(["B", "C", "OTHER"]).nullable().optional(),
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime().optional(),
    notes: z.string().max(1000).optional(),
    isPublished: z.boolean().default(false),
  })
  .refine(
    (d) => !d.endsAt || new Date(d.startsAt).getTime() <= new Date(d.endsAt).getTime(),
    { message: "Competition must end on or after it starts", path: ["endsAt"] },
  )

export const POST = withAnyPermission(["create_competitions", "edit_competitions"], async (req, _ctx, user) => {
  const body = await req.json().catch(() => null)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return err(formatZodError(parsed.error), 400)

  const season = await getActiveSeason(user.clubId)
  if (!season) return err("No active season.", 400)

  // Pre-check duplicate name so P2002 doesn't bubble to a 500.
  const existing = await prisma.competition.findFirst({
    where: { seasonId: season.id, name: parsed.data.name },
    select: { id: true },
  })
  if (existing) return err("A competition with this name already exists this season.", 409)

  const created = await prisma.competition.create({
    data: { seasonId: season.id, ...parsed.data },
  })

  // Out-of-transaction sync (same reason as events): avoids the 5s
  // interactive-transaction budget on populated seasons.
  try {
    await syncCompetitionEventsForCompetition(created.id)
  } catch (e) {
    console.error("[competitions:POST] schedule sync failed (competition was created):", e)
  }

  return ok(created, 201)
})
