"use client"

import { useState } from "react"
import { toast } from "sonner"
import { IconPlus, IconCreditCard } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { formatDateOnly } from "@/lib/format"

interface Invoice {
  id: string
  title: string
  amountCents: number
  amountPaidCents: number
  status: string
  dueAt: string | null
  issuedAt: string
  memberSeasonId: string
  memberSeason: {
    id: string
    user: { id: string; firstName: string; lastName: string; email: string }
  }
  payments: { id: string; amountCents: number; method: string; paidAt: string; referenceNumber: string | null }[]
}

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

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-800",
  PARTIALLY_PAID: "bg-yellow-100 text-yellow-800",
  PAID: "bg-green-100 text-green-800",
  OVERDUE: "bg-red-100 text-red-800",
  DRAFT: "bg-gray-100 text-gray-800",
  VOID: "bg-gray-100 text-gray-500",
}

const PAYMENT_METHODS = ["CASH", "CHECK", "CARD", "ZELLE", "VENMO", "PAYPAL", "OTHER"] as const

export function FinancesView({ invoices: initial, members, canCreate, canEdit }: Props) {
  const [invoices, setInvoices] = useState<Invoice[]>(initial)
  const [showCreate, setShowCreate] = useState(false)
  const [recordingFor, setRecordingFor] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(false)
  const [createForm, setCreateForm] = useState({
    memberSeasonId: "", title: "", amountDollars: "", dueAt: "",
  })
  const [paymentForm, setPaymentForm] = useState({
    amountDollars: "", method: "CASH" as string, referenceNumber: "",
  })

  async function handleCreateInvoice() {
    if (!createForm.memberSeasonId || !createForm.title || !createForm.amountDollars) {
      toast.error("Member, title, and amount are required."); return
    }
    const amountCents = Math.round(parseFloat(createForm.amountDollars) * 100)
    if (isNaN(amountCents) || amountCents < 1) { toast.error("Invalid amount."); return }
    setLoading(true)
    try {
      const res = await fetch("/api/admin/dues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberSeasonId: createForm.memberSeasonId,
          title: createForm.title,
          amountCents,
          dueAt: createForm.dueAt ? new Date(createForm.dueAt).toISOString() : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.message ?? "Failed to create."); return }
      const ms = members.find((m) => m.id === createForm.memberSeasonId)
      setInvoices((inv) => [{
        ...data,
        memberSeason: { id: createForm.memberSeasonId, user: ms?.user ?? { id: "", firstName: "", lastName: "", email: "" } },
        payments: [],
      }, ...inv])
      setShowCreate(false)
      setCreateForm({ memberSeasonId: "", title: "", amountDollars: "", dueAt: "" })
      toast.success("Invoice created.")
    } finally { setLoading(false) }
  }

  async function handleRecordPayment() {
    if (!recordingFor || !paymentForm.amountDollars) { toast.error("Amount required."); return }
    const amountCents = Math.round(parseFloat(paymentForm.amountDollars) * 100)
    if (isNaN(amountCents) || amountCents < 1) { toast.error("Invalid amount."); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/dues/${recordingFor.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountCents,
          method: paymentForm.method,
          referenceNumber: paymentForm.referenceNumber || undefined,
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
      setPaymentForm({ amountDollars: "", method: "CASH", referenceNumber: "" })
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

      {invoices.length === 0 ? (
        <p className="text-sm text-muted-foreground">No invoices yet.</p>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Member</th>
                <th className="text-left px-4 py-2 font-medium">Invoice</th>
                <th className="text-left px-4 py-2 font-medium">Amount</th>
                <th className="text-left px-4 py-2 font-medium">Paid</th>
                <th className="text-left px-4 py-2 font-medium">Status</th>
                <th className="text-left px-4 py-2 font-medium">Due</th>
                {canEdit && <th className="px-4 py-2" />}
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-t">
                  <td className="px-4 py-2 text-xs">
                    {inv.memberSeason.user.firstName} {inv.memberSeason.user.lastName}
                  </td>
                  <td className="px-4 py-2 font-medium">{inv.title}</td>
                  <td className="px-4 py-2">${(inv.amountCents / 100).toFixed(2)}</td>
                  <td className="px-4 py-2">${(inv.amountPaidCents / 100).toFixed(2)}</td>
                  <td className="px-4 py-2">
                    <Badge variant="outline" className={`text-xs ${STATUS_COLORS[inv.status] ?? ""}`}>
                      {inv.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">{formatDateOnly(inv.dueAt ? new Date(inv.dueAt) : undefined)}</td>
                  {canEdit && (
                    <td className="px-4 py-2">
                      <div className="flex gap-1">
                        {["OPEN", "PARTIALLY_PAID"].includes(inv.status) && (
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setRecordingFor(inv)}>
                            <IconCreditCard className="size-3 mr-1" />Record
                          </Button>
                        )}
                        {inv.status !== "VOID" && inv.status !== "PAID" && (
                          <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={() => handleVoid(inv.id)}>
                            Void
                          </Button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Invoice Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Invoice</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Member</Label>
              <Select value={createForm.memberSeasonId} onValueChange={(v) => setCreateForm(f => ({ ...f, memberSeasonId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.user.firstName} {m.user.lastName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Invoice Title</Label>
              <Input placeholder="Spring Season Dues" value={createForm.title} onChange={(e) => setCreateForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Amount ($)</Label>
                <Input type="number" min={0} step={0.01} placeholder="50.00" value={createForm.amountDollars} onChange={(e) => setCreateForm(f => ({ ...f, amountDollars: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Due Date (optional)</Label>
                <Input type="date" value={createForm.dueAt} onChange={(e) => setCreateForm(f => ({ ...f, dueAt: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreateInvoice} disabled={loading}>{loading ? "Creating..." : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Payment Dialog */}
      <Dialog open={!!recordingFor} onOpenChange={(o) => { if (!o) setRecordingFor(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment — {recordingFor?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              Outstanding: ${recordingFor ? ((recordingFor.amountCents - recordingFor.amountPaidCents) / 100).toFixed(2) : ""}
            </div>
            <div className="space-y-1.5">
              <Label>Amount Paid ($)</Label>
              <Input type="number" min={0} step={0.01} value={paymentForm.amountDollars} onChange={(e) => setPaymentForm(f => ({ ...f, amountDollars: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Method</Label>
              <Select value={paymentForm.method} onValueChange={(v) => setPaymentForm(f => ({ ...f, method: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Reference Number (optional)</Label>
              <Input value={paymentForm.referenceNumber} onChange={(e) => setPaymentForm(f => ({ ...f, referenceNumber: e.target.value }))} placeholder="Check #123, Venmo ID..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRecordingFor(null)}>Cancel</Button>
            <Button onClick={handleRecordPayment} disabled={loading}>{loading ? "Recording..." : "Record Payment"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
