"use client"

import { useState } from "react"
import { toast } from "sonner"
import {
  CalendarBlank,
  MapPin,
  Clock,
  Users,
  Plus,
  PencilSimple,
  Trash,
  X,
} from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type ClubEventType =
  | "MEETING"
  | "SUPER_SATURDAY"
  | "FUNDRAISER"
  | "WORKSHOP"
  | "FIELD_TRIP"
  | "OTHER"

interface Category {
  id: string
  name: string
}

interface ClubEvent {
  id: string
  name: string
  type: ClubEventType
  location: string | null
  startsAt: string
  endsAt: string | null
  hoursValue: number
  categoryId: string | null
  category: { id: string; name: string } | null
  notes: string | null
  createdAt: string
  updatedAt: string
  _count: { attendance: number }
}

interface Props {
  initialEvents: ClubEvent[]
  categories: Category[]
  canManage: boolean
  canCreate: boolean
}

const TYPE_LABELS: Record<ClubEventType, string> = {
  MEETING: "Meeting",
  SUPER_SATURDAY: "Super Saturday",
  FUNDRAISER: "Fundraiser",
  WORKSHOP: "Workshop",
  FIELD_TRIP: "Field Trip",
  OTHER: "Other",
}

const TYPE_COLORS: Record<ClubEventType, string> = {
  MEETING: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  SUPER_SATURDAY: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  FUNDRAISER: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  WORKSHOP: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  FIELD_TRIP: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  OTHER: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
}

interface FormState {
  name: string
  type: ClubEventType
  location: string
  startsAt: string
  endsAt: string
  hoursValue: string
  categoryId: string
  notes: string
}

const EMPTY_FORM: FormState = {
  name: "",
  type: "MEETING",
  location: "",
  startsAt: "",
  endsAt: "",
  hoursValue: "0",
  categoryId: "",
  notes: "",
}

function toDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return ""
  // datetime-local format: YYYY-MM-DDTHH:MM
  return iso.slice(0, 16)
}

function toISOStringOrUndefined(local: string): string | undefined {
  if (!local) return undefined
  return new Date(local).toISOString()
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  })
}

