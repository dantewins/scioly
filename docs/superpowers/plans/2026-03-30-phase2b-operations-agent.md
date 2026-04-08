# Phase 2B — Operations Agent Implementation Plan

> **Agent:** Operations Agent
> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use `- [ ]` checkbox syntax for tracking.

**Goal:** Science Olympiad event CRUD, competition management, team assembly, and event scheduling — all scoped to the active season.

**Permission flags used:** `view_events`, `create_events`, `edit_events`, `delete_events`, `view_competitions`, `create_competitions`, `edit_competitions`, `delete_competitions`, `view_teams`, `create_teams`, `edit_teams`, `delete_teams`
**Pattern:** Dashboard pages = server components. API routes use `withPermission(flag)`. Always scope queries to `user.clubId` via the active season.

---

## File Map

| File | Action |
|---|---|
| `app/api/admin/events/route.ts` | Create — GET list, POST create event |
| `app/api/admin/events/[id]/route.ts` | Create — PATCH update, DELETE event |
| `app/api/admin/events/[id]/enrollments/route.ts` | Create — GET enrollments, PATCH member enrollment status |
| `app/api/admin/competitions/route.ts` | Create — GET list, POST create |
| `app/api/admin/competitions/[id]/route.ts` | Create — GET detail + schedule, PATCH update, DELETE |
| `app/api/admin/competitions/[id]/schedule/route.ts` | Create — POST add event to schedule, DELETE remove |
| `app/api/admin/teams/route.ts` | Create — GET list, POST create team |
| `app/api/admin/teams/[id]/route.ts` | Create — GET detail, PATCH update, DELETE |
| `app/api/admin/teams/[id]/members/route.ts` | Create — POST add member, DELETE remove |
| `app/dashboard/events/page.tsx` | Replace stub |
| `app/dashboard/competitions/page.tsx` | Replace stub |
| `app/dashboard/competitions/[id]/page.tsx` | Create |
| `app/dashboard/teams/page.tsx` | Replace stub |
| `app/dashboard/teams/[teamId]/page.tsx` | Create |

---

## Task 1: Events API

**Files:**
- Create: `app/api/admin/events/route.ts`
- Create: `app/api/admin/events/[id]/route.ts`
- Create: `app/api/admin/events/[id]/enrollments/route.ts`

- [ ] **Step 1: Write events list + create**

```ts
// app/api/admin/events/route.ts
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withPermission, ok, err } from "@/lib/api"
import { getActiveSeason } from "@/lib/db"

export const dynamic = "force-dynamic"

export const GET = withPermission("view_events", async (_req, _ctx, user) => {
  const season = await getActiveSeason(user.clubId)
  if (!season) return err("No active season.", 400)

  const events = await prisma.event.findMany({
    where: { seasonId: season.id },
    include: {
      _count: { select: { enrollments: true, teams: true } },
    },
    orderBy: { sortOrder: "asc" },
  })
  return ok(events)
})

const createSchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().max(10).optional(),
  description: z.string().max(500).optional(),
  minParticipants: z.number().int().min(1).default(2),
  maxParticipants: z.number().int().min(1).default(2),
  isTrialEvent: z.boolean().default(false),
  sortOrder: z.number().int().optional(),
})

export const POST = withPermission("create_events", async (req, _ctx, user) => {
  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input.", 400)

  const season = await getActiveSeason(user.clubId)
  if (!season) return err("No active season.", 400)

  const existing = await prisma.event.findUnique({
    where: { seasonId_name: { seasonId: season.id, name: parsed.data.name } },
  })
  if (existing) return err("An event with this name already exists.", 409)

  const event = await prisma.event.create({
    data: { seasonId: season.id, ...parsed.data },
  })
  return ok(event, 201)
})
```

- [ ] **Step 2: Write event update + delete**

```ts
// app/api/admin/events/[id]/route.ts
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withPermission, ok, err } from "@/lib/api"
import { getActiveSeason } from "@/lib/db"

export const dynamic = "force-dynamic"

async function resolveEvent(eventId: string, clubId: string) {
  return prisma.event.findFirst({
    where: { id: eventId, season: { clubId } },
  })
}

const patchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  code: z.string().max(10).optional(),
  description: z.string().max(500).optional(),
  minParticipants: z.number().int().min(1).optional(),
  maxParticipants: z.number().int().min(1).optional(),
  isTrialEvent: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
})

export const PATCH = withPermission(
  "edit_events",
  async (req, ctx: { params: Promise<{ id: string }> }, user) => {
    const { id } = await ctx.params
    const body = await req.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input.", 400)

    const event = await resolveEvent(id, user.clubId)
    if (!event) return err("Event not found.", 404)

    const updated = await prisma.event.update({
      where: { id },
      data: parsed.data,
    })
    return ok(updated)
  },
)

export const DELETE = withPermission(
  "delete_events",
  async (_req, ctx: { params: Promise<{ id: string }> }, user) => {
    const { id } = await ctx.params
    const event = await resolveEvent(id, user.clubId)
    if (!event) return err("Event not found.", 404)

    await prisma.event.delete({ where: { id } })
    return ok({ ok: true })
  },
)
```

