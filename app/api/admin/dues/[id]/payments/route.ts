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
          status: true,
          amountCents: true,
          amountPaidCents: true,
          season: { select: { clubId: true } },
        },
      })
      if (!invoice) return { error: "NOT_FOUND" as const }

      // Reject payments on closed-state invoices.
      if (invoice.status === "VOID") {
        return { error: "VOID" as const }
      }
      if (invoice.status === "PAID") {
        return { error: "ALREADY_PAID" as const }
      }

      // Cap payment at the outstanding balance — overpayments silently
      // ballooning amountPaidCents past amountCents was confusing.
      const outstanding = invoice.amountCents - invoice.amountPaidCents
      if (outstanding <= 0) {
        return { error: "NOTHING_OWED" as const }
      }
      if (parsed.data.amountCents > outstanding) {
        return { error: "OVERPAYMENT" as const, outstanding }
      }

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

    if ("error" in result) {
      if (result.error === "NOT_FOUND") return err("Invoice not found.", 404)
      if (result.error === "VOID") return err("Can't record a payment on a voided invoice.", 400)
      if (result.error === "ALREADY_PAID") return err("This invoice is already paid in full.", 400)
      if (result.error === "NOTHING_OWED") return err("This invoice has no outstanding balance.", 400)
      if (result.error === "OVERPAYMENT") {
        return err(
          `Payment exceeds outstanding balance. Maximum: $${(result.outstanding / 100).toFixed(2)}.`,
          400,
        )
      }
      return err("Could not record payment.", 400)
    }

    return ok({ ok: true, ...result })
  },
)
