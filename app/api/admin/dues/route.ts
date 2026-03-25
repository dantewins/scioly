import { InvoiceStatus, PaymentMethod } from "@prisma/client"
import type { User } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { withAdminAuth, ok, err } from "@/lib/api"
import { getActiveSeason } from "@/lib/db"

export const dynamic = "force-dynamic"

export const GET = withAdminAuth(
  async (request: Request, _ctx: unknown, currentUser: User) => {
    const { searchParams } = new URL(request.url)
    const memberSeasonId = searchParams.get("memberSeasonId")?.trim()

    if (!memberSeasonId) {
      return err("memberSeasonId is required.", 400)
    }

    const activeSeason = await getActiveSeason(currentUser.clubId)
    if (!activeSeason) return ok([])

    const invoices = await prisma.duesInvoice.findMany({
      where: { memberSeasonId },
      include: {
        payments: {
          include: {
            recordedBy: { select: { firstName: true, lastName: true } },
          },
          orderBy: { paidAt: "desc" },
        },
      },
      orderBy: { issuedAt: "desc" },
    })

    return ok(invoices)
  },
  "fetch invoices"
)

export const POST = withAdminAuth(
  async (request: Request, _ctx: unknown, currentUser: User) => {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get("action") ?? "invoice"

    const body = await request.json() as Record<string, unknown>

    const activeSeason = await getActiveSeason(currentUser.clubId)
    if (!activeSeason) return err("No active season.", 400)

    if (action === "invoice") {
      const { memberSeasonId, title, description, amountCents, dueAt } = body as {
        memberSeasonId: string
        title: string
        description?: string
        amountCents: number
        dueAt?: string
      }

      if (!memberSeasonId || !title || amountCents == null) {
        return err("Missing required fields.", 400)
      }

      const invoice = await prisma.duesInvoice.create({
        data: {
          seasonId: activeSeason.id,
          memberSeasonId,
          title,
          description,
          amountCents,
          dueAt: dueAt ? new Date(dueAt) : undefined,
        },
      })

      return ok(invoice, 201)
    }

    if (action === "payment") {
      const { invoiceId, memberSeasonId, amountCents, method, referenceNumber, receiptUrl, notes, paidAt } = body as {
        invoiceId: string
        memberSeasonId: string
        amountCents: number
        method?: PaymentMethod
        referenceNumber?: string
        receiptUrl?: string
        notes?: string
        paidAt?: string
      }

      if (!invoiceId || !memberSeasonId || amountCents == null) {
        return err("Missing required fields.", 400)
      }

      const invoice = await prisma.duesInvoice.findUnique({ where: { id: invoiceId } })
      if (!invoice) return err("Invoice not found.", 404)

      const newPaid = invoice.amountPaidCents + amountCents
      const newStatus =
        newPaid >= invoice.amountCents
          ? InvoiceStatus.PAID
          : InvoiceStatus.PARTIALLY_PAID

      const [payment] = await prisma.$transaction([
        prisma.paymentRecord.create({
          data: {
            invoiceId,
            memberSeasonId,
            amountCents,
            method: method ?? PaymentMethod.OTHER,
            referenceNumber,
            receiptUrl,
            notes,
            paidAt: paidAt ? new Date(paidAt) : new Date(),
            recordedById: currentUser.id,
          },
        }),
        prisma.duesInvoice.update({
          where: { id: invoiceId },
          data: {
            amountPaidCents: newPaid,
            status: newStatus,
            ...(newStatus === InvoiceStatus.PAID && { paidAt: new Date() }),
          },
        }),
      ])

      return ok(payment, 201)
    }

    return err("Invalid action.", 400)
  },
  "create invoice or payment"
)

export const PATCH = withAdminAuth(
  async (request: Request, _ctx: unknown, _currentUser: User) => {
    const body = await request.json() as {
      id: string
      title?: string
      description?: string
      amountCents?: number
      dueAt?: string | null
      status?: InvoiceStatus
      notes?: string
    }

    const { id } = body
    if (!id) return err("id is required.", 400)

    const existing = await prisma.duesInvoice.findUnique({ where: { id } })
    if (!existing) return err("Invoice not found.", 404)

    await prisma.duesInvoice.update({
      where: { id },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.amountCents !== undefined && { amountCents: body.amountCents }),
        ...(body.dueAt !== undefined && { dueAt: body.dueAt ? new Date(body.dueAt) : null }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.notes !== undefined && { notes: body.notes }),
      },
    })

    return ok({ success: true })
  },
  "update invoice"
)

export const DELETE = withAdminAuth(
  async (request: Request, _ctx: unknown, _currentUser: User) => {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")?.trim()

    if (!id) return err("id is required.", 400)

    const existing = await prisma.duesInvoice.findUnique({ where: { id } })
    if (!existing) return err("Invoice not found.", 404)

    await prisma.duesInvoice.delete({ where: { id } })

    return ok({ success: true })
  },
  "delete invoice"
)
