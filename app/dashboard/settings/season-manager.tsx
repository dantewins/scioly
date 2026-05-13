"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { IconPlus, IconCalendar } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { EntityCard } from "@/components/ui/entity-card"
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { apiCall } from "@/lib/api-client"

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
    try {
      await apiCall(`/api/admin/seasons/${seasonId}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: active }),
      })
      setSeasons((s) =>
        s.map((x) => ({ ...x, isActive: active ? x.id === seasonId : x.id === seasonId ? false : x.isActive })),
      )
      toast.success(active ? "Season activated." : "Season deactivated.")
      router.refresh()
    } catch {
      toast.error("Failed to update season.")
    }
  }

  async function handleCreate() {
    if (!form.name || !form.schoolYear || !form.startsAt || !form.endsAt) {
      toast.error("All fields are required."); return
    }
    setLoading(true)
    try {
      const data = await apiCall<Season>("/api/admin/seasons", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          startsAt: new Date(form.startsAt).toISOString(),
          endsAt: new Date(form.endsAt).toISOString(),
        }),
      })
      setSeasons((s) => [{ ...data, _count: { members: 0 } }, ...s])
      setShowCreate(false)
      setForm({ name: "", schoolYear: "", startsAt: "", endsAt: "" })
      toast.success("Season created.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create.")
    } finally { setLoading(false) }
  }

  return (
    <div className="space-y-2">
      {seasons.map((s) => (
        <EntityCard
          key={s.id}
          tone={s.isActive ? "brand" : "neutral"}
          kicker={<><IconCalendar className="size-3 shrink-0" aria-hidden /> Season</>}
          title={s.name}
          titleSize="sm"
          status={s.isActive ? <Badge variant="info" className="text-[10px]">Active</Badge> : undefined}
          metrics={
            <>
              <span>{s.schoolYear}</span>
              <span>
                <span className="text-foreground/80">{s._count.members}</span> members
              </span>
            </>
          }
          trailing={
            canManage ? (
              <Switch
                checked={s.isActive}
                onCheckedChange={(v) => toggleActive(s.id, v)}
                aria-label={s.isActive ? "Deactivate season" : "Activate season"}
              />
            ) : undefined
          }
          alwaysShowTrailing
        />
      ))}

      {seasons.length === 0 && (
        <p className="text-sm text-muted-foreground">No seasons yet. Create one to get started.</p>
      )}

      {canManage && (
        <Button size="sm" onClick={() => setShowCreate(true)} variant="outline" className="w-full">
          <IconPlus className="mr-1.5 size-[15px]" />
          New Season
        </Button>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
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
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
