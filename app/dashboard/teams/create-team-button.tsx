"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { IconPlus } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"

interface Competition { id: string; name: string }
interface Event { id: string; name: string; code: string | null }

interface Props {
  competitions: Competition[]
  events: Event[]
}

export function CreateTeamButton({ competitions, events }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ label: "", competitionId: "", eventId: "" })

  async function handleCreate() {
    if (!form.label) { toast.error("Team label is required."); return }
    setLoading(true)
    try {
      const res = await fetch("/api/admin/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: form.label,
          competitionId: form.competitionId || undefined,
          eventId: form.eventId || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.message ?? "Failed to create."); return }
      toast.success("Team created.")
      setOpen(false)
      router.push(`/dashboard/teams/${data.id}`)
    } finally { setLoading(false) }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} size="sm">
        <IconPlus className="size-4 mr-1.5" />Create Team
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Team</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Team Label</Label>
              <Input placeholder="e.g. Anatomy A" value={form.label} onChange={(e) => setForm(f => ({ ...f, label: e.target.value }))} />
            </div>
            {competitions.length > 0 && (
              <div className="space-y-1.5">
                <Label>Competition (optional)</Label>
                <Select value={form.competitionId} onValueChange={(v) => setForm(f => ({ ...f, competitionId: v }))}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {competitions.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {events.length > 0 && (
              <div className="space-y-1.5">
                <Label>Event (optional)</Label>
                <Select value={form.eventId} onValueChange={(v) => setForm(f => ({ ...f, eventId: v }))}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {events.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={loading || !form.label}>{loading ? "Creating..." : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
