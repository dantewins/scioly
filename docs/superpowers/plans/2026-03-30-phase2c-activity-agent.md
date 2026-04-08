# Phase 2C — Activity Agent Implementation Plan

> **Agent:** Activity Agent
> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use `- [ ]` checkbox syntax for tracking.

**Goal:** Hours (admin-configurable categories, member submission, admin review), Finances (invoice creation, payment recording), Forms (form types, member submission), Club Events (calendar, attendance tracking).

**Permission flags used:** `view_hours`, `create_hours`, `edit_hours`, `delete_hours`, `view_finances`, `create_finances`, `edit_finances`, `view_forms`, `create_forms`, `edit_forms`, `view_club_events`, `create_club_events`, `edit_club_events`
**Pattern:** Dashboard pages = server components. API routes use `withPermission(flag)` or `withMemberAuth`. Always scope queries by `user.clubId` and active season.

---

## File Map

| File | Action |
|---|---|
| `app/api/admin/hour-categories/route.ts` | Create — CRUD hour categories |
| `app/api/admin/hour-categories/[id]/route.ts` | Create — PATCH/DELETE |
| `app/api/admin/hours/route.ts` | Create — GET all entries, PATCH approve/reject |
| `app/api/member/hours/route.ts` | Create — GET own entries, POST submit |
| `app/api/admin/dues/route.ts` | Create — GET invoices, POST create invoice |
| `app/api/admin/dues/[id]/route.ts` | Create — PATCH status, POST record payment |
| `app/api/admin/dues/[id]/payments/route.ts` | Create — POST add payment record |
| `app/api/admin/forms/route.ts` | Create — GET form types, POST create |
| `app/api/admin/forms/[id]/route.ts` | Create — PATCH/DELETE form type |
| `app/api/admin/forms/[id]/submissions/route.ts` | Create — GET submissions, PATCH verify/reject |
| `app/api/member/forms/route.ts` | Create — GET own submissions, PATCH submit |
| `app/api/admin/club-events/route.ts` | Create — GET list, POST create |
| `app/api/admin/club-events/[id]/route.ts` | Create — PATCH/DELETE club event |
| `app/api/admin/club-events/[id]/attendance/route.ts` | Create — GET attendees, POST mark attendance |
| `app/dashboard/hours/page.tsx` | Replace stub |
| `app/dashboard/finances/page.tsx` | Replace stub |
| `app/dashboard/forms/page.tsx` | Replace stub |
| `app/dashboard/club-events/page.tsx` | Replace stub |

---

## Task 1: Hour categories API

**Files:**
- Create: `app/api/admin/hour-categories/route.ts`
- Create: `app/api/admin/hour-categories/[id]/route.ts`

Hour categories are the foundation for all hour tracking. Admins configure them per season (e.g., "Study Sessions", "Community Service"). Each category can have a required hours target.

- [ ] **Step 1: Write categories list + create**

```ts
// app/api/admin/hour-categories/route.ts
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withPermission, ok, err } from "@/lib/api"
import { getActiveSeason } from "@/lib/db"

export const dynamic = "force-dynamic"

export const GET = withPermission("view_hours", async (_req, _ctx, user) => {
  const season = await getActiveSeason(user.clubId)
  if (!season) return err("No active season.", 400)

  const categories = await prisma.hourCategory.findMany({
    where: { seasonId: season.id },
    include: { _count: { select: { hourEntries: true } } },
    orderBy: { name: "asc" },
  })
  return ok(categories)
})

const createSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  requiredHours: z.number().min(0).max(999).optional(),
  requiresApproval: z.boolean().default(true),
  proofInstructions: z.string().max(500).optional(),
})

export const POST = withPermission("edit_hours", async (req, _ctx, user) => {
  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input.", 400)

  const season = await getActiveSeason(user.clubId)
  if (!season) return err("No active season.", 400)

  const existing = await prisma.hourCategory.findUnique({
    where: { seasonId_name: { seasonId: season.id, name: parsed.data.name } },
  })
  if (existing) return err("A category with this name already exists.", 409)

  const category = await prisma.hourCategory.create({
    data: { seasonId: season.id, ...parsed.data },
  })
  return ok(category, 201)
})
```

- [ ] **Step 2: Write category update + delete**

```ts
// app/api/admin/hour-categories/[id]/route.ts
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withPermission, ok, err } from "@/lib/api"

export const dynamic = "force-dynamic"

const patchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  requiredHours: z.number().min(0).max(999).nullable().optional(),
  requiresApproval: z.boolean().optional(),
  proofInstructions: z.string().max(500).optional(),
})

export const PATCH = withPermission(
  "edit_hours",
  async (req, ctx: { params: Promise<{ id: string }> }, user) => {
    const { id } = await ctx.params
    const body = await req.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input.", 400)

    const cat = await prisma.hourCategory.findFirst({
      where: { id, season: { clubId: user.clubId } },
    })
    if (!cat) return err("Category not found.", 404)

    const updated = await prisma.hourCategory.update({ where: { id }, data: parsed.data })
    return ok(updated)
  },
)

export const DELETE = withPermission(
  "delete_hours",
  async (_req, ctx: { params: Promise<{ id: string }> }, user) => {
    const { id } = await ctx.params
    const cat = await prisma.hourCategory.findFirst({
      where: { id, season: { clubId: user.clubId } },
    })
    if (!cat) return err("Category not found.", 404)

    // Check if any entries reference this category
    const entryCount = await prisma.hourEntry.count({ where: { categoryId: id } })
    if (entryCount > 0) {
      return err(`Cannot delete — ${entryCount} hour entries use this category.`, 409)
    }

    await prisma.hourCategory.delete({ where: { id } })
    return ok({ ok: true })
  },
)
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "hour-categories" | head -5
```

- [ ] **Step 4: Commit**

```bash
git add app/api/admin/hour-categories/
git commit -m "feat: hour categories CRUD API"
```

---

## Task 2: Hours API

**Files:**
- Create: `app/api/admin/hours/route.ts`
- Create: `app/api/member/hours/route.ts`

- [ ] **Step 1: Write admin hours route**

