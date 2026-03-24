"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import {
  IconArrowLeft,
  IconLoader2,
  IconCalendar,
  IconMapPin,
  IconClock,
  IconPencil,
  IconTrash,
  IconCheck,
} from "@tabler/icons-react"
import { toast } from "sonner"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ClubEventFormDialog } from "@/components/club-event-form-dialog"
import {
  TYPE_LABELS,
  TYPE_COLORS,
  clubEventDetailSchema,
  hourCategorySchema,
  type ClubEventDetail,
  type ClubEventFormState,
  type HourCategory,
} from "@/lib/club-events"

export default function ClubEventDetailPage() {
  const params = useParams()
  const router = useRouter()
  const eventId = params.id as string

  const [event, setEvent] = React.useState<ClubEventDetail | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [attendanceLoading, setAttendanceLoading] = React.useState<string | null>(null)
  const [editOpen, setEditOpen] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)
  const [form, setForm] = React.useState<ClubEventFormState>({
    name: "", type: "MEETING", location: "", startsAt: "", endsAt: "",
    hoursValue: "0", categoryId: "", notes: "",
  })
  const [hourCategories, setHourCategories] = React.useState<HourCategory[]>([])
  const [memberSearch, setMemberSearch] = React.useState("")

  const loadEvent = React.useCallback(async () => {
    setLoading(true)
    try {
      const [eventRes, catsRes] = await Promise.all([
        fetch(`/api/admin/club-events?id=${eventId}`, { cache: "no-store" }),
        fetch("/api/admin/hour-categories", { cache: "no-store" }).catch(() => null),
      ])
      if (!eventRes.ok) throw new Error()
      const json = await eventRes.json()
      setEvent(clubEventDetailSchema.parse(json))

      if (catsRes?.ok) {
        const catsJson = await catsRes.json()
        setHourCategories(z.array(hourCategorySchema).parse(catsJson))
      }
    } catch {
      toast.error("Failed to load event.")
    } finally {
      setLoading(false)
    }
  }, [eventId])

  React.useEffect(() => { void loadEvent() }, [loadEvent])

  const openEdit = () => {
    if (!event) return
    setForm({
      name: event.name,
      type: event.type,
      location: event.location,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      hoursValue: String(event.hoursValue),
      categoryId: event.categoryId ?? "",
      notes: event.notes,
    })
    setEditOpen(true)
  }

  const handleSave = React.useCallback(async () => {
    if (!form.name.trim() || !form.startsAt) {
      toast.error("Name and start date are required.")
      return
    }
    if (form.endsAt && form.endsAt < form.startsAt) {
      toast.error("End date cannot be before start date.")
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/admin/club-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "edit",
          id: eventId,
          name: form.name.trim(),
          type: form.type,
          location: form.location.trim() || undefined,
          startsAt: form.startsAt,
          endsAt: form.endsAt || undefined,
          hoursValue: parseFloat(form.hoursValue) || 0,
          categoryId: form.categoryId || undefined,
          notes: form.notes.trim() || undefined,
        }),
      })
      if (!res.ok) throw new Error()
      toast.success("Event updated.")
      setEditOpen(false)
      await loadEvent()
    } catch {
      toast.error("Failed to update event.")
    } finally {
      setSaving(false)
    }
  }, [form, eventId, loadEvent])

  const handleDelete = React.useCallback(async () => {
    setDeleting(true)
    try {
      const res = await fetch("/api/admin/club-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id: eventId }),
      })
      if (!res.ok) throw new Error()
      toast.success("Event deleted.")
      router.push("/dashboard/club-events")
    } catch {
      toast.error("Failed to delete event.")
      setDeleting(false)
    }
  }, [eventId, router])

  const toggleAttendance = React.useCallback(async (memberSeasonId: string, currentlyAttended: boolean) => {
    setAttendanceLoading(memberSeasonId)
    try {
      const res = await fetch("/api/admin/club-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: currentlyAttended ? "unmark-attendance" : "mark-attendance",
          clubEventId: eventId,
          memberSeasonId,
        }),
      })
      if (!res.ok) throw new Error()
      setEvent(prev => {
        if (!prev) return prev
        return {
          ...prev,
          attendeeCount: currentlyAttended ? prev.attendeeCount - 1 : prev.attendeeCount + 1,
          members: prev.members.map(m =>
            m.id === memberSeasonId ? { ...m, attended: !currentlyAttended } : m
          ),
        }
      })
    } catch {
      toast.error("Failed to update attendance.")
    } finally {
      setAttendanceLoading(null)
    }
  }, [eventId])

  const filteredMembers = React.useMemo(() => {
    if (!event) return []
    const q = memberSearch.toLowerCase().trim()
    if (!q) return event.members
    return event.members.filter(m => m.name.toLowerCase().includes(q))
  }, [event, memberSearch])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center gap-2 text-sm text-muted-foreground">
        <IconLoader2 className="size-4 animate-spin" />
        Loading event...
      </div>
    )
  }

  if (!event) {
    return (
      <div className="px-8 py-4 lg:px-12 md:py-6 space-y-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/club-events")} className="-ml-2">
          <IconArrowLeft className="size-4" /> Back
        </Button>
        <p className="text-sm text-muted-foreground">Event not found.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 px-8 py-4 lg:px-12 md:py-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="sm" className="-ml-2 mt-0.5 text-muted-foreground" onClick={() => router.push("/dashboard/club-events")}>
          <IconArrowLeft className="size-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h1 className="text-xl font-semibold">{event.name}</h1>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${TYPE_COLORS[event.type] ?? TYPE_COLORS.OTHER}`}>
              {TYPE_LABELS[event.type] ?? event.type}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            {event.startsAt && (
              <span className="flex items-center gap-1">
                <IconCalendar className="size-3.5" />
                {new Date(event.startsAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
              </span>
            )}
            {event.location && (
              <span className="flex items-center gap-1"><IconMapPin className="size-3.5" />{event.location}</span>
            )}
            {event.hoursValue > 0 && (
              <span className="flex items-center gap-1"><IconClock className="size-3.5" />{event.hoursValue} hrs</span>
            )}
            {event.categoryName && (
              <span className="text-xs border rounded-full px-2 py-0.5">{event.categoryName}</span>
            )}
          </div>
          {event.notes && (
            <p className="mt-2 text-sm text-muted-foreground">{event.notes}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" size="sm" onClick={openEdit}>
            <IconPencil className="size-4" />
            Edit
          </Button>
          <Button variant="outline" size="sm" className="text-muted-foreground hover:text-foreground" onClick={() => setDeleteOpen(true)}>
            <IconTrash className="size-4" />
          </Button>
        </div>
      </div>

      {/* Attendance */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">Attendance</h2>
            <p className="text-sm text-muted-foreground">
              {event.attendeeCount} / {event.members.length} members attended
              {event.hoursValue > 0 && ` · Attendance grants ${event.hoursValue} hours`}
            </p>
          </div>
          <div className="w-48">
            <Input
              placeholder="Search members..."
              value={memberSearch}
              onChange={e => setMemberSearch(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
        </div>

        {event.members.length === 0 ? (
          <div className="flex h-32 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
            No active members found.
          </div>
        ) : (
          <div className="rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Member</th>
                  <th className="px-4 py-3 text-center font-medium w-28">Attended</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredMembers.map(member => (
                  <tr key={member.id} className={`transition-colors ${member.attended ? "bg-green-50/50 dark:bg-green-950/20" : "hover:bg-muted/30"}`}>
                    <td className="px-4 py-2.5 font-medium">{member.name}</td>
                    <td className="px-4 py-2.5 text-center">
                      <button
                        onClick={() => void toggleAttendance(member.id, member.attended)}
                        disabled={attendanceLoading === member.id}
                        className={`inline-flex items-center justify-center size-7 rounded-md border transition-colors ${
                          member.attended
                            ? "bg-green-500 border-green-500 text-white hover:bg-green-600"
                            : "border-border text-muted-foreground hover:border-primary hover:text-primary"
                        }`}
                      >
                        {attendanceLoading === member.id
                          ? <IconLoader2 className="size-3.5 animate-spin" />
                          : <IconCheck className="size-3.5" />
                        }
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <ClubEventFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        title="Edit event"
        form={form}
        onFormChange={setForm}
        onSubmit={() => void handleSave()}
        submitting={saving}
        submitLabel="Save"
        hourCategories={hourCategories}
        showNotes
      />

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete event?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently delete <strong>{event.name}</strong> and all attendance records and associated hours. This cannot be undone.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>Cancel</Button>
            <Button variant="default" onClick={() => void handleDelete()} disabled={deleting}>
              {deleting && <IconLoader2 className="size-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
