"use client"

import { useState } from "react"
import { toast } from "sonner"
import { IconPlus } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { formatDateOnly } from "@/lib/format"
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

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
}

export function MemberHoursView({ entries: initial, categories, canSubmit }: Props) {
  const [entries, setEntries] = useState<Entry[]>(initial)
  const [showSubmit, setShowSubmit] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ categoryId: "", title: "", description: "", totalHours: "", proofUrl: "" })

  const selectedCategory = categories.find((c) => c.id === form.categoryId)

  async function handleSubmit() {
    if (!form.categoryId || !form.title || !form.totalHours) {
      toast.error("Category, title and hours are required."); return
    }
    setLoading(true)
    try {
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
      setShowSubmit(false)
      setForm({ categoryId: "", title: "", description: "", totalHours: "", proofUrl: "" })
      toast.success("Hours submitted.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit.")
    } finally { setLoading(false) }
  }

  return (
    <div className="space-y-4">
      {canSubmit && (
        <Button size="sm" onClick={() => setShowSubmit(true)}>
          <IconPlus className="mr-1.5 size-[15px]" />
          Log Hours
        </Button>
      )}

      <div className="space-y-2">
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hour entries yet.</p>
        ) : (
          entries.map((entry) => (
            <Card key={entry.id} className="flex flex-row items-start gap-3 px-[var(--card-px)] py-[var(--card-py)]">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm truncate">{entry.title}</p>
                  <Badge variant="secondary" className="text-xs shrink-0">{Number(entry.totalHours).toFixed(1)} hrs</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{entry.category.name} · {formatDateOnly(new Date(entry.submittedAt))}</p>
                {entry.rejectionReason && (
                  <p className="text-xs text-destructive mt-0.5">{entry.rejectionReason}</p>
                )}
              </div>
              <Badge className={STATUS_COLORS[entry.status] ?? ""} variant="outline">
                {entry.status}
              </Badge>
            </Card>
          ))
        )}
      </div>

      <Dialog open={showSubmit} onOpenChange={setShowSubmit}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Log Hours</DialogTitle></DialogHeader>
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
            <div className="space-y-1.5">
              <Label>Proof URL (optional)</Label>
              <Input type="url" value={form.proofUrl} onChange={(e) => setForm(f => ({ ...f, proofUrl: e.target.value }))} placeholder="https://..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubmit(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={loading}>{loading ? "Submitting..." : "Submit"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