```ts
// app/api/admin/hours/route.ts
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withPermission, ok, err } from "@/lib/api"
import { getActiveSeason } from "@/lib/db"

export const dynamic = "force-dynamic"

export const GET = withPermission("view_hours", async (req, _ctx, user) => {
  const season = await getActiveSeason(user.clubId)
  if (!season) return err("No active season.", 400)

  const url = new URL(req.url)
  const status = url.searchParams.get("status") as "PENDING" | "APPROVED" | "REJECTED" | null
  const categoryId = url.searchParams.get("category") ?? undefined

  const entries = await prisma.hourEntry.findMany({
    where: {
      memberSeason: { seasonId: season.id, user: { clubId: user.clubId } },
      ...(status && { status }),
      ...(categoryId && { categoryId }),
    },
    include: {
      memberSeason: {
        include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
      },
      category: { select: { id: true, name: true } },
    },
    orderBy: { submittedAt: "desc" },
  })
  return ok(entries)
})

const reviewSchema = z.object({
  entryId: z.string(),
  action: z.enum(["approve", "reject"]),
  rejectionReason: z.string().max(500).optional(),
})

export const PATCH = withPermission("edit_hours", async (req, _ctx, user) => {
  const body = await req.json()
  const parsed = reviewSchema.safeParse(body)
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input.", 400)

  const { entryId, action, rejectionReason } = parsed.data

  // Verify entry belongs to this club
  const entry = await prisma.hourEntry.findFirst({
    where: { id: entryId, memberSeason: { season: { clubId: user.clubId } } },
  })
  if (!entry) return err("Hour entry not found.", 404)

  const updated = await prisma.hourEntry.update({
    where: { id: entryId },
    data:
      action === "approve"
        ? { status: "APPROVED", approvedAt: new Date(), approvedById: user.id, rejectionReason: null }
        : { status: "REJECTED", rejectionReason: rejectionReason ?? "No reason provided." },
  })
  return ok(updated)
})
```

- [ ] **Step 2: Write member hours route**

```ts
// app/api/member/hours/route.ts
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withMemberAuth, ok, err } from "@/lib/api"
import { hasPermission } from "@/lib/permissions"
import { getActiveSeason, getMemberSeason } from "@/lib/db"

export const dynamic = "force-dynamic"

// GET — current member's own hour entries
export const GET = withMemberAuth(async (_req, _ctx, user) => {
  const ms = await getMemberSeason(user.id, user.clubId)
  if (!ms) return err("Not a member this season.", 403)

  const entries = await prisma.hourEntry.findMany({
    where: { memberSeasonId: ms.id },
    include: { category: { select: { id: true, name: true } } },
    orderBy: { submittedAt: "desc" },
  })
  return ok(entries)
})

const submitSchema = z.object({
  categoryId: z.string(),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  totalHours: z.number().min(0.25).max(24),
  proofUrl: z.string().url().optional(),
})

// POST — submit a new hour entry (requires create_hours permission)
export const POST = withMemberAuth(async (req, _ctx, user) => {
  if (!hasPermission(user.permissions, "create_hours")) {
    return err("Forbidden.", 403)
  }

  const body = await req.json()
  const parsed = submitSchema.safeParse(body)
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input.", 400)

  const season = await getActiveSeason(user.clubId)
  if (!season) return err("No active season.", 400)

  const ms = await getMemberSeason(user.id, user.clubId)
  if (!ms) return err("Not a member this season.", 403)

  // Verify category belongs to this season
  const category = await prisma.hourCategory.findFirst({
    where: { id: parsed.data.categoryId, seasonId: season.id },
  })
  if (!category) return err("Category not found.", 404)

  const entry = await prisma.hourEntry.create({
    data: {
      memberSeasonId: ms.id,
      ...parsed.data,
      // If category doesn't require approval, auto-approve
      status: category.requiresApproval ? "PENDING" : "APPROVED",
      ...(category.requiresApproval ? {} : { approvedAt: new Date(), approvedById: user.id }),
    },
    include: { category: { select: { id: true, name: true } } },
  })
  return ok(entry, 201)
})
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep -E "admin/hours|member/hours" | head -5
```

- [ ] **Step 4: Commit**

```bash
git add app/api/admin/hours/ app/api/member/hours/
git commit -m "feat: hours API — admin review and member submission"
```

---

## Task 3: Hours dashboard page

**Files:**
- Replace stub: `app/dashboard/hours/page.tsx`

The hours page has two views: admin sees all entries with filter/approve UI; members see their own entries + submission form. Use `user.role` and permissions to determine which view to render.

- [ ] **Step 1: Write hours page**

```tsx
// app/dashboard/hours/page.tsx
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { canView, canEdit, canCreate } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { getActiveSeason, getMemberSeason } from "@/lib/db"
import { PageHeader } from "@/components/page-header"
import { AdminHoursView } from "./admin-hours-view"
import { MemberHoursView } from "./member-hours-view"

export const dynamic = "force-dynamic"

export default async function HoursPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  if (!canView(user.permissions, "hours")) redirect("/dashboard")

  const season = await getActiveSeason(user.clubId)
  const isAdmin = canEdit(user.permissions, "hours")

  if (isAdmin) {
    // Admin view: all pending entries + categories
    const [pendingEntries, categories] = season ? await Promise.all([
      prisma.hourEntry.findMany({
        where: { memberSeason: { seasonId: season.id, user: { clubId: user.clubId } }, status: "PENDING" },
        include: {
          memberSeason: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
          category: { select: { id: true, name: true } },
        },
        orderBy: { submittedAt: "asc" },
      }),
      prisma.hourCategory.findMany({
        where: { seasonId: season.id },
        include: { _count: { select: { hourEntries: true } } },
        orderBy: { name: "asc" },
      }),
    ]) : [[], []]

    return (
      <div className="flex flex-col gap-6 py-4 lg:px-6 md:py-6 sm:px-4 px-0">
        <PageHeader title="Hours" description={`${pendingEntries.length} pending review`} />
        <AdminHoursView pendingEntries={pendingEntries} categories={categories} canManageCategories={canEdit(user.permissions, "hours")} />
      </div>
    )
  }

  // Member view: own entries + submit form
  const ms = season ? await getMemberSeason(user.id, user.clubId) : null
  const [myEntries, categories] = ms && season ? await Promise.all([
    prisma.hourEntry.findMany({
      where: { memberSeasonId: ms.id },
      include: { category: { select: { id: true, name: true } } },
      orderBy: { submittedAt: "desc" },
    }),
    prisma.hourCategory.findMany({
      where: { seasonId: season.id },
      orderBy: { name: "asc" },
    }),
  ]) : [[], []]

  const totalApproved = myEntries
    .filter((e) => e.status === "APPROVED")
    .reduce((s, e) => s + Number(e.totalHours), 0)

  return (
    <div className="flex flex-col gap-6 py-4 lg:px-6 md:py-6 sm:px-4 px-0">
      <PageHeader title="My Hours" description={`${totalApproved.toFixed(1)} approved hours this season`} />
      <MemberHoursView entries={myEntries} categories={categories} canSubmit={canCreate(user.permissions, "hours")} />
    </div>
  )
}
```

