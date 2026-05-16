// app/api/admin/dues/[id]/payments/route.ts
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withPermission, ok, err } from "@/lib/api"
import { formatZodError } from "@/lib/zod-errors"

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
    const body = await req.json().catch(() => null)
    const parsed = addPaymentSchema.safeParse(body)
    if (!parsed.success) return err(formatZodError(parsed.error), 400)

    const result = await prisma.$transaction(async (tx) => {
      const invoice = await tx.duesInvoice.findFirst({
        where: { id: invoiceId, season: { clubId: user.clubId } },
        select: {
          id: true,
          seasonId: true,
          memberSeasonId: true,
          title: true,
          paidAt: true,
          season: { select: { clubId: true } },
        },
      })
      if (!invoice) return null

      const payment = await tx.paymentRecord.create({
        data: {
          invoiceId,
          memberSeasonId: invoice.memberSeasonId,
          ...parsed.data,
          recordedById: user.id,
        },
        select: { id: true },
      })

      const updatedInvoice = await tx.duesInvoice.update({
        where: { id: invoiceId },
        data: { amountPaidCents: { increment: parsed.data.amountCents } },
        select: { amountCents: true, amountPaidCents: true },
      })

      const newStatus =
        updatedInvoice.amountPaidCents >= updatedInvoice.amountCents
          ? "PAID"
          : "PARTIALLY_PAID"

      await tx.duesInvoice.update({
        where: { id: invoiceId },
        data: {
          status: newStatus,
          ...(newStatus === "PAID" && !invoice.paidAt ? { paidAt: new Date() } : {}),
        },
      })

      const defaultAccount = await tx.financeAccount.findFirst({
        where: {
          clubId: invoice.season.clubId,
          OR: [{ seasonId: invoice.seasonId }, { seasonId: null }],
        },
        select: { id: true },
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      })

      await tx.financeEntry.create({
        data: {
          clubId: invoice.season.clubId,
          seasonId: invoice.seasonId,
          accountId: defaultAccount?.id ?? null,
          memberSeasonId: invoice.memberSeasonId,
          invoiceId,
          paymentRecordId: payment.id,
          recordedById: user.id,
          direction: "CREDIT",
          category: "DUES",
          amountCents: parsed.data.amountCents,
          title: `Payment: ${invoice.title}`,
          externalRef: parsed.data.referenceNumber ?? null,
          description: parsed.data.notes ?? null,
          occurredAt: new Date(),
        },
      })

      return { paymentId: payment.id, status: newStatus }
    })

    if (!result) return err("Invoice not found.", 404)

    return ok({ ok: true, ...result })
  },
)
