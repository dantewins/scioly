import { z } from "zod"
import { ResourceType } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { withPermission, ok, err } from "@/lib/api"
import { logActivity } from "@/lib/activity"
import { formatZodError } from "@/lib/zod-errors"

export const dynamic = "force-dynamic"

const patchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  type: z.nativeEnum(ResourceType).optional(),
  url: z.string().url().max(2000).optional(),
  eventId: z.string().nullable().optional(),
  competitionId: z.string().nullable().optional(),
})

export const PATCH = withPermission(
  "edit_practice",
  async (req, ctx: { params: Promise<{ id: string }> }, user) => {
    const { id } = await ctx.params
    const existing = await prisma.resource.findFirst({
      where: { id, season: { clubId: user.clubId } },
      select: { id: true, title: true },
    })
    if (!existing) return err("Resource not found.", 404)

    const body = await req.json().catch(() => null)
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return err(formatZodError(parsed.error), 400)
    }

    const data: Record<string, unknown> = {}
    if (parsed.data.title !== undefined) data.title = parsed.data.title.trim()
    if (parsed.data.description !== undefined) {
      data.description = parsed.data.description?.trim() || null
    }
    if (parsed.data.type !== undefined) data.type = parsed.data.type
    if (parsed.data.url !== undefined) data.url = parsed.data.url.trim()
    if (parsed.data.eventId !== undefined) data.eventId = parsed.data.eventId
    if (parsed.data.competitionId !== undefined) data.competitionId = parsed.data.competitionId

    const updated = await prisma.resource.update({
      where: { id },
      data,
    })

    await logActivity({
      clubId: user.clubId,
      actorId: user.id,
      entityType: "Resource",
      entityId: id,
      action: "update",
      metadata: { fields: Object.keys(data) },
    })

    return ok(updated)
  },
)

export const DELETE = withPermission(
  "edit_practice",
  async (_req, ctx: { params: Promise<{ id: string }> }, user) => {
    const { id } = await ctx.params
    const existing = await prisma.resource.findFirst({
      where: { id, season: { clubId: user.clubId } },
      select: { id: true, title: true },
    })
    if (!existing) return err("Resource not found.", 404)

    await prisma.resource.delete({ where: { id } })

    await logActivity({
      clubId: user.clubId,
      actorId: user.id,
      entityType: "Resource",
      entityId: id,
      action: "delete",
      metadata: { title: existing.title },
    })

    return ok({ ok: true })
  },
)