- [ ] **Step 2: Create AdminHoursView client component**

Create `app/dashboard/hours/admin-hours-view.tsx`:

```tsx
// app/dashboard/hours/admin-hours-view.tsx
"use client"

import { useState } from "react"
import { toast } from "sonner"
import { IconCheck, IconX, IconPlus } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card"
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

interface Entry {
  id: string
  title: string
  totalHours: string | number
  status: string
  submittedAt: string
  description: string | null
  proofUrl: string | null
  memberSeason: { user: { id: string; firstName: string; lastName: string } }
  category: { id: string; name: string }
}

interface Category {
  id: string
  name: string
  description: string | null
  requiredHours: string | number | null
  requiresApproval: boolean
  _count: { hourEntries: number }
}

interface Props {
  pendingEntries: Entry[]
  categories: Category[]
  canManageCategories: boolean
}

export function AdminHoursView({ pendingEntries: initial, categories: initialCats, canManageCategories }: Props) {
  const [entries, setEntries] = useState<Entry[]>(initial)
  const [categories, setCategories] = useState<Category[]>(initialCats)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState("")
  const [showCreateCat, setShowCreateCat] = useState(false)
  const [catForm, setCatForm] = useState({ name: "", description: "", requiredHours: "", requiresApproval: true })
  const [loading, setLoading] = useState(false)

  async function review(entryId: string, action: "approve" | "reject", reason?: string) {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/hours", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId, action, rejectionReason: reason }),
      })
      if (!res.ok) { toast.error("Failed to update."); return }
      setEntries((e) => e.filter((x) => x.id !== entryId))
      setRejectingId(null)
      setRejectReason("")
      toast.success(action === "approve" ? "Hours approved." : "Hours rejected.")
    } finally { setLoading(false) }
  }

  async function createCategory() {
    if (!catForm.name) { toast.error("Name required."); return }
    setLoading(true)
    try {
      const res = await fetch("/api/admin/hour-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...catForm,
          requiredHours: catForm.requiredHours ? parseFloat(catForm.requiredHours) : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.message ?? "Failed."); return }
      setCategories((c) => [...c, { ...data, _count: { hourEntries: 0 } }])
      setShowCreateCat(false)
      setCatForm({ name: "", description: "", requiredHours: "", requiresApproval: true })
      toast.success("Category created.")
    } finally { setLoading(false) }
  }

  return (
    <Tabs defaultValue="pending">
      <TabsList>
        <TabsTrigger value="pending">Pending ({entries.length})</TabsTrigger>
        <TabsTrigger value="categories">Categories ({categories.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="pending" className="mt-4 space-y-3">
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pending hour entries.</p>
        ) : (
          entries.map((entry) => (
            <Card key={entry.id}>
              <CardContent flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">{entry.title}</p>
                    <Badge variant="secondary" className="text-xs shrink-0">{Number(entry.totalHours).toFixed(1)} hrs</Badge>
                    <Badge variant="outline" className="text-xs shrink-0">{entry.category.name}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {entry.memberSeason.user.firstName} {entry.memberSeason.user.lastName}
                    {entry.description && ` · ${entry.description.slice(0, 80)}`}
                  </p>
                  {entry.proofUrl && (
                    <a href={entry.proofUrl} target="_blank" rel="noopener" className="text-xs text-primary underline mt-0.5 block">
                      View proof
                    </a>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="icon" variant="outline" className="size-8 text-green-600" onClick={() => review(entry.id, "approve")} disabled={loading}>
                    <IconCheck className="size-4" />
                  </Button>
                  <Button size="icon" variant="outline" className="size-8 text-destructive" onClick={() => setRejectingId(entry.id)} disabled={loading}>
                    <IconX className="size-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </TabsContent>

      <TabsContent value="categories" className="mt-4 space-y-3">
        {categories.map((cat) => (
          <Card key={cat.id}>
            <CardContent">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{cat.name}</p>
                  {cat.description && <p className="text-xs text-muted-foreground">{cat.description}</p>}
                  <div className="flex items-center gap-3 mt-1">
                    {cat.requiredHours && <span className="text-xs">Required: {Number(cat.requiredHours)}h</span>}
                    <span className="text-xs text-muted-foreground">{cat._count.hourEntries} entries</span>
                    {!cat.requiresApproval && <Badge variant="outline" className="text-xs">Auto-approved</Badge>}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {canManageCategories && (
          <Button variant="outline" onClick={() => setShowCreateCat(true)}>
            <IconPlus className="size-4 mr-1.5" />Add Category
          </Button>
        )}
      </TabsContent>

      {/* Reject dialog */}
      <Dialog open={!!rejectingId} onOpenChange={() => { setRejectingId(null); setRejectReason("") }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject Hours</DialogTitle></DialogHeader>
          <div className="space-y-1.5">
            <Label>Reason (optional)</Label>
            <Input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Explain why these hours are being rejected" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectingId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => rejectingId && review(rejectingId, "reject", rejectReason)} disabled={loading}>
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create category dialog */}
      <Dialog open={showCreateCat} onOpenChange={setShowCreateCat}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Hour Category</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={catForm.name} onChange={(e) => setCatForm(f => ({ ...f, name: e.target.value }))} placeholder="Study Sessions" />
            </div>
            <div className="space-y-1.5">
              <Label>Description (optional)</Label>
              <Input value={catForm.description} onChange={(e) => setCatForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Required Hours (optional)</Label>
              <Input type="number" min={0} step={0.5} value={catForm.requiredHours} onChange={(e) => setCatForm(f => ({ ...f, requiredHours: e.target.value }))} placeholder="e.g. 20" />
            </div>
            <div className="flex items-center gap-2">
              <Switch id="req-approval" checked={catForm.requiresApproval} onCheckedChange={(v) => setCatForm(f => ({ ...f, requiresApproval: v }))} />
              <Label htmlFor="req-approval">Requires admin approval</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateCat(false)}>Cancel</Button>
            <Button onClick={createCategory} disabled={loading || !catForm.name}>{loading ? "Creating..." : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Tabs>
  )
}
```

