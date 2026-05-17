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
    const body = await req.json().catch(() => null)
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
  async (req, ctx: { params: Promise<{ id: string }> }, user) => {
    const { id } = await ctx.params
    const form = await prisma.formType.findFirst({
      where: { id, season: { clubId: user.clubId } },
      include: { _count: { select: { submissions: true } } },
    })
    if (!form) return err("Form type not found.", 404)

    // Block accidental deletes of forms that members have already submitted
    // to (medical waivers, code-of-conduct, etc. would cascade-delete to
    // empty). Admins can force-delete with ?force=1.
    const url = new URL(req.url)
    const force = url.searchParams.get("force") === "1"
    if (form._count.submissions > 0 && !force) {
      return err(
        `${form._count.submissions} member submission${form._count.submissions === 1 ? "" : "s"} would be deleted. Pass ?force=1 to confirm.`,
        409,
      )
    }

    await prisma.formType.delete({ where: { id } })
    return ok({ ok: true })
  },
)
