"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  IconLoader2,
  IconCalendarEvent,
  IconCalendar,
  IconMapPin,
  IconUsers,
  IconPlus,
  IconClock,
  IconArrowsSort,
} from "@tabler/icons-react"
import { toast } from "sonner"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel } from "@/components/ui/field"
import { EmptyState } from "@/components/empty-state"
import { PageHeader } from "@/components/page-header"

const clubEventSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  location: z.string().default(""),
  startsAt: z.string().default(""),
  endsAt: z.string().default(""),
  hoursValue: z.number().default(0),
  attendeeCount: z.number().default(0),
  isEnded: z.boolean().default(false),
})

type ClubEvent = z.infer<typeof clubEventSchema>

const hourCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
})

const TYPE_LABELS: Record<string, string> = {
  MEETING: "Meeting",
  SUPER_SATURDAY: "Super Saturday",
  FUNDRAISER: "Fundraiser",
  WORKSHOP: "Workshop",
  FIELD_TRIP: "Field Trip",
  OTHER: "Other",
}

const TYPE_COLORS: Record<string, string> = {
  MEETING: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  SUPER_SATURDAY: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  FUNDRAISER: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  WORKSHOP: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  FIELD_TRIP: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
  OTHER: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
}

const EVENT_TYPES = ["MEETING", "SUPER_SATURDAY", "FUNDRAISER", "WORKSHOP", "FIELD_TRIP", "OTHER"]

const selectClassName =
  "w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50"

type FormState = {
  name: string
  type: string
  location: string
  startsAt: string
  endsAt: string
  hoursValue: string
  categoryId: string
}

const emptyForm: FormState = {
  name: "",
  type: "MEETING",
  location: "",
  startsAt: "",
  endsAt: "",
  hoursValue: "0",
  categoryId: "",
}

