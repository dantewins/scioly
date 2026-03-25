import { HourEntryStatus } from "@prisma/client"
import type { User } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { withAdminAuth, ok, err } from "@/lib/api"
import { getActiveSeason } from "@/lib/db"

export const dynamic = "force-dynamic"

export const GET = withAdminAuth(
  async (request: Request, _ctx: unknown, currentUser: User) => {
    const { searchParams } = new URL(request.url)
    const memberSeasonId = searchParams.get("memberSeasonId")?.trim()

    if (!memberSeasonId) {
      return err("memberSeasonId is required.", 400)
    }

    const activeSeason = await getActiveSeason(currentUser.clubId)
    if (!activeSeason) return ok([])

    const entries = await prisma.hourEntry.findMany({
      where: { memberSeasonId },
      include: {
        category: { select: { id: true, name: true } },
        approvedBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { submittedAt: "desc" },
    })

    return ok(entries)
  },
  "fetch hour entries"
)

export const POST = withAdminAuth(
  async (request: Request, _ctx: unknown, currentUser: User) => {
    const body = await request.json() as {
      memberSeasonId: string
      categoryId: string
      title: string
      description?: string
      startsAt?: string
      endsAt?: string
      totalHours: number
      status?: HourEntryStatus
    }

    const { memberSeasonId, categoryId, title, totalHours } = body

    if (!memberSeasonId || !categoryId || !title || totalHours == null) {
      return err("Missing required fields.", 400)
    }

    const entry = await prisma.hourEntry.create({
      data: {
        memberSeasonId,
        categoryId,
        title,
        description: body.description,
        startsAt: body.startsAt ? new Date(body.startsAt) : undefined,
        endsAt: body.endsAt ? new Date(body.endsAt) : undefined,
        totalHours,
        status: body.status ?? HourEntryStatus.APPROVED,
        approvedById: body.status === HourEntryStatus.APPROVED || !body.status ? currentUser.id : undefined,
        approvedAt: body.status === HourEntryStatus.APPROVED || !body.status ? new Date() : undefined,
      },
      include: { category: { select: { id: true, name: true } } },
    })

    return ok(entry, 201)
  },
  "create hour entry"
)

export const PATCH = withAdminAuth(
  async (request: Request, _ctx: unknown, currentUser: User) => {
    const body = await request.json() as {
      id?: string
      action?: "approve" | "reject" | "edit" | "set-requirement"
      memberSeasonId?: string
      expectedHours?: number
      rejectionReason?: string
      title?: string
      description?: string
      categoryId?: string
      startsAt?: string
      endsAt?: string
      totalHours?: number
    }

    const { action } = body

    // Update expectedHours on MemberSeason
    if (action === "set-requirement") {
      const { memberSeasonId, expectedHours } = body
      if (!memberSeasonId) return err("memberSeasonId is required.", 400)

      await prisma.memberSeason.update({
        where: { id: memberSeasonId },
        data: { expectedHours: expectedHours ?? null },
      })

      return ok({ success: true })
    }

    const { id } = body
    if (!id) return err("id is required.", 400)

    const existing = await prisma.hourEntry.findUnique({ where: { id } })
    if (!existing) return err("Hour entry not found.", 404)

    if (action === "approve") {
      await prisma.hourEntry.update({
        where: { id },
        data: {
          status: HourEntryStatus.APPROVED,
          approvedById: currentUser.id,
          approvedAt: new Date(),
          rejectionReason: null,
        },
      })
      return ok({ success: true })
    }

    if (action === "reject") {
      await prisma.hourEntry.update({
        where: { id },
        data: {
          status: HourEntryStatus.REJECTED,
          rejectionReason: body.rejectionReason ?? null,
        },
      })
      return ok({ success: true })
    }

    // Default: edit entry fields
    await prisma.hourEntry.update({
      where: { id },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.categoryId !== undefined && { categoryId: body.categoryId }),
        ...(body.startsAt !== undefined && { startsAt: body.startsAt ? new Date(body.startsAt) : null }),
        ...(body.endsAt !== undefined && { endsAt: body.endsAt ? new Date(body.endsAt) : null }),
        ...(body.totalHours !== undefined && { totalHours: body.totalHours }),
      },
    })

    return ok({ success: true })
  },
  "update hour entry"
)

export const DELETE = withAdminAuth(
  async (request: Request, _ctx: unknown, _currentUser: User) => {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")?.trim()

    if (!id) return err("id is required.", 400)

    const existing = await prisma.hourEntry.findUnique({ where: { id } })
    if (!existing) return err("Hour entry not found.", 404)

    await prisma.hourEntry.delete({ where: { id } })

    return ok({ success: true })
  },
  "delete hour entry"
)
