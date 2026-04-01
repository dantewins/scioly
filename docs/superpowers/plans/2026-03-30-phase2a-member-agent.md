# Phase 2A — Member Agent Implementation Plan

> **Agent:** Member Agent
> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use `- [ ]` checkbox syntax for tracking.

**Goal:** Public application flow (`/apply/[clubSlug]`), applications review, members table, member detail page (tabbed: overview / event enrollment / hours summary / dues summary / forms summary), season management in settings.

**Permission flags used:** `view_members`, `create_members`, `edit_members`, `delete_members`
**Pattern:** Dashboard pages = server components calling `getCurrentUser()` directly. API routes use `withPermission(flag)` from `lib/api.ts`. Use `getActiveSeason(user.clubId)` from `lib/db.ts` to scope queries.

---

## File Map

| File | Action |
|---|---|
| `app/apply/[clubSlug]/page.tsx` | Create — public application page |
| `components/forms/apply-form.tsx` | Rewrite — update for clubSlug flow, remove joinCode |
| `app/api/public/club/[slug]/route.ts` | Create — unauthenticated GET: club info + active season events |
| `app/api/public/apply/route.ts` | Create — unauthenticated POST: submit application |
| `app/api/admin/applicants/route.ts` | Create — GET applicants list, PATCH approve/deny single |
| `app/api/admin/members/route.ts` | Create — GET members list with pagination + search |
| `app/api/admin/members/[id]/route.ts` | Create — GET member detail, PATCH update status/role |
| `app/api/admin/seasons/route.ts` | Create — GET seasons list, POST create new season |
| `app/api/admin/seasons/[id]/route.ts` | Create — PATCH activate/close season |
| `app/dashboard/applications/page.tsx` | Replace stub — applications review page |
| `app/dashboard/members/page.tsx` | Replace stub — members table page |
| `app/dashboard/members/[id]/page.tsx` | Create — member detail tabbed page |
| `app/dashboard/settings/page.tsx` | Extend — add Season Management section |
| `app/dashboard/settings/season-manager.tsx` | Create — season CRUD client component |
| `components/tables/applicants-table.tsx` | Rewrite — update for new API + schema |
| `components/tables/members-table.tsx` | Rewrite — update for new API + schema |

---

## Task 1: Public club info API

**Files:**
- Create: `app/api/public/club/[slug]/route.ts`

This is an unauthenticated route. It returns the club info and its active season's events — everything the apply page needs to render.

- [ ] **Step 1: Write the route**

```ts
// app/api/public/club/[slug]/route.ts
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params

  const club = await prisma.club.findUnique({
    where: { slug },
    select: { id: true, name: true, schoolName: true, slug: true },
  })
  if (!club) {
    return NextResponse.json({ error: "Club not found." }, { status: 404 })
  }

  const season = await prisma.season.findFirst({
    where: { clubId: club.id, isActive: true },
    select: {
      id: true,
      name: true,
      schoolYear: true,
      events: {
        select: { id: true, name: true, code: true, isTrialEvent: true, sortOrder: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  })

  return NextResponse.json({ club, season })
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "public/club" | head -5
```

- [ ] **Step 3: Commit**

```bash
git add app/api/public/club/
git commit -m "feat: public club info API for apply page"
```

---

## Task 2: Public apply API

**Files:**
- Create: `app/api/public/apply/route.ts`

Application submission: validates school domain, creates `User` (APPLICANT) + `MemberSeason` (PENDING). No email sent yet — that happens on approval.

- [ ] **Step 1: Write the route**

```ts
// app/api/public/apply/route.ts
import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

const schema = z.object({
  clubSlug: z.string(),
  firstName: z.string().min(1).max(60),
  lastName: z.string().min(1).max(60),
  email: z.string().email(),
  phone: z.string().max(20).optional(),
  gradeLevel: z.coerce.number().int().min(9).max(12).optional(),
  graduationYear: z.coerce.number().int().optional(),
  shirtSize: z.string().optional(),
  isReturning: z.boolean().optional(),
  canTravel: z.boolean().optional(),
  // Application essay fields
  whyJoin: z.string().max(2000).optional(),
  contributionIdeas: z.string().max(2000).optional(),
  awards: z.string().max(2000).optional(),
  previousEvents: z.string().max(2000).optional(),
  scienceClasses: z.string().max(1000).optional(),
  mathClasses: z.string().max(1000).optional(),
  questions: z.string().max(1000).optional(),
  // Event choices: array of event IDs (up to 6)
  eventChoices: z.array(z.string()).max(6).optional(),
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input." },
        { status: 400 },
      )
    }

    const { clubSlug, eventChoices, ...fields } = parsed.data

    // Resolve club
    const club = await prisma.club.findUnique({ where: { slug: clubSlug } })
    if (!club) {
      return NextResponse.json({ error: "Club not found." }, { status: 404 })
    }

    // Enforce school domain
    if (club.schoolDomain) {
      const emailDomain = fields.email.split("@")[1]?.toLowerCase()
      if (emailDomain !== club.schoolDomain.toLowerCase()) {
        return NextResponse.json(
          { error: `Your email must end in @${club.schoolDomain}.` },
          { status: 400 },
        )
      }
    }

    // Check not already registered
    const existing = await prisma.user.findUnique({ where: { email: fields.email } })
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 },
      )
    }

    // Active season required
    const season = await prisma.season.findFirst({
      where: { clubId: club.id, isActive: true },
    })
    if (!season) {
      return NextResponse.json({ error: "No active season." }, { status: 400 })
    }

    // Create user + member season + event enrollments
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          clubId: club.id,
          email: fields.email,
          role: "APPLICANT",
          firstName: fields.firstName,
          lastName: fields.lastName,
          phone: fields.phone,
          gradeLevel: fields.gradeLevel,
          graduationYear: fields.graduationYear,
          shirtSize: fields.shirtSize,
        },
      })

      const ms = await tx.memberSeason.create({
        data: {
          userId: user.id,
          seasonId: season.id,
          membershipStatus: "PENDING",
          isReturning: fields.isReturning ?? false,
          canTravel: fields.canTravel ?? false,
          whyJoin: fields.whyJoin,
          contributionIdeas: fields.contributionIdeas,
          awards: fields.awards,
          previousEvents: fields.previousEvents,
          scienceClasses: fields.scienceClasses,
          mathClasses: fields.mathClasses,
          questions: fields.questions,
          applicationSubmittedAt: new Date(),
        },
      })

      // Create INTERESTED enrollments for chosen events
      if (eventChoices?.length) {
        await tx.eventEnrollment.createMany({
          data: eventChoices.map((eventId) => ({
            memberSeasonId: ms.id,
            eventId,
            status: "INTERESTED" as const,
          })),
          skipDuplicates: true,
        })
      }
    })

    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (e) {
    console.error("[apply]", e)
    return NextResponse.json({ error: "Submission failed." }, { status: 500 })
  }
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "public/apply" | head -5
```