- [ ] **Step 3: Create MemberHoursView client component**

Create `app/dashboard/hours/member-hours-view.tsx`:

```tsx
// app/dashboard/hours/member-hours-view.tsx
"use client"

import { useState } from "react"
import { toast } from "sonner"
import { IconPlus } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { formatDateOnly } from "@/lib/format"

interface Entry {
  id: string
  title: string
  totalHours: string | number
  status: string
  submittedAt: string
  description: string | null
  rejectionReason: string | null
  category: { id: string; name: string }
}

interface Category {
  id: string
  name: string
  description: string | null
  proofInstructions: string | null
}

interface Props {
  entries: Entry[]
  categories: Category[]
  canSubmit: boolean
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
}

export function MemberHoursView({ entries: initial, categories, canSubmit }: Props) {
  const [entries, setEntries] = useState<Entry[]>(initial)
  const [showSubmit, setShowSubmit] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ categoryId: "", title: "", description: "", totalHours: "", proofUrl: "" })

  const selectedCategory = categories.find((c) => c.id === form.categoryId)

  async function handleSubmit() {
    if (!form.categoryId || !form.title || !form.totalHours) {
      toast.error("Category, title and hours are required."); return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/member/hours", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          totalHours: parseFloat(form.totalHours),
          proofUrl: form.proofUrl || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.message ?? "Failed to submit."); return }
      setEntries((e) => [{ ...data, category: categories.find(c => c.id === data.categoryId) ?? { id: "", name: "" } }, ...e])
      setShowSubmit(false)
      setForm({ categoryId: "", title: "", description: "", totalHours: "", proofUrl: "" })
      toast.success("Hours submitted.")
    } finally { setLoading(false) }
  }

  return (
    <div className="space-y-4">
      {canSubmit && (
        <Button onClick={() => setShowSubmit(true)}>
          <IconPlus className="size-4 mr-1.5" />Log Hours
        </Button>
      )}

      <div className="space-y-2">
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hour entries yet.</p>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className="flex items-start gap-3 rounded-lg border p-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm truncate">{entry.title}</p>
                  <Badge variant="secondary" className="text-xs shrink-0">{Number(entry.totalHours).toFixed(1)} hrs</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{entry.category.name} · {formatDateOnly(new Date(entry.submittedAt))}</p>
                {entry.rejectionReason && (
                  <p className="text-xs text-destructive mt-0.5">{entry.rejectionReason}</p>
                )}
              </div>
              <Badge className={STATUS_COLORS[entry.status] ?? ""} variant="outline">
                {entry.status}
              </Badge>
            </div>
          ))
        )}
      </div>

      <Dialog open={showSubmit} onOpenChange={setShowSubmit}>
        <DialogContent>
          <DialogHeader><DialogTitle>Log Hours</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={form.categoryId} onValueChange={(v) => setForm(f => ({ ...f, categoryId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {selectedCategory?.proofInstructions && (
                <p className="text-xs text-muted-foreground">{selectedCategory.proofInstructions}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} placeholder="What did you do?" />
            </div>
            <div className="space-y-1.5">
              <Label>Hours</Label>
              <Input type="number" min={0.25} max={24} step={0.25} value={form.totalHours} onChange={(e) => setForm(f => ({ ...f, totalHours: e.target.value }))} placeholder="1.5" />
            </div>
            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
              <Input value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Proof URL (optional)</Label>
              <Input type="url" value={form.proofUrl} onChange={(e) => setForm(f => ({ ...f, proofUrl: e.target.value }))} placeholder="https://..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubmit(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={loading}>{loading ? "Submitting..." : "Submit"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep -E "dashboard/hours" | head -10
```

- [ ] **Step 5: Commit**

```bash
git add app/dashboard/hours/
git commit -m "feat: hours page — admin review and member submission with categories"
```

---

## Task 4: Finances API and page

**Files:**
- Create: `app/api/admin/dues/route.ts`
- Create: `app/api/admin/dues/[id]/route.ts`
- Create: `app/api/admin/dues/[id]/payments/route.ts`
- Replace stub: `app/dashboard/finances/page.tsx`

- [ ] **Step 1: Write dues invoice API**

```ts
// app/api/admin/dues/route.ts
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withPermission, ok, err } from "@/lib/api"
import { getActiveSeason } from "@/lib/db"

export const dynamic = "force-dynamic"

export const GET = withPermission("view_finances", async (req, _ctx, user) => {
  const season = await getActiveSeason(user.clubId)
  if (!season) return err("No active season.", 400)

  const url = new URL(req.url)
  const status = url.searchParams.get("status") ?? undefined

  const invoices = await prisma.duesInvoice.findMany({
    where: {
      seasonId: season.id,
      ...(status && { status: status as "OPEN" | "PAID" | "OVERDUE" }),
    },
    include: {
      memberSeason: {
        include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
      },
      payments: { select: { id: true, amountCents: true, method: true, paidAt: true } },
    },
    orderBy: { issuedAt: "desc" },
  })
  return ok(invoices)
})

const createSchema = z.object({
  memberSeasonId: z.string(),
  title: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  amountCents: z.number().int().min(1),
  dueAt: z.string().datetime().optional(),
  notes: z.string().max(500).optional(),
})

export const POST = withPermission("create_finances", async (req, _ctx, user) => {
  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input.", 400)

  const season = await getActiveSeason(user.clubId)
  if (!season) return err("No active season.", 400)

  // Verify memberSeason belongs to this club
  const ms = await prisma.memberSeason.findFirst({
    where: { id: parsed.data.memberSeasonId, season: { clubId: user.clubId } },
  })
  if (!ms) return err("Member season not found.", 404)

  const invoice = await prisma.duesInvoice.create({
    data: {
      seasonId: season.id,
      ...parsed.data,
      status: "OPEN",
    },
  })
  return ok(invoice, 201)
})
```

- [ ] **Step 2: Write invoice update + payment recording**

```ts
// app/api/admin/dues/[id]/route.ts
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withPermission, ok, err } from "@/lib/api"

export const dynamic = "force-dynamic"

const patchSchema = z.object({
  status: z.enum(["DRAFT", "OPEN", "PARTIALLY_PAID", "PAID", "VOID", "OVERDUE"]).optional(),
  notes: z.string().max(500).optional(),
  dueAt: z.string().datetime().nullable().optional(),
})

export const PATCH = withPermission(
  "edit_finances",
  async (req, ctx: { params: Promise<{ id: string }> }, user) => {
    const { id } = await ctx.params
    const body = await req.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid.", 400)

    const invoice = await prisma.duesInvoice.findFirst({
      where: { id, season: { clubId: user.clubId } },
    })
    if (!invoice) return err("Invoice not found.", 404)

    const updated = await prisma.duesInvoice.update({ where: { id }, data: parsed.data })
    return ok(updated)
  },
)
```