- [ ] **Step 3: Write enrollments sub-resource**

```ts
// app/api/admin/events/[id]/enrollments/route.ts
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withPermission, ok, err } from "@/lib/api"
import { getActiveSeason } from "@/lib/db"

export const dynamic = "force-dynamic"

export const GET = withPermission(
  "view_events",
  async (_req, ctx: { params: Promise<{ id: string }> }, user) => {
    const { id: eventId } = await ctx.params
    const season = await getActiveSeason(user.clubId)
    if (!season) return err("No active season.", 400)

    const enrollments = await prisma.eventEnrollment.findMany({
      where: { eventId, memberSeason: { seasonId: season.id, user: { clubId: user.clubId } } },
      include: {
        memberSeason: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true, gradeLevel: true } },
          },
        },
      },
      orderBy: { memberSeason: { user: { lastName: "asc" } } },
    })
    return ok(enrollments)
  },
)

const patchSchema = z.object({
  memberSeasonId: z.string(),
  status: z.enum(["INTERESTED", "TRYOUT_PENDING", "ACTIVE", "WAITLISTED", "DROPPED"]),
})

export const PATCH = withPermission(
  "edit_events",
  async (req, ctx: { params: Promise<{ id: string }> }, user) => {
    const { id: eventId } = await ctx.params
    const body = await req.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input.", 400)

    const enrollment = await prisma.eventEnrollment.findFirst({
      where: {
        eventId,
        memberSeasonId: parsed.data.memberSeasonId,
        event: { season: { clubId: user.clubId } },
      },
    })
    if (!enrollment) return err("Enrollment not found.", 404)

    const updated = await prisma.eventEnrollment.update({
      where: { id: enrollment.id },
      data: { status: parsed.data.status },
    })
    return ok(updated)
  },
)
```

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "admin/events" | head -10
```

- [ ] **Step 5: Commit**

```bash
git add app/api/admin/events/
git commit -m "feat: events CRUD API with enrollment management"
```

---

## Task 2: Events dashboard page

**Files:**
- Replace stub: `app/dashboard/events/page.tsx`

- [ ] **Step 1: Write events page**

```tsx
// app/dashboard/events/page.tsx
import { redirect } from "next/navigation"
import { IconAtom, IconPlus } from "@tabler/icons-react"
import { getCurrentUser } from "@/lib/auth"
import { canView, canCreate } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { getActiveSeason } from "@/lib/db"
import { PageHeader } from "@/components/page-header"
import { EmptyState } from "@/components/empty-state"
import { Badge } from "@/components/ui/badge"
import { EventsManager } from "./events-manager"

export const dynamic = "force-dynamic"

