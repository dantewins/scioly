"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import { IconPlus, IconPencil, IconTrash } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/status-badge"
import { cn } from "@/lib/utils"
import {
  ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogFooter, ResponsiveDialogHeader, ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { formatDateCompact } from "@/lib/format"
import { apiCall } from "@/lib/api-client"

interface Entry {
  id: string
  title: string
  totalHours: string | number
  status: string
  submittedAt: string
  description: string | null
  rejectionReason: string | null
  category: { id: string; name: string }
}

interface Category {
  id: string
  name: string
  description: string | null
  proofInstructions: string | null
}

interface Props {
  entries: Entry[]
  categories: Category[]
  canSubmit: boolean
}

const EMPTY_FORM = { categoryId: "", title: "", description: "", totalHours: "", proofUrl: "" }

const STATUS_STRIPE: Record<string, string> = {
  APPROVED: "bg-[var(--success)]",
  REJECTED: "bg-[var(--danger)]",
  PENDING: "bg-[var(--warning)]",
}

export function MemberHoursView({ entries: initial, categories, canSubmit }: Props) {
  const [entries, setEntries] = useState<Entry[]>(initial)
  const [showSubmit, setShowSubmit] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("ALL")
  const [withdrawTarget, setWithdrawTarget] = useState<Entry | null>(null)
  const [withdrawing, setWithdrawing] = useState(false)

  const selectedCategory = categories.find((c) => c.id === form.categoryId)
  const isEditing = editingId !== null

  const counts = useMemo(() => ({
    ALL: entries.length,
    PENDING: entries.filter((e) => e.status === "PENDING").length,
    APPROVED: entries.filter((e) => e.status === "APPROVED").length,
    REJECTED: entries.filter((e) => e.status === "REJECTED").length,
  }), [entries])

  const visibleEntries = useMemo(
    () => statusFilter === "ALL" ? entries : entries.filter((e) => e.status === statusFilter),
    [entries, statusFilter],
  )

  function openEdit(entry: Entry) {
    setEditingId(entry.id)
    setForm({
      categoryId: entry.category.id,
      title: entry.title,
      description: entry.description ?? "",
      totalHours: String(entry.totalHours),
      proofUrl: "",
    })
    setShowSubmit(true)
  }

  function closeDialog(open: boolean) {
    setShowSubmit(open)
    if (!open) {
      setEditingId(null)
      setForm(EMPTY_FORM)
    }
  }

  function handleDelete(entry: Entry) {
    setWithdrawTarget(entry)
  }

  async function confirmWithdraw() {
    if (!withdrawTarget) return
    setWithdrawing(true)
    try {
      await apiCall(`/api/member/hours/${withdrawTarget.id}`, { method: "DELETE" })
      setEntries((e) => e.filter((x) => x.id !== withdrawTarget.id))
      toast.success("Entry withdrawn.")
      setWithdrawTarget(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to withdraw.")
    } finally {
      setWithdrawing(false)
    }
  }

  async function handleSubmit() {
    if (!form.categoryId || !form.title || !form.totalHours) {
      toast.error("Category, title and hours are required."); return
    }
    setLoading(true)
    try {
      if (isEditing && editingId) {
        const data = await apiCall<Entry & { categoryId: string }>(`/api/member/hours/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify({
            categoryId: form.categoryId,
            title: form.title,
            description: form.description || null,
            totalHours: parseFloat(form.totalHours),
          }),
        })
        setEntries((e) =>
          e.map((x) => x.id === editingId ? {
            ...x,
            ...data,
            category: categories.find(c => c.id === data.categoryId) ?? x.category,
          } : x),
        )
        toast.success("Entry updated.")
      } else {
        const data = await apiCall<Entry & { categoryId: string }>("/api/member/hours", {
          method: "POST",
          body: JSON.stringify({
            ...form,
            totalHours: parseFloat(form.totalHours),
            proofUrl: form.proofUrl || undefined,
          }),
        })
        setEntries((e) => [{
          ...data,
          rejectionReason: null,
          category: categories.find(c => c.id === data.categoryId) ?? { id: "", name: "" },
        }, ...e])
        toast.success("Hours submitted.")
      }
      closeDialog(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit.")
    } finally { setLoading(false) }
  }

  return (
    <div className="space-y-4">
      {canSubmit && categories.length === 0 && (
        <div className="rounded-[var(--radius)] border border-amber-200/60 bg-amber-50/40 px-4 py-3 text-sm">
          <p className="font-medium text-amber-900">No hour categories yet</p>
          <p className="mt-1 text-amber-800/80">
            Your admin needs to set up hour categories before you can log hours.
            Reach out to them if this has been a while.
          </p>
        </div>
      )}

      {canSubmit && categories.length > 0 && (
        <Button size="sm" onClick={() => setShowSubmit(true)}>
          <IconPlus className="mr-1.5 size-[15px]" />
          Log Hours
        </Button>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        {(["ALL", "PENDING", "APPROVED", "REJECTED"] as const).map((s) => {
          const active = statusFilter === s
          return (
            <Button
              key={s}
              size="sm"
              variant={active ? "default" : "outline"}
              onClick={() => setStatusFilter(s)}
              aria-pressed={active}
            >
              {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()} ({counts[s]})
            </Button>
          )
        })}
      </div>

      <div className="space-y-2">
        {visibleEntries.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {statusFilter === "ALL" ? "No hour entries yet." : `No ${statusFilter.toLowerCase()} entries.`}
          </p>
        ) : (
          /* Ledger row — status stripe on the left, title middle, hours number prominent on the right */
          visibleEntries.map((entry) => (
            <div
              key={entry.id}
              className="group relative flex items-center gap-3 overflow-hidden rounded-[var(--radius)] border border-border/80 bg-card pl-4 pr-3 py-3 shadow-[0_1px_2px_0_color-mix(in_oklch,var(--azure-300),transparent_88%)] transition-shadow"
            >
              <span aria-hidden className={cn("absolute inset-y-2 left-0 w-[3px] rounded-r-sm", STATUS_STRIPE[entry.status])} />

              <div className="flex-1 min-w-0 pl-2">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm truncate">{entry.title}</p>
                  <StatusBadge status={entry.status} withDot />
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {entry.category.name}
                  <span className="mx-1.5" aria-hidden>·</span>
                  <span className="font-mono tabular-nums">{formatDateCompact(new Date(entry.submittedAt))}</span>
                </p>
                {entry.rejectionReason && (
                  <p className="mt-1 text-xs text-[var(--danger)]">{entry.rejectionReason}</p>
                )}
              </div>

              {/* Hours number — the right-side stat */}
              <div className="flex items-baseline gap-0.5 shrink-0">
                <span className="font-serif text-2xl leading-none tabular-nums text-foreground">
                  {Number(entry.totalHours).toFixed(1)}
                </span>
                <span className="text-xs text-muted-foreground">h</span>
              </div>

              {entry.status === "PENDING" && canSubmit && (
                <div className="flex items-center gap-0.5 shrink-0 ml-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => openEdit(entry)}
                    disabled={loading}
                    aria-label={`Edit ${entry.title}`}
                  >
                    <IconPencil className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(entry)}
                    disabled={loading}
                    aria-label={`Withdraw ${entry.title}`}
                  >
                    <IconTrash className="size-3.5" />
                  </Button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <ResponsiveDialog open={showSubmit} onOpenChange={closeDialog}>
        <ResponsiveDialogContent className="max-h-[90vh] overflow-y-auto">
          <ResponsiveDialogHeader><ResponsiveDialogTitle>{isEditing ? "Edit Hours" : "Log Hours"}</ResponsiveDialogTitle></ResponsiveDialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={form.categoryId} onValueChange={(v) => setForm(f => ({ ...f, categoryId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {selectedCategory?.proofInstructions && (
                <p className="text-xs text-muted-foreground">{selectedCategory.proofInstructions}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} placeholder="What did you do?" />
            </div>
            <div className="space-y-1.5">
              <Label>Hours</Label>
              <Input type="number" min={0.25} max={24} step={0.25} value={form.totalHours} onChange={(e) => setForm(f => ({ ...f, totalHours: e.target.value }))} placeholder="1.5" />
            </div>
            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
              <Input value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            {!isEditing && (
              <div className="space-y-1.5">
                <Label>Proof URL (optional)</Label>
                <Input type="url" value={form.proofUrl} onChange={(e) => setForm(f => ({ ...f, proofUrl: e.target.value }))} placeholder="https://..." />
              </div>
            )}
          </div>
          <ResponsiveDialogFooter>
            <Button variant="outline" onClick={() => closeDialog(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? (isEditing ? "Saving..." : "Submitting...") : (isEditing ? "Save" : "Submit")}
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      <ConfirmDialog
        open={withdrawTarget !== null}
        title="Withdraw hour entry?"
        description={
          withdrawTarget
            ? `"${withdrawTarget.title}" will be removed from your pending submissions. This cannot be undone.`
            : undefined
        }
        confirmLabel="Withdraw"
        destructive
        loading={withdrawing}
        onConfirm={confirmWithdraw}
        onCancel={() => setWithdrawTarget(null)}
      />
    </div>
  )
}
