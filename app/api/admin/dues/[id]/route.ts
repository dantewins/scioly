// app/api/admin/dues/[id]/route.ts
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withPermission, ok, err } from "@/lib/api"
import { formatZodError } from "@/lib/zod-errors"

export const dynamic = "force-dynamic"

const patchSchema = z.object({
  // Admin-driven transitions only. PAID/PARTIALLY_PAID are derived from
  // PaymentRecords and can't be flipped via PATCH; OVERDUE is set by a
  // (future) scheduled task that compares dueAt to now.
  status: z.enum(["OPEN", "VOID"]).optional(),
  notes: z.string().max(500).optional(),
  dueAt: z.string().datetime().nullable().optional(),
})

const ALLOWED_TRANSITIONS: Record<string, readonly string[]> = {
  DRAFT: ["OPEN", "VOID"],
  OPEN: ["VOID"],
  PARTIALLY_PAID: ["VOID"],
  PAID: [],
  VOID: ["OPEN"],
  OVERDUE: ["VOID"],
}

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

    if (parsed.data.status && parsed.data.status !== invoice.status) {
      const allowed = ALLOWED_TRANSITIONS[invoice.status] ?? []
      if (!allowed.includes(parsed.data.status)) {
        return err(
          `Can't change status from ${invoice.status} to ${parsed.data.status}.`,
          400,
        )
      }
    }

    const updated = await prisma.duesInvoice.update({ where: { id }, data: parsed.data })
    return ok(updated)
  },
)
