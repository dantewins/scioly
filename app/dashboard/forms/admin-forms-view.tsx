"use client"

import { useState } from "react"
import { toast } from "sonner"
import { IconPlus } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"

interface FormType {
  id: string
  name: string
  category: string
  description: string | null
  isRequired: boolean
  requiresUpload: boolean
  dueAt: string | null
  _count: { submissions: number }
  submissions: { id: string }[]
}

interface Props {
  formTypes: FormType[]
  canCreate: boolean
}

const CATEGORIES = [
  "WAIVER", "MEDICAL", "PERMISSION", "CODE_OF_CONDUCT",
  "TRAVEL", "PHOTO_RELEASE", "CLUB_CONTRACT", "OTHER"
] as const

export function AdminFormsView({ formTypes: initial, canCreate }: Props) {
  const [formTypes, setFormTypes] = useState<FormType[]>(initial)
  const [showCreate, setShowCreate] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: "", category: "OTHER" as string, description: "",
    isRequired: true, requiresUpload: false, dueAt: "",
  })

  async function handleCreate() {
    if (!form.name) { toast.error("Name is required."); return }
    setLoading(true)
    try {
      const res = await fetch("/api/admin/forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          dueAt: form.dueAt ? new Date(form.dueAt).toISOString() : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.message ?? "Failed to create."); return }
      setFormTypes((f) => [...f, { ...data, _count: { submissions: 0 }, submissions: [] }])
      setShowCreate(false)
      setForm({ name: "", category: "OTHER", description: "", isRequired: true, requiresUpload: false, dueAt: "" })
      toast.success("Form type created.")
    } finally { setLoading(false) }
  }

  return (
    <div className="space-y-4">
      {canCreate && (
        <Button onClick={() => setShowCreate(true)}>
          <IconPlus className="size-4 mr-1.5" />New Form Type
        </Button>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {formTypes.map((ft) => (
          <Card key={ft.id}>
            <CardContent className="pt-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-sm">{ft.name}</p>
                <Badge variant="outline" className="text-xs shrink-0">{ft.category}</Badge>
              </div>
              {ft.description && <p className="text-xs text-muted-foreground">{ft.description}</p>}
              <div className="flex items-center gap-2 flex-wrap">
                {ft.isRequired && <Badge variant="secondary" className="text-xs">Required</Badge>}
                {ft.requiresUpload && <Badge variant="outline" className="text-xs">Upload</Badge>}
                <span className="text-xs text-muted-foreground">
                  {ft._count.submissions} submitted · {ft.submissions.length} pending
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
        {formTypes.length === 0 && (
          <p className="text-sm text-muted-foreground col-span-full">No form types yet.</p>
        )}
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Form Type</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input placeholder="Parent Permission Slip" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Description (optional)</Label>
              <Input value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Due Date (optional)</Label>
              <Input type="date" value={form.dueAt} onChange={(e) => setForm(f => ({ ...f, dueAt: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Switch id="required" checked={form.isRequired} onCheckedChange={(v) => setForm(f => ({ ...f, isRequired: v }))} />
                <Label htmlFor="required">Required form</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="upload" checked={form.requiresUpload} onCheckedChange={(v) => setForm(f => ({ ...f, requiresUpload: v }))} />
                <Label htmlFor="upload">Requires file upload</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={loading || !form.name}>{loading ? "Creating..." : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