- [ ] **Step 3: Commit**

```bash
git add app/api/public/apply/
git commit -m "feat: public application submission API"
```

---

## Task 3: Apply page UI

**Files:**
- Create: `app/apply/[clubSlug]/page.tsx`
- Rewrite: `components/forms/apply-form.tsx`

- [ ] **Step 1: Read the existing apply-form.tsx**

Read the full file to understand current field structure. The form currently uses `joinCode` — remove that and replace with the club slug from the URL.

- [ ] **Step 2: Write the apply page (server component shell)**

```tsx
// app/apply/[clubSlug]/page.tsx
import { notFound } from "next/navigation"
import { IconAtom } from "@tabler/icons-react"
import { ApplyForm } from "@/components/forms/apply-form"

export const dynamic = "force-dynamic"

interface Props {
  params: Promise<{ clubSlug: string }>
}

export default async function ApplyPage({ params }: Props) {
  const { clubSlug } = await params

  // Validate club exists server-side (for 404 on bad slugs)
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL}/api/public/club/${clubSlug}`,
    { cache: "no-store" },
  )
  if (!res.ok) notFound()

  const { club, season } = await res.json()

  return (
    <div className="min-h-screen bg-muted/20 py-10 px-4">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="text-center space-y-1">
          <div className="flex justify-center">
            <IconAtom className="size-8 text-primary" />
          </div>
          <h1 className="text-2xl font-semibold">{club.name}</h1>
          {club.schoolName && (
            <p className="text-sm text-muted-foreground">{club.schoolName}</p>
          )}
          {season && (
            <p className="text-sm text-muted-foreground">
              {season.name} Application
            </p>
          )}
        </div>

        {!season ? (
          <div className="rounded-lg border p-8 text-center text-muted-foreground text-sm">
            Applications are not currently open. Please check back later.
          </div>
        ) : (
          <ApplyForm
            clubSlug={clubSlug}
            events={season.events}
          />
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Rewrite apply-form.tsx**

The form should:
- Accept `clubSlug` and `events` as props (no more joinCode)
- POST to `/api/public/apply` with `clubSlug` in the body
- On success show a "Application submitted! We'll be in touch." message
- Keep all existing fields (name, email, phone, grade, shirt size, isReturning, canTravel, essay fields)
- Allow selecting up to 6 events from the provided list (replace the old free-text event entry)

Key changes from old form:
- Remove `joinCode` field entirely
- Remove `type EventsResponse` — events are passed as props
- Change event selection from free-text to checkboxes/selects from the `events` prop
- Submit to `/api/public/apply` (not old apply route)
- Show success state inline (no redirect)

Write the full new `apply-form.tsx`. Key structure:

```tsx
"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { IconCheck } from "@tabler/icons-react"

interface EventOption {
  id: string
  name: string
  code: string | null
  isTrialEvent: boolean
}

interface Props {
  clubSlug: string
  events: EventOption[]
}

export function ApplyForm({ clubSlug, events }: Props) {
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedEvents, setSelectedEvents] = useState<string[]>([])
  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", phone: "",
    gradeLevel: "", shirtSize: "", isReturning: false, canTravel: false,
    whyJoin: "", contributionIdeas: "", awards: "",
    previousEvents: "", scienceClasses: "", mathClasses: "", questions: "",
  })

  function toggleEvent(eventId: string) {
    setSelectedEvents((prev) =>
      prev.includes(eventId)
        ? prev.filter((id) => id !== eventId)
        : prev.length < 6
          ? [...prev, eventId]
          : prev,
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch("/api/public/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clubSlug,
          ...form,
          gradeLevel: form.gradeLevel ? parseInt(form.gradeLevel) : undefined,
          eventChoices: selectedEvents,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? "Submission failed.")
        return
      }
      setSubmitted(true)
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <Card>
        <CardContent className="py-12 text-center space-y-3">
          <div className="flex justify-center">
            <div className="size-12 rounded-full bg-green-100 flex items-center justify-center">
              <IconCheck className="size-6 text-green-600" />
            </div>
          </div>
          <h2 className="font-semibold">Application Submitted!</h2>
          <p className="text-sm text-muted-foreground">
            Your application has been received. You'll get an email when it's reviewed.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Section: Personal Info */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <h2 className="font-semibold text-sm">Personal Information</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>First Name</Label>
              <Input value={form.firstName} onChange={(e) => setForm(f => ({ ...f, firstName: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label>Last Name</Label>
              <Input value={form.lastName} onChange={(e) => setForm(f => ({ ...f, lastName: e.target.value }))} required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Phone (optional)</Label>
              <Input type="tel" value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Grade Level</Label>
              <Select value={form.gradeLevel} onValueChange={(v) => setForm(f => ({ ...f, gradeLevel: v }))}>
                <SelectTrigger><SelectValue placeholder="Select grade" /></SelectTrigger>
                <SelectContent>
                  {["9","10","11","12"].map(g => <SelectItem key={g} value={g}>Grade {g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Shirt Size</Label>
              <Select value={form.shirtSize} onValueChange={(v) => setForm(f => ({ ...f, shirtSize: v }))}>
                <SelectTrigger><SelectValue placeholder="Select size" /></SelectTrigger>
                <SelectContent>
                  {["XS","S","M","L","XL","XXL"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Checkbox id="isReturning" checked={form.isReturning} onCheckedChange={(v) => setForm(f => ({ ...f, isReturning: !!v }))} />
              <Label htmlFor="isReturning">I am a returning member</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="canTravel" checked={form.canTravel} onCheckedChange={(v) => setForm(f => ({ ...f, canTravel: !!v }))} />
              <Label htmlFor="canTravel">I can travel to competitions</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section: Event Preferences */}
      {events.length > 0 && (
        <Card>
          <CardContent className="pt-6 space-y-3">
            <div>
              <h2 className="font-semibold text-sm">Event Preferences</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Select up to 6 events you're interested in (in any order).</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {events.map((event) => (
                <div key={event.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`event-${event.id}`}
                    checked={selectedEvents.includes(event.id)}
                    onCheckedChange={() => toggleEvent(event.id)}
                    disabled={!selectedEvents.includes(event.id) && selectedEvents.length >= 6}
                  />
                  <Label htmlFor={`event-${event.id}`} className="text-sm font-normal cursor-pointer">
                    {event.name}{event.isTrialEvent && " (Trial)"}
                  </Label>
                </div>
              ))}
            </div>
            {selectedEvents.length >= 6 && (
              <p className="text-xs text-muted-foreground">Maximum 6 events selected.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Section: Essay */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <h2 className="font-semibold text-sm">About You</h2>
          {(
            [
              ["whyJoin", "Why do you want to join Science Olympiad?"],
              ["contributionIdeas", "How do you plan to contribute to the team?"],
              ["previousEvents", "What Science Olympiad events have you done before?"],
              ["scienceClasses", "What science classes are you currently taking or have completed?"],
              ["mathClasses", "What math classes are you currently taking or have completed?"],
              ["awards", "List any academic awards or achievements (optional)."],
              ["questions", "Any questions or comments? (optional)"],
            ] as [keyof typeof form, string][]
          ).map(([field, label]) => (
            <div key={field} className="space-y-1.5">
              <Label>{label}</Label>
              <textarea
                className="w-full min-h-[80px] rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
                value={form[field] as string}
                onChange={(e) => setForm(f => ({ ...f, [field]: e.target.value }))}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Submitting..." : "Submit Application"}
      </Button>
    </form>
  )
}
```

> **Note:** The `Checkbox` component may not be in `components/ui/` yet. If missing, add it: `npx shadcn add checkbox`

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep -E "apply-form|apply/\[" | head -10
```

- [ ] **Step 5: Commit**

```bash
git add app/apply/ components/forms/apply-form.tsx
git commit -m "feat: public apply page and form with event selection"
```

---

## Task 4: Applicants API

**Files:**
- Create: `app/api/admin/applicants/route.ts`

Approval flow: `User.role` → MEMBER, `MemberSeason.membershipStatus` → ACTIVE, create `PasswordSetupToken`, call `sendPasswordSetupEmail`.

- [ ] **Step 1: Write the route**

```ts
// app/api/admin/applicants/route.ts
import { z } from "zod"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { withPermission, ok, err } from "@/lib/api"
import { sendPasswordSetupEmail } from "@/lib/email"
import { getActiveSeason } from "@/lib/db"

export const dynamic = "force-dynamic"

// GET — list all pending applicants for the active season
export const GET = withPermission("view_members", async (_req, _ctx, user) => {
  const season = await getActiveSeason(user.clubId)
  if (!season) return err("No active season.", 400)

  const applicants = await prisma.memberSeason.findMany({
    where: {
      seasonId: season.id,
      membershipStatus: "PENDING",
      user: { clubId: user.clubId, role: "APPLICANT" },
    },
    include: {
      user: {
        select: {
          id: true, firstName: true, lastName: true,
          email: true, gradeLevel: true, phone: true,
        },
      },
      eventEnrollments: {
        include: { event: { select: { id: true, name: true, code: true } } },
      },
    },
    orderBy: { applicationSubmittedAt: "asc" },
  })

  return ok(applicants)
})

const patchSchema = z.object({
  memberSeasonId: z.string(),
  action: z.enum(["approve", "deny"]),
  reason: z.string().optional(),
})

// PATCH — approve or deny a single applicant
export const PATCH = withPermission("edit_members", async (req, _ctx, _user) => {
  const body = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input.", 400)

  const { memberSeasonId, action, reason } = parsed.data

  const ms = await prisma.memberSeason.findUnique({
    where: { id: memberSeasonId },
    include: { user: { select: { id: true, email: true, firstName: true, role: true } } },
  })
  if (!ms) return err("Applicant not found.", 404)
  if (ms.membershipStatus !== "PENDING") return err("Applicant is not in pending status.", 400)

  if (action === "deny") {
    await prisma.memberSeason.update({
      where: { id: memberSeasonId },
      data: {
        membershipStatus: "REMOVED",
        statusChangedAt: new Date(),
        statusReason: reason ?? "Application denied.",
      },
    })
    return ok({ ok: true })
  }

  // Approve: update role + status, create token, send email
  const token = await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: ms.user.id },
      data: { role: "MEMBER" },
    })

    await tx.memberSeason.update({
      where: { id: memberSeasonId },
      data: {
        membershipStatus: "ACTIVE",
        statusChangedAt: new Date(),
      },
    })

    const setupToken = await tx.passwordSetupToken.create({
      data: {
        userId: ms.user.id,
        expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000), // 72 hours
      },
    })

    return setupToken
  })

  // Send welcome email (outside transaction — non-critical)
  try {
    await sendPasswordSetupEmail(ms.user.email, token.token, ms.user.firstName)
  } catch (e) {
    console.error("[applicants:approve] Email send failed:", e)
    // Don't fail the approval if email fails
  }

  return ok({ ok: true })
})
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "applicants" | head -5
```

- [ ] **Step 3: Commit**

```bash
git add app/api/admin/applicants/
git commit -m "feat: applicants API — list and approve/deny with email"
```

---

## Task 5: Members API

**Files:**
- Create: `app/api/admin/members/route.ts`
- Create: `app/api/admin/members/[id]/route.ts`

- [ ] **Step 1: Write members list route**

```ts
// app/api/admin/members/route.ts
import { prisma } from "@/lib/prisma"
import { withPermission, ok, err } from "@/lib/api"
import { getActiveSeason } from "@/lib/db"

