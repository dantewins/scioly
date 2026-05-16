import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withPermission, ok, err } from "@/lib/api"
import { logActivity } from "@/lib/activity"
import { formatZodError } from "@/lib/zod-errors"

export const dynamic = "force-dynamic"

const patchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  body: z.string().min(1).max(4000).optional(),
  isPinned: z.boolean().optional(),
  // publishedAt: null unpublishes; ISO string republishes at that time;
  // omitting the field leaves it unchanged.
  publishedAt: z.string().datetime().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
})

export const PATCH = withPermission(
  "edit_club_settings",
  async (req, ctx: { params: Promise<{ id: string }> }, user) => {
    const { id } = await ctx.params
    const body = await req.json().catch(() => null)
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) return err(formatZodError(parsed.error), 400)

    const existing = await prisma.announcement.findFirst({
      where: { id, season: { clubId: user.clubId } },
      select: { id: true, title: true },
    })
    if (!existing) return err("Announcement not found.", 404)

    const data: Record<string, unknown> = {}
    if (parsed.data.title !== undefined) data.title = parsed.data.title
    if (parsed.data.body !== undefined) data.body = parsed.data.body
    if (parsed.data.isPinned !== undefined) data.isPinned = parsed.data.isPinned
    if (parsed.data.publishedAt !== undefined) {
      data.publishedAt = parsed.data.publishedAt ? new Date(parsed.data.publishedAt) : null
    }
    if (parsed.data.expiresAt !== undefined) {
      data.expiresAt = parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null
    }

    const updated = await prisma.announcement.update({
      where: { id },
      data,
    })

    await logActivity({
      clubId: user.clubId,
      actorId: user.id,
      entityType: "Announcement",
      entityId: id,
      action: "update",
      metadata: { fields: Object.keys(data) },
    })

    return ok(updated)
  },
)

export const DELETE = withPermission(
  "edit_club_settings",
  async (_req, ctx: { params: Promise<{ id: string }> }, user) => {
    const { id } = await ctx.params

    const existing = await prisma.announcement.findFirst({
      where: { id, season: { clubId: user.clubId } },
      select: { id: true, title: true },
    })
    if (!existing) return err("Announcement not found.", 404)

    await prisma.announcement.delete({ where: { id } })

    await logActivity({
      clubId: user.clubId,
      actorId: user.id,
      entityType: "Announcement",
      entityId: id,
      action: "delete",
      metadata: { title: existing.title },
    })

    return ok({ ok: true })
  },
)
