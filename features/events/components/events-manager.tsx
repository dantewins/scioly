"use client"

import { useState } from "react"
import { toast } from "sonner"
import { IconPlus, IconEdit, IconTrash, IconUsers } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import {
  ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogHeader, ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { EventForm } from "@/features/events/components/event-form"
import { apiCall } from "@/lib/api-client"
import { cn } from "@/lib/utils"

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
  const [deleting, setDeleting] = useState<Event | null>(null)
  const [deletingNow, setDeletingNow] = useState(false)
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

  function handleDelete(eventId: string) {
    const target = events.find((e) => e.id === eventId)
    if (target) setDeleting(target)
  }

  async function confirmDelete() {
    if (!deleting) return
    setDeletingNow(true)
    try {
      await apiCall(`/api/admin/events/${deleting.id}`, { method: "DELETE" })
      setEvents((e) => e.filter((x) => x.id !== deleting.id))
      toast.success("Event deleted.")
      setDeleting(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete.")
    } finally {
      setDeletingNow(false)
    }
  }

  return (
    <div className="space-y-3">
      {/* Catalog grid — each event is a reference tile with the event code as a mono code chip on the left */}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {events.map((event) => (
          <div
            key={event.id}
            className="group relative flex items-start gap-3 rounded-[var(--radius)] border border-border/80 bg-card px-3 py-3 shadow-[0_1px_2px_0_color-mix(in_oklch,var(--azure-300),transparent_88%)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-azure-soft"
          >
            <span
              className={cn(
                "inline-flex h-10 min-w-[44px] shrink-0 items-center justify-center rounded-md px-1 font-mono text-[11px] font-semibold tabular-nums tracking-wide",
                event.isTrialEvent
                  ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200/70"
                  : "bg-azure-50 text-azure-700 ring-1 ring-azure-200/70",
              )}
              aria-hidden
            >
              {event.code ?? "—"}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-sm leading-tight truncate">{event.name}</p>
                {event.isTrialEvent && (
                  <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-amber-700">Trial</span>
                )}
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground tabular-nums">
                <span className="text-foreground/80">{event.minParticipants}–{event.maxParticipants}</span> members
                <span className="mx-1.5" aria-hidden>·</span>
                <IconUsers className="inline size-3 -mt-px mr-1" aria-hidden />
                <span className="text-foreground/80">{event._count.enrollments}</span> enrolled
              </p>
            </div>
            {canManage && (
              <div className="flex items-center gap-0.5 self-center opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon-sm" onClick={() => setEditing(event)} aria-label={`Edit ${event.name}`}>
                  <IconEdit className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => handleDelete(event.id)}
                  aria-label={`Delete ${event.name}`}
                >
                  <IconTrash className="size-3.5" />
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      {canCreate && (
        <Button size="sm" onClick={() => setCreating(true)} variant="outline" className="w-full">
          <IconPlus className="mr-1.5 size-[15px]" />
          New Event
        </Button>
      )}

      {/* Create ResponsiveDialog */}
      <ResponsiveDialog open={creating} onOpenChange={setCreating}>
        <ResponsiveDialogContent className="max-h-[90vh] overflow-y-auto">
          <ResponsiveDialogHeader><ResponsiveDialogTitle>New Event</ResponsiveDialogTitle></ResponsiveDialogHeader>
          <EventForm
            onSubmit={handleCreate}
            loading={loading}
            onCancel={() => setCreating(false)}
            submitLabel="Create"
          />
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      {/* Edit ResponsiveDialog */}
      {editing && (
        <ResponsiveDialog open onOpenChange={() => setEditing(null)}>
          <ResponsiveDialogContent className="max-h-[90vh] overflow-y-auto">
            <ResponsiveDialogHeader><ResponsiveDialogTitle>Edit Event</ResponsiveDialogTitle></ResponsiveDialogHeader>
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
          </ResponsiveDialogContent>
        </ResponsiveDialog>
      )}

      <ConfirmDialog
        open={deleting !== null}
        title={deleting ? `Delete "${deleting.name}"?` : "Delete event?"}
        description={
          deleting
            ? `All ${deleting._count.enrollments} enrollment${deleting._count.enrollments === 1 ? "" : "s"} for this event will be removed. This cannot be undone.`
            : undefined
        }
        confirmLabel="Delete Event"
        destructive
        loading={deletingNow}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  )
}