export default function ClubEventsPage() {
  const router = useRouter()
  const [data, setData] = React.useState<ClubEvent[]>([])
  const [loading, setLoading] = React.useState(true)
  const [createOpen, setCreateOpen] = React.useState(false)
  const [creating, setCreating] = React.useState(false)
  const [form, setForm] = React.useState<FormState>(emptyForm)
  const [hourCategories, setHourCategories] = React.useState<z.infer<typeof hourCategorySchema>[]>([])
  const [typeFilter, setTypeFilter] = React.useState("ALL")
  const [statusFilter, setStatusFilter] = React.useState<"all" | "upcoming" | "ended">("all")
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("asc")

  const displayData = React.useMemo(() => {
    let result = [...data]
    if (typeFilter !== "ALL") result = result.filter(e => e.type === typeFilter)
    if (statusFilter === "upcoming") result = result.filter(e => !e.isEnded)
    if (statusFilter === "ended") result = result.filter(e => e.isEnded)
    result.sort((a, b) => {
      const cmp = a.startsAt.localeCompare(b.startsAt)
      return sortOrder === "asc" ? cmp : -cmp
    })
    return result
  }, [data, typeFilter, statusFilter, sortOrder])

  const loadData = React.useCallback(async () => {
    setLoading(true)
    try {
      const [eventsRes, catsRes] = await Promise.all([
        fetch("/api/admin/club-events", { cache: "no-store" }),
        fetch("/api/admin/hour-categories", { cache: "no-store" }).catch(() => null),
      ])
      if (!eventsRes.ok) throw new Error()
      const json = await eventsRes.json()
      setData(z.array(clubEventSchema).parse(json))

      if (catsRes?.ok) {
        const catsJson = await catsRes.json()
        setHourCategories(z.array(hourCategorySchema).parse(catsJson))
      }
    } catch {
      toast.error("Failed to load club events.")
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { void loadData() }, [loadData])

  const handleCreate = React.useCallback(async () => {
    if (!form.name.trim() || !form.startsAt) {
      toast.error("Name and start date are required.")
      return
    }
    if (form.endsAt && form.endsAt < form.startsAt) {
      toast.error("End date cannot be before start date.")
      return
    }
    setCreating(true)
    try {
      const res = await fetch("/api/admin/club-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          name: form.name.trim(),
          type: form.type,
          location: form.location.trim() || undefined,
          startsAt: form.startsAt,
          endsAt: form.endsAt || undefined,
          hoursValue: parseFloat(form.hoursValue) || 0,
          categoryId: form.categoryId || undefined,
        }),
      })
      if (!res.ok) throw new Error()
      toast.success("Event created.")
      setCreateOpen(false)
      setForm(emptyForm)
      await loadData()
    } catch {
      toast.error("Failed to create event.")
    } finally {
      setCreating(false)
    }
  }, [form, loadData])

  return (
    <div className="flex flex-col gap-6 px-8 py-4 lg:px-12 md:py-6">
      <PageHeader
        title="Club Events"
        description="Manage club activities, meetings, and events."
      >
        <Button onClick={() => setCreateOpen(true)}>
          <IconPlus className="size-4" />
          New event
        </Button>
      </PageHeader>

      {loading ? (
        <div className="flex h-48 items-center justify-center gap-2 text-sm text-muted-foreground">
          <IconLoader2 className="size-4 animate-spin" />
          Loading events...
        </div>
      ) : data.length === 0 ? (
        <EmptyState
          icon={IconCalendarEvent}
          title="No club events yet"
          description="Create meetings, Super Saturdays, fundraisers, and other club activities."
          action={
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <IconPlus className="size-4" />
              New event
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-4">
          {/* Sort/filter bar */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className={selectClassName + " w-auto"}
            >
              <option value="ALL">All types</option>
              {EVENT_TYPES.map(t => (
                <option key={t} value={t}>{TYPE_LABELS[t]}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as "all" | "upcoming" | "ended")}
              className={selectClassName + " w-auto"}
            >
              <option value="all">All</option>
              <option value="upcoming">Upcoming</option>
              <option value="ended">Ended</option>
            </select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortOrder(s => s === "asc" ? "desc" : "asc")}
            >
              <IconArrowsSort className="size-4" />
              {sortOrder === "asc" ? "Oldest first" : "Newest first"}
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {displayData.map(e => (
            <div
              key={e.id}
              className="rounded-xl border bg-card p-5 space-y-3 hover:border-primary/40 transition-colors cursor-pointer"
              onClick={() => router.push(`/dashboard/club-events/${e.id}`)}
            >
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  {e.isEnded && (
                    <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground">
                      Ended
                    </span>
                  )}
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${TYPE_COLORS[e.type] ?? TYPE_COLORS.OTHER}`}>
                    {TYPE_LABELS[e.type] ?? e.type}
                  </span>
                </div>
                <h2 className="font-semibold">{e.name}</h2>
                {e.location && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <IconMapPin className="size-3.5 shrink-0" />
                    {e.location}
                  </div>
                )}
                {e.startsAt && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <IconCalendar className="size-3.5 shrink-0" />
                    {e.startsAt}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground border-t pt-3">
                <div className="flex items-center gap-1.5">
                  <IconUsers className="size-3.5" />
                  <span>{e.attendeeCount} attended</span>
                </div>
                {e.hoursValue > 0 && (
                  <div className="flex items-center gap-1.5">
                    <IconClock className="size-3.5" />
                    <span>{e.hoursValue} hrs</span>
                  </div>
                )}
              </div>
            </div>
          ))}
          </div>
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New club event</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Field>
              <FieldLabel htmlFor="ce-name">Name</FieldLabel>
              <Input
                id="ce-name"
                placeholder="e.g. Super Saturday #1"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="ce-type">Type</FieldLabel>
              <select
                id="ce-type"
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className={selectClassName}
              >
                {EVENT_TYPES.map(t => (
                  <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                ))}
              </select>
            </Field>
            <Field>
              <FieldLabel htmlFor="ce-location">Location</FieldLabel>
              <Input
                id="ce-location"
                placeholder="School or venue name"
                value={form.location}
                onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="ce-start">Start</FieldLabel>
                <Input
                  id="ce-start"
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={e => setForm(f => ({ ...f, startsAt: e.target.value }))}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="ce-end">End</FieldLabel>
                <Input
                  id="ce-end"
                  type="datetime-local"
                  value={form.endsAt}
                  onChange={e => setForm(f => ({ ...f, endsAt: e.target.value }))}
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="ce-hours">Hours granted</FieldLabel>
                <Input
                  id="ce-hours"
                  type="number"
                  min={0}
                  step={0.5}
                  placeholder="0"
                  value={form.hoursValue}
                  onChange={e => setForm(f => ({ ...f, hoursValue: e.target.value }))}
                />
              </Field>
              {hourCategories.length > 0 && (
                <Field>
                  <FieldLabel htmlFor="ce-cat">Hour category</FieldLabel>
                  <select
                    id="ce-cat"
                    value={form.categoryId}
                    onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}
                    className={selectClassName}
                  >
                    <option value="">None</option>
                    {hourCategories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </Field>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>
              Cancel
            </Button>
            <Button onClick={() => void handleCreate()} disabled={creating}>
              {creating && <IconLoader2 className="size-4 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
