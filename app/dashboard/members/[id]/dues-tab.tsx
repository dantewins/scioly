"use client"

import * as React from "react"
import { IconPlus, IconTrash, IconMail, IconCreditCard } from "@tabler/icons-react"
import { toast } from "sonner"
import { z } from "zod"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const paymentSchema = z.object({
  id: z.string(),
  invoiceId: z.string(),
  memberSeasonId: z.string(),
  amountCents: z.number(),
  method: z.string(),
  referenceNumber: z.string().nullable(),
  receiptUrl: z.string().nullable(),
  notes: z.string().nullable(),
  paidAt: z.string(),
  recordedById: z.string().nullable(),
  createdAt: z.string(),
  recordedBy: z.object({ firstName: z.string(), lastName: z.string() }).nullable(),
})

const invoiceSchema = z.object({
  id: z.string(),
  seasonId: z.string(),
  memberSeasonId: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  amountCents: z.number(),
  amountPaidCents: z.number(),
  status: z.string(),
  dueAt: z.string().nullable(),
  issuedAt: z.string(),
  paidAt: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  payments: z.array(paymentSchema),
})

type Invoice = z.infer<typeof invoiceSchema>

interface DuesTabProps {
  memberSeasonId: string
  invoices: Invoice[]
}

const PAYMENT_METHODS = ["CASH", "CHECK", "CARD", "ZELLE", "VENMO", "PAYPAL", "OTHER"]

function InvoiceStatusBadge({ status }: { status: string }) {
  if (status === "PAID") return <Badge className="bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400 text-xs">Paid</Badge>
  if (status === "PARTIALLY_PAID") return <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-50 dark:bg-blue-900/30 dark:text-blue-300 text-xs">Partial</Badge>
  if (status === "OVERDUE") return <Badge variant="destructive" className="text-xs">Overdue</Badge>
  if (status === "VOID") return <Badge variant="secondary" className="text-xs">Void</Badge>
  return <Badge variant="outline" className="text-xs">Open</Badge>
}

const defaultInvoiceForm = { title: "", description: "", amountDollars: "", dueAt: "" }
const defaultPaymentForm = { amountDollars: "", method: "CASH", referenceNumber: "", notes: "" }

