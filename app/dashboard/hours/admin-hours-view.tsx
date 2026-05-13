"use client"

import { useState } from "react"
import { toast } from "sonner"
import { IconCheck, IconX, IconPlus } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EntityCard } from "@/components/ui/entity-card"
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { RejectHoursDialog } from "@/components/dialogs/reject-hours-dialog"
import { apiCall } from "@/lib/api-client"

interface Entry {
  id: string
  title: string
  totalHours: string | number
  status: string
  submittedAt: string
  description: string | null
  proofUrl: string | null
  memberSeason: { user: { id: string; firstName: string; lastName: string } }
  category: { id: string; name: string }
}

interface Category {
  id: string
  name: string
  description: string | null
  requiredHours: string | number | null
  requiresApproval: boolean
  _count: { hourEntries: number }
}

interface Props {
  pendingEntries: Entry[]
  categories: Category[]
  canManageCategories: boolean
}

export function AdminHoursView({ pendingEntries: initial, categories: initialCats, canManageCategories }: Props) {
  const [entries, setEntries] = useState<Entry[]>(initial)
  const [categories, setCategories] = useState<Category[]>(initialCats)
  const [rejectingIds, setRejectingIds] = useState<string[] | null>(null)
  const [rejectReason, setRejectReason] = useState("")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showCreateCat, setShowCreateCat] = useState(false)
  const [catForm, setCatForm] = useState({ name: "", description: "", requiredHours: "", requiresApproval: true })
  const [loading, setLoading] = useState(false)

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    setSelectedIds((prev) =>
      prev.size === entries.length && entries.length > 0
        ? new Set()
        : new Set(entries.map((e) => e.id)),
    )
  }

  async function review(entryIds: string[], action: "approve" | "reject", reason?: string) {
    if (entryIds.length === 0) return
    setLoading(true)
    try {
      await apiCall("/api/admin/hours", {
        method: "PATCH",
        body: JSON.stringify({ entryIds, action, rejectionReason: reason }),
      })
      const removed = new Set(entryIds)
      setEntries((e) => e.filter((x) => !removed.has(x.id)))
      setSelectedIds((prev) => {
        const next = new Set(prev)
        for (const id of entryIds) next.delete(id)
        return next
      })
      setRejectingIds(null)
      setRejectReason("")
      const count = entryIds.length
      const verb = action === "approve" ? "approved" : "rejected"
      toast.success(count === 1 ? `Hours ${verb}.` : `${count} entries ${verb}.`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update.")
    } finally { setLoading(false) }
  }

  async function createCategory() {
    if (!catForm.name) { toast.error("Name required."); return }
    setLoading(true)
    try {
      const data = await apiCall<Category>("/api/admin/hour-categories", {
        method: "POST",
        body: JSON.stringify({
          ...catForm,
          requiredHours: catForm.requiredHours ? parseFloat(catForm.requiredHours) : undefined,
        }),
      })
      setCategories((c) => [...c, { ...data, _count: { hourEntries: 0 } }])
      setShowCreateCat(false)
      setCatForm({ name: "", description: "", requiredHours: "", requiresApproval: true })
      toast.success("Category created.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create category.")
    } finally { setLoading(false) }
  }

  return (
    <Tabs defaultValue="pending">
      <TabsList>
        <TabsTrigger value="pending">Pending ({entries.length})</TabsTrigger>
        <TabsTrigger value="categories">Categories ({categories.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="pending" className="mt-4 space-y-3">
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pending hour entries.</p>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2 rounded-[var(--radius)] border border-azure-200/60 bg-azure-50/40 px-3 py-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedIds.size > 0 && selectedIds.size === entries.length}
                  onCheckedChange={toggleSelectAll}
                  aria-label="Select all pending entries"
                />
                <span className="text-xs text-muted-foreground">
                  {selectedIds.size === 0
                    ? `${entries.length} pending`
                    : `${selectedIds.size} of ${entries.length} selected`}
                </span>
              </div>
              {selectedIds.size > 0 && (
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-[var(--success)] border-[color-mix(in_oklch,var(--success),transparent_75%)] hover:bg-[var(--success-soft)]"
                    onClick={() => review([...selectedIds], "approve")}
                    disabled={loading}
                  >
                    <IconCheck className="mr-1.5 size-[15px]" />
                    Approve {selectedIds.size}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive border-destructive/30 hover:bg-destructive/5"
                    onClick={() => setRejectingIds([...selectedIds])}
                    disabled={loading}
                  >
                    <IconX className="mr-1.5 size-[15px]" />
                    Reject {selectedIds.size}
                  </Button>
                </div>
              )}
            </div>
            {entries.map((entry) => (
              <EntityCard
                key={entry.id}
                tone="warning"
                title={entry.title}
                titleSize="sm"
                metrics={
                  <>
                    <span>
                      <span className="text-foreground/80">{Number(entry.totalHours).toFixed(1)}h</span>
                    </span>
                    <span>{entry.category.name}</span>
                    <span>{entry.memberSeason.user.firstName} {entry.memberSeason.user.lastName}</span>
                    {entry.proofUrl && (
                      <a href={entry.proofUrl} target="_blank" rel="noopener noreferrer" className="text-azure-700 underline-offset-4 hover:underline">
                        View proof
                      </a>
                    )}
                  </>
                }
                trailing={
                  <>
                    <Checkbox
                      checked={selectedIds.has(entry.id)}
                      onCheckedChange={() => toggleSelected(entry.id)}
                      aria-label={`Select ${entry.title}`}
                    />
                    <Button
                      size="icon-sm"
                      variant="outline"
                      className="text-[var(--success)] border-[color-mix(in_oklch,var(--success),transparent_75%)] hover:bg-[var(--success-soft)]"
                      onClick={() => review([entry.id], "approve")}
                      disabled={loading}
                      aria-label={`Approve ${entry.title}`}
                    >
                      <IconCheck className="size-4" />
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="outline"
                      className="text-destructive border-destructive/30 hover:bg-destructive/5"
                      onClick={() => setRejectingIds([entry.id])}
                      disabled={loading}
                      aria-label={`Reject ${entry.title}`}
                    >
                      <IconX className="size-4" />
                    </Button>
                  </>
                }
                alwaysShowTrailing
              >
                {entry.description && (
                  <p className="text-xs text-muted-foreground">{entry.description.slice(0, 120)}</p>
                )}
              </EntityCard>
            ))}
          </>
        )}
      </TabsContent>

      <TabsContent value="categories" className="mt-4 space-y-2">
        {categories.map((cat) => (
          <EntityCard
            key={cat.id}
            tone={cat.requiresApproval ? "brand" : "success"}
            title={cat.name}
            titleSize="sm"
            description={cat.description ?? undefined}
            status={!cat.requiresApproval ? <Badge variant="success" className="text-[10px]">Auto-approved</Badge> : undefined}
            metrics={
              <>
                {cat.requiredHours && (
                  <span>
                    Required: <span className="text-foreground/80">{Number(cat.requiredHours)}h</span>
                  </span>
                )}
                <span>
                  <span className="text-foreground/80">{cat._count.hourEntries}</span> entries
                </span>
              </>
            }
          />
        ))}

        {canManageCategories && (
          <Button size="sm" onClick={() => setShowCreateCat(true)}>
            <IconPlus className="mr-1.5 size-[15px]" />
            New Category
          </Button>
        )}
      </TabsContent>

      {/* Reject dialog */}
      <RejectHoursDialog
        open={!!rejectingIds && rejectingIds.length > 0}
        reason={rejectReason}
        loading={loading}
        onReasonChange={setRejectReason}
        onConfirm={() => rejectingIds && review(rejectingIds, "reject", rejectReason)}
        onCancel={() => { setRejectingIds(null); setRejectReason("") }}
      />

      {/* Create category dialog */}
      <Dialog open={showCreateCat} onOpenChange={setShowCreateCat}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Hour Category</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={catForm.name} onChange={(e) => setCatForm(f => ({ ...f, name: e.target.value }))} placeholder="Study Sessions" />
            </div>
            <div className="space-y-1.5">
              <Label>Description (optional)</Label>
              <Input value={catForm.description} onChange={(e) => setCatForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Required Hours (optional)</Label>
              <Input type="number" min={0} step={0.5} value={catForm.requiredHours} onChange={(e) => setCatForm(f => ({ ...f, requiredHours: e.target.value }))} placeholder="e.g. 20" />
            </div>
            <div className="flex items-center gap-2">
              <Switch id="req-approval" checked={catForm.requiresApproval} onCheckedChange={(v) => setCatForm(f => ({ ...f, requiresApproval: v }))} />
              <Label htmlFor="req-approval">Requires admin approval</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateCat(false)}>Cancel</Button>
            <Button onClick={createCategory} disabled={loading || !catForm.name}>{loading ? "Creating..." : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Tabs>
  )
}
