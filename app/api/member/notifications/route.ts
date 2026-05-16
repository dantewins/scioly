import { prisma } from "@/lib/prisma"
import { withActiveMemberAuth, ok } from "@/lib/api"
import { getMemberNotifications } from "@/lib/notifications"

export const dynamic = "force-dynamic"

export const GET = withActiveMemberAuth(async (_req, _ctx, user) => {
  const result = await getMemberNotifications(user.id, user.clubId)
  return ok(result)
})

// POST — mark all current notifications as read by bumping the user's
// notificationsLastReadAt to now.
export const POST = withActiveMemberAuth(async (_req, _ctx, user) => {
  await prisma.user.update({
    where: { id: user.id },
    data: { notificationsLastReadAt: new Date() },
  })
  return ok({ ok: true })
})