```ts
// app/api/admin/dues/[id]/payments/route.ts
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withPermission, ok, err } from "@/lib/api"

export const dynamic = "force-dynamic"

const addPaymentSchema = z.object({
  amountCents: z.number().int().min(1),
  method: z.enum(["CASH", "CHECK", "CARD", "ZELLE", "VENMO", "PAYPAL", "OTHER"]).default("OTHER"),
  referenceNumber: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
})

export const POST = withPermission(
  "edit_finances",
  async (req, ctx: { params: Promise<{ id: string }> }, user) => {
    const { id: invoiceId } = await ctx.params
    const body = await req.json()
    const parsed = addPaymentSchema.safeParse(body)
    if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid.", 400)

    const invoice = await prisma.duesInvoice.findFirst({
      where: { id: invoiceId, season: { clubId: user.clubId } },
    })
    if (!invoice) return err("Invoice not found.", 404)

    const newPaidCents = invoice.amountPaidCents + parsed.data.amountCents
    const newStatus = newPaidCents >= invoice.amountCents ? "PAID" : "PARTIALLY_PAID"

    await prisma.$transaction([
      prisma.paymentRecord.create({
        data: {
          invoiceId,
          memberSeasonId: invoice.memberSeasonId,
          ...parsed.data,
          recordedById: user.id,
        },
      }),
      prisma.duesInvoice.update({
        where: { id: invoiceId },
        data: {
          amountPaidCents: newPaidCents,
          status: newStatus,
          ...(newStatus === "PAID" && { paidAt: new Date() }),
        },
      }),
    ])

    return ok({ ok: true })
  },
)
```

- [ ] **Step 3: Write finances page**

```tsx
// app/dashboard/finances/page.tsx
import { redirect } from "next/navigation"
import { IconWallet } from "@tabler/icons-react"
import { getCurrentUser } from "@/lib/auth"
import { canView, canCreate } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { getActiveSeason } from "@/lib/db"
import { PageHeader } from "@/components/page-header"
import { EmptyState } from "@/components/empty-state"
import { FinancesView } from "./finances-view"

export const dynamic = "force-dynamic"

export default async function FinancesPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  if (!canView(user.permissions, "finances")) redirect("/dashboard")

  const season = await getActiveSeason(user.clubId)
  const [invoices, members] = season ? await Promise.all([
    prisma.duesInvoice.findMany({
      where: { seasonId: season.id },
      include: {
        memberSeason: {
          include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
        },
        payments: { select: { id: true, amountCents: true, method: true, paidAt: true, referenceNumber: true } },
      },
      orderBy: { issuedAt: "desc" },
    }),
    prisma.memberSeason.findMany({
      where: { seasonId: season.id, membershipStatus: "ACTIVE", user: { clubId: user.clubId } },
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: [{ user: { lastName: "asc" } }],
    }),
  ]) : [[], []]

  const totalOwed = invoices
    .filter((i) => ["OPEN", "PARTIALLY_PAID", "OVERDUE"].includes(i.status))
    .reduce((s, i) => s + (i.amountCents - i.amountPaidCents), 0)

  return (
    <div className="flex flex-col gap-6 py-4 lg:px-6 md:py-6 sm:px-4 px-0">
      <PageHeader
        title="Finances"
        description={`$${(totalOwed / 100).toFixed(2)} outstanding across ${invoices.filter((i) => i.status !== "PAID" && i.status !== "VOID").length} invoices`}
      />

      {!season ? (
        <EmptyState icon={IconWallet} title="No active season" />
      ) : (
        <FinancesView
          invoices={invoices}
          members={members}
          canCreate={canCreate(user.permissions, "finances")}
          canEdit={canView(user.permissions, "finances")}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 4: Create FinancesView client component**

Create `app/dashboard/finances/finances-view.tsx` — a component that:
- Shows a table of invoices with: Member name, Title, Amount, Paid, Status, Due Date, Actions
- "New Invoice" button → dialog with member picker, title, amount (in dollars, convert to cents), due date
- "Record Payment" action on each open/partial invoice → dialog with amount, payment method, reference
- "Void" action to void an invoice

POST to `/api/admin/dues` to create. POST to `/api/admin/dues/[id]/payments` to record payment. PATCH to `/api/admin/dues/[id]` to void (`status: "VOID"`).

- [ ] **Step 5: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep -E "dashboard/finances|admin/dues" | head -10
```

- [ ] **Step 6: Commit**

```bash
git add app/api/admin/dues/ app/dashboard/finances/
git commit -m "feat: finances page — invoices and payment recording"
```

---

## Task 5: Forms API and page

**Files:**
- Create: `app/api/admin/forms/route.ts`
- Create: `app/api/admin/forms/[id]/route.ts`
- Create: `app/api/admin/forms/[id]/submissions/route.ts`
- Create: `app/api/member/forms/route.ts`
- Replace stub: `app/dashboard/forms/page.tsx`

- [ ] **Step 1: Write form types admin API**

```ts
// app/api/admin/forms/route.ts
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withPermission, ok, err } from "@/lib/api"
import { getActiveSeason } from "@/lib/db"

export const dynamic = "force-dynamic"

export const GET = withPermission("view_forms", async (_req, _ctx, user) => {
  const season = await getActiveSeason(user.clubId)
  if (!season) return err("No active season.", 400)

  const forms = await prisma.formType.findMany({
    where: { seasonId: season.id },
    include: {
      _count: { select: { submissions: true } },
    },
    orderBy: { name: "asc" },
  })
  return ok(forms)
})

const createSchema = z.object({
  name: z.string().min(1).max(100),
  category: z.enum(["WAIVER", "MEDICAL", "PERMISSION", "CODE_OF_CONDUCT", "TRAVEL", "PHOTO_RELEASE", "CLUB_CONTRACT", "OTHER"]).default("OTHER"),
  description: z.string().max(500).optional(),
  isRequired: z.boolean().default(true),
  requiresUpload: z.boolean().default(false),
  dueAt: z.string().datetime().optional(),
})

export const POST = withPermission("create_forms", async (req, _ctx, user) => {
  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid.", 400)

  const season = await getActiveSeason(user.clubId)
  if (!season) return err("No active season.", 400)

  const form = await prisma.formType.create({
    data: { seasonId: season.id, ...parsed.data },
  })
  return ok(form, 201)
})
```

