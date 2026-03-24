"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  IconLoader2,
  IconTrophy,
  IconCalendar,
  IconMapPin,
  IconUsers,
  IconPlus,
  IconArrowRight,
  IconDots,
  IconEdit,
  IconTrash,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel } from "@/components/ui/field"
import { EmptyState } from "@/components/empty-state"
import { PageHeader } from "@/components/page-header"

// ─── Zod schema ──────────────────────────────────────────────────────────────

const competitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  location: z.string().optional().default(""),
  startsAt: z.string().optional().default(""),
  endsAt: z.string().optional().default(""),
  isPublished: z.boolean().optional().default(true),
  squadCount: z.number().optional().default(0),
  teamCount: z.number().optional().default(0),
  isEnded: z.boolean().optional().default(false),
})

type Competition = z.infer<typeof competitionSchema>

// ─── Display maps ─────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  PRACTICE:     "Practice",
  INVITATIONAL: "Invitational",
  REGIONAL:     "Regional",
  STATE:        "State",
  NATIONAL:     "National",
  OTHER:        "Other",
}

// Left accent bar colors — monochrome-friendly, no red
const TYPE_BAR: Record<string, string> = {
  PRACTICE:     "bg-zinc-400 dark:bg-zinc-500",
  INVITATIONAL: "bg-blue-500",
  REGIONAL:     "bg-amber-500",
  STATE:        "bg-orange-500",
  NATIONAL:     "bg-zinc-700 dark:bg-zinc-300",
  OTHER:        "bg-zinc-300 dark:bg-zinc-600",
}

// Inline type badge colors (subtle)
const TYPE_BADGE: Record<string, string> = {
  PRACTICE:     "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  INVITATIONAL: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  REGIONAL:     "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  STATE:        "bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  NATIONAL:     "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200",
  OTHER:        "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
}

const COMPETITION_TYPES = ["PRACTICE", "INVITATIONAL", "REGIONAL", "STATE", "NATIONAL", "OTHER"]

const selectClassName =
  "w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50"

type CompForm = { name: string; type: string; location: string; startsAt: string; endsAt: string }
const emptyForm: CompForm = { name: "", type: "INVITATIONAL", location: "", startsAt: "", endsAt: "" }

// ─── Component ────────────────────────────────────────────────────────────────

