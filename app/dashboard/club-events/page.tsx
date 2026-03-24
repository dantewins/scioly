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
  IconChevronLeft,
  IconChevronRight,
} from "@tabler/icons-react"
import { toast } from "sonner"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/empty-state"
import { PageHeader } from "@/components/page-header"
import { ClubEventFormDialog } from "@/components/club-event-form-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  EVENT_TYPES,
  TYPE_LABELS,
  TYPE_COLORS,
  pagedClubEventsSchema,
  hourCategorySchema,
  emptyClubEventForm,
  type ClubEventSummary,
  type ClubEventFormState,
  type HourCategory,
} from "@/lib/club-events"

const PAGE_SIZE = 9

export default function ClubEventsPage() {
  const router = useRouter()
  const [data, setData] = React.useState<ClubEventSummary[]>([])
  const [total, setTotal] = React.useState(0)
  const [loading, setLoading] = React.useState(true)
  const [createOpen, setCreateOpen] = React.useState(false)
  const [creating, setCreating] = React.useState(false)
  const [form, setForm] = React.useState<ClubEventFormState>(emptyClubEventForm)
  const [hourCategories, setHourCategories] = React.useState<HourCategory[]>([])
  const [typeFilter, setTypeFilter] = React.useState("ALL")
  const [statusFilter, setStatusFilter] = React.useState<"all" | "upcoming" | "ended">("all")
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("asc")
  const [pageIndex, setPageIndex] = React.useState(0)

  const loadData = React.useCallback(async (
    page: number,
    type: string,
    status: string,
    sort: string,
  ) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page + 1),
        pageSize: String(PAGE_SIZE),
        type,
        status,
        sort,
      })
      const [eventsRes, catsRes] = await Promise.all([
        fetch(`/api/admin/club-events?${params}`, { cache: "no-store" }),
        fetch("/api/admin/hour-categories", { cache: "no-store" }).catch(() => null),
      ])
      if (!eventsRes.ok) throw new Error()
      const json = await eventsRes.json()
      const parsed = pagedClubEventsSchema.parse(json)
      setData(parsed.items)
      setTotal(parsed.total)

      if (catsRes?.ok) {
        const catsJson = await catsRes.json()
        setHourCategories(z.array(hourCategorySchema).parse(catsJson))
      }
    } catch {
      toast.error("Failed to load club events.")
      setData([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [])

  // Reset to page 0 when filters change
  React.useEffect(() => {
    setPageIndex(p => (p === 0 ? p : 0))
  }, [typeFilter, statusFilter, sortOrder])

  // Single load effect
  React.useEffect(() => {
    void loadData(pageIndex, typeFilter, statusFilter, sortOrder)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageIndex, typeFilter, statusFilter, sortOrder])

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
      setForm(emptyClubEventForm)
      void loadData(pageIndex, typeFilter, statusFilter, sortOrder)
    } catch {
      toast.error("Failed to create event.")
    } finally {
      setCreating(false)
    }
  }, [form, loadData, pageIndex, typeFilter, statusFilter, sortOrder])

  const from = total === 0 ? 0 : pageIndex * PAGE_SIZE + 1
  const to = Math.min((pageIndex + 1) * PAGE_SIZE, total)
  const hasNoEvents = total === 0 && typeFilter === "ALL" && statusFilter === "all"

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
      ) : hasNoEvents ? (
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
          {/* Filter bar */}
          <div className="flex flex-wrap items-center gap-2">
            <Select value={typeFilter} onValueChange={val => setTypeFilter(val)}>
              <SelectTrigger className="w-auto">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All types</SelectItem>
                {EVENT_TYPES.map(t => (
                  <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={val => setStatusFilter(val as "all" | "upcoming" | "ended")}>
              <SelectTrigger className="w-auto">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="ended">Ended</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortOrder(s => s === "asc" ? "desc" : "asc")}
            >
              <IconArrowsSort className="size-4" />
              {sortOrder === "asc" ? "Oldest first" : "Newest first"}
            </Button>
          </div>

          {/* Event cards grid */}
          {data.length === 0 ? (
            <div className="flex h-32 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
              No events match your filters.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.map(e => (
                <EventCard key={e.id} event={e} onClick={() => router.push(`/dashboard/club-events/${e.id}`)} />
              ))}
            </div>
          )}

          {/* Pagination */}
          <div className="flex items-center justify-between px-1">
            <div className="text-sm text-muted-foreground">
              Showing {from}–{to} of {total}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPageIndex(p => p - 1)}
                disabled={pageIndex === 0}
              >
                <IconChevronLeft className="size-4" />
                <span className="sr-only">Previous page</span>
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPageIndex(p => p + 1)}
                disabled={(pageIndex + 1) * PAGE_SIZE >= total}
              >
                <IconChevronRight className="size-4" />
                <span className="sr-only">Next page</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      <ClubEventFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="New club event"
        form={form}
        onFormChange={setForm}
        onSubmit={() => void handleCreate()}
        submitting={creating}
        submitLabel="Create"
        hourCategories={hourCategories}
      />
    </div>
  )
}

// ── Event Card ──────────────────────────────────────────────────────────────

function EventCard({ event: e, onClick }: { event: ClubEventSummary; onClick: () => void }) {
  return (
    <div
      className="rounded-xl border bg-card p-5 space-y-3 hover:border-primary/40 transition-colors cursor-pointer"
      onClick={onClick}
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
  )
}
