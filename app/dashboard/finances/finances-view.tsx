"use client"

import { useState } from "react"
import { toast } from "sonner"
import { IconPlus } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { InvoicesTable, type InvoiceRow } from "@/components/tables/invoices-table"
import { InvoiceForm } from "@/components/forms/invoice-form"
import { PaymentForm } from "@/components/forms/payment-form"

type Invoice = InvoiceRow

interface Member {
  id: string
  user: { id: string; firstName: string; lastName: string }
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
      const res = await fetch("/api/admin/dues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberSeasonId: form.memberSeasonId,
          title: form.title,
          amountCents,
          dueAt: form.dueAt ? new Date(form.dueAt).toISOString() : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.message ?? "Failed to create."); return }
      const ms = members.find((m) => m.id === form.memberSeasonId)
      setInvoices((inv) => [{
        ...data,
        memberSeason: { id: form.memberSeasonId, user: ms?.user ?? { id: "", firstName: "", lastName: "", email: "" } },
        payments: [],
      }, ...inv])
      setShowCreate(false)
      toast.success("Invoice created.")
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
      const res = await fetch(`/api/admin/dues/${recordingFor.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountCents,
          method: form.method,
          referenceNumber: form.referenceNumber || undefined,
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        toast.error(d.message ?? "Failed to record payment.")
        return
      }
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
    } finally { setLoading(false) }
  }

  async function handleVoid(invoiceId: string) {
    if (!confirm("Void this invoice? This cannot be undone.")) return
    const res = await fetch(`/api/admin/dues/${invoiceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "VOID" }),
    })
    if (!res.ok) { toast.error("Failed to void invoice."); return }
    setInvoices((inv) => inv.map((x) => x.id === invoiceId ? { ...x, status: "VOID" } : x))
    toast.success("Invoice voided.")
  }

  return (
    <div className="space-y-4">
      {canCreate && (
        <Button onClick={() => setShowCreate(true)}>
          <IconPlus className="size-4 mr-1.5" />New Invoice
        </Button>
      )}

      <InvoicesTable
        invoices={invoices}
        canEdit={canEdit}
        onRecordPayment={(inv) => setRecordingFor(inv)}
        onVoid={handleVoid}
      />

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
    </div>
  )
}
