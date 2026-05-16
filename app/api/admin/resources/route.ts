import { z } from "zod"
import { ResourceType } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { withPermission, ok, err } from "@/lib/api"
import { getActiveSeason } from "@/lib/db"
import { logActivity } from "@/lib/activity"

export const dynamic = "force-dynamic"

// GET — list all resources for the active season. Optional eventId filter.
export const GET = withPermission("view_practice", async (req, _ctx, user) => {
  const season = await getActiveSeason(user.clubId)
  if (!season) return ok([])

  const url = new URL(req.url)
  const eventId = url.searchParams.get("eventId") ?? undefined
  const competitionId = url.searchParams.get("competitionId") ?? undefined

  const resources = await prisma.resource.findMany({
    where: {
      seasonId: season.id,
      ...(eventId ? { eventId } : {}),
      ...(competitionId ? { competitionId } : {}),
    },
    select: {
      id: true,
      title: true,
      description: true,
      type: true,
      url: true,
      eventId: true,
      competitionId: true,
      seasonRosterId: true,
      competitionRosterId: true,
      uploadedById: true,
      createdAt: true,
      updatedAt: true,
      event: { select: { id: true, name: true, code: true } },
      competition: { select: { id: true, name: true } },
    },
    orderBy: [{ eventId: "asc" }, { createdAt: "desc" }],
  })

  return ok(resources)
})

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  type: z.nativeEnum(ResourceType),
  url: z.string().url().max(2000),
  eventId: z.string().nullable().optional(),
  competitionId: z.string().nullable().optional(),
  seasonRosterId: z.string().nullable().optional(),
  competitionRosterId: z.string().nullable().optional(),
})

export const POST = withPermission("edit_practice", async (req, _ctx, user) => {
  const season = await getActiveSeason(user.clubId)
  if (!season) return err("No active season.", 400)

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    const fieldPath = issue?.path && issue.path.length > 0 ? issue.path.join(".") + ": " : ""
    return err(`${fieldPath}${issue?.message ?? "Invalid input."}`, 400)
  }

  // Verify event/competition belong to this club + season.
  if (parsed.data.eventId) {
    const event = await prisma.event.findFirst({
      where: { id: parsed.data.eventId, seasonId: season.id },
      select: { id: true },
    })
    if (!event) return err("Event not found.", 404)
  }
  if (parsed.data.competitionId) {
    const comp = await prisma.competition.findFirst({
      where: { id: parsed.data.competitionId, seasonId: season.id },
      select: { id: true },
    })
    if (!comp) return err("Competition not found.", 404)
  }

  const resource = await prisma.resource.create({
    data: {
      seasonId: season.id,
      title: parsed.data.title.trim(),
      description: parsed.data.description?.trim() || null,
      type: parsed.data.type,
      url: parsed.data.url.trim(),
      eventId: parsed.data.eventId ?? null,
      competitionId: parsed.data.competitionId ?? null,
      seasonRosterId: parsed.data.seasonRosterId ?? null,
      competitionRosterId: parsed.data.competitionRosterId ?? null,
      uploadedById: user.id,
    },
  })

  await logActivity({
    clubId: user.clubId,
    actorId: user.id,
    entityType: "Resource",
    entityId: resource.id,
    action: "create",
    metadata: { title: resource.title, type: resource.type },
  })

  return ok(resource, 201)
})
