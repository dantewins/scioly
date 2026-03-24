"use client"

import * as React from "react"
import {
  IconAtom,
  IconLoader2,
  IconPlus,
  IconEdit,
  IconDots,
  IconTrash,
} from "@tabler/icons-react"
import { useIsMobile } from "@/hooks/use-mobile"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { EmptyState } from "@/components/empty-state"
import { PageHeader } from "@/components/page-header"

// ─── Schema ───────────────────────────────────────────────────────────────────

const eventSchema = z.object({
  id: z.string(),
  code: z.string().nullable().default(null),
  name: z.string(),
  minParticipants: z.number().default(1),
  maxParticipants: z.number().default(2),
  isTrialEvent: z.boolean().default(false),
  sortOrder: z.number().nullable().default(null),
})

type SciOlyEvent = z.infer<typeof eventSchema>

// Empty form state used both for "new event" and when resetting after save
type FormState = {
  name: string
  code: string
  minParticipants: string
  maxParticipants: string
  isTrialEvent: boolean
  sortOrder: string
}

const emptyForm: FormState = {
  name: "",
  code: "",
  minParticipants: "1",
  maxParticipants: "2",
  isTrialEvent: false,
  sortOrder: "",
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function EventsPage() {
  const isMobile = useIsMobile()
  const [data, setData] = React.useState<SciOlyEvent[]>([])
  const [loading, setLoading] = React.useState(true)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [editingEvent, setEditingEvent] = React.useState<SciOlyEvent | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<SciOlyEvent | null>(null)
  const [deleting, setDeleting] = React.useState(false)
  const [form, setForm] = React.useState<FormState>(emptyForm)

  // ── Data loading ─────────────────────────────────────────────────────────────

  const loadEvents = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/events", { cache: "no-store" })
      if (!res.ok) throw new Error()
      const json = await res.json()
      setData(z.array(eventSchema).parse(json))
    } catch {
      toast.error("Failed to load events.")
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { void loadEvents() }, [loadEvents])

  // ── Dialog helpers ────────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditingEvent(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  // Pre-populate the form with the existing event's values when editing
  const openEdit = (e: SciOlyEvent) => {
    setEditingEvent(e)
    setForm({
      name: e.name,
      code: e.code ?? "",
      minParticipants: String(e.minParticipants),
      maxParticipants: String(e.maxParticipants),
      isTrialEvent: e.isTrialEvent,
      sortOrder: e.sortOrder != null ? String(e.sortOrder) : "",
    })
    setDialogOpen(true)
  }

  // ── CRUD handlers ─────────────────────────────────────────────────────────────

  const handleSave = React.useCallback(async () => {
    if (!form.name.trim()) { toast.error("Name is required."); return }
    const maxP = parseInt(form.maxParticipants)
    if (!maxP || maxP < 1) { toast.error("Max participants must be at least 1."); return }

    setSaving(true)
    try {
      const res = await fetch("/api/admin/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: editingEvent ? "edit" : "create",
          ...(editingEvent ? { id: editingEvent.id } : {}),
          name: form.name.trim(),
          code: form.code.trim() || undefined,
          minParticipants: parseInt(form.minParticipants) || 1,
          maxParticipants: maxP,
          isTrialEvent: form.isTrialEvent,
          sortOrder: form.sortOrder ? parseInt(form.sortOrder) : undefined,
        }),
      })
      if (!res.ok) throw new Error()
      toast.success(editingEvent ? "Event updated." : "Event created.")
      setDialogOpen(false)
      await loadEvents()
    } catch {
      toast.error(editingEvent ? "Failed to update event." : "Failed to create event.")
    } finally {
      setSaving(false)
    }
  }, [form, editingEvent, loadEvents])

  const handleDelete = React.useCallback(async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch("/api/admin/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id: deleteTarget.id }),
      })
      if (!res.ok) throw new Error()
      toast.success("Event deleted.")
      setDeleteTarget(null)
      await loadEvents()
    } catch {
      toast.error("Failed to delete event.")
    } finally {
      setDeleting(false)
    }
  }, [deleteTarget, loadEvents])

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6 px-8 py-4 lg:px-12 md:py-6">
      <PageHeader
        title="Events"
        description="Manage Science Olympiad disciplines for the active season."
      >
        <Button onClick={openCreate}>
          <IconPlus className="size-4" />
          New Event
        </Button>
      </PageHeader>

      {/* ── Loading ── */}
      {loading ? (
        <div className="flex h-48 items-center justify-center gap-2 text-sm text-muted-foreground">
          <IconLoader2 className="size-4 animate-spin" />
          Loading events...
        </div>

        /* ── Empty state ── */
      ) : data.length === 0 ? (
        <EmptyState
          icon={IconAtom}
          title="No events yet"
          description="Create the Science Olympiad disciplines for this season before scheduling competitions."
          action={
            <Button size="sm" onClick={openCreate}>
              <IconPlus className="size-4" />
              New Event
            </Button>
          }
        />

        /* ── Events list ── */
      ) : isMobile ? (
        // Mobile: card per event
        <div className="space-y-2">
          {data.map(e => (
            <div
              key={e.id}
              className="flex items-center justify-between rounded-xl border bg-card px-4 py-3 gap-3"
            >
              <div className="min-w-0 space-y-1">
                <div className="font-medium truncate">{e.name}</div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {e.code && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{e.code}</span>
                  )}
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    Max {e.maxParticipants}
                  </span>
                  {e.sortOrder != null && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      #{e.sortOrder}
                    </span>
                  )}
                  {e.isTrialEvent && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                      Trial
                    </span>
                  )}
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-8 shrink-0">
                    <IconDots className="size-4" />
                    <span className="sr-only">Actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => openEdit(e)}>
                    <IconEdit className="size-4" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setDeleteTarget(e)}>
                    <IconTrash className="size-4" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      ) : (
        // Desktop: full table — same component structure as members/applicants tables
        <div className="rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow className="h-12">
                <TableHead className="px-4 font-semibold text-foreground">Name</TableHead>
                <TableHead className="px-4 font-semibold text-foreground">Code</TableHead>
                <TableHead className="px-4 font-semibold text-foreground">Max</TableHead>
                <TableHead className="px-4 font-semibold text-foreground">Order</TableHead>
                <TableHead className="px-4 font-semibold text-foreground">Trial</TableHead>
                <TableHead className="px-4 font-semibold text-foreground"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map(e => (
                <TableRow key={e.id} className="hover:bg-muted/50">
                  <TableCell className="px-4 py-3 font-medium">
                    {e.name}
                    {e.isTrialEvent && (
                      <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">Trial</span>
                    )}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-muted-foreground">{e.code ?? "—"}</TableCell>
                  <TableCell className="px-4 py-3 text-muted-foreground">{e.maxParticipants}</TableCell>
                  <TableCell className="px-4 py-3 text-muted-foreground">{e.sortOrder ?? "—"}</TableCell>
                  <TableCell className="px-4 py-3 text-muted-foreground">
                    {e.isTrialEvent ? "Yes" : "No"}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8">
                          <IconDots className="size-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(e)}>
                          <IconEdit className="size-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setDeleteTarget(e)}>
                          <IconTrash className="size-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </div>
      )}

      {/* ── Create / Edit dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingEvent ? "Edit event" : "New event"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Field>
              <FieldLabel htmlFor="e-name">Name</FieldLabel>
              <Input
                id="e-name"
                placeholder="e.g. Bridge Building"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="e-code">Code (optional)</FieldLabel>
                <Input
                  id="e-code"
                  placeholder="e.g. BB"
                  value={form.code}
                  onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="e-order">Sort order</FieldLabel>
                <Input
                  id="e-order"
                  type="number"
                  min={1}
                  placeholder="e.g. 1"
                  value={form.sortOrder}
                  onChange={e => setForm(f => ({ ...f, sortOrder: e.target.value }))}
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="e-min">Min participants</FieldLabel>
                <Input
                  id="e-min"
                  type="number"
                  min={1}
                  value={form.minParticipants}
                  onChange={e => setForm(f => ({ ...f, minParticipants: e.target.value }))}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="e-max">Max participants</FieldLabel>
                <Input
                  id="e-max"
                  type="number"
                  min={1}
                  value={form.maxParticipants}
                  onChange={e => setForm(f => ({ ...f, maxParticipants: e.target.value }))}
                />
              </Field>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="e-trial"
                type="checkbox"
                checked={form.isTrialEvent}
                onChange={e => setForm(f => ({ ...f, isTrialEvent: e.target.checked }))}
                className="size-4 rounded border"
              />
              <label htmlFor="e-trial" className="text-sm">Trial event</label>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={() => void handleSave()} disabled={saving}>
              {saving && <IconLoader2 className="size-4 animate-spin" />}
              {editingEvent ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirmation dialog — uses default (dark) variant instead of red ── */}
      <Dialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete event?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This will also remove all enrollments and team assignments for this event.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</Button>
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