export function DuesTab({ memberSeasonId, invoices: initial }: DuesTabProps) {
  const [invoices, setInvoices] = React.useState<Invoice[]>(initial)
  const [addInvoiceOpen, setAddInvoiceOpen] = React.useState(false)
  const [paymentTarget, setPaymentTarget] = React.useState<Invoice | null>(null)
  const [invoiceForm, setInvoiceForm] = React.useState(defaultInvoiceForm)
  const [paymentForm, setPaymentForm] = React.useState(defaultPaymentForm)
  const [loading, setLoading] = React.useState(false)
  const [sendingEmail, setSendingEmail] = React.useState(false)

  const totalDue = invoices.reduce((s, i) => s + i.amountCents, 0)
  const totalPaid = invoices.reduce((s, i) => s + i.amountPaidCents, 0)

  async function createInvoice() {
    setLoading(true)
    try {
      const amountCents = Math.round(parseFloat(invoiceForm.amountDollars) * 100)
      const res = await fetch("/api/admin/dues?action=invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberSeasonId,
          title: invoiceForm.title,
          description: invoiceForm.description || undefined,
          amountCents,
          dueAt: invoiceForm.dueAt || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)
      setInvoices(prev => [invoiceSchema.parse({ ...data, payments: [] }), ...prev])
      setInvoiceForm(defaultInvoiceForm)
      setAddInvoiceOpen(false)
      toast.success("Invoice created.")
    } catch (e) {
      toast.error(String(e))
    } finally {
      setLoading(false)
    }
  }

  async function recordPayment() {
    if (!paymentTarget) return
    setLoading(true)
    try {
      const amountCents = Math.round(parseFloat(paymentForm.amountDollars) * 100)
      const res = await fetch("/api/admin/dues?action=payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId: paymentTarget.id,
          memberSeasonId,
          amountCents,
          method: paymentForm.method,
          referenceNumber: paymentForm.referenceNumber || undefined,
          notes: paymentForm.notes || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)

      // Re-fetch invoices to get updated status
      const refetch = await fetch(`/api/admin/dues?memberSeasonId=${memberSeasonId}`)
      if (refetch.ok) {
        const refreshed = await refetch.json()
        setInvoices(z.array(invoiceSchema).parse(refreshed))
      }

      setPaymentTarget(null)
      setPaymentForm(defaultPaymentForm)
      toast.success("Payment recorded.")
    } catch (e) {
      toast.error(String(e))
    } finally {
      setLoading(false)
    }
  }

  async function voidInvoice(id: string) {
    const res = await fetch("/api/admin/dues", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "VOID" }),
    })
    if (res.ok) {
      setInvoices(prev => prev.map(i => i.id === id ? { ...i, status: "VOID" } : i))
      toast.success("Invoice voided.")
    } else {
      toast.error("Failed to void invoice.")
    }
  }

  async function sendReminder() {
    setSendingEmail(true)
    try {
      const res = await fetch("/api/admin/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "dues-reminder", memberSeasonIds: [memberSeasonId] }),
      })
      if (res.ok) toast.success("Reminder email sent.")
      else toast.error("Failed to send email.")
    } finally {
      setSendingEmail(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">
          Paid: ${(totalPaid / 100).toFixed(2)} / ${(totalDue / 100).toFixed(2)}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={sendReminder} disabled={sendingEmail}>
            <IconMail className="size-4" />
            {sendingEmail ? "Sending…" : "Send reminder"}
          </Button>
          <Button size="sm" onClick={() => setAddInvoiceOpen(true)}>
            <IconPlus className="size-4" /> Add invoice
          </Button>
        </div>
      </div>

      {invoices.length === 0 ? (
        <div className="rounded-xl border border-dashed py-8 text-center text-sm text-muted-foreground">
          No invoices yet.
        </div>
      ) : (
        <div className="space-y-3">
          {invoices.map(inv => (
            <div key={inv.id} className="rounded-xl border bg-card">
              <div className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm">{inv.title}</p>
                    <InvoiceStatusBadge status={inv.status} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    ${(inv.amountCents / 100).toFixed(2)}
                    {inv.amountPaidCents > 0 && ` · $${(inv.amountPaidCents / 100).toFixed(2)} paid`}
                    {inv.dueAt && ` · Due ${new Date(inv.dueAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {inv.status !== "PAID" && inv.status !== "VOID" && (
                    <Button variant="outline" size="sm" onClick={() => { setPaymentTarget(inv); setPaymentForm(defaultPaymentForm) }}>
                      <IconCreditCard className="size-4" /> Record payment
                    </Button>
                  )}
                  {inv.status !== "VOID" && inv.status !== "PAID" && (
                    <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive" onClick={() => voidInvoice(inv.id)}>
                      <IconTrash className="size-4" />
                    </Button>
                  )}
                </div>
              </div>
              {inv.payments.length > 0 && (
                <div className="border-t px-4 pb-3 pt-2 space-y-1">
                  {inv.payments.map(p => (
                    <div key={p.id} className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{p.method} · ${(p.amountCents / 100).toFixed(2)}</span>
                      <span>{new Date(p.paidAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add invoice dialog */}
      <Dialog open={addInvoiceOpen} onOpenChange={setAddInvoiceOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create invoice</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={invoiceForm.title} onChange={e => setInvoiceForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Season dues" />
            </div>
            <div className="space-y-2">
              <Label>Amount ($)</Label>
              <Input type="number" min="0" step="0.01" value={invoiceForm.amountDollars} onChange={e => setInvoiceForm(f => ({ ...f, amountDollars: e.target.value }))} placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <Label>Due date (optional)</Label>
              <Input type="date" value={invoiceForm.dueAt} onChange={e => setInvoiceForm(f => ({ ...f, dueAt: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddInvoiceOpen(false)}>Cancel</Button>
            <Button onClick={createInvoice} disabled={loading || !invoiceForm.title || !invoiceForm.amountDollars}>
              {loading ? "Creating…" : "Create invoice"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record payment dialog */}
      <Dialog open={!!paymentTarget} onOpenChange={open => { if (!open) setPaymentTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record payment — {paymentTarget?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Amount ($)</Label>
              <Input type="number" min="0" step="0.01" value={paymentForm.amountDollars} onChange={e => setPaymentForm(f => ({ ...f, amountDollars: e.target.value }))} placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <Label>Payment method</Label>
              <Select value={paymentForm.method} onValueChange={v => setPaymentForm(f => ({ ...f, method: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map(m => (
                    <SelectItem key={m} value={m}>{m.charAt(0) + m.slice(1).toLowerCase()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Reference # (optional)</Label>
              <Input value={paymentForm.referenceNumber} onChange={e => setPaymentForm(f => ({ ...f, referenceNumber: e.target.value }))} placeholder="Check #, transaction ID…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentTarget(null)}>Cancel</Button>
            <Button onClick={recordPayment} disabled={loading || !paymentForm.amountDollars}>
              {loading ? "Saving…" : "Record payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
