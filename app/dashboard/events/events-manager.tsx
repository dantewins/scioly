"use client"

import { useState } from "react"
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
import { apiCall } from "@/lib/api-client"

interface Event {
  id: string
  name: string
  code: string | null
  description: string | null
  minParticipants: number
  maxParticipants: number
  isTrialEvent: boolean
  sortOrder: number | null
  _count: { enrollments: number }
}

interface Props {
  initialEvents: Event[]
  canManage: boolean
  canCreate: boolean
}

type EventFormValues = {
  name: string
  code: string
  minParticipants: number
  maxParticipants: number
  isTrialEvent: boolean
}

export function EventsManager({ initialEvents, canManage, canCreate }: Props) {
  const [events, setEvents] = useState<Event[]>(initialEvents)
  const [editing, setEditing] = useState<Event | null>(null)
  const [creating, setCreating] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleCreate(form: EventFormValues) {
    setLoading(true)
    try {
      const data = await apiCall<Event>("/api/admin/events", {
        method: "POST",
        body: JSON.stringify(form),
      })
      setEvents((e) => [...e, { ...data, _count: { enrollments: 0 } }])
      setCreating(false)
      toast.success("Event created.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create.")
    } finally { setLoading(false) }
  }

  async function handleSave(eventId: string, form: EventFormValues) {
    setLoading(true)
    try {
      await apiCall(`/api/admin/events/${eventId}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: form.name,
          code: form.code,
          minParticipants: form.minParticipants,
          maxParticipants: form.maxParticipants,
          isTrialEvent: form.isTrialEvent,
        }),
      })
      setEvents((currentEvents) =>
        currentEvents.map((event) =>
          event.id === eventId ? { ...event, ...form } : event
        )
      )
      setEditing(null)
      toast.success("Event updated.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save.")
    } finally { setLoading(false) }
  }

  async function handleDelete(eventId: string) {
    if (!confirm("Delete this event? All enrollments will be removed.")) return
    try {
      await apiCall(`/api/admin/events/${eventId}`, { method: "DELETE" })
      setEvents((e) => e.filter((x) => x.id !== eventId))
      toast.success("Event deleted.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete.")
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {events.map((event) => (
          <Card key={event.id}>
            <CardContent>
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
                    <Button variant="ghost" size="icon-sm" onClick={() => setEditing(event)}>
                      <IconEdit className="size-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(event.id)}>
                      <IconTrash className="size-3.5 text-destructive" />
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {canCreate && (
        <Button size="sm" onClick={() => setCreating(true)} variant="outline" className="w-full">
          <IconPlus className="mr-1.5 size-[15px]" />
          New Event
        </Button>
      )}

      {/* Create Dialog */}
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Event</DialogTitle></DialogHeader>
          <EventForm
            onSubmit={handleCreate}
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
              onSubmit={(data) => handleSave(editing.id, data)}
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
