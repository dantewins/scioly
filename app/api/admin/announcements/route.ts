import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withActiveMemberAuth, withPermission, ok, err } from "@/lib/api"
import { getActiveSeason } from "@/lib/db"
import { logActivity } from "@/lib/activity"
import { canEdit } from "@/lib/permissions"

export const dynamic = "force-dynamic"

// Members + admins read; only managers post.
// Pass ?scope=all to fetch unpublished + expired too (admin only).
export const GET = withActiveMemberAuth(async (req, _ctx, user) => {
  const season = await getActiveSeason(user.clubId)
  if (!season) return ok([])

  const url = new URL(req.url)
  const wantAll = url.searchParams.get("scope") === "all"
  const isManager = canEdit(user.permissions, "club_settings")

  const now = new Date()
  const announcements = await prisma.announcement.findMany({
    where: {
      seasonId: season.id,
      ...(wantAll && isManager
        ? {}
        : {
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
            publishedAt: { not: null, lte: now },
          }),
    },
    select: {
      id: true,
      title: true,
      body: true,
      isPinned: true,
      publishedAt: true,
      expiresAt: true,
      createdAt: true,
      createdById: true,
    },
    orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }, { createdAt: "desc" }],
    take: 50,
  })
  return ok(announcements)
})

const createSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(4000),
  isPinned: z.boolean().optional(),
  // null = save as draft (no publishedAt). Omitted = publish now. ISO = schedule.
  publishedAt: z.string().datetime().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
})

export const POST = withPermission("edit_club_settings", async (req, _ctx, user) => {
  const body = await req.json().catch(() => null)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input.", 400)

  const season = await getActiveSeason(user.clubId)
  if (!season) return err("No active season.", 400)

  const publishedAt =
    parsed.data.publishedAt === null
      ? null
      : parsed.data.publishedAt
        ? new Date(parsed.data.publishedAt)
        : new Date()

  const announcement = await prisma.announcement.create({
    data: {
      seasonId: season.id,
      title: parsed.data.title,
      body: parsed.data.body,
      isPinned: parsed.data.isPinned ?? false,
      publishedAt,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
      createdById: user.id,
    },
  })

  await logActivity({
    clubId: user.clubId,
    actorId: user.id,
    entityType: "Announcement",
    entityId: announcement.id,
    action: "create",
    metadata: { title: announcement.title },
  })

  return ok(announcement, 201)
})