export function ClubEventsManager({
  initialEvents,
  categories,
  canManage,
  canCreate,
}: Props) {
  const [events, setEvents] = useState<ClubEvent[]>(initialEvents)
  const [showCreate, setShowCreate] = useState(false)
  const [editingEvent, setEditingEvent] = useState<ClubEvent | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [loading, setLoading] = useState(false)

  const now = new Date()
  const upcoming = events.filter((e) => new Date(e.startsAt) >= now)
  const past = events.filter((e) => new Date(e.startsAt) < now)

  function openCreate() {
    setForm(EMPTY_FORM)
    setShowCreate(true)
  }

  function openEdit(event: ClubEvent) {
    setForm({
      name: event.name,
      type: event.type,
      location: event.location ?? "",
      startsAt: toDatetimeLocal(event.startsAt),
      endsAt: toDatetimeLocal(event.endsAt),
      hoursValue: String(event.hoursValue),
      categoryId: event.categoryId ?? "",
      notes: event.notes ?? "",
    })
    setEditingEvent(event)
  }

  function closeDialogs() {
    setShowCreate(false)
    setEditingEvent(null)
    setForm(EMPTY_FORM)
  }

  function field(key: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleCreate() {
    if (!form.name.trim() || !form.startsAt) {
      toast.error("Name and start time are required.")
      return
    }
    setLoading(true)
    try {
      const body: Record<string, unknown> = {
        name: form.name.trim(),
        type: form.type,
        startsAt: toISOStringOrUndefined(form.startsAt),
        hoursValue: parseFloat(form.hoursValue) || 0,
      }
      if (form.location.trim()) body.location = form.location.trim()
      if (form.endsAt) body.endsAt = toISOStringOrUndefined(form.endsAt)
      if (form.categoryId) body.categoryId = form.categoryId
      if (form.notes.trim()) body.notes = form.notes.trim()

      const res = await fetch("/api/admin/club-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error(data.message ?? "Failed to create event.")
        return
      }
      const created: ClubEvent = await res.json()
      setEvents((ev) =>
        [...ev, created].sort(
          (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
        )
      )
      closeDialogs()
      toast.success("Event created.")
    } finally {
      setLoading(false)
    }
  }

  async function handleUpdate() {
    if (!editingEvent) return
    if (!form.name.trim() || !form.startsAt) {
      toast.error("Name and start time are required.")
      return
    }
    setLoading(true)
    try {
      const body: Record<string, unknown> = {
        name: form.name.trim(),
        type: form.type,
        startsAt: toISOStringOrUndefined(form.startsAt),
        hoursValue: parseFloat(form.hoursValue) || 0,
        location: form.location.trim() || null,
        endsAt: form.endsAt ? toISOStringOrUndefined(form.endsAt) : null,
        categoryId: form.categoryId || null,
        notes: form.notes.trim() || null,
      }

      const res = await fetch(`/api/admin/club-events/${editingEvent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error(data.message ?? "Failed to update event.")
        return
      }
      const updated = await res.json()
      setEvents((ev) =>
        ev
          .map((e) =>
            e.id === editingEvent.id
              ? {
                  ...updated,
                  hoursValue: Number(updated.hoursValue),
                  startsAt: updated.startsAt,
                  endsAt: updated.endsAt ?? null,
                  category: editingEvent.category,
                  _count: editingEvent._count,
                }
              : e
          )
          .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
      )
      closeDialogs()
      toast.success("Event updated.")
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this event? This cannot be undone.")) return
    const res = await fetch(`/api/admin/club-events/${id}`, { method: "DELETE" })
    if (!res.ok) {
      toast.error("Failed to delete event.")
      return
    }
    setEvents((ev) => ev.filter((e) => e.id !== id))
    toast.success("Event deleted.")
  }

  function EventCard({ event }: { event: ClubEvent }) {
    return (
      <Card className="group">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-sm font-medium">{event.name}</CardTitle>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[event.type]}`}
                >
                  {TYPE_LABELS[event.type]}
                </span>
              </div>
            </div>
            {canManage && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  onClick={() => openEdit(event)}
                >
                  <PencilSimple size={13} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-muted-foreground hover:text-destructive"
                  onClick={() => handleDelete(event.id)}
                >
                  <Trash size={13} />
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarBlank size={12} />
            <span>
              {formatDate(event.startsAt)} at {formatTime(event.startsAt)}
              {event.endsAt && ` — ${formatTime(event.endsAt)}`}
            </span>
          </div>
          {event.location && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin size={12} />
              <span>{event.location}</span>
            </div>
          )}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {event.hoursValue > 0 && (
              <span className="flex items-center gap-1">
                <Clock size={12} />
                {event.hoursValue}h
              </span>
            )}
            <span className="flex items-center gap-1">
              <Users size={12} />
              {event._count.attendance} attended
            </span>
          </div>
        </CardContent>
      </Card>
    )
  }

  const formFields = (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>Name <span className="text-destructive">*</span></Label>
        <Input
          value={form.name}
          onChange={(e) => field("name", e.target.value)}
          placeholder="e.g. Weekly Meeting"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Type</Label>
          <Select value={form.type} onValueChange={(v) => field("type", v as ClubEventType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(TYPE_LABELS) as ClubEventType[]).map((t) => (
                <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Location</Label>
          <Input
            value={form.location}
            onChange={(e) => field("location", e.target.value)}
            placeholder="Room 204"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Start Time <span className="text-destructive">*</span></Label>
          <Input
            type="datetime-local"
            value={form.startsAt}
            onChange={(e) => field("startsAt", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>End Time</Label>
          <Input
            type="datetime-local"
            value={form.endsAt}
            onChange={(e) => field("endsAt", e.target.value)}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Hours Value</Label>
          <Input
            type="number"
            min={0}
            max={24}
            step={0.25}
            value={form.hoursValue}
            onChange={(e) => field("hoursValue", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Hour Category</Label>
          <Select
            value={form.categoryId || "__none"}
            onValueChange={(v) => field("categoryId", v === "__none" ? "" : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none">None</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Notes</Label>
        <Textarea
          value={form.notes}
          onChange={(e) => field("notes", e.target.value)}
          placeholder="Optional notes…"
          rows={2}
        />
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {canCreate && (
        <Button size="sm" onClick={openCreate}>
          <Plus size={15} className="mr-1.5" />
          New Event
        </Button>
      )}

      {upcoming.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Upcoming
          </h2>
          <div className="space-y-2">
            {upcoming.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        </div>
      )}

      {past.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Past
          </h2>
          <div className="space-y-2">
            {past.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        </div>
      )}

      {events.length === 0 && (
        <p className="text-sm text-muted-foreground">No events this season.</p>
      )}

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={(open) => !open && closeDialogs()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Event</DialogTitle>
          </DialogHeader>
          {formFields}
          <DialogFooter>
            <Button variant="outline" onClick={closeDialogs}>Cancel</Button>
            <Button onClick={handleCreate} disabled={loading}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editingEvent} onOpenChange={(open) => !open && closeDialogs()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
          </DialogHeader>
          {formFields}
          <DialogFooter>
            <Button variant="outline" onClick={closeDialogs}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={loading}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
