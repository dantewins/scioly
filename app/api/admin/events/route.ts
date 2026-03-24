import type { User } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { withAdminAuth, ok, err } from "@/lib/api"
import { getActiveSeason } from "@/lib/db"

export const dynamic = "force-dynamic"

export const GET = withAdminAuth(
  async (_request: Request, _ctx: unknown, currentUser: User) => {
    const activeSeason = await getActiveSeason(currentUser.clubId)
    if (!activeSeason) return ok([])

    const events = await prisma.event.findMany({
      where: { seasonId: activeSeason.id },
      select: {
        id: true,
        code: true,
        name: true,
        minParticipants: true,
        maxParticipants: true,
        isTrialEvent: true,
        sortOrder: true,
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    })

    return ok(events)
  },
  "fetch events"
)

export const POST = withAdminAuth(
  async (request: Request, _ctx: unknown, currentUser: User) => {
    const activeSeason = await getActiveSeason(currentUser.clubId)
    if (!activeSeason) return err("No active season.", 400)

    const body = await request.json() as {
      action: "create" | "edit" | "delete"
      id?: string
      name?: string
      code?: string
      minParticipants?: number
      maxParticipants?: number
      isTrialEvent?: boolean
      sortOrder?: number
    }

    const { action } = body

    if (action === "create") {
      const { name, code, minParticipants, maxParticipants, isTrialEvent, sortOrder } = body
      if (!name?.trim()) return err("Name is required.", 400)
      if (!maxParticipants || maxParticipants < 1) return err("Max participants is required.", 400)

      const event = await prisma.event.create({
        data: {
          seasonId: activeSeason.id,
          name: name.trim(),
          code: code?.trim() || null,
          minParticipants: minParticipants ?? 1,
          maxParticipants,
          isTrialEvent: isTrialEvent ?? false,
          sortOrder: sortOrder ?? null,
        },
        select: { id: true, name: true },
      })

      return ok({ success: true, id: event.id, name: event.name })
    }

    if (action === "edit") {
      const { id, name, code, minParticipants, maxParticipants, isTrialEvent, sortOrder } = body
      if (!id) return err("Missing id.", 400)
      if (!name?.trim()) return err("Name is required.", 400)

      await prisma.event.update({
        where: { id },
        data: {
          name: name.trim(),
          code: code?.trim() || null,
          minParticipants: minParticipants ?? 1,
          maxParticipants: maxParticipants ?? 2,
          isTrialEvent: isTrialEvent ?? false,
          sortOrder: sortOrder ?? null,
        },
      })

      return ok({ success: true })
    }

    if (action === "delete") {
      const { id } = body
      if (!id) return err("Missing id.", 400)

      await prisma.event.delete({ where: { id } })
      return ok({ success: true })
    }

    return err("Invalid action.", 400)
  },
  "manage events"
)