- [ ] **Step 2: Write form submissions API (admin)**

```ts
// app/api/admin/forms/[id]/submissions/route.ts
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withPermission, ok, err } from "@/lib/api"
import { getActiveSeason } from "@/lib/db"

export const dynamic = "force-dynamic"

export const GET = withPermission(
  "view_forms",
  async (_req, ctx: { params: Promise<{ id: string }> }, user) => {
    const { id: formTypeId } = await ctx.params
    const season = await getActiveSeason(user.clubId)
    if (!season) return err("No active season.", 400)

    const submissions = await prisma.formSubmission.findMany({
      where: {
        formTypeId,
        memberSeason: { seasonId: season.id, user: { clubId: user.clubId } },
      },
      include: {
        memberSeason: {
          include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
        },
      },
      orderBy: { submittedAt: "desc" },
    })
    return ok(submissions)
  },
)

const reviewSchema = z.object({
  submissionId: z.string(),
  action: z.enum(["verify", "reject"]),
  rejectionReason: z.string().optional(),
})

export const PATCH = withPermission(
  "edit_forms",
  async (req, _ctx, user) => {
    const body = await req.json()
    const parsed = reviewSchema.safeParse(body)
    if (!parsed.success) return err("Invalid.", 400)

    const { submissionId, action, rejectionReason } = parsed.data

    const sub = await prisma.formSubmission.findFirst({
      where: { id: submissionId, memberSeason: { season: { clubId: user.clubId } } },
    })
    if (!sub) return err("Submission not found.", 404)

    const updated = await prisma.formSubmission.update({
      where: { id: submissionId },
      data:
        action === "verify"
          ? { status: "VERIFIED", verifiedAt: new Date(), verifiedById: user.id, rejectionReason: null }
          : { status: "REJECTED", rejectionReason: rejectionReason ?? "No reason." },
    })
    return ok(updated)
  },
)
```

- [ ] **Step 3: Write member forms API**

```ts
// app/api/member/forms/route.ts
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withMemberAuth, ok, err } from "@/lib/api"
import { getActiveSeason, getMemberSeason } from "@/lib/db"

export const dynamic = "force-dynamic"

// GET — list all required forms and the member's submission status
export const GET = withMemberAuth(async (_req, _ctx, user) => {
  const season = await getActiveSeason(user.clubId)
  if (!season) return ok([])

  const ms = await getMemberSeason(user.id, user.clubId)
  if (!ms) return ok([])

  const formTypes = await prisma.formType.findMany({
    where: { seasonId: season.id },
    include: {
      submissions: {
        where: { memberSeasonId: ms.id },
        select: { id: true, status: true, submittedAt: true, fileUrl: true },
        take: 1,
      },
    },
    orderBy: { name: "asc" },
  })

  return ok(formTypes)
})

const submitSchema = z.object({
  formTypeId: z.string(),
  acknowledgement: z.boolean().optional(),
  fileUrl: z.string().url().optional(),
})

// PATCH — acknowledge or provide URL for a form submission
export const PATCH = withMemberAuth(async (req, _ctx, user) => {
  const body = await req.json()
  const parsed = submitSchema.safeParse(body)
  if (!parsed.success) return err("Invalid.", 400)

  const season = await getActiveSeason(user.clubId)
  if (!season) return err("No active season.", 400)

  const ms = await getMemberSeason(user.id, user.clubId)
  if (!ms) return err("Not a member this season.", 403)

  const formType = await prisma.formType.findFirst({
    where: { id: parsed.data.formTypeId, seasonId: season.id },
  })
  if (!formType) return err("Form type not found.", 404)

  const submission = await prisma.formSubmission.upsert({
    where: { formTypeId_memberSeasonId: { formTypeId: parsed.data.formTypeId, memberSeasonId: ms.id } },
    create: {
      formTypeId: parsed.data.formTypeId,
      memberSeasonId: ms.id,
      acknowledgement: parsed.data.acknowledgement ?? false,
      fileUrl: parsed.data.fileUrl,
      status: "SUBMITTED",
      submittedAt: new Date(),
    },
    update: {
      acknowledgement: parsed.data.acknowledgement ?? false,
      fileUrl: parsed.data.fileUrl,
      status: "SUBMITTED",
      submittedAt: new Date(),
    },
  })
  return ok(submission)
})
```

- [ ] **Step 4: Write forms page**

```tsx
// app/dashboard/forms/page.tsx
import { redirect } from "next/navigation"
import { IconFileCheck } from "@tabler/icons-react"
import { getCurrentUser } from "@/lib/auth"
import { canView, canCreate, canEdit } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { getActiveSeason, getMemberSeason } from "@/lib/db"
import { PageHeader } from "@/components/page-header"
import { EmptyState } from "@/components/empty-state"
import { AdminFormsView } from "./admin-forms-view"
import { MemberFormsView } from "./member-forms-view"

export const dynamic = "force-dynamic"

export default async function FormsPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  if (!canView(user.permissions, "forms")) redirect("/dashboard")

  const season = await getActiveSeason(user.clubId)
  const isAdmin = canEdit(user.permissions, "forms")

  if (isAdmin) {
    const formTypes = season ? await prisma.formType.findMany({
      where: { seasonId: season.id },
      include: {
        _count: { select: { submissions: true } },
        submissions: {
          where: { status: "SUBMITTED" },
          select: { id: true },
        },
      },
      orderBy: { name: "asc" },
    }) : []

    return (
      <div className="flex flex-col gap-6 py-4 lg:px-6 md:py-6 sm:px-4 px-0">
        <PageHeader title="Forms" description={`${formTypes.length} form type${formTypes.length !== 1 ? "s" : ""} this season`} />
        <AdminFormsView formTypes={formTypes} canCreate={canCreate(user.permissions, "forms")} />
      </div>
    )
  }

  // Member view
  const ms = season ? await getMemberSeason(user.id, user.clubId) : null
  const formTypes = ms && season ? await prisma.formType.findMany({
    where: { seasonId: season.id },
    include: {
      submissions: {
        where: { memberSeasonId: ms.id },
        select: { id: true, status: true, submittedAt: true, fileUrl: true },
        take: 1,
      },
    },
    orderBy: { name: "asc" },
  }) : []

  const completed = formTypes.filter((f) => f.submissions[0]?.status === "VERIFIED").length

  return (
    <div className="flex flex-col gap-6 py-4 lg:px-6 md:py-6 sm:px-4 px-0">
      <PageHeader title="Forms" description={`${completed} / ${formTypes.length} completed`} />
      {formTypes.length === 0 ? (
        <EmptyState icon={IconFileCheck} title="No forms required" description="No forms have been assigned for this season." />
      ) : (
        <MemberFormsView formTypes={formTypes} />
      )}
    </div>
  )
}
```

