"use client"

import * as React from "react"
import { IconPlus, IconCheck, IconX, IconTrash, IconMail, IconEdit } from "@tabler/icons-react"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const hourEntrySchema = z.object({
  id: z.string(),
  memberSeasonId: z.string(),
  categoryId: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  startsAt: z.string().nullable(),
  endsAt: z.string().nullable(),
  totalHours: z.number(),
  status: z.string(),
  submittedAt: z.string(),
  approvedAt: z.string().nullable(),
  approvedById: z.string().nullable(),
  rejectionReason: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  category: z.object({ id: z.string(), name: z.string() }),
  approvedBy: z.object({ firstName: z.string(), lastName: z.string() }).nullable(),
})

type HourEntry = z.infer<typeof hourEntrySchema>

interface HoursTabProps {
  memberSeasonId: string
  hourEntries: HourEntry[]
  hourCategories: { id: string; name: string }[]
  expectedHours: number | null
}

function StatusBadge({ status }: { status: string }) {
  if (status === "APPROVED") return <Badge className="bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400 text-xs">Approved</Badge>
  if (status === "REJECTED") return <Badge variant="destructive" className="text-xs">Rejected</Badge>
  return <Badge variant="secondary" className="text-xs">Pending</Badge>
}

const defaultForm = {
  categoryId: "",
  title: "",
  description: "",
  startsAt: "",
  endsAt: "",
  totalHours: "",
}

