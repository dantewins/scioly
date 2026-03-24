import type { User } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { withAdminAuth, ok } from "@/lib/api"
import { getActiveSeason } from "@/lib/db"

export const dynamic = "force-dynamic"

export const GET = withAdminAuth(
  async (_request: Request, _ctx: unknown, currentUser: User) => {
    const activeSeason = await getActiveSeason(currentUser.clubId)
    if (!activeSeason) return ok([])

    const categories = await prisma.hourCategory.findMany({
      where: { seasonId: activeSeason.id },
      select: { id: true, name: true, requiresApproval: true },
      orderBy: { name: "asc" },
    })

    return ok(categories)
  },
  "fetch hour categories"
)