- [ ] **Step 5: Create AdminFormsView and MemberFormsView**

**AdminFormsView** (`app/dashboard/forms/admin-forms-view.tsx`): Shows each form type as a card with name, category, required/optional badge, pending submissions count. "Create Form" button posts to `/api/admin/forms`. Clicking a form navigates to a detail view (can be a sheet/dialog) showing submissions list with verify/reject actions via `/api/admin/forms/[id]/submissions`.

**MemberFormsView** (`app/dashboard/forms/member-forms-view.tsx`): Lists each form type. For each: name, due date, status badge (NOT_STARTED / SUBMITTED / VERIFIED / REJECTED). "Submit" button that either shows an acknowledgement checkbox (if `requiresUpload = false`) or a URL input field (if `requiresUpload = true`). PATCH to `/api/member/forms`.

- [ ] **Step 6: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep -E "dashboard/forms|admin/forms|member/forms" | head -10
```

- [ ] **Step 7: Commit**

```bash
git add app/api/admin/forms/ app/api/member/forms/ app/dashboard/forms/
git commit -m "feat: forms compliance page — admin type management and member submission"
```

---

## Task 6: Club Events API and page

**Files:**
- Create: `app/api/admin/club-events/route.ts`
- Create: `app/api/admin/club-events/[id]/route.ts`
- Create: `app/api/admin/club-events/[id]/attendance/route.ts`
- Replace stub: `app/dashboard/club-events/page.tsx`

- [ ] **Step 1: Write club events API**

```ts
// app/api/admin/club-events/route.ts
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withPermission, ok, err } from "@/lib/api"
import { getActiveSeason } from "@/lib/db"

export const dynamic = "force-dynamic"

export const GET = withPermission("view_club_events", async (_req, _ctx, user) => {
  const season = await getActiveSeason(user.clubId)
  if (!season) return err("No active season.", 400)

  const events = await prisma.clubEvent.findMany({
    where: { seasonId: season.id },
    include: {
      category: { select: { id: true, name: true } },
      _count: { select: { attendance: true } },
    },
    orderBy: { startsAt: "asc" },
  })
  return ok(events)
})

const createSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(["MEETING", "SUPER_SATURDAY", "FUNDRAISER", "WORKSHOP", "FIELD_TRIP", "OTHER"]).default("OTHER"),
  location: z.string().max(200).optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().optional(),
  hoursValue: z.number().min(0).max(24).default(0),
  categoryId: z.string().optional(),
  notes: z.string().max(500).optional(),
})

export const POST = withPermission("create_club_events", async (req, _ctx, user) => {
  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid.", 400)

  const season = await getActiveSeason(user.clubId)
  if (!season) return err("No active season.", 400)

  const event = await prisma.clubEvent.create({
    data: { seasonId: season.id, ...parsed.data },
    include: {
      category: { select: { id: true, name: true } },
      _count: { select: { attendance: true } },
    },
  })
  return ok(event, 201)
})
```

- [ ] **Step 2: Write club event detail + attendance**

```ts
// app/api/admin/club-events/[id]/route.ts
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withPermission, ok, err } from "@/lib/api"

export const dynamic = "force-dynamic"

const patchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  type: z.enum(["MEETING", "SUPER_SATURDAY", "FUNDRAISER", "WORKSHOP", "FIELD_TRIP", "OTHER"]).optional(),
  location: z.string().max(200).optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().nullable().optional(),
  hoursValue: z.number().min(0).max(24).optional(),
  categoryId: z.string().nullable().optional(),
  notes: z.string().max(500).optional(),
})

export const PATCH = withPermission(
  "edit_club_events",
  async (req, ctx: { params: Promise<{ id: string }> }, user) => {
    const { id } = await ctx.params
    const body = await req.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid.", 400)

    const event = await prisma.clubEvent.findFirst({
      where: { id, season: { clubId: user.clubId } },
    })
    if (!event) return err("Club event not found.", 404)

    const updated = await prisma.clubEvent.update({ where: { id }, data: parsed.data })
    return ok(updated)
  },
)

export const DELETE = withPermission(
  "delete_club_events",
  async (_req, ctx: { params: Promise<{ id: string }> }, user) => {
    const { id } = await ctx.params
    const event = await prisma.clubEvent.findFirst({
      where: { id, season: { clubId: user.clubId } },
    })
    if (!event) return err("Club event not found.", 404)

    await prisma.clubEvent.delete({ where: { id } })
    return ok({ ok: true })
  },
)
```

```ts
// app/api/admin/club-events/[id]/attendance/route.ts
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withPermission, ok, err } from "@/lib/api"

export const dynamic = "force-dynamic"

export const GET = withPermission(
  "view_club_events",
  async (_req, ctx: { params: Promise<{ id: string }> }, user) => {
    const { id: clubEventId } = await ctx.params

    const event = await prisma.clubEvent.findFirst({
      where: { id: clubEventId, season: { clubId: user.clubId } },
    })
    if (!event) return err("Club event not found.", 404)

    const attendance = await prisma.clubEventAttendance.findMany({
      where: { clubEventId },
      include: {
        memberSeason: {
          include: { user: { select: { id: true, firstName: true, lastName: true } } },
        },
      },
    })
    return ok(attendance)
  },
)

const markSchema = z.object({
  memberSeasonId: z.string(),
})

