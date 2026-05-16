// app/api/admin/forms/[id]/route.ts
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withPermission, ok, err } from "@/lib/api"
import { formatZodError } from "@/lib/zod-errors"

export const dynamic = "force-dynamic"

const patchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  category: z.enum(["WAIVER", "MEDICAL", "PERMISSION", "CODE_OF_CONDUCT", "TRAVEL", "PHOTO_RELEASE", "CLUB_CONTRACT", "OTHER"]).optional(),
  description: z.string().max(500).optional(),
  isRequired: z.boolean().optional(),
  requiresUpload: z.boolean().optional(),
  dueAt: z.string().datetime().nullable().optional(),
})

export const PATCH = withPermission(
  "edit_forms",
  async (req, ctx: { params: Promise<{ id: string }> }, user) => {
    const { id } = await ctx.params
    const body = await req.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) return err(formatZodError(parsed.error), 400)

    const form = await prisma.formType.findFirst({
      where: { id, season: { clubId: user.clubId } },
    })
    if (!form) return err("Form type not found.", 404)

    const updated = await prisma.formType.update({ where: { id }, data: parsed.data })
    return ok(updated)
  },
)

export const DELETE = withPermission(
  "delete_forms",
  async (_req, ctx: { params: Promise<{ id: string }> }, user) => {
    const { id } = await ctx.params
    const form = await prisma.formType.findFirst({
      where: { id, season: { clubId: user.clubId } },
    })
    if (!form) return err("Form type not found.", 404)

    await prisma.formType.delete({ where: { id } })
    return ok({ ok: true })
  },
)
