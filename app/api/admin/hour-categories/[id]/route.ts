// app/api/admin/hour-categories/[id]/route.ts
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withPermission, ok, err } from "@/lib/api"
import { formatZodError } from "@/lib/zod-errors"

export const dynamic = "force-dynamic"

const patchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  requiredHours: z.number().min(0).max(999).nullable().optional(),
  maxHoursPerEntry: z.number().min(0.25).max(24).nullable().optional(),
  requiresApproval: z.boolean().optional(),
  proofInstructions: z.string().max(500).optional(),
})

export const PATCH = withPermission(
  "edit_hours",
  async (req, ctx: { params: Promise<{ id: string }> }, user) => {
    const { id } = await ctx.params
    const body = await req.json().catch(() => null)
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) return err(formatZodError(parsed.error), 400)

    const cat = await prisma.hourCategory.findFirst({
      where: { id, season: { clubId: user.clubId } },
    })
    if (!cat) return err("Category not found.", 404)

    const updated = await prisma.hourCategory.update({ where: { id }, data: parsed.data })
    return ok(updated)
  },
)

export const DELETE = withPermission(
  "delete_hours",
  async (_req, ctx: { params: Promise<{ id: string }> }, user) => {
    const { id } = await ctx.params
    const cat = await prisma.hourCategory.findFirst({
      where: { id, season: { clubId: user.clubId } },
    })
    if (!cat) return err("Category not found.", 404)

    // Check if any entries reference this category
    const entryCount = await prisma.hourEntry.count({ where: { categoryId: id } })
    if (entryCount > 0) {
      return err(`Cannot delete — ${entryCount} hour entries use this category.`, 409)
    }

    await prisma.hourCategory.delete({ where: { id } })
    return ok({ ok: true })
  },
)