export default async function EventsPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  if (!canView(user.permissions, "events")) redirect("/dashboard")

  const season = await getActiveSeason(user.clubId)
  const events = season
    ? await prisma.event.findMany({
        where: { seasonId: season.id },
        include: { _count: { select: { enrollments: true, teams: true } } },
        orderBy: { sortOrder: "asc" },
      })
    : []

  const canManage = canCreate(user.permissions, "events")

  return (
    <div className="flex flex-col gap-6 py-4 lg:px-6 md:py-6 sm:px-4 px-0">
      <PageHeader title="Events" description={season ? `${events.length} events in ${season.name ?? "active season"}` : "No active season"}>
        {/* Create button rendered client-side in EventsManager */}
      </PageHeader>

      {!season ? (
        <EmptyState icon={IconAtom} title="No active season" description="Create a season in Settings to get started." />
      ) : events.length === 0 ? (
        <EmptyState icon={IconAtom} title="No events yet" description="Add the Science Olympiad events for this season." />
      ) : (
        <EventsManager initialEvents={events} canManage={canManage} />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create EventsManager client component**

Create `app/dashboard/events/events-manager.tsx`:

```tsx
// app/dashboard/events/events-manager.tsx
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
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

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
            <CardContent">
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
        <DialogContent>
          <DialogHeader><DialogTitle>New Event</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Event Name</Label>
              <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Anatomy & Physiology" />
            </div>
            <div className="space-y-1.5">
              <Label>Code (optional)</Label>
              <Input value={form.code} onChange={(e) => setForm(f => ({ ...f, code: e.target.value }))} placeholder="ANP" maxLength={10} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Min Participants</Label>
                <Input type="number" min={1} value={form.minParticipants} onChange={(e) => setForm(f => ({ ...f, minParticipants: parseInt(e.target.value) || 1 }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Max Participants</Label>
                <Input type="number" min={1} value={form.maxParticipants} onChange={(e) => setForm(f => ({ ...f, maxParticipants: parseInt(e.target.value) || 1 }))} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="trial" checked={form.isTrialEvent} onCheckedChange={(v) => setForm(f => ({ ...f, isTrialEvent: v }))} />
              <Label htmlFor="trial">Trial event</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreating(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={loading || !form.name.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      {editing && (
        <Dialog open onOpenChange={() => setEditing(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit Event</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Event Name</Label>
                <Input value={editing.name} onChange={(e) => setEditing(x => x ? { ...x, name: e.target.value } : x)} />
              </div>
              <div className="space-y-1.5">
                <Label>Code</Label>
                <Input value={editing.code ?? ""} onChange={(e) => setEditing(x => x ? { ...x, code: e.target.value } : x)} maxLength={10} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Min Participants</Label>
                  <Input type="number" min={1} value={editing.minParticipants} onChange={(e) => setEditing(x => x ? { ...x, minParticipants: parseInt(e.target.value) || 1 } : x)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Max Participants</Label>
                  <Input type="number" min={1} value={editing.maxParticipants} onChange={(e) => setEditing(x => x ? { ...x, maxParticipants: parseInt(e.target.value) || 1 } : x)} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="trial-edit" checked={editing.isTrialEvent} onCheckedChange={(v) => setEditing(x => x ? { ...x, isTrialEvent: v } : x)} />
                <Label htmlFor="trial-edit">Trial event</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={handleSave} disabled={loading}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep -E "dashboard/events" | head -5
```

- [ ] **Step 4: Commit**

```bash
git add app/dashboard/events/
git commit -m "feat: events management page with CRUD"
```

---

## Task 3: Competitions API

**Files:**
- Create: `app/api/admin/competitions/route.ts`
- Create: `app/api/admin/competitions/[id]/route.ts`
- Create: `app/api/admin/competitions/[id]/schedule/route.ts`

- [ ] **Step 1: Write competitions list + create**

```ts
// app/api/admin/competitions/route.ts
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withPermission, ok, err } from "@/lib/api"
import { getActiveSeason } from "@/lib/db"

export const dynamic = "force-dynamic"

export const GET = withPermission("view_competitions", async (_req, _ctx, user) => {
  const season = await getActiveSeason(user.clubId)
  if (!season) return err("No active season.", 400)

  const competitions = await prisma.competition.findMany({
    where: { seasonId: season.id },
    include: {
      _count: { select: { teams: true, eventSchedules: true } },
    },
    orderBy: { startsAt: "asc" },
  })
  return ok(competitions)
})

const createSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(["PRACTICE", "INVITATIONAL", "REGIONAL", "STATE", "NATIONAL", "OTHER"]).default("OTHER"),
  location: z.string().max(200).optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().optional(),
  notes: z.string().max(1000).optional(),
  isPublished: z.boolean().default(false),
})

export const POST = withPermission("create_competitions", async (req, _ctx, user) => {
  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input.", 400)

  const season = await getActiveSeason(user.clubId)
  if (!season) return err("No active season.", 400)

  const competition = await prisma.competition.create({
    data: { seasonId: season.id, ...parsed.data },
  })
  return ok(competition, 201)
})
```

- [ ] **Step 2: Write competition detail + update + delete**

```ts
// app/api/admin/competitions/[id]/route.ts
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withPermission, ok, err } from "@/lib/api"

export const dynamic = "force-dynamic"

async function resolveComp(id: string, clubId: string) {
  return prisma.competition.findFirst({
    where: { id, season: { clubId } },
  })
}

export const GET = withPermission(
  "view_competitions",
  async (_req, ctx: { params: Promise<{ id: string }> }, user) => {
    const { id } = await ctx.params
    const competition = await prisma.competition.findFirst({
      where: { id, season: { clubId: user.clubId } },
      include: {
        teams: {
          include: {
            assignments: {
              include: {
                memberSeason: {
                  include: { user: { select: { id: true, firstName: true, lastName: true } } },
                },
              },
            },
            event: { select: { id: true, name: true, code: true } },
          },
        },
        eventSchedules: {
          include: { event: { select: { id: true, name: true, code: true } } },
          orderBy: { timeSlot: "asc" },
        },
      },
    })
    if (!competition) return err("Competition not found.", 404)
    return ok(competition)
  },
)

const patchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  type: z.enum(["PRACTICE", "INVITATIONAL", "REGIONAL", "STATE", "NATIONAL", "OTHER"]).optional(),
  location: z.string().max(200).optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  notes: z.string().max(1000).optional(),
  isPublished: z.boolean().optional(),
})

export const PATCH = withPermission(
  "edit_competitions",
  async (req, ctx: { params: Promise<{ id: string }> }, user) => {
    const { id } = await ctx.params
    const body = await req.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input.", 400)

    const comp = await resolveComp(id, user.clubId)
    if (!comp) return err("Competition not found.", 404)

    const updated = await prisma.competition.update({ where: { id }, data: parsed.data })
    return ok(updated)
  },
)

export const DELETE = withPermission(
  "delete_competitions",
  async (_req, ctx: { params: Promise<{ id: string }> }, user) => {
    const { id } = await ctx.params
    const comp = await resolveComp(id, user.clubId)
    if (!comp) return err("Competition not found.", 404)

    await prisma.competition.delete({ where: { id } })
    return ok({ ok: true })
  },
)
```

- [ ] **Step 3: Write event schedule sub-resource**

```ts
// app/api/admin/competitions/[id]/schedule/route.ts
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withPermission, ok, err } from "@/lib/api"

export const dynamic = "force-dynamic"

const addSchema = z.object({
  eventId: z.string(),
  timeSlot: z.number().int().min(1),
  slotLabel: z.string().max(50).optional(),
})

export const POST = withPermission(
  "edit_competitions",
  async (req, ctx: { params: Promise<{ id: string }> }, user) => {
    const { id: competitionId } = await ctx.params
    const body = await req.json()
    const parsed = addSchema.safeParse(body)
    if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input.", 400)

    // Verify competition belongs to this club
    const comp = await prisma.competition.findFirst({
      where: { id: competitionId, season: { clubId: user.clubId } },
    })
    if (!comp) return err("Competition not found.", 404)

    const schedule = await prisma.eventSchedule.upsert({
      where: { competitionId_eventId: { competitionId, eventId: parsed.data.eventId } },
      create: { competitionId, ...parsed.data },
      update: { timeSlot: parsed.data.timeSlot, slotLabel: parsed.data.slotLabel },
    })
    return ok(schedule, 201)
  },
)

export const DELETE = withPermission(
  "edit_competitions",
  async (req, ctx: { params: Promise<{ id: string }> }, user) => {
    const { id: competitionId } = await ctx.params
    const body = await req.json()
    const { eventId } = body as { eventId: string }

    const comp = await prisma.competition.findFirst({
      where: { id: competitionId, season: { clubId: user.clubId } },
    })
    if (!comp) return err("Competition not found.", 404)

    await prisma.eventSchedule.deleteMany({ where: { competitionId, eventId } })
    return ok({ ok: true })
  },
)
```

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "admin/competitions" | head -10
```

- [ ] **Step 5: Commit**

```bash
git add app/api/admin/competitions/
git commit -m "feat: competitions CRUD API with event schedule management"
```

---

## Task 4: Competitions dashboard pages

**Files:**
- Replace stub: `app/dashboard/competitions/page.tsx`
- Create: `app/dashboard/competitions/[id]/page.tsx`

- [ ] **Step 1: Write competitions list page**

```tsx
// app/dashboard/competitions/page.tsx
import { redirect } from "next/navigation"
import Link from "next/link"
import { IconTrophy, IconPlus, IconMapPin, IconCalendar } from "@tabler/icons-react"
import { getCurrentUser } from "@/lib/auth"
import { canView, canCreate } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { getActiveSeason } from "@/lib/db"
import { PageHeader } from "@/components/page-header"
import { EmptyState } from "@/components/empty-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { formatDateOnly } from "@/lib/format"
import { CreateCompetitionDialog } from "./create-competition-dialog"

export const dynamic = "force-dynamic"

const TYPE_COLORS: Record<string, string> = {
  INVITATIONAL: "bg-blue-100 text-blue-800",
  REGIONAL: "bg-purple-100 text-purple-800",
  STATE: "bg-orange-100 text-orange-800",
  NATIONAL: "bg-red-100 text-red-800",
  PRACTICE: "bg-green-100 text-green-800",
  OTHER: "bg-gray-100 text-gray-800",
}

export default async function CompetitionsPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  if (!canView(user.permissions, "competitions")) redirect("/dashboard")

  const season = await getActiveSeason(user.clubId)
  const competitions = season
    ? await prisma.competition.findMany({
        where: { seasonId: season.id },
        include: { _count: { select: { teams: true, eventSchedules: true } } },
        orderBy: { startsAt: "asc" },
      })
    : []

  const canManage = canCreate(user.permissions, "competitions")

  return (
    <div className="flex flex-col gap-6 py-4 lg:px-6 md:py-6 sm:px-4 px-0">
      <PageHeader title="Competitions" description={`${competitions.length} competition${competitions.length !== 1 ? "s" : ""}`}>
        {canManage && season && <CreateCompetitionDialog />}
      </PageHeader>

      {!season ? (
        <EmptyState icon={IconTrophy} title="No active season" description="Create a season in Settings first." />
      ) : competitions.length === 0 ? (
        <EmptyState icon={IconTrophy} title="No competitions yet" description="Add your first competition for this season." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {competitions.map((comp) => (
            <Link key={comp.id} href={`/dashboard/competitions/${comp.id}`}>
              <Card className="hover:bg-muted/30 transition-colors cursor-pointer">
                <CardContent space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-sm leading-tight">{comp.name}</p>
                    <Badge className={TYPE_COLORS[comp.type] ?? ""} variant="outline">
                      {comp.type}
                    </Badge>
                  </div>
                  {comp.location && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <IconMapPin className="size-3" />
                      {comp.location}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <IconCalendar className="size-3" />
                    {formatDateOnly(comp.startsAt)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {comp._count.teams} teams · {comp._count.eventSchedules} events scheduled
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create CreateCompetitionDialog client component**

Create `app/dashboard/competitions/create-competition-dialog.tsx`:

```tsx
// app/dashboard/competitions/create-competition-dialog.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { IconPlus } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"

const TYPES = ["PRACTICE", "INVITATIONAL", "REGIONAL", "STATE", "NATIONAL", "OTHER"] as const

export function CreateCompetitionDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: "", type: "INVITATIONAL" as string,
    location: "", startsAt: "", endsAt: "",
  })

  async function handleCreate() {
    if (!form.name || !form.startsAt) { toast.error("Name and start date are required."); return }
    setLoading(true)
    try {
      const res = await fetch("/api/admin/competitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          startsAt: new Date(form.startsAt).toISOString(),
          endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.message ?? "Failed to create."); return }
      toast.success("Competition created.")
      setOpen(false)
      router.refresh()
      router.push(`/dashboard/competitions/${data.id}`)
    } finally { setLoading(false) }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} size="sm">
        <IconPlus className="size-4 mr-1.5" />Add Competition
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Competition</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input placeholder="Spring Invitational 2026" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Location (optional)</Label>
              <Input value={form.location} onChange={(e) => setForm(f => ({ ...f, location: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Start Date</Label>
                <Input type="date" value={form.startsAt} onChange={(e) => setForm(f => ({ ...f, startsAt: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>End Date (optional)</Label>
                <Input type="date" value={form.endsAt} onChange={(e) => setForm(f => ({ ...f, endsAt: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={loading || !form.name}>{loading ? "Creating..." : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
```

- [ ] **Step 3: Write competition detail page**

```tsx
// app/dashboard/competitions/[id]/page.tsx
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { IconArrowLeft, IconCalendar, IconMapPin } from "@tabler/icons-react"
import { getCurrentUser } from "@/lib/auth"
import { canView, canEdit } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDateOnly } from "@/lib/format"

export const dynamic = "force-dynamic"

interface Props { params: Promise<{ id: string }> }

export default async function CompetitionDetailPage({ params }: Props) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  if (!canView(user.permissions, "competitions")) redirect("/dashboard")

  const competition = await prisma.competition.findFirst({
    where: { id, season: { clubId: user.clubId } },
    include: {
      teams: {
        include: {
          event: { select: { id: true, name: true, code: true } },
          assignments: {
            include: {
              memberSeason: {
                include: { user: { select: { id: true, firstName: true, lastName: true } } },
              },
            },
          },
        },
      },
      eventSchedules: {
        include: { event: { select: { id: true, name: true, code: true } } },
        orderBy: { timeSlot: "asc" },
      },
    },
  })
  if (!competition) notFound()

  const canManage = canEdit(user.permissions, "competitions")

  return (
    <div className="flex flex-col gap-6 py-4 lg:px-6 md:py-6 sm:px-4 px-0">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/competitions"><IconArrowLeft className="size-4" /></Link>
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold truncate">{competition.name}</h1>
            <Badge variant="outline">{competition.type}</Badge>
            {competition.isPublished && <Badge variant="secondary">Published</Badge>}
          </div>
          <div className="flex items-center gap-4 mt-0.5 text-sm text-muted-foreground">
            {competition.location && (
              <span className="flex items-center gap-1"><IconMapPin className="size-3" />{competition.location}</span>
            )}
            <span className="flex items-center gap-1"><IconCalendar className="size-3" />{formatDateOnly(competition.startsAt)}</span>
          </div>
        </div>
      </div>

      <Tabs defaultValue="teams">
        <TabsList>
          <TabsTrigger value="teams">Teams ({competition.teams.length})</TabsTrigger>
          <TabsTrigger value="schedule">Schedule ({competition.eventSchedules.length})</TabsTrigger>
        </TabsList>

        {/* Teams Tab */}
        <TabsContent value="teams" className="mt-4 space-y-3">
          {competition.teams.length === 0 ? (
            <p className="text-sm text-muted-foreground">No teams for this competition yet.</p>
          ) : (
            competition.teams.map((team) => (
              <Card key={team.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    {team.label}
                    {team.event && (
                      <Badge variant="secondary" className="text-xs font-normal">
                        {team.event.name}
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-1">
                    {team.assignments.map((a) => (
                      <Badge key={a.id} variant="outline" className="text-xs font-normal">
                        {a.memberSeason.user.firstName} {a.memberSeason.user.lastName}
                        {a.role !== "MEMBER" && ` (${a.role})`}
                      </Badge>
                    ))}
                    {team.assignments.length === 0 && (
                      <span className="text-xs text-muted-foreground">No members assigned.</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
          {canManage && (
            <Link href={`/dashboard/teams?competition=${id}`}>
              <Button variant="outline" size="sm">Manage Teams</Button>
            </Link>
          )}
        </TabsContent>

        {/* Schedule Tab */}
        <TabsContent value="schedule" className="mt-4">
          {competition.eventSchedules.length === 0 ? (
            <p className="text-sm text-muted-foreground">No events scheduled yet.</p>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">Slot</th>
                    <th className="text-left px-4 py-2 font-medium">Event</th>
                    <th className="text-left px-4 py-2 font-medium">Label</th>
                  </tr>
                </thead>
                <tbody>
                  {competition.eventSchedules.map((s) => (
                    <tr key={s.id} className="border-t">
                      <td className="px-4 py-2 font-mono text-xs">{s.timeSlot}</td>
                      <td className="px-4 py-2">{s.event.name}</td>
                      <td className="px-4 py-2 text-muted-foreground">{s.slotLabel ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep -E "dashboard/competitions" | head -10
```

- [ ] **Step 5: Commit**

```bash
git add app/dashboard/competitions/
git commit -m "feat: competitions list and detail pages"
```

---

## Task 5: Teams API

**Files:**
- Create: `app/api/admin/teams/route.ts`
- Create: `app/api/admin/teams/[id]/route.ts`
- Create: `app/api/admin/teams/[id]/members/route.ts`

- [ ] **Step 1: Write teams list + create**

```ts
// app/api/admin/teams/route.ts
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withPermission, ok, err } from "@/lib/api"
import { getActiveSeason } from "@/lib/db"

export const dynamic = "force-dynamic"

export const GET = withPermission("view_teams", async (req, _ctx, user) => {
  const season = await getActiveSeason(user.clubId)
  if (!season) return err("No active season.", 400)

  const url = new URL(req.url)
  const competitionId = url.searchParams.get("competition") ?? undefined
  const eventId = url.searchParams.get("event") ?? undefined

  const teams = await prisma.team.findMany({
    where: {
      seasonId: season.id,
      ...(competitionId && { competitionId }),
      ...(eventId && { eventId }),
    },
    include: {
      competition: { select: { id: true, name: true } },
      event: { select: { id: true, name: true, code: true } },
      assignments: {
        include: {
          memberSeason: {
            include: { user: { select: { id: true, firstName: true, lastName: true } } },
          },
        },
      },
    },
    orderBy: { label: "asc" },
  })
  return ok(teams)
})

const createSchema = z.object({
  label: z.string().min(1).max(50),
  competitionId: z.string().optional(),
  eventId: z.string().optional(),
  memberLimit: z.number().int().min(1).optional(),
  notes: z.string().max(500).optional(),
})

export const POST = withPermission("create_teams", async (req, _ctx, user) => {
  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input.", 400)

  const season = await getActiveSeason(user.clubId)
  if (!season) return err("No active season.", 400)

  const team = await prisma.team.create({
    data: { seasonId: season.id, ...parsed.data },
  })
  return ok(team, 201)
})
```

- [ ] **Step 2: Write team detail + update + delete**

```ts
// app/api/admin/teams/[id]/route.ts
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withPermission, ok, err } from "@/lib/api"

export const dynamic = "force-dynamic"

async function resolveTeam(id: string, clubId: string) {
  return prisma.team.findFirst({ where: { id, season: { clubId } } })
}

export const GET = withPermission(
  "view_teams",
  async (_req, ctx: { params: Promise<{ id: string }> }, user) => {
    const { id } = await ctx.params
    const team = await prisma.team.findFirst({
      where: { id, season: { clubId: user.clubId } },
      include: {
        competition: { select: { id: true, name: true } },
        event: { select: { id: true, name: true, code: true } },
        assignments: {
          include: {
            memberSeason: {
              include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
            },
          },
        },
      },
    })
    if (!team) return err("Team not found.", 404)
    return ok(team)
  },
)

const patchSchema = z.object({
  label: z.string().min(1).max(50).optional(),
  competitionId: z.string().nullable().optional(),
  eventId: z.string().nullable().optional(),
  notes: z.string().max(500).optional(),
})

export const PATCH = withPermission(
  "edit_teams",
  async (req, ctx: { params: Promise<{ id: string }> }, user) => {
    const { id } = await ctx.params
    const body = await req.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input.", 400)

    const team = await resolveTeam(id, user.clubId)
    if (!team) return err("Team not found.", 404)

    const updated = await prisma.team.update({ where: { id }, data: parsed.data })
    return ok(updated)
  },
)

export const DELETE = withPermission(
  "delete_teams",
  async (_req, ctx: { params: Promise<{ id: string }> }, user) => {
    const { id } = await ctx.params
    const team = await resolveTeam(id, user.clubId)
    if (!team) return err("Team not found.", 404)

    await prisma.team.delete({ where: { id } })
    return ok({ ok: true })
  },
)
```

- [ ] **Step 3: Write team member assignment**

```ts
// app/api/admin/teams/[id]/members/route.ts
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withPermission, ok, err } from "@/lib/api"

export const dynamic = "force-dynamic"

const addSchema = z.object({
  memberSeasonId: z.string(),
  role: z.enum(["MEMBER", "CAPTAIN", "ALTERNATE"]).default("MEMBER"),
  seatNumber: z.number().int().optional(),
})

export const POST = withPermission(
  "edit_teams",
  async (req, ctx: { params: Promise<{ id: string }> }, user) => {
    const { id: teamId } = await ctx.params
    const body = await req.json()
    const parsed = addSchema.safeParse(body)
    if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input.", 400)

    const team = await prisma.team.findFirst({
      where: { id: teamId, season: { clubId: user.clubId } },
    })
    if (!team) return err("Team not found.", 404)

    // Verify memberSeason is in same club
    const ms = await prisma.memberSeason.findFirst({
      where: { id: parsed.data.memberSeasonId, season: { clubId: user.clubId } },
    })
    if (!ms) return err("Member not found.", 404)

    const assignment = await prisma.teamAssignment.upsert({
      where: { teamId_memberSeasonId: { teamId, memberSeasonId: parsed.data.memberSeasonId } },
      create: { teamId, ...parsed.data },
      update: { role: parsed.data.role, seatNumber: parsed.data.seatNumber },
    })
    return ok(assignment, 201)
  },
)

const removeSchema = z.object({ memberSeasonId: z.string() })

export const DELETE = withPermission(
  "edit_teams",
  async (req, ctx: { params: Promise<{ id: string }> }, user) => {
    const { id: teamId } = await ctx.params
    const body = await req.json()
    const parsed = removeSchema.safeParse(body)
    if (!parsed.success) return err("Invalid input.", 400)

    const team = await prisma.team.findFirst({
      where: { id: teamId, season: { clubId: user.clubId } },
    })
    if (!team) return err("Team not found.", 404)

    await prisma.teamAssignment.deleteMany({
      where: { teamId, memberSeasonId: parsed.data.memberSeasonId },
    })
    return ok({ ok: true })
  },
)
```

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "admin/teams" | head -10
```

- [ ] **Step 5: Commit**

```bash
git add app/api/admin/teams/
git commit -m "feat: teams CRUD API with member assignment"
```

---

## Task 6: Teams dashboard pages

**Files:**
- Replace stub: `app/dashboard/teams/page.tsx`
- Create: `app/dashboard/teams/[teamId]/page.tsx`

- [ ] **Step 1: Write teams list page**

```tsx
// app/dashboard/teams/page.tsx
import { redirect } from "next/navigation"
import Link from "next/link"
import { IconChartBar } from "@tabler/icons-react"
import { getCurrentUser } from "@/lib/auth"
import { canView, canCreate } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { getActiveSeason } from "@/lib/db"
import { PageHeader } from "@/components/page-header"
import { EmptyState } from "@/components/empty-state"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { CreateTeamButton } from "./create-team-button"

export const dynamic = "force-dynamic"

export default async function TeamsPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  if (!canView(user.permissions, "teams")) redirect("/dashboard")

  const season = await getActiveSeason(user.clubId)

  // Fetch competitions for the create dialog
  const [teams, competitions, events] = season ? await Promise.all([
    prisma.team.findMany({
      where: { seasonId: season.id },
      include: {
        competition: { select: { id: true, name: true } },
        event: { select: { id: true, name: true, code: true } },
        _count: { select: { assignments: true } },
      },
      orderBy: { label: "asc" },
    }),
    prisma.competition.findMany({
      where: { seasonId: season.id },
      select: { id: true, name: true },
      orderBy: { startsAt: "asc" },
    }),
    prisma.event.findMany({
      where: { seasonId: season.id },
      select: { id: true, name: true, code: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]) : [[], [], []]

  const canManage = canCreate(user.permissions, "teams")

  return (
    <div className="flex flex-col gap-6 py-4 lg:px-6 md:py-6 sm:px-4 px-0">
      <PageHeader title="Teams" description={`${teams.length} team${teams.length !== 1 ? "s" : ""} this season`}>
        {canManage && season && (
          <CreateTeamButton competitions={competitions} events={events} />
        )}
      </PageHeader>

      {!season ? (
        <EmptyState icon={IconChartBar} title="No active season" />
      ) : teams.length === 0 ? (
        <EmptyState icon={IconChartBar} title="No teams yet" description="Create teams and assign members." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <Link key={team.id} href={`/dashboard/teams/${team.id}`}>
              <Card className="hover:bg-muted/30 transition-colors cursor-pointer">
                <CardContent space-y-1.5">
                  <p className="font-medium text-sm">{team.label}</p>
                  <div className="flex flex-wrap gap-1">
                    {team.competition && <Badge variant="secondary" className="text-xs">{team.competition.name}</Badge>}
                    {team.event && <Badge variant="outline" className="text-xs">{team.event.name}</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">{team._count.assignments} members assigned</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create CreateTeamButton client component**

Create `app/dashboard/teams/create-team-button.tsx` — a button that opens a dialog with name, competition selector, event selector. On success, calls `router.push` to the new team detail page.

Follow the same pattern as `CreateCompetitionDialog`. POST to `/api/admin/teams`. Fields: label (required), competitionId (optional select), eventId (optional select).

- [ ] **Step 3: Write team detail page**

```tsx
// app/dashboard/teams/[teamId]/page.tsx
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { IconArrowLeft, IconUsers } from "@tabler/icons-react"
import { getCurrentUser } from "@/lib/auth"
import { canView, canEdit } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { getActiveSeason } from "@/lib/db"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TeamMemberManager } from "./team-member-manager"

export const dynamic = "force-dynamic"

interface Props { params: Promise<{ teamId: string }> }

export default async function TeamDetailPage({ params }: Props) {
  const { teamId } = await params
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  if (!canView(user.permissions, "teams")) redirect("/dashboard")

  const season = await getActiveSeason(user.clubId)
  if (!season) redirect("/dashboard/teams")

  const [team, allMembers] = await Promise.all([
    prisma.team.findFirst({
      where: { id: teamId, season: { clubId: user.clubId } },
      include: {
        competition: { select: { id: true, name: true } },
        event: { select: { id: true, name: true } },
        assignments: {
          include: {
            memberSeason: {
              include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
            },
          },
        },
      },
    }),
    // All active members for the assignment picker
    prisma.memberSeason.findMany({
      where: { seasonId: season.id, membershipStatus: "ACTIVE", user: { clubId: user.clubId } },
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: [{ user: { lastName: "asc" } }, { user: { firstName: "asc" } }],
    }),
  ])

  if (!team) notFound()

  const canManage = canEdit(user.permissions, "teams")

  return (
    <div className="flex flex-col gap-6 py-4 lg:px-6 md:py-6 sm:px-4 px-0">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/teams"><IconArrowLeft className="size-4" /></Link>
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">{team.label}</h1>
            {team.competition && <Badge variant="secondary">{team.competition.name}</Badge>}
            {team.event && <Badge variant="outline">{team.event.name}</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">{team.assignments.length} members</p>
        </div>
      </div>

      <TeamMemberManager
        teamId={teamId}
        assignments={team.assignments}
        allMembers={allMembers}
        canManage={canManage}
      />
    </div>
  )
}
```

- [ ] **Step 4: Create TeamMemberManager client component**

Create `app/dashboard/teams/[teamId]/team-member-manager.tsx`:

A component that shows current team assignments in a table (name, role badge, remove button) and a "Add Member" button that opens a dialog with a member picker + role selector (MEMBER / CAPTAIN / ALTERNATE).

POST to `/api/admin/teams/[teamId]/members`, DELETE to same endpoint with `memberSeasonId` in body.

- [ ] **Step 5: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep -E "dashboard/teams" | head -10
```

- [ ] **Step 6: Commit**

```bash
git add app/dashboard/teams/
git commit -m "feat: teams pages — list, create, detail with member assignment"
```

---

## Task 7: Final integration check

- [ ] **Step 1: Full TypeScript compile**

```bash
npx tsc --noEmit 2>&1
```

Fix all errors.

- [ ] **Step 2: Build**

```bash
npm run build
```

Expected: successful build.

- [ ] **Step 3: Smoke test**

1. `/dashboard/events` — create an event, edit it, see count
2. `/dashboard/competitions` — create a competition, navigate to detail
3. `/dashboard/competitions/[id]` — see teams and schedule tabs
4. `/dashboard/teams` — create a team linked to a competition + event
5. `/dashboard/teams/[id]` — assign a member, change their role

- [ ] **Step 4: Commit fixes**

```bash
git add -A
git commit -m "fix: Phase 2B integration — TypeScript and build fixes"
```
