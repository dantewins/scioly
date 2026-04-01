"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { IconPlus, IconCalendar } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

interface Season {
  id: string
  name: string
  schoolYear: string
  isActive: boolean
  startsAt: string
  endsAt: string
  _count: { members: number }
}

interface Props {
  seasons: Season[]
  canManage: boolean
}

export function SeasonManager({ seasons: initial, canManage }: Props) {
  const router = useRouter()
  const [seasons, setSeasons] = useState<Season[]>(initial)
  const [showCreate, setShowCreate] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: "", schoolYear: "", startsAt: "", endsAt: "" })

  async function toggleActive(seasonId: string, active: boolean) {
    const res = await fetch(`/api/admin/seasons/${seasonId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: active }),
    })
    if (!res.ok) { toast.error("Failed to update season."); return }
    setSeasons((s) =>
      s.map((x) => ({ ...x, isActive: active ? x.id === seasonId : x.id === seasonId ? false : x.isActive })),
    )
    toast.success(active ? "Season activated." : "Season deactivated.")
    router.refresh()
  }

  async function handleCreate() {
    if (!form.name || !form.schoolYear || !form.startsAt || !form.endsAt) {
      toast.error("All fields are required."); return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/admin/seasons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          startsAt: new Date(form.startsAt).toISOString(),
          endsAt: new Date(form.endsAt).toISOString(),
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.message ?? "Failed to create."); return }
      setSeasons((s) => [{ ...data, _count: { members: 0 } }, ...s])
      setShowCreate(false)
      setForm({ name: "", schoolYear: "", startsAt: "", endsAt: "" })
      toast.success("Season created.")
    } finally { setLoading(false) }
  }

  return (
    <div className="space-y-3">
      {seasons.map((s) => (
        <Card key={s.id}>
          <CardContent className="pt-4 flex items-center gap-4">
            <IconCalendar className="size-4 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{s.name}</p>
              <p className="text-xs text-muted-foreground">{s.schoolYear} · {s._count.members} members</p>
            </div>
            <div className="flex items-center gap-3">
              {s.isActive && <Badge variant="secondary">Active</Badge>}
              {canManage && (
                <div className="flex items-center gap-1.5">
                  <Switch
                    checked={s.isActive}
                    onCheckedChange={(v) => toggleActive(s.id, v)}
                  />
                  <span className="text-xs text-muted-foreground">Active</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      {seasons.length === 0 && (
        <p className="text-sm text-muted-foreground">No seasons yet. Create one to get started.</p>
      )}

      {canManage && (
        <Button variant="outline" className="w-full" onClick={() => setShowCreate(true)}>
          <IconPlus className="size-4 mr-1.5" />New Season
        </Button>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Season</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Season Name</Label>
              <Input placeholder="2025-2026 Season" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>School Year</Label>
              <Input placeholder="2025-2026" value={form.schoolYear} onChange={(e) => setForm(f => ({ ...f, schoolYear: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Start Date</Label>
                <Input type="date" value={form.startsAt} onChange={(e) => setForm(f => ({ ...f, startsAt: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>End Date</Label>
                <Input type="date" value={form.endsAt} onChange={(e) => setForm(f => ({ ...f, endsAt: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={loading}>{loading ? "Creating..." : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