export const POST = withPermission(
  "edit_club_events",
  async (req, ctx: { params: Promise<{ id: string }> }, user) => {
    const { id: clubEventId } = await ctx.params
    const body = await req.json()
    const parsed = markSchema.safeParse(body)
    if (!parsed.success) return err("Invalid.", 400)

    const event = await prisma.clubEvent.findFirst({
      where: { id: clubEventId, season: { clubId: user.clubId } },
      include: { category: true },
    })
    if (!event) return err("Club event not found.", 404)

    const result = await prisma.$transaction(async (tx) => {
      // Create attendance record
      const attendance = await tx.clubEventAttendance.upsert({
        where: { clubEventId_memberSeasonId: { clubEventId, memberSeasonId: parsed.data.memberSeasonId } },
        create: { clubEventId, memberSeasonId: parsed.data.memberSeasonId },
        update: {},
      })

      // Auto-create approved hour entry if hoursValue > 0 and category is set
      if (Number(event.hoursValue) > 0 && event.categoryId) {
        const hourEntry = await tx.hourEntry.create({
          data: {
            memberSeasonId: parsed.data.memberSeasonId,
            categoryId: event.categoryId,
            title: `Attendance: ${event.name}`,
            totalHours: event.hoursValue,
            status: "APPROVED",
            approvedAt: new Date(),
            approvedById: user.id,
          },
        })
        // Link the attendance to the hour entry
        await tx.clubEventAttendance.update({
          where: { id: attendance.id },
          data: { hourEntryId: hourEntry.id },
        })
      }

      return attendance
    })

    return ok(result, 201)
  },
)

export const DELETE = withPermission(
  "edit_club_events",
  async (req, ctx: { params: Promise<{ id: string }> }, user) => {
    const { id: clubEventId } = await ctx.params
    const body = await req.json()
    const { memberSeasonId } = body as { memberSeasonId: string }

    const event = await prisma.clubEvent.findFirst({
      where: { id: clubEventId, season: { clubId: user.clubId } },
    })
    if (!event) return err("Club event not found.", 404)

    // Get attendance to find linked hour entry
    const attendance = await prisma.clubEventAttendance.findUnique({
      where: { clubEventId_memberSeasonId: { clubEventId, memberSeasonId } },
    })

    await prisma.$transaction(async (tx) => {
      if (attendance?.hourEntryId) {
        await tx.hourEntry.delete({ where: { id: attendance.hourEntryId } }).catch(() => null)
      }
      await tx.clubEventAttendance.deleteMany({ where: { clubEventId, memberSeasonId } })
    })

    return ok({ ok: true })
  },
)
```

- [ ] **Step 3: Write club events page**

```tsx
// app/dashboard/club-events/page.tsx
import { redirect } from "next/navigation"
import { IconCalendarEvent } from "@tabler/icons-react"
import { getCurrentUser } from "@/lib/auth"
import { canView, canCreate, canEdit } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { getActiveSeason } from "@/lib/db"
import { PageHeader } from "@/components/page-header"
import { EmptyState } from "@/components/empty-state"
import { ClubEventsView } from "./club-events-view"

export const dynamic = "force-dynamic"

export default async function ClubEventsPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  if (!canView(user.permissions, "club_events")) redirect("/dashboard")

  const season = await getActiveSeason(user.clubId)

  const [events, categories, members] = season ? await Promise.all([
    prisma.clubEvent.findMany({
      where: { seasonId: season.id },
      include: {
        category: { select: { id: true, name: true } },
        _count: { select: { attendance: true } },
      },
      orderBy: { startsAt: "asc" },
    }),
    prisma.hourCategory.findMany({
      where: { seasonId: season.id },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    canEdit(user.permissions, "club_events")
      ? prisma.memberSeason.findMany({
          where: { seasonId: season.id, membershipStatus: "ACTIVE", user: { clubId: user.clubId } },
          include: { user: { select: { id: true, firstName: true, lastName: true } } },
          orderBy: [{ user: { lastName: "asc" } }],
        })
      : [],
  ]) : [[], [], []]

  return (
    <div className="flex flex-col gap-6 py-4 lg:px-6 md:py-6 sm:px-4 px-0">
      <PageHeader title="Club Events" description={`${events.length} event${events.length !== 1 ? "s" : ""} this season`} />

      {!season ? (
        <EmptyState icon={IconCalendarEvent} title="No active season" />
      ) : (
        <ClubEventsView
          events={events}
          categories={categories}
          members={members}
          canManage={canEdit(user.permissions, "club_events")}
          canCreate={canCreate(user.permissions, "club_events")}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 4: Create ClubEventsView client component**

Create `app/dashboard/club-events/club-events-view.tsx`:

A component that shows club events as cards sorted by date. Each card shows: name, type badge, date, location, hours value, attendance count.

**For admins** (`canManage = true`): clicking opens an attendance sheet (shadcn Sheet component) showing a list of all active members with checkboxes. Checked members have attendance recorded, unchecked have it removed. POST to `/api/admin/club-events/[id]/attendance` to add, DELETE to remove.

**Create button** (if `canCreate`): opens a dialog with fields: name, type (select), location, start date/time, end date/time, hoursValue (number), categoryId (optional select from categories list). POST to `/api/admin/club-events`.

- [ ] **Step 5: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep -E "club-events|admin/club" | head -10
```

- [ ] **Step 6: Commit**

```bash
git add app/api/admin/club-events/ app/dashboard/club-events/
git commit -m "feat: club events page with attendance tracking and auto hour creation"
```

---

## Task 7: Final integration check

- [ ] **Step 1: Full TypeScript compile**

```bash
npx tsc --noEmit 2>&1
```

Fix all errors. Common issues:
- `prisma.duesInvoice.findMany` — `seasonId` filter requires the join field. Use `season: { clubId: user.clubId }` instead if seasonId isn't directly on the invoice. Check schema: `DuesInvoice` has `seasonId` directly, so filter by `{ seasonId: season.id }`.
- `prisma.clubEvent` — `season: { clubId }` in where clause requires a relation filter. Check schema: `ClubEvent` has `seasonId`, not direct `clubId`. Filter by `{ season: { clubId: user.clubId } }`.
- `Decimal` to `number` coercions: use `Number(field)` for `.toFixed()` calls.

- [ ] **Step 2: Build**

```bash
npm run build
```

Expected: successful build.

- [ ] **Step 3: Smoke test**

1. `/dashboard/hours` as admin → see pending tab + categories tab with add button
2. Submit an hour entry as member → should appear in pending
3. Approve it → should move to approved
4. `/dashboard/finances` → create an invoice for a member, record a payment
5. `/dashboard/forms` → create a form type, submit as member
6. `/dashboard/club-events` → create an event, mark attendance for a member

- [ ] **Step 4: Commit fixes**

```bash
git add -A
git commit -m "fix: Phase 2C integration — TypeScript and build fixes"
```