export const dynamic = "force-dynamic"

export const GET = withPermission("view_members", async (req, _ctx, user) => {
  const season = await getActiveSeason(user.clubId)
  if (!season) return err("No active season.", 400)

  const url = new URL(req.url)
  const search = url.searchParams.get("q") ?? ""
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"))
  const limit = 50
  const skip = (page - 1) * limit

  const where = {
    seasonId: season.id,
    membershipStatus: { notIn: ["PENDING" as const] },
    user: {
      clubId: user.clubId,
      ...(search
        ? {
            OR: [
              { firstName: { contains: search, mode: "insensitive" as const } },
              { lastName: { contains: search, mode: "insensitive" as const } },
              { email: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
  }

  const [total, members] = await prisma.$transaction([
    prisma.memberSeason.count({ where }),
    prisma.memberSeason.findMany({
      where,
      skip,
      take: limit,
      include: {
        user: {
          select: {
            id: true, firstName: true, lastName: true,
            email: true, gradeLevel: true, role: true,
          },
        },
        roles: { include: { clubRole: { select: { id: true, name: true } } } },
      },
      orderBy: [{ user: { lastName: "asc" } }, { user: { firstName: "asc" } }],
    }),
  ])

  return ok({ members, total, page, limit })
})
```

- [ ] **Step 2: Write member detail route**

```ts
// app/api/admin/members/[id]/route.ts
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withPermission, withMemberAuth, ok, err } from "@/lib/api"
import { getActiveSeason } from "@/lib/db"

export const dynamic = "force-dynamic"

// GET — full member detail for the active season
export const GET = withPermission("view_members", async (_req, ctx: { params: Promise<{ id: string }> }, user) => {
  const { id: targetUserId } = await ctx.params

  const season = await getActiveSeason(user.clubId)
  if (!season) return err("No active season.", 400)

  // Ensure target user belongs to this club
  const targetUser = await prisma.user.findFirst({
    where: { id: targetUserId, clubId: user.clubId },
    select: {
      id: true, firstName: true, lastName: true, email: true,
      phone: true, gradeLevel: true, graduationYear: true,
      studentNumber: true, shirtSize: true, role: true, imageUrl: true,
    },
  })
  if (!targetUser) return err("Member not found.", 404)

  const ms = await prisma.memberSeason.findUnique({
    where: { userId_seasonId: { userId: targetUserId, seasonId: season.id } },
    include: {
      roles: { include: { clubRole: { select: { id: true, name: true } } } },
      eventEnrollments: {
        include: { event: { select: { id: true, name: true, code: true } } },
        orderBy: { event: { sortOrder: "asc" } },
      },
      hourEntries: {
        where: { status: "APPROVED" },
        select: { totalHours: true, categoryId: true },
      },
      invoices: {
        select: { id: true, title: true, amountCents: true, amountPaidCents: true, status: true, dueAt: true },
        orderBy: { issuedAt: "desc" },
      },
      formSubmissions: {
        include: { formType: { select: { id: true, name: true, category: true } } },
        orderBy: { formType: { name: "asc" } },
      },
    },
  })

  return ok({ user: targetUser, memberSeason: ms })
})

const statusSchema = z.object({
  membershipStatus: z.enum(["ACTIVE", "INACTIVE", "ALUMNI", "REMOVED"]).optional(),
  statusReason: z.string().max(500).optional(),
})

// PATCH — update member status
export const PATCH = withPermission("edit_members", async (req, ctx: { params: Promise<{ id: string }> }, user) => {
  const { id: targetUserId } = await ctx.params
  const body = await req.json()
  const parsed = statusSchema.safeParse(body)
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input.", 400)

  const season = await getActiveSeason(user.clubId)
  if (!season) return err("No active season.", 400)

  const ms = await prisma.memberSeason.findFirst({
    where: { userId: targetUserId, seasonId: season.id, user: { clubId: user.clubId } },
  })
  if (!ms) return err("Member not found.", 404)

  const updated = await prisma.memberSeason.update({
    where: { id: ms.id },
    data: {
      ...(parsed.data.membershipStatus && {
        membershipStatus: parsed.data.membershipStatus,
        statusChangedAt: new Date(),
        statusReason: parsed.data.statusReason,
      }),
    },
  })

  return ok(updated)
})
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "admin/members" | head -10
```

- [ ] **Step 4: Commit**

```bash
git add app/api/admin/members/
git commit -m "feat: members list and detail API"
```

---

## Task 6: Applications dashboard page

**Files:**
- Replace stub: `app/dashboard/applications/page.tsx`
- Rewrite: `components/tables/applicants-table.tsx`

- [ ] **Step 1: Read existing applicants-table.tsx**

Read the full file. It likely has most of the table structure but uses old API routes and old schema fields. Update it for the new API.

- [ ] **Step 2: Rewrite applicants-table.tsx**

The table should:
- Accept `initialApplicants` as prop (server-fetched list)
- Show columns: Name, Email, Grade, Applied, Event Choices, Actions
- Actions: "Approve" button → PATCH `/api/admin/applicants` with `action: "approve"`, "Deny" button → opens confirm dialog with optional reason
- On approve/deny: remove the row from the list and show a toast
- Use TanStack Table

Key type for an applicant row:
```ts
type Applicant = {
  id: string
  membershipStatus: string
  applicationSubmittedAt: string | null
  user: { id: string; firstName: string; lastName: string; email: string; gradeLevel: number | null; phone: string | null }
  eventEnrollments: { event: { id: string; name: string; code: string | null } }[]
}
```

- [ ] **Step 3: Write applications page**

```tsx
// app/dashboard/applications/page.tsx
import { redirect } from "next/navigation"
import { IconUserCheck } from "@tabler/icons-react"
import { getCurrentUser } from "@/lib/auth"
import { canView } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { getActiveSeason } from "@/lib/db"
import { PageHeader } from "@/components/page-header"
import { EmptyState } from "@/components/empty-state"
import { ApplicantsTable } from "@/components/tables/applicants-table"

export const dynamic = "force-dynamic"

export default async function ApplicationsPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  if (!canView(user.permissions, "members")) redirect("/dashboard")

  const season = await getActiveSeason(user.clubId)

  const applicants = season
    ? await prisma.memberSeason.findMany({
        where: {
          seasonId: season.id,
          membershipStatus: "PENDING",
          user: { clubId: user.clubId, role: "APPLICANT" },
        },
        include: {
          user: {
            select: {
              id: true, firstName: true, lastName: true,
              email: true, gradeLevel: true, phone: true,
            },
          },
          eventEnrollments: {
            include: { event: { select: { id: true, name: true, code: true } } },
          },
        },
        orderBy: { applicationSubmittedAt: "asc" },
      })
    : []

  const canManage = user.role === "WEBSITE_OWNER" || canView(user.permissions, "members")

  return (
    <div className="flex flex-col gap-6 px-4 py-4 lg:px-6 md:py-6">
      <PageHeader
        title="Applications"
        description={`${applicants.length} pending application${applicants.length !== 1 ? "s" : ""}`}
      />

      {applicants.length === 0 ? (
        <EmptyState
          icon={IconUserCheck}
          title="No pending applications"
          description="New applications will appear here when members apply."
        />
      ) : (
        <ApplicantsTable initialApplicants={applicants} canManage={canManage} />
      )}
    </div>
  )
}
```

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep -E "applications|applicants" | head -10
```

- [ ] **Step 5: Commit**

```bash
git add app/dashboard/applications/ components/tables/applicants-table.tsx
git commit -m "feat: applications review page with approve/deny"
```

---

## Task 7: Members dashboard page

**Files:**
- Replace stub: `app/dashboard/members/page.tsx`
- Rewrite: `components/tables/members-table.tsx`

- [ ] **Step 1: Read existing members-table.tsx**

Read the full file — it has the table structure. Update column definitions and API calls for the new schema.

- [ ] **Step 2: Write members page**

```tsx
// app/dashboard/members/page.tsx
import { redirect } from "next/navigation"
import { IconUsers } from "@tabler/icons-react"
import { getCurrentUser } from "@/lib/auth"
import { canView } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { getActiveSeason } from "@/lib/db"
import { PageHeader } from "@/components/page-header"
import { EmptyState } from "@/components/empty-state"
import { MembersTable } from "@/components/tables/members-table"

export const dynamic = "force-dynamic"

export default async function MembersPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  if (!canView(user.permissions, "members")) redirect("/dashboard")

  const season = await getActiveSeason(user.clubId)

  const members = season
    ? await prisma.memberSeason.findMany({
        where: {
          seasonId: season.id,
          membershipStatus: { notIn: ["PENDING"] },
          user: { clubId: user.clubId },
        },
        include: {
          user: {
            select: {
              id: true, firstName: true, lastName: true,
              email: true, gradeLevel: true, role: true,
            },
          },
          roles: { include: { clubRole: { select: { id: true, name: true } } } },
        },
        orderBy: [{ user: { lastName: "asc" } }, { user: { firstName: "asc" } }],
      })
    : []

  return (
    <div className="flex flex-col gap-6 px-4 py-4 lg:px-6 md:py-6">
      <PageHeader
        title="Members"
        description={`${members.length} member${members.length !== 1 ? "s" : ""} this season`}
      />

      {members.length === 0 ? (
        <EmptyState
          icon={IconUsers}
          title="No members yet"
          description="Approved applicants will appear here."
        />
      ) : (
        <MembersTable members={members} />
      )}
    </div>
  )
}
```

- [ ] **Step 3: Update members-table.tsx**

Update the table to use the new member shape. Key column changes:
- Name (linked to `/dashboard/members/[user.id]`)
- Email
- Grade
- Roles (badges from `roles` array)
- Status (`membershipStatus` badge)
- Actions: View button

Remove any references to old fields like `ADMIN` / `BOARD_MEMBER` role checks.

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep -E "dashboard/members|members-table" | head -10
```

- [ ] **Step 5: Commit**

```bash
git add app/dashboard/members/page.tsx components/tables/members-table.tsx
git commit -m "feat: members list page"
```

---

## Task 8: Member detail page

**Files:**
- Create: `app/dashboard/members/[id]/page.tsx`

A tabbed page with: Overview, Events, Hours, Dues, Forms. Each tab uses server-fetched data from `prisma` directly (not API calls).

- [ ] **Step 1: Write member detail page**

```tsx
// app/dashboard/members/[id]/page.tsx
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { IconArrowLeft } from "@tabler/icons-react"
import { getCurrentUser } from "@/lib/auth"
import { canView, canEdit } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { getActiveSeason } from "@/lib/db"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card"
import { formatDateOnly } from "@/lib/format"

export const dynamic = "force-dynamic"

interface Props {
  params: Promise<{ id: string }>
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800",
  INACTIVE: "bg-yellow-100 text-yellow-800",
  ALUMNI: "bg-blue-100 text-blue-800",
  REMOVED: "bg-red-100 text-red-800",
  PENDING: "bg-gray-100 text-gray-800",
}

export default async function MemberDetailPage({ params }: Props) {
  const { id: targetUserId } = await params
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  if (!canView(user.permissions, "members")) redirect("/dashboard")

  const season = await getActiveSeason(user.clubId)

  const [targetUser, ms] = await Promise.all([
    prisma.user.findFirst({
      where: { id: targetUserId, clubId: user.clubId },
      select: {
        id: true, firstName: true, lastName: true, email: true,
        phone: true, gradeLevel: true, graduationYear: true,
        shirtSize: true, role: true,
      },
    }),
    season
      ? prisma.memberSeason.findUnique({
          where: { userId_seasonId: { userId: targetUserId, seasonId: season.id } },
          include: {
            roles: { include: { clubRole: { select: { id: true, name: true } } } },
            eventEnrollments: {
              include: { event: { select: { id: true, name: true, code: true } } },
              orderBy: { event: { sortOrder: "asc" } },
            },
            hourEntries: {
              select: { id: true, title: true, totalHours: true, status: true, submittedAt: true },
              orderBy: { submittedAt: "desc" },
            },
            invoices: {
              select: {
                id: true, title: true, amountCents: true, amountPaidCents: true,
                status: true, dueAt: true, issuedAt: true,
              },
              orderBy: { issuedAt: "desc" },
            },
            formSubmissions: {
              include: {
                formType: { select: { id: true, name: true, category: true } },
              },
              orderBy: { formType: { name: "asc" } },
            },
          },
        })
      : null,
  ])

  if (!targetUser) notFound()

  const totalApprovedHours = ms?.hourEntries
    .filter((h) => h.status === "APPROVED")
    .reduce((sum, h) => sum + Number(h.totalHours), 0) ?? 0

  return (
    <div className="flex flex-col gap-6 px-4 py-4 lg:px-6 md:py-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/members"><IconArrowLeft className="size-4" /></Link>
        </Button>
        <div>
          <h1 className="text-xl font-semibold">
            {targetUser.firstName} {targetUser.lastName}
          </h1>
          <p className="text-sm text-muted-foreground">{targetUser.email}</p>
        </div>
        {ms && (
          <Badge className={STATUS_COLORS[ms.membershipStatus] ?? ""} variant="outline">
            {ms.membershipStatus}
          </Badge>
        )}
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="hours">Hours</TabsTrigger>
          <TabsTrigger value="dues">Dues</TabsTrigger>
          <TabsTrigger value="forms">Forms</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Card>
              <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">Grade</CardTitle></CardHeader>
              <CardContent><p className="text-lg font-semibold">{targetUser.gradeLevel ?? "—"}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">Shirt Size</CardTitle></CardHeader>
              <CardContent><p className="text-lg font-semibold">{targetUser.shirtSize ?? "—"}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">Approved Hours</CardTitle></CardHeader>
              <CardContent><p className="text-lg font-semibold">{totalApprovedHours.toFixed(1)}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">Roles</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1">
                  {ms?.roles.length
                    ? ms.roles.map((r) => <Badge key={r.clubRole.id} variant="secondary" className="text-xs">{r.clubRole.name}</Badge>)
                    : <span className="text-sm text-muted-foreground">None</span>
                  }
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-sm">Contact Info</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-muted-foreground">Email</span><p>{targetUser.email}</p></div>
              <div><span className="text-muted-foreground">Phone</span><p>{targetUser.phone ?? "—"}</p></div>
              <div><span className="text-muted-foreground">Graduation Year</span><p>{targetUser.graduationYear ?? "—"}</p></div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Events Tab */}
        <TabsContent value="events" className="mt-4">
          {!ms?.eventEnrollments.length ? (
            <p className="text-sm text-muted-foreground">No event enrollments.</p>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">Event</th>
                    <th className="text-left px-4 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {ms.eventEnrollments.map((e) => (
                    <tr key={e.id} className="border-t">
                      <td className="px-4 py-2">{e.event.name}</td>
                      <td className="px-4 py-2">
                        <Badge variant="outline">{e.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* Hours Tab */}
        <TabsContent value="hours" className="mt-4">
          {!ms?.hourEntries.length ? (
            <p className="text-sm text-muted-foreground">No hour entries.</p>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">Title</th>
                    <th className="text-left px-4 py-2 font-medium">Hours</th>
                    <th className="text-left px-4 py-2 font-medium">Status</th>
                    <th className="text-left px-4 py-2 font-medium">Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {ms.hourEntries.map((h) => (
                    <tr key={h.id} className="border-t">
                      <td className="px-4 py-2">{h.title}</td>
                      <td className="px-4 py-2">{Number(h.totalHours).toFixed(1)}</td>
                      <td className="px-4 py-2"><Badge variant="outline">{h.status}</Badge></td>
                      <td className="px-4 py-2 text-muted-foreground">{formatDateOnly(h.submittedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* Dues Tab */}
        <TabsContent value="dues" className="mt-4">
          {!ms?.invoices.length ? (
            <p className="text-sm text-muted-foreground">No invoices.</p>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">Invoice</th>
                    <th className="text-left px-4 py-2 font-medium">Amount</th>
                    <th className="text-left px-4 py-2 font-medium">Paid</th>
                    <th className="text-left px-4 py-2 font-medium">Status</th>
                    <th className="text-left px-4 py-2 font-medium">Due</th>
                  </tr>
                </thead>
                <tbody>
                  {ms.invoices.map((inv) => (
                    <tr key={inv.id} className="border-t">
                      <td className="px-4 py-2">{inv.title}</td>
                      <td className="px-4 py-2">${(inv.amountCents / 100).toFixed(2)}</td>
                      <td className="px-4 py-2">${(inv.amountPaidCents / 100).toFixed(2)}</td>
                      <td className="px-4 py-2"><Badge variant="outline">{inv.status}</Badge></td>
                      <td className="px-4 py-2 text-muted-foreground">{formatDateOnly(inv.dueAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* Forms Tab */}
        <TabsContent value="forms" className="mt-4">
          {!ms?.formSubmissions.length ? (
            <p className="text-sm text-muted-foreground">No form submissions.</p>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">Form</th>
                    <th className="text-left px-4 py-2 font-medium">Category</th>
                    <th className="text-left px-4 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {ms.formSubmissions.map((fs) => (
                    <tr key={fs.id} className="border-t">
                      <td className="px-4 py-2">{fs.formType.name}</td>
                      <td className="px-4 py-2 text-muted-foreground">{fs.formType.category}</td>
                      <td className="px-4 py-2"><Badge variant="outline">{fs.status}</Badge></td>
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

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "members/\[id\]" | head -10
```

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/members/
git commit -m "feat: member detail page with tabs — events, hours, dues, forms"
```

---

## Task 9: Season management API + Settings extension

**Files:**
- Create: `app/api/admin/seasons/route.ts`
- Create: `app/api/admin/seasons/[id]/route.ts`
- Create: `app/dashboard/settings/season-manager.tsx`
- Extend: `app/dashboard/settings/page.tsx`

- [ ] **Step 1: Write seasons API**

```ts
// app/api/admin/seasons/route.ts
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withPermission, ok, err } from "@/lib/api"

export const dynamic = "force-dynamic"

export const GET = withPermission("view_club_settings", async (_req, _ctx, user) => {
  const seasons = await prisma.season.findMany({
    where: { clubId: user.clubId },
    orderBy: { startsAt: "desc" },
    select: {
      id: true, name: true, schoolYear: true,
      startsAt: true, endsAt: true, isActive: true, createdAt: true,
      _count: { select: { members: true } },
    },
  })
  return ok(seasons)
})

const createSchema = z.object({
  name: z.string().min(1).max(100),
  schoolYear: z.string().regex(/^\d{4}-\d{4}$/, "Use format YYYY-YYYY"),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
})

export const POST = withPermission("edit_club_settings", async (req, _ctx, user) => {
  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input.", 400)

  const existing = await prisma.season.findUnique({
    where: { clubId_schoolYear: { clubId: user.clubId, schoolYear: parsed.data.schoolYear } },
  })
  if (existing) return err("A season for this school year already exists.", 409)

  const season = await prisma.season.create({
    data: { clubId: user.clubId, ...parsed.data, isActive: false },
  })
  return ok(season, 201)
})
```

```ts
// app/api/admin/seasons/[id]/route.ts
import { prisma } from "@/lib/prisma"
import { withPermission, ok, err } from "@/lib/api"

export const dynamic = "force-dynamic"

// PATCH: activate or deactivate a season (only one can be active at a time)
export const PATCH = withPermission(
  "edit_club_settings",
  async (req, ctx: { params: Promise<{ id: string }> }, user) => {
    const { id } = await ctx.params
    const body = await req.json()
    const { isActive } = body as { isActive: boolean }

    const season = await prisma.season.findFirst({
      where: { id, clubId: user.clubId },
    })
    if (!season) return err("Season not found.", 404)

    if (isActive) {
      // Deactivate all other seasons for this club, activate this one
      await prisma.$transaction([
        prisma.season.updateMany({
          where: { clubId: user.clubId, isActive: true },
          data: { isActive: false },
        }),
        prisma.season.update({ where: { id }, data: { isActive: true } }),
      ])
    } else {
      await prisma.season.update({ where: { id }, data: { isActive: false } })
    }

    return ok({ ok: true })
  },
)
```

- [ ] **Step 2: Create SeasonManager component**

```tsx
// app/dashboard/settings/season-manager.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { IconPlus, IconCalendar } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

interface Season {
  id: string
  name: string
  schoolYear: string
  isActive: boolean
  startsAt: string
  endsAt: string
  _count: { members: number }
}

interface Props {
  seasons: Season[]
  canManage: boolean
}

export function SeasonManager({ seasons: initial, canManage }: Props) {
  const router = useRouter()
  const [seasons, setSeasons] = useState<Season[]>(initial)
  const [showCreate, setShowCreate] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: "", schoolYear: "", startsAt: "", endsAt: "" })

  async function toggleActive(seasonId: string, active: boolean) {
    const res = await fetch(`/api/admin/seasons/${seasonId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: active }),
    })
    if (!res.ok) { toast.error("Failed to update season."); return }
    setSeasons((s) =>
      s.map((x) => ({ ...x, isActive: active ? x.id === seasonId : x.id === seasonId ? false : x.isActive })),
    )
    toast.success(active ? "Season activated." : "Season deactivated.")
    router.refresh()
  }

  async function handleCreate() {
    if (!form.name || !form.schoolYear || !form.startsAt || !form.endsAt) {
      toast.error("All fields are required."); return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/admin/seasons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          startsAt: new Date(form.startsAt).toISOString(),
          endsAt: new Date(form.endsAt).toISOString(),
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.message ?? "Failed to create."); return }
      setSeasons((s) => [data, ...s])
      setShowCreate(false)
      setForm({ name: "", schoolYear: "", startsAt: "", endsAt: "" })
      toast.success("Season created.")
    } finally { setLoading(false) }
  }

  return (
    <div className="space-y-3">
      {seasons.map((s) => (
        <Card key={s.id}>
          <CardContent className="pt-4 flex items-center gap-4">
            <IconCalendar className="size-4 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{s.name}</p>
              <p className="text-xs text-muted-foreground">{s.schoolYear} · {s._count.members} members</p>
            </div>
            <div className="flex items-center gap-3">
              {s.isActive && <Badge variant="secondary">Active</Badge>}
              {canManage && (
                <div className="flex items-center gap-1.5">
                  <Switch
                    checked={s.isActive}
                    onCheckedChange={(v) => toggleActive(s.id, v)}
                  />
                  <span className="text-xs text-muted-foreground">Active</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      {canManage && (
        <Button variant="outline" className="w-full" onClick={() => setShowCreate(true)}>
          <IconPlus className="size-4 mr-1.5" />New Season
        </Button>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Season</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Season Name</Label>
              <Input placeholder="2025–2026 Season" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>School Year</Label>
              <Input placeholder="2025-2026" value={form.schoolYear} onChange={(e) => setForm(f => ({ ...f, schoolYear: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Start Date</Label>
                <Input type="date" value={form.startsAt} onChange={(e) => setForm(f => ({ ...f, startsAt: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>End Date</Label>
                <Input type="date" value={form.endsAt} onChange={(e) => setForm(f => ({ ...f, endsAt: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={loading}>{loading ? "Creating..." : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

- [ ] **Step 3: Extend settings page**

Read `app/dashboard/settings/page.tsx`. Add a "Seasons" section below the Roles section:

```tsx
// Add to imports
import { IconCalendar } from "@tabler/icons-react"
import { SeasonManager } from "./season-manager"

// Add to the data fetching in the server component
const seasons = await prisma.season.findMany({
  where: { clubId: user.clubId },
  orderBy: { startsAt: "desc" },
  select: {
    id: true, name: true, schoolYear: true,
    startsAt: true, endsAt: true, isActive: true, createdAt: true,
    _count: { select: { members: true } },
  },
})

// Add after the Roles section in the JSX
{canEditSettings && (
  <section className="space-y-4">
    <div className="flex items-center gap-2">
      <IconCalendar className="size-4 text-muted-foreground" />
      <h2 className="text-sm font-semibold">Seasons</h2>
    </div>
    <SeasonManager seasons={seasons} canManage={canEditSettings} />
  </section>
)}
```

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "season" | head -10
```

- [ ] **Step 5: Commit**

```bash
git add app/api/admin/seasons/ app/dashboard/settings/
git commit -m "feat: season management — create, activate, settings page integration"
```

---

## Task 10: Final integration check

- [ ] **Step 1: Full TypeScript compile**

```bash
npx tsc --noEmit 2>&1
```

Fix all errors. Common issues:
- `Checkbox` shadcn component missing → run `npx shadcn add checkbox` if needed
- Prisma `Decimal` to `number` conversion in hour entry sums → use `Number(h.totalHours)`
- Missing `shirtSize` on User model (it was moved to MemberSeason in schema) → check and update accordingly

> **Schema note:** `shirtSize` in the current schema is on `MemberSeason`, not `User`. Update `apply-form.tsx` and API to store `shirtSize` in the `memberSeason.create` data, not `user.create` data.

- [ ] **Step 2: Build**

```bash
npm run build
```

Expected: successful build.

- [ ] **Step 3: Smoke test checklist**

1. Navigate to `http://localhost:3000/apply/mast-scioly` (the seeded club slug)
2. Fill out and submit an application → should see success message
3. Log in as `owner@mast.edu` / `password123`
4. Navigate to `/dashboard/applications` → should see the application
5. Click Approve → toast success, row disappears
6. Navigate to `/dashboard/members` → should see the new member
7. Click into the member → should see detail page with tabs
8. Navigate to `/dashboard/settings` → should see Seasons section

- [ ] **Step 4: Commit fixes**

```bash
git add -A
git commit -m "fix: Phase 2A integration — TypeScript and schema field fixes"
```