export default function CompetitionsPage() {
  const router = useRouter()

  const [data, setData] = React.useState<Competition[]>([])
  const [loading, setLoading] = React.useState(true)

  // Create
  const [createOpen, setCreateOpen] = React.useState(false)
  const [creating, setCreating] = React.useState(false)
  const [form, setForm] = React.useState<CompForm>(emptyForm)

  // Edit
  const [editTarget, setEditTarget] = React.useState<Competition | null>(null)
  const [editForm, setEditForm] = React.useState<CompForm>(emptyForm)
  const [editSaving, setEditSaving] = React.useState(false)

  // Delete
  const [deleteTarget, setDeleteTarget] = React.useState<Competition | null>(null)
  const [deleting, setDeleting] = React.useState(false)

  // Fetch all competitions for the active season
  const loadCompetitions = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/competitions", { cache: "no-store" })
      if (!res.ok) throw new Error()
      const json = await res.json()
      setData(z.array(competitionSchema).parse(json))
    } catch {
      toast.error("Failed to load competitions.")
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { void loadCompetitions() }, [loadCompetitions])

  // ── Create ────────────────────────────────────────────────────────────────

  const createCompetition = React.useCallback(async () => {
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
      const res = await fetch("/api/admin/competitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error()
      toast.success("Competition created.")
      setCreateOpen(false)
      setForm(emptyForm)
      await loadCompetitions()
    } catch {
      toast.error("Failed to create competition.")
    } finally {
      setCreating(false)
    }
  }, [form, loadCompetitions])

  // ── Edit ──────────────────────────────────────────────────────────────────

  const openEdit = (c: Competition) => {
    setEditTarget(c)
    setEditForm({ name: c.name, type: c.type, location: c.location ?? "", startsAt: c.startsAt ?? "", endsAt: c.endsAt ?? "" })
  }

  const saveEdit = React.useCallback(async () => {
    if (!editTarget) return
    if (!editForm.name.trim() || !editForm.startsAt) {
      toast.error("Name and start date are required.")
      return
    }
    if (editForm.endsAt && editForm.endsAt < editForm.startsAt) {
      toast.error("End date cannot be before start date.")
      return
    }
    setEditSaving(true)
    try {
      const res = await fetch("/api/admin/competitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "edit", id: editTarget.id, ...editForm }),
      })
      if (!res.ok) throw new Error()
      toast.success("Competition updated.")
      setEditTarget(null)
      await loadCompetitions()
    } catch {
      toast.error("Failed to update competition.")
    } finally {
      setEditSaving(false)
    }
  }, [editTarget, editForm, loadCompetitions])

  // ── Delete ────────────────────────────────────────────────────────────────

  const handleDelete = React.useCallback(async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch("/api/admin/competitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id: deleteTarget.id }),
      })
      if (!res.ok) throw new Error()
      toast.success("Competition deleted.")
      setDeleteTarget(null)
      await loadCompetitions()
    } catch {
      toast.error("Failed to delete competition.")
    } finally {
      setDeleting(false)
    }
  }, [deleteTarget, loadCompetitions])

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6 px-8 py-4 lg:px-12 md:py-6">
      <PageHeader
        title="Competitions"
        description="Manage team assignments for each competition."
      >
        <Button onClick={() => setCreateOpen(true)}>
          <IconPlus className="size-4" />
          New competition
        </Button>
      </PageHeader>

      {/* ── Loading state ── */}
      {loading ? (
        <div className="flex h-48 items-center justify-center gap-2 text-sm text-muted-foreground">
          <IconLoader2 className="size-4 animate-spin" />
          Loading competitions...
        </div>

      /* ── Empty state ── */
      ) : data.length === 0 ? (
        <EmptyState
          icon={IconTrophy}
          title="No competitions yet"
          description="Create a competition to start building squads."
          action={
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <IconPlus className="size-4" />
              New competition
            </Button>
          }
        />

      /* ── Competition list ── */
      ) : (
        <div className="flex flex-col gap-2">
          {data.map(c => (
            <div
              key={c.id}
              onClick={() => router.push(`/dashboard/competitions/${c.id}`)}
              className="group flex items-stretch gap-0 rounded-xl border bg-card overflow-hidden hover:border-primary/30 transition-all cursor-pointer"
            >
              {/* Left accent bar — color-coded by competition type */}
              <div className={`w-2 shrink-0 ${TYPE_BAR[c.type] ?? TYPE_BAR.OTHER}`} />

              {/* Main content area */}
              <div className="flex flex-1 items-center gap-4 px-5 py-4 min-w-0">
                {/* Name + badges */}
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold leading-tight truncate">{c.name}</h3>
                    {c.isEnded && (
                      <span className="hidden sm:inline-block shrink-0 rounded-full px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground">
                        Ended
                      </span>
                    )}
                    <span className={`hidden sm:inline-block shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_BADGE[c.type] ?? TYPE_BADGE.OTHER}`}>
                      {TYPE_LABELS[c.type] ?? c.type}
                    </span>
                  </div>

                  {/* Meta row — date and location */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    {c.startsAt && (
                      <span className="flex items-center gap-1">
                        <IconCalendar className="size-3 shrink-0" />
                        {new Date(c.startsAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                      </span>
                    )}
                    {c.location && (
                      <span className="flex items-center gap-1">
                        <IconMapPin className="size-3 shrink-0" />
                        {c.location}
                      </span>
                    )}
                  </div>
                </div>

                {/* Stats — hidden on very small screens */}
                <div className="hidden sm:flex items-center gap-4 shrink-0 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <IconTrophy className="size-3" />
                    {c.squadCount} {c.squadCount === 1 ? "squad" : "squads"}
                  </span>
                  <span className="flex items-center gap-1">
                    <IconUsers className="size-3" />
                    {c.teamCount} {c.teamCount === 1 ? "team" : "teams"} formed
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-8">
                        <IconDots className="size-4" />
                        <span className="sr-only">Actions</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(c)}>
                        <IconEdit className="size-4" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setDeleteTarget(c)}>
                        <IconTrash className="size-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Create competition dialog ── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New competition</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Field>
              <FieldLabel htmlFor="c-name">Name</FieldLabel>
              <Input
                id="c-name"
                placeholder="e.g. Broward Regional"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="c-type">Type</FieldLabel>
              <select
                id="c-type"
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className={selectClassName}
              >
                {COMPETITION_TYPES.map(t => (
                  <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                ))}
              </select>
            </Field>
            <Field>
              <FieldLabel htmlFor="c-location">Location</FieldLabel>
              <Input
                id="c-location"
                placeholder="School or venue name"
                value={form.location}
                onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="c-start">Start</FieldLabel>
                <Input
                  id="c-start"
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={e => setForm(f => ({ ...f, startsAt: e.target.value }))}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="c-end">End</FieldLabel>
                <Input
                  id="c-end"
                  type="datetime-local"
                  value={form.endsAt}
                  onChange={e => setForm(f => ({ ...f, endsAt: e.target.value }))}
                />
              </Field>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>
              Cancel
            </Button>
            <Button onClick={() => void createCompetition()} disabled={creating}>
              {creating && <IconLoader2 className="size-4 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit competition dialog ── */}
      <Dialog open={!!editTarget} onOpenChange={open => !open && setEditTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit competition</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Field>
              <FieldLabel htmlFor="ec-name">Name</FieldLabel>
              <Input
                id="ec-name"
                value={editForm.name}
                onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="ec-type">Type</FieldLabel>
              <select
                id="ec-type"
                value={editForm.type}
                onChange={e => setEditForm(f => ({ ...f, type: e.target.value }))}
                className={selectClassName}
              >
                {COMPETITION_TYPES.map(t => (
                  <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                ))}
              </select>
            </Field>
            <Field>
              <FieldLabel htmlFor="ec-location">Location</FieldLabel>
              <Input
                id="ec-location"
                value={editForm.location}
                onChange={e => setEditForm(f => ({ ...f, location: e.target.value }))}
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="ec-start">Start</FieldLabel>
                <Input
                  id="ec-start"
                  type="datetime-local"
                  value={editForm.startsAt}
                  onChange={e => setEditForm(f => ({ ...f, startsAt: e.target.value }))}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="ec-end">End</FieldLabel>
                <Input
                  id="ec-end"
                  type="datetime-local"
                  value={editForm.endsAt}
                  onChange={e => setEditForm(f => ({ ...f, endsAt: e.target.value }))}
                />
              </Field>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditTarget(null)} disabled={editSaving}>Cancel</Button>
            <Button onClick={() => void saveEdit()} disabled={editSaving}>
              {editSaving && <IconLoader2 className="size-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete competition dialog ── */}
      <Dialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete competition?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? All squads and team assignments will be permanently removed.
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