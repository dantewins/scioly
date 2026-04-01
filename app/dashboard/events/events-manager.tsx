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
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { EventForm } from "@/components/forms/event-form"

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
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Event</DialogTitle></DialogHeader>
          <EventForm
            onSubmit={(data) => {
              setForm(f => ({ ...f, ...data }))
              handleCreate()
            }}
            loading={loading}
            onCancel={() => setCreating(false)}
            submitLabel="Create"
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      {editing && (
        <Dialog open onOpenChange={() => setEditing(null)}>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Edit Event</DialogTitle></DialogHeader>
            <EventForm
              defaultValues={{
                name: editing.name,
                code: editing.code ?? "",
                minParticipants: editing.minParticipants,
                maxParticipants: editing.maxParticipants,
                isTrialEvent: editing.isTrialEvent,
              }}
              onSubmit={(data) => {
                setEditing(x => x ? { ...x, ...data } : x)
                handleSave()
              }}
              loading={loading}
              onCancel={() => setEditing(null)}
              submitLabel="Save"
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
