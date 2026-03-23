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
import { PageHeader } from "@/components/page-header"

const competitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  location: z.string().optional().default(""),
  startsAt: z.string().optional().default(""),
  endsAt: z.string().optional().default(""),
  isPublished: z.boolean().optional().default(true),
  teamCount: z.number().optional().default(0),
  memberCount: z.number().optional().default(0),
})

type Competition = z.infer<typeof competitionSchema>

const TYPE_LABELS: Record<string, string> = {
  PRACTICE: "Practice",
  INVITATIONAL: "Invitational",
  REGIONAL: "Regional",
  STATE: "State",
  NATIONAL: "National",
  OTHER: "Other",
}

const TYPE_COLORS: Record<string, string> = {
  PRACTICE: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  INVITATIONAL: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  REGIONAL: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  STATE: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  NATIONAL: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  OTHER: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
}

const COMPETITION_TYPES = ["PRACTICE", "INVITATIONAL", "REGIONAL", "STATE", "NATIONAL", "OTHER"]

const selectClassName =
  "w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50"

export default function TeamsPage() {
  const router = useRouter()
  const [data, setData] = React.useState<Competition[]>([])
  const [loading, setLoading] = React.useState(true)
  const [createOpen, setCreateOpen] = React.useState(false)
  const [creating, setCreating] = React.useState(false)
  const [form, setForm] = React.useState({
    name: "",
    type: "INVITATIONAL",
    location: "",
    startsAt: "",
    endsAt: "",
  })

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

  const createCompetition = React.useCallback(async () => {
    if (!form.name.trim() || !form.startsAt) {
      toast.error("Name and start date are required.")
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
      setForm({ name: "", type: "INVITATIONAL", location: "", startsAt: "", endsAt: "" })
      await loadCompetitions()
    } catch {
      toast.error("Failed to create competition.")
    } finally {
      setCreating(false)
    }
  }, [form, loadCompetitions])

  return (
    <div className="flex flex-col gap-6 px-4 py-4 lg:px-6 md:py-6">
      <PageHeader
        title="Teams"
        description="Manage team assignments for each competition."
      >
        <Button onClick={() => setCreateOpen(true)}>
          <IconPlus className="size-4" />
          New competition
        </Button>
      </PageHeader>

      {loading ? (
        <div className="flex h-48 items-center justify-center gap-2 text-sm text-muted-foreground">
          <IconLoader2 className="size-4 animate-spin" />
          Loading competitions...
        </div>
      ) : data.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-muted-foreground">
          <IconTrophy className="size-8 opacity-30" />
          <p className="text-sm">No competitions yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map(c => {
            const isEnded = !!c.endsAt && new Date(c.endsAt) < new Date()
            return (
            <div
              key={c.id}
              className="rounded-xl border bg-card p-5 space-y-4 hover:border-primary/40 transition-colors"
            >
              <div className="space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-semibold leading-tight">{c.name}</h2>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {isEnded && (
                      <span className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                        Ended
                      </span>
                    )}
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${TYPE_COLORS[c.type] ?? TYPE_COLORS.OTHER}`}
                    >
                      {TYPE_LABELS[c.type] ?? c.type}
                    </span>
                  </div>
                </div>
                {c.location && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <IconMapPin className="size-3.5 shrink-0" />
                    {c.location}
                  </div>
                )}
                {c.startsAt && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <IconCalendar className="size-3.5 shrink-0" />
                    {c.startsAt}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 text-sm text-muted-foreground border-t pt-3">
                <div className="flex items-center gap-1.5">
                  <IconTrophy className="size-3.5" />
                  <span>{c.teamCount} {c.teamCount === 1 ? "team" : "teams"}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <IconUsers className="size-3.5" />
                  <span>{c.memberCount} assigned</span>
                </div>
              </div>

              <Button
                className="w-full"
                variant={isEnded ? "outline" : "default"}
                onClick={() => router.push(`/dashboard/teams/${c.id}`)}
              >
                {isEnded ? "View Teams" : "Open Team Builder"}
              </Button>
            </div>
          )})}
        </div>
      )}

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
                <FieldLabel htmlFor="c-start">Start date</FieldLabel>
                <Input
                  id="c-start"
                  type="date"
                  value={form.startsAt}
                  onChange={e => setForm(f => ({ ...f, startsAt: e.target.value }))}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="c-end">End date</FieldLabel>
                <Input
                  id="c-end"
                  type="date"
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
    </div>
  )
}
