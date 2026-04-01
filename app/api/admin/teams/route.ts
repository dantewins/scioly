// app/api/admin/teams/route.ts
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withPermission, ok, err } from "@/lib/api"
import { getActiveSeason } from "@/lib/db"

export const dynamic = "force-dynamic"

export const GET = withPermission("view_teams", async (req, _ctx, user) => {
  const season = await getActiveSeason(user.clubId)
  if (!season) return err("No active season.", 400)

  const url = new URL(req.url)
  const competitionId = url.searchParams.get("competition") ?? undefined
  const eventId = url.searchParams.get("event") ?? undefined

  const teams = await prisma.team.findMany({
    where: {
      seasonId: season.id,
      ...(competitionId && { competitionId }),
      ...(eventId && { eventId }),
    },
    include: {
      competition: { select: { id: true, name: true } },
      event: { select: { id: true, name: true, code: true } },
      assignments: {
        include: {
          memberSeason: {
            include: { user: { select: { id: true, firstName: true, lastName: true } } },
          },
        },
      },
    },
    orderBy: { label: "asc" },
  })
  return ok(teams)
})

const createSchema = z.object({
  label: z.string().min(1).max(50),
  competitionId: z.string().optional(),
  eventId: z.string().optional(),
  memberLimit: z.number().int().min(1).optional(),
  notes: z.string().max(500).optional(),
})

export const POST = withPermission("create_teams", async (req, _ctx, user) => {
  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input.", 400)

  const season = await getActiveSeason(user.clubId)
  if (!season) return err("No active season.", 400)

  const team = await prisma.team.create({
    data: { seasonId: season.id, ...parsed.data },
  })
  return ok(team, 201)
})
