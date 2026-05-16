// app/api/admin/dues/[id]/route.ts
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withPermission, ok, err } from "@/lib/api"
import { formatZodError } from "@/lib/zod-errors"

export const dynamic = "force-dynamic"

const patchSchema = z.object({
  status: z.enum(["DRAFT", "OPEN", "PARTIALLY_PAID", "PAID", "VOID", "OVERDUE"]).optional(),
  notes: z.string().max(500).optional(),
  dueAt: z.string().datetime().nullable().optional(),
})

export const PATCH = withPermission(
  "edit_finances",
  async (req, ctx: { params: Promise<{ id: string }> }, user) => {
    const { id } = await ctx.params
    const body = await req.json().catch(() => null)
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) return err(formatZodError(parsed.error), 400)

    const invoice = await prisma.duesInvoice.findFirst({
      where: { id, season: { clubId: user.clubId } },
    })
    if (!invoice) return err("Invoice not found.", 404)

    const updated = await prisma.duesInvoice.update({ where: { id }, data: parsed.data })
    return ok(updated)
  },
)
