"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { IconPlus, IconEdit, IconTrash } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card, CardContent,
} from "@/components/ui/card"
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

interface Event {
  id: string
  name: string
  code: string | null
  description: string | null
  minParticipants: number
  maxParticipants: number
  isTrialEvent: boolean
  sortOrder: number | null
  _count: { enrollments: number; teams: number }
}

interface Props {
  initialEvents: Event[]
  canManage: boolean
}

const emptyForm = {
  name: "", code: "", description: "",
  minParticipants: 2, maxParticipants: 2, isTrialEvent: false,
}

export function EventsManager({ initialEvents, canManage }: Props) {
  const router = useRouter()
  const [events, setEvents] = useState<Event[]>(initialEvents)
  const [editing, setEditing] = useState<Event | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)

  async function handleCreate() {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.message ?? "Failed to create."); return }
      setEvents((e) => [...e, { ...data, _count: { enrollments: 0, teams: 0 } }])
      setCreating(false)
      setForm(emptyForm)
      toast.success("Event created.")
    } finally { setLoading(false) }
  }

  async function handleSave() {
    if (!editing) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/events/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editing.name, code: editing.code,
          description: editing.description,
          minParticipants: editing.minParticipants,
          maxParticipants: editing.maxParticipants,
          isTrialEvent: editing.isTrialEvent,
        }),
      })
      if (!res.ok) { toast.error("Failed to save."); return }
      setEvents((e) => e.map((x) => x.id === editing.id ? { ...x, ...editing } : x))
      setEditing(null)
      toast.success("Event updated.")
    } finally { setLoading(false) }
  }

  async function handleDelete(eventId: string) {
    if (!confirm("Delete this event? All enrollments will be removed.")) return
    const res = await fetch(`/api/admin/events/${eventId}`, { method: "DELETE" })
    if (!res.ok) { toast.error("Failed to delete."); return }
    setEvents((e) => e.filter((x) => x.id !== eventId))
    toast.success("Event deleted.")
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {events.map((event) => (
          <Card key={event.id}>
            <CardContent className="pt-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-medium text-sm truncate">{event.name}</p>
                    {event.code && <span className="text-xs text-muted-foreground">({event.code})</span>}
                  </div>
                  {event.isTrialEvent && <Badge variant="outline" className="text-xs mt-1">Trial</Badge>}
                  <p className="text-xs text-muted-foreground mt-1">
                    {event.minParticipants}–{event.maxParticipants} members ·{" "}
                    {event._count.enrollments} enrolled
                  </p>
                </div>
                {canManage && (
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="size-7" onClick={() => setEditing(event)}>
                      <IconEdit className="size-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="size-7" onClick={() => handleDelete(event.id)}>
                      <IconTrash className="size-3.5 text-destructive" />
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {canManage && (
        <Button variant="outline" onClick={() => setCreating(true)}>
          <IconPlus className="size-4 mr-1.5" />Add Event
        </Button>
      )}

      {/* Create Dialog */}
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Event</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Event Name</Label>
              <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Anatomy & Physiology" />
            </div>
            <div className="space-y-1.5">
              <Label>Code (optional)</Label>
              <Input value={form.code} onChange={(e) => setForm(f => ({ ...f, code: e.target.value }))} placeholder="ANP" maxLength={10} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Min Participants</Label>
                <Input type="number" min={1} value={form.minParticipants} onChange={(e) => setForm(f => ({ ...f, minParticipants: parseInt(e.target.value) || 1 }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Max Participants</Label>
                <Input type="number" min={1} value={form.maxParticipants} onChange={(e) => setForm(f => ({ ...f, maxParticipants: parseInt(e.target.value) || 1 }))} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="trial" checked={form.isTrialEvent} onCheckedChange={(v) => setForm(f => ({ ...f, isTrialEvent: v }))} />
              <Label htmlFor="trial">Trial event</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreating(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={loading || !form.name.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      {editing && (
        <Dialog open onOpenChange={() => setEditing(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit Event</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Event Name</Label>
                <Input value={editing.name} onChange={(e) => setEditing(x => x ? { ...x, name: e.target.value } : x)} />
              </div>
              <div className="space-y-1.5">
                <Label>Code</Label>
                <Input value={editing.code ?? ""} onChange={(e) => setEditing(x => x ? { ...x, code: e.target.value } : x)} maxLength={10} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Min Participants</Label>
                  <Input type="number" min={1} value={editing.minParticipants} onChange={(e) => setEditing(x => x ? { ...x, minParticipants: parseInt(e.target.value) || 1 } : x)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Max Participants</Label>
                  <Input type="number" min={1} value={editing.maxParticipants} onChange={(e) => setEditing(x => x ? { ...x, maxParticipants: parseInt(e.target.value) || 1 } : x)} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="trial-edit" checked={editing.isTrialEvent} onCheckedChange={(v) => setEditing(x => x ? { ...x, isTrialEvent: v } : x)} />
                <Label htmlFor="trial-edit">Trial event</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={handleSave} disabled={loading}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
