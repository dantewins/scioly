"use client"

import { useState } from "react"
import { toast } from "sonner"
import { IconPlus } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { apiCall } from "@/lib/api-client"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { InvoicesTable, type InvoiceRow } from "@/features/finances/components/invoices-table"
import { InvoiceForm } from "@/features/finances/components/invoice-form"
import { PaymentForm } from "@/features/finances/components/payment-form"

type Invoice = InvoiceRow

interface Member {
  id: string
  user: { id: string; firstName: string; lastName: string; email: string }
}

interface Props {
  invoices: Invoice[]
  members: Member[]
  canCreate: boolean
  canEdit: boolean
}

export function FinancesView({ invoices: initial, members, canCreate, canEdit }: Props) {
  const [invoices, setInvoices] = useState<Invoice[]>(initial)
  const [showCreate, setShowCreate] = useState(false)
  const [recordingFor, setRecordingFor] = useState<Invoice | null>(null)
  const [voidingId, setVoidingId] = useState<string | null>(null)
  const [voiding, setVoiding] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleCreateInvoice(form: {
    memberSeasonId: string
    title: string
    amountDollars: string
    dueAt: string
  }) {
    if (!form.memberSeasonId || !form.title || !form.amountDollars) {
      toast.error("Member, title, and amount are required."); return
    }
    const amountCents = Math.round(parseFloat(form.amountDollars) * 100)
    if (isNaN(amountCents) || amountCents < 1) { toast.error("Invalid amount."); return }
    setLoading(true)
    try {
      const data = await apiCall<Invoice>("/api/admin/dues", {
        method: "POST",
        body: JSON.stringify({
          memberSeasonId: form.memberSeasonId,
          title: form.title,
          amountCents,
          dueAt: form.dueAt ? new Date(form.dueAt).toISOString() : undefined,
        }),
      })
      const ms = members.find((m) => m.id === form.memberSeasonId)
      setInvoices((inv) => [{
        ...data,
        memberSeason: { id: form.memberSeasonId, user: ms?.user ?? { id: "", firstName: "", lastName: "", email: "" } },
        payments: [],
      }, ...inv])
      setShowCreate(false)
      toast.success("Invoice created.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create invoice.")
    } finally { setLoading(false) }
  }

  async function handleRecordPayment(form: {
    amountDollars: string
    method: string
    referenceNumber: string
  }) {
    if (!recordingFor || !form.amountDollars) { toast.error("Amount required."); return }
    const amountCents = Math.round(parseFloat(form.amountDollars) * 100)
    if (isNaN(amountCents) || amountCents < 1) { toast.error("Invalid amount."); return }
    setLoading(true)
    try {
      await apiCall(`/api/admin/dues/${recordingFor.id}/payments`, {
        method: "POST",
        body: JSON.stringify({
          amountCents,
          method: form.method,
          referenceNumber: form.referenceNumber || undefined,
        }),
      })
      const newPaid = recordingFor.amountPaidCents + amountCents
      const newStatus = newPaid >= recordingFor.amountCents ? "PAID" : "PARTIALLY_PAID"
      setInvoices((inv) =>
        inv.map((x) =>
          x.id === recordingFor.id
            ? { ...x, amountPaidCents: newPaid, status: newStatus }
            : x,
        ),
      )
      setRecordingFor(null)
      toast.success("Payment recorded.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to record payment.")
    } finally { setLoading(false) }
  }

  function handleVoid(invoiceId: string) {
    setVoidingId(invoiceId)
  }

  async function confirmVoid() {
    if (!voidingId) return
    setVoiding(true)
    try {
      await apiCall(`/api/admin/dues/${voidingId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "VOID" }),
      })
      setInvoices((inv) => inv.map((x) => x.id === voidingId ? { ...x, status: "VOID" } : x))
      toast.success("Invoice voided.")
      setVoidingId(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to void invoice.")
    } finally {
      setVoiding(false)
    }
  }

  return (
    <div className="space-y-6">
      {canCreate && (
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <IconPlus size={15} className="mr-1.5" />
          New Invoice
        </Button>
      )}

      <InvoicesTable
        invoices={invoices}
        canEdit={canEdit}
        onRecordPayment={(inv) => setRecordingFor(inv)}
        onVoid={handleVoid}
      />

      {invoices.length === 0 && (
        <p className="text-sm text-muted-foreground">No invoices yet.</p>
      )}

      {/* Create Invoice Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Invoice</DialogTitle></DialogHeader>
          <InvoiceForm
            members={members}
            onSubmit={handleCreateInvoice}
            loading={loading}
            onCancel={() => setShowCreate(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Record Payment Dialog */}
      <Dialog open={!!recordingFor} onOpenChange={(o) => { if (!o) setRecordingFor(null) }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record Payment — {recordingFor?.title}</DialogTitle>
          </DialogHeader>
          <PaymentForm
            outstandingDollars={recordingFor ? ((recordingFor.amountCents - recordingFor.amountPaidCents) / 100).toFixed(2) : undefined}
            onSubmit={handleRecordPayment}
            loading={loading}
            onCancel={() => setRecordingFor(null)}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={voidingId !== null}
        title="Void this invoice?"
        description="The invoice will be marked as void and cannot be restored. Recorded payments are preserved."
        confirmLabel="Void Invoice"
        destructive
        loading={voiding}
        onConfirm={confirmVoid}
        onCancel={() => setVoidingId(null)}
      />
    </div>
  )
}
