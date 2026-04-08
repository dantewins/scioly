"use client"

import { useState } from "react"
import { toast } from "sonner"
import { IconCheck, IconX, IconPlus } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Card, CardContent,
} from "@/components/ui/card"
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
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState("")
  const [showCreateCat, setShowCreateCat] = useState(false)
  const [catForm, setCatForm] = useState({ name: "", description: "", requiredHours: "", requiresApproval: true })
  const [loading, setLoading] = useState(false)

  async function review(entryId: string, action: "approve" | "reject", reason?: string) {
    setLoading(true)
    try {
      await apiCall("/api/admin/hours", {
        method: "PATCH",
        body: JSON.stringify({ entryId, action, rejectionReason: reason }),
      })
      setEntries((e) => e.filter((x) => x.id !== entryId))
      setRejectingId(null)
      setRejectReason("")
      toast.success(action === "approve" ? "Hours approved." : "Hours rejected.")
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
          entries.map((entry) => (
            <Card key={entry.id}>
              <CardContent className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">{entry.title}</p>
                    <Badge variant="secondary" className="text-xs shrink-0">{Number(entry.totalHours).toFixed(1)} hrs</Badge>
                    <Badge variant="outline" className="text-xs shrink-0">{entry.category.name}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {entry.memberSeason.user.firstName} {entry.memberSeason.user.lastName}
                    {entry.description && ` · ${entry.description.slice(0, 80)}`}
                  </p>
                  {entry.proofUrl && (
                    <a href={entry.proofUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline mt-0.5 block">
                      View proof
                    </a>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="icon-sm" variant="outline" className="text-green-600" onClick={() => review(entry.id, "approve")} disabled={loading}>
                    <IconCheck className="size-4" />
                  </Button>
                  <Button size="icon-sm" variant="outline" className="text-destructive" onClick={() => setRejectingId(entry.id)} disabled={loading}>
                    <IconX className="size-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </TabsContent>

      <TabsContent value="categories" className="mt-4 space-y-3">
        {categories.map((cat) => (
          <Card key={cat.id}>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{cat.name}</p>
                  {cat.description && <p className="text-xs text-muted-foreground">{cat.description}</p>}
                  <div className="flex items-center gap-3 mt-1">
                    {cat.requiredHours && <span className="text-xs">Required: {Number(cat.requiredHours)}h</span>}
                    <span className="text-xs text-muted-foreground">{cat._count.hourEntries} entries</span>
                    {!cat.requiresApproval && <Badge variant="outline" className="text-xs">Auto-approved</Badge>}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
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
        open={!!rejectingId}
        reason={rejectReason}
        loading={loading}
        onReasonChange={setRejectReason}
        onConfirm={() => rejectingId && review(rejectingId, "reject", rejectReason)}
        onCancel={() => { setRejectingId(null); setRejectReason("") }}
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