export function HoursTab({ memberSeasonId, hourEntries: initial, hourCategories, expectedHours: initialExpected }: HoursTabProps) {
  const [entries, setEntries] = React.useState<HourEntry[]>(initial)
  const [expectedHours, setExpectedHours] = React.useState<number | null>(initialExpected)
  const [addOpen, setAddOpen] = React.useState(false)
  const [requirementOpen, setRequirementOpen] = React.useState(false)
  const [rejectTarget, setRejectTarget] = React.useState<{ id: string } | null>(null)
  const [rejectReason, setRejectReason] = React.useState("")
  const [form, setForm] = React.useState(defaultForm)
  const [requirementValue, setRequirementValue] = React.useState(String(initialExpected ?? ""))
  const [loading, setLoading] = React.useState(false)
  const [sendingEmail, setSendingEmail] = React.useState(false)

  const approvedHours = entries.filter(e => e.status === "APPROVED").reduce((s, e) => s + e.totalHours, 0)
  const progressPct = expectedHours ? Math.min(100, (approvedHours / expectedHours) * 100) : null

  async function addEntry() {
    if (!form.categoryId || !form.title || !form.totalHours) return
    setLoading(true)
    try {
      const res = await fetch("/api/admin/hours", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberSeasonId,
          categoryId: form.categoryId,
          title: form.title,
          description: form.description || undefined,
          startsAt: form.startsAt || undefined,
          endsAt: form.endsAt || undefined,
          totalHours: parseFloat(form.totalHours),
          status: "APPROVED",
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)
      setEntries(prev => [hourEntrySchema.parse(data), ...prev])
      setForm(defaultForm)
      setAddOpen(false)
      toast.success("Hour entry added.")
    } catch (e) {
      toast.error(String(e))
    } finally {
      setLoading(false)
    }
  }

  async function approveEntry(id: string) {
    const res = await fetch("/api/admin/hours", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "approve" }),
    })
    if (res.ok) {
      setEntries(prev => prev.map(e => e.id === id ? { ...e, status: "APPROVED" } : e))
      toast.success("Entry approved.")
    } else {
      toast.error("Failed to approve.")
    }
  }

  async function rejectEntry() {
    if (!rejectTarget) return
    setLoading(true)
    try {
      const res = await fetch("/api/admin/hours", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: rejectTarget.id, action: "reject", rejectionReason: rejectReason }),
      })
      if (!res.ok) throw new Error("Failed to reject.")
      setEntries(prev => prev.map(e => e.id === rejectTarget.id ? { ...e, status: "REJECTED", rejectionReason: rejectReason } : e))
      setRejectTarget(null)
      setRejectReason("")
      toast.success("Entry rejected.")
    } finally {
      setLoading(false)
    }
  }

  async function deleteEntry(id: string) {
    const res = await fetch(`/api/admin/hours?id=${id}`, { method: "DELETE" })
    if (res.ok) {
      setEntries(prev => prev.filter(e => e.id !== id))
      toast.success("Entry deleted.")
    } else {
      toast.error("Failed to delete.")
    }
  }

  async function saveRequirement() {
    setLoading(true)
    try {
      const val = requirementValue ? parseFloat(requirementValue) : null
      const res = await fetch("/api/admin/hours", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set-requirement", memberSeasonId, expectedHours: val }),
      })
      if (!res.ok) throw new Error("Failed to save.")
      setExpectedHours(val)
      setRequirementOpen(false)
      toast.success("Hour requirement updated.")
    } finally {
      setLoading(false)
    }
  }

  async function sendWarning() {
    setSendingEmail(true)
    try {
      const res = await fetch("/api/admin/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "hours-warning", memberSeasonIds: [memberSeasonId] }),
      })
      if (res.ok) toast.success("Warning email sent.")
      else toast.error("Failed to send email.")
    } finally {
      setSendingEmail(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold">
            Hours: {approvedHours.toFixed(1)}{expectedHours != null ? ` / ${expectedHours}` : ""}
          </h3>
          <button
            onClick={() => { setRequirementValue(String(expectedHours ?? "")); setRequirementOpen(true) }}
            className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
          >
            <IconEdit className="inline size-3 mr-0.5" />
            {expectedHours != null ? "Edit requirement" : "Set requirement"}
          </button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={sendWarning} disabled={sendingEmail}>
            <IconMail className="size-4" />
            {sendingEmail ? "Sending…" : "Send warning"}
          </Button>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <IconPlus className="size-4" /> Add entry
          </Button>
        </div>
      </div>

      {/* Progress bar */}
      {progressPct != null && (
        <div className="space-y-1">
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${progressPct >= 100 ? "bg-green-500" : progressPct >= 60 ? "bg-amber-500" : "bg-red-400"}`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">{progressPct.toFixed(0)}% of requirement</p>
        </div>
      )}

      {/* Table */}
      {entries.length === 0 ? (
        <div className="rounded-xl border border-dashed py-8 text-center text-sm text-muted-foreground">
          No hour entries yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map(entry => (
                <TableRow key={entry.id}>
                  <TableCell className="font-medium">{entry.title}</TableCell>
                  <TableCell className="text-muted-foreground">{entry.category.name}</TableCell>
                  <TableCell>{entry.totalHours.toFixed(1)}</TableCell>
                  <TableCell><StatusBadge status={entry.status} /></TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      {entry.status === "PENDING" && (
                        <>
                          <Button variant="ghost" size="icon" className="size-7 text-green-600 hover:text-green-700" onClick={() => approveEntry(entry.id)}>
                            <IconCheck className="size-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="size-7 text-destructive hover:text-destructive" onClick={() => { setRejectTarget({ id: entry.id }); setRejectReason("") }}>
                            <IconX className="size-4" />
                          </Button>
                        </>
                      )}
                      <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-destructive" onClick={() => deleteEntry(entry.id)}>
                        <IconTrash className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add entry dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add hour entry</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={form.categoryId} onValueChange={v => setForm(f => ({ ...f, categoryId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {hourCategories.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Club meeting" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Start date</Label>
                <Input type="date" value={form.startsAt} onChange={e => setForm(f => ({ ...f, startsAt: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>End date</Label>
                <Input type="date" value={form.endsAt} onChange={e => setForm(f => ({ ...f, endsAt: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Hours</Label>
              <Input type="number" min="0" step="0.25" value={form.totalHours} onChange={e => setForm(f => ({ ...f, totalHours: e.target.value }))} placeholder="e.g. 1.5" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={addEntry} disabled={loading || !form.categoryId || !form.title || !form.totalHours}>
              {loading ? "Adding…" : "Add entry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={open => { if (!open) setRejectTarget(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject entry</DialogTitle></DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Reason (optional)</Label>
            <Input value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Reason for rejection" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={rejectEntry} disabled={loading}>Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit requirement dialog */}
      <Dialog open={requirementOpen} onOpenChange={setRequirementOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Hour requirement</DialogTitle></DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Required hours for this season</Label>
            <Input
              type="number"
              min="0"
              step="0.5"
              value={requirementValue}
              onChange={e => setRequirementValue(e.target.value)}
              placeholder="e.g. 20"
            />
            <p className="text-xs text-muted-foreground">Leave blank to remove the requirement.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRequirementOpen(false)}>Cancel</Button>
            <Button onClick={saveRequirement} disabled={loading}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
