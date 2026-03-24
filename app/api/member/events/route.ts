import type { User } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { withMemberAuth, ok } from "@/lib/api"
import { getActiveSeason } from "@/lib/db"

export const dynamic = "force-dynamic"

// GET /api/member/events
// Returns events for the active season (for practice page filter)
export const GET = withMemberAuth(
  async (_request: Request, _ctx: unknown, currentUser: User) => {
    const activeSeason = await getActiveSeason(currentUser.clubId)
    if (!activeSeason) return ok([])

    const events = await prisma.event.findMany({
      where: { seasonId: activeSeason.id },
      select: { id: true, code: true, name: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    })

    return ok(events)
  },
  "fetch events"
)
