// app/api/admin/seasons/[id]/route.ts
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withPermission, ok, err } from "@/lib/api"
import { clearCurrentUserCache } from "@/lib/auth"
import { clearSeasonLookupCaches } from "@/lib/db"
import { formatZodError } from "@/lib/zod-errors"

export const dynamic = "force-dynamic"

const patchSchema = z.object({ isActive: z.boolean() })

// PATCH: activate or deactivate a season (only one can be active at a time)
export const PATCH = withPermission(
  "edit_club_settings",
  async (req, ctx: { params: Promise<{ id: string }> }, user) => {
    const { id } = await ctx.params
    const body = await req.json().catch(() => null)
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) return err(formatZodError(parsed.error), 400)
    const { isActive } = parsed.data

    const season = await prisma.season.findFirst({
      where: { id, clubId: user.clubId },
    })
    if (!season) return err("Season not found.", 404)

    if (isActive) {
      // Deactivate all other seasons for this club, activate this one
      await prisma.$transaction([
        prisma.season.updateMany({
          where: { clubId: user.clubId, isActive: true },
          data: { isActive: false },
        }),
        prisma.season.update({ where: { id }, data: { isActive: true } }),
      ])
    } else {
      await prisma.season.update({ where: { id }, data: { isActive: false } })
    }

    clearSeasonLookupCaches()
    clearCurrentUserCache()
    return ok({ ok: true })
  },
)
