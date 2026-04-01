// app/api/admin/dues/[id]/payments/route.ts
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withPermission, ok, err } from "@/lib/api"

export const dynamic = "force-dynamic"

const addPaymentSchema = z.object({
  amountCents: z.number().int().min(1),
  method: z.enum(["CASH", "CHECK", "CARD", "ZELLE", "VENMO", "PAYPAL", "OTHER"]).default("OTHER"),
  referenceNumber: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
})

export const POST = withPermission(
  "edit_finances",
  async (req, ctx: { params: Promise<{ id: string }> }, user) => {
    const { id: invoiceId } = await ctx.params
    const body = await req.json()
    const parsed = addPaymentSchema.safeParse(body)
    if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid.", 400)

    const invoice = await prisma.duesInvoice.findFirst({
      where: { id: invoiceId, season: { clubId: user.clubId } },
    })
    if (!invoice) return err("Invoice not found.", 404)

    const newPaidCents = invoice.amountPaidCents + parsed.data.amountCents
    const newStatus = newPaidCents >= invoice.amountCents ? "PAID" : "PARTIALLY_PAID"

    await prisma.$transaction([
      prisma.paymentRecord.create({
        data: {
          invoiceId,
          memberSeasonId: invoice.memberSeasonId,
          ...parsed.data,
          recordedById: user.id,
        },
      }),
      prisma.duesInvoice.update({
        where: { id: invoiceId },
        data: {
          amountPaidCents: newPaidCents,
          status: newStatus,
          ...(newStatus === "PAID" && { paidAt: new Date() }),
        },
      }),
    ])

    return ok({ ok: true })
  },
)
