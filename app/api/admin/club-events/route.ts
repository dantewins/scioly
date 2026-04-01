// app/api/admin/club-events/route.ts
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withPermission, ok, err } from "@/lib/api"
import { getActiveSeason } from "@/lib/db"

export const dynamic = "force-dynamic"

export const GET = withPermission("view_club_events", async (_req, _ctx, user) => {
  const season = await getActiveSeason(user.clubId)
  if (!season) return err("No active season.", 400)

  const events = await prisma.clubEvent.findMany({
    where: { seasonId: season.id },
    include: {
      category: { select: { id: true, name: true } },
      _count: { select: { attendance: true } },
    },
    orderBy: { startsAt: "asc" },
  })
  return ok(events)
})

const createSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(["MEETING", "SUPER_SATURDAY", "FUNDRAISER", "WORKSHOP", "FIELD_TRIP", "OTHER"]).default("OTHER"),
  location: z.string().max(200).optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().optional(),
  hoursValue: z.number().min(0).max(24).default(0),
  categoryId: z.string().optional(),
  notes: z.string().max(500).optional(),
})

export const POST = withPermission("create_club_events", async (req, _ctx, user) => {
  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid.", 400)

  const season = await getActiveSeason(user.clubId)
  if (!season) return err("No active season.", 400)

  const event = await prisma.clubEvent.create({
    data: { seasonId: season.id, ...parsed.data },
    include: {
      category: { select: { id: true, name: true } },
      _count: { select: { attendance: true } },
    },
  })
  return ok(event, 201)
})
