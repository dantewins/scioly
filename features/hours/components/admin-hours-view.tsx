"use client"

import { useState } from "react"
import { toast } from "sonner"
import { IconCheck, IconX, IconPlus, IconClock } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EmptyState } from "@/components/empty-state"
import { RejectHoursDialog } from "@/features/hours/components/reject-hours-dialog"
import { HoursPendingRow, type PendingEntry } from "@/features/hours/components/hours-pending-row"
import { HourCategoryCard, type HourCategoryRecord } from "@/features/hours/components/hour-category-card"
import { CreateCategoryDialog } from "@/features/hours/components/create-category-dialog"
import { apiCall } from "@/lib/api-client"

interface Entry extends PendingEntry {
  status: string
  submittedAt: string
}

interface Props {
  pendingEntries: Entry[]
  categories: HourCategoryRecord[]
  canManageCategories: boolean
}

export function AdminHoursView({
  pendingEntries: initial,
  categories: initialCats,
  canManageCategories,
}: Props) {
  const [entries, setEntries] = useState<Entry[]>(initial)
  const [categories, setCategories] = useState<HourCategoryRecord[]>(initialCats)
  const [rejectingIds, setRejectingIds] = useState<string[] | null>(null)
  const [rejectReason, setRejectReason] = useState("")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showCreateCat, setShowCreateCat] = useState(false)
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
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateCategory(form: {
    name: string
    description: string
    requiredHours: string
    requiresApproval: boolean
  }) {
    if (!form.name) {
      toast.error("Name required.")
      return
    }
    setLoading(true)
    try {
      const data = await apiCall<HourCategoryRecord>("/api/admin/hour-categories", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          requiredHours: form.requiredHours ? parseFloat(form.requiredHours) : undefined,
        }),
      })
      setCategories((c) => [...c, { ...data, _count: { hourEntries: 0 } }])
      setShowCreateCat(false)
      toast.success("Category created.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create category.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Tabs defaultValue="pending">
      <TabsList>
        <TabsTrigger value="pending">Pending ({entries.length})</TabsTrigger>
        <TabsTrigger value="categories">Categories ({categories.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="pending" className="mt-4 space-y-3">
        {entries.length === 0 ? (
          <EmptyState
            icon={IconClock}
            title="No pending hours"
            description="Submitted hour entries awaiting review will appear here."
          />
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
              <HoursPendingRow
                key={entry.id}
                entry={entry}
                selected={selectedIds.has(entry.id)}
                loading={loading}
                onToggleSelect={toggleSelected}
                onApprove={(id) => review([id], "approve")}
                onReject={(id) => setRejectingIds([id])}
              />
            ))}
          </>
        )}
      </TabsContent>

      <TabsContent value="categories" className="mt-4 space-y-2">
        {categories.map((cat) => (
          <HourCategoryCard key={cat.id} category={cat} />
        ))}

        {canManageCategories && (
          <Button size="sm" onClick={() => setShowCreateCat(true)}>
            <IconPlus className="mr-1.5 size-[15px]" />
            New Category
          </Button>
        )}
      </TabsContent>

      <RejectHoursDialog
        open={!!rejectingIds && rejectingIds.length > 0}
        reason={rejectReason}
        loading={loading}
        onReasonChange={setRejectReason}
        onConfirm={() => rejectingIds && review(rejectingIds, "reject", rejectReason)}
        onCancel={() => {
          setRejectingIds(null)
          setRejectReason("")
        }}
      />

      <CreateCategoryDialog
        open={showCreateCat}
        onOpenChange={setShowCreateCat}
        onCreate={handleCreateCategory}
        loading={loading}
      />
    </Tabs>
  )
}
