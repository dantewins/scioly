"use client"

import { useState } from "react"
import { toast } from "sonner"
import { PlusIcon } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ClubEventCard, type ClubEventCardData } from "@/components/cards/club-event-card"
import { ClubEventForm } from "@/components/forms/club-event-form"

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

interface ClubEvent extends ClubEventCardData {
  categoryId: string | null
  category: { id: string; name: string } | null
  createdAt: string
  updatedAt: string
}

interface Props {
  initialEvents: ClubEvent[]
  categories: Category[]
  canManage: boolean
  canCreate: boolean
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
  return iso.slice(0, 16)
}

function toISOStringOrUndefined(local: string): string | undefined {
  if (!local) return undefined
  return new Date(local).toISOString()
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
  const [loading, setLoading] = useState(false)

  const now = new Date()
  const upcoming = events.filter((e) => new Date(e.startsAt) >= now)
  const past = events.filter((e) => new Date(e.startsAt) < now)

  function openCreate() {
    setShowCreate(true)
  }

  function openEdit(event: ClubEventCardData) {
    const full = events.find((e) => e.id === event.id)
    if (full) setEditingEvent(full)
  }

  function closeDialogs() {
    setShowCreate(false)
    setEditingEvent(null)
  }

  async function handleCreate(form: FormState) {
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

  async function handleUpdate(form: FormState) {
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

  const editingDefaults = editingEvent
    ? {
        name: editingEvent.name,
        type: editingEvent.type,
        location: editingEvent.location ?? "",
        startsAt: toDatetimeLocal(editingEvent.startsAt),
        endsAt: toDatetimeLocal(editingEvent.endsAt),
        hoursValue: String(editingEvent.hoursValue),
        categoryId: editingEvent.categoryId ?? "",
        notes: editingEvent.notes ?? "",
      }
    : undefined

  return (
    <div className="space-y-6">
      {canCreate && (
        <Button size="sm" onClick={openCreate}>
          <PlusIcon size={15} className="mr-1.5" />
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
              <ClubEventCard
                key={e.id}
                event={e}
                canManage={canManage}
                onEdit={openEdit}
                onDelete={handleDelete}
              />
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
              <ClubEventCard
                key={e.id}
                event={e}
                canManage={canManage}
                onEdit={openEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </div>
      )}

      {events.length === 0 && (
        <p className="text-sm text-muted-foreground">No events this season.</p>
      )}

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={(open) => !open && closeDialogs()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Event</DialogTitle>
          </DialogHeader>
          <ClubEventForm
            categories={categories}
            defaultValues={EMPTY_FORM}
            onSubmit={handleCreate}
            loading={loading}
            onCancel={closeDialogs}
            submitLabel="Create"
          />
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editingEvent} onOpenChange={(open) => !open && closeDialogs()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
          </DialogHeader>
          {editingEvent && (
            <ClubEventForm
              categories={categories}
              defaultValues={editingDefaults}
              onSubmit={handleUpdate}
              loading={loading}
              onCancel={closeDialogs}
              submitLabel="Save"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
