// app/api/admin/roles/[roleId]/route.ts
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withPermission, ok, err } from "@/lib/api"
import { clearCurrentUserCache } from "@/lib/auth"
import { sanitizePermissionMap } from "@/lib/permissions"
import { formatZodError } from "@/lib/zod-errors"

export const dynamic = "force-dynamic"

const patchSchema = z.object({
  name: z.string().min(1).max(60).optional(),
  description: z.string().max(200).optional(),
  permissions: z.record(z.string(), z.boolean()).optional(),
})

export const PATCH = withPermission(
  "edit_roles",
  async (req, ctx: { params: Promise<{ roleId: string }> }, user) => {
    const { roleId } = await ctx.params
    const body = await req.json().catch(() => null)
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) return err(formatZodError(parsed.error), 400)

    const existing = await prisma.clubRole.findFirst({
      where: { id: roleId, clubId: user.clubId },
    })
    if (!existing) return err("Role not found.", 404)

    const role = await prisma.clubRole.update({
      where: { id: roleId },
      data: {
        ...parsed.data,
        ...(parsed.data.permissions !== undefined
          ? { permissions: sanitizePermissionMap(parsed.data.permissions) }
          : {}),
      },
    })
    clearCurrentUserCache()
    return ok(role)
  },
)

export const DELETE = withPermission(
  "delete_roles",
  async (_req, ctx: { params: Promise<{ roleId: string }> }, user) => {
    const { roleId } = await ctx.params

    const existing = await prisma.clubRole.findFirst({
      where: { id: roleId, clubId: user.clubId },
    })
    if (!existing) return err("Role not found.", 404)

    await prisma.clubRole.delete({ where: { id: roleId } })
    clearCurrentUserCache()
    return ok({ ok: true })
  },
)
