# Audit Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the artifacts for the `/audit-loop` feedback cycle — extended seed, perf measurement script, slash command playbook — and wire up a daily scheduled run.

**Architecture:** Three artifacts. `prisma/seed-large.ts` populates a realistic dataset. `scripts/measure-routes.ts` (with helpers under `scripts/lib/`) hits authenticated routes via HTTP and records timings to `docs/audit/perf-<date>.json`. `.claude/commands/audit-loop.md` is the slash-command playbook that orchestrates the perf script + persona sub-agents and aggregates findings. Performance is measured server-side via `Server-Timing` header + total response time.

**Tech Stack:** TypeScript, Node 20+, tsx (already installed), Prisma 7 + `@prisma/adapter-pg`, bcryptjs (already installed), Next.js 16, Node built-in `fetch` and `node:assert`. No new dependencies required.

**Spec reference:** `docs/superpowers/specs/2026-05-02-audit-loop-design.md`

**Note on TDD:** This project has no test framework installed and the spec explicitly leaves that out of scope. For pure-function helpers (`scripts/lib/diff.ts`) we use a small standalone test runner via `node:assert` invoked through `tsx`. For I/O code (seed, fetch-based perf script) we use verification-by-execution: run the script, observe output, check counts/JSON shape. This matches the project's existing conventions.

---

## File Structure

**Created:**
- `prisma/seed-large.ts` — extended seed (50 members, 5 competitions, full season worth of fixtures)
- `scripts/lib/route-config.ts` — typed route × role matrix (~25 entries)
- `scripts/lib/auth.ts` — login helper that captures session cookie via `POST /api/auth/login`
- `scripts/lib/bootstrap-ids.ts` — resolves dynamic ID placeholders (`{firstCompetitionId}` etc.) by querying the seeded DB
- `scripts/lib/measure.ts` — single-route measurement (3 requests, median of last 2, captures Server-Timing)
- `scripts/lib/diff.ts` — pure function comparing two perf runs
- `scripts/lib/diff.test.ts` — standalone test for `diff.ts` (uses `node:assert`, runs via `tsx`)
- `scripts/measure-routes.ts` — main entry point that orchestrates the helpers
- `.claude/commands/audit-loop.md` — slash-command playbook
- `docs/audit/.gitkeep` — ensures audit output directory exists in git

**Modified:**
- `package.json` — add `seed:large` and `audit` scripts

---

### Task 1: Create audit output directory

**Files:**
- Create: `docs/audit/.gitkeep`

- [ ] **Step 1: Create the directory marker**

```bash
mkdir -p docs/audit && touch docs/audit/.gitkeep
```

- [ ] **Step 2: Verify**

```bash
ls -la docs/audit/
```

Expected: directory exists with `.gitkeep` file.

- [ ] **Step 3: Commit**

```bash
git add docs/audit/.gitkeep
git commit -m "audit: create docs/audit output directory"
```

---

### Task 2: Implement extended seed

**Files:**
- Create: `prisma/seed-large.ts`
- Modify: `package.json` (add `seed:large` script)

This is the longest task. It populates the DB with realistic volumes per the spec table. The code below is complete — paste it as a unit, then run.

- [ ] **Step 1: Create `prisma/seed-large.ts`**

```typescript
// prisma/seed-large.ts
import "dotenv/config"
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import bcrypt from "bcryptjs"
import { adminPermissions, boardMemberPermissions, memberPermissions } from "../lib/permissions"
import { syncCompetitionEventsForCompetition } from "../lib/competition-event-sync"

const dbUrl = process.env.DATABASE_URL
if (!dbUrl) {
  console.error("DATABASE_URL is not set.")
  process.exit(1)
}

function isLikelyProd(url: string): boolean {
  const prodHosts = ["vercel.app", "neon.tech", "supabase", "railway.app"]
  const safeMarkers = ["dev", "local", "staging", "test"]
  const lower = url.toLowerCase()
  if (!prodHosts.some((h) => lower.includes(h))) return false
  return !safeMarkers.some((m) => lower.includes(m))
}

if (isLikelyProd(dbUrl) && !process.argv.includes("--force")) {
  console.error(
    "DATABASE_URL looks like production. Refusing to seed. Pass --force to override.",
  )
  process.exit(1)
}

const adapter = new PrismaPg({ connectionString: dbUrl })
const prisma = new PrismaClient({ adapter })

const FIRST_NAMES = [
  "Alex", "Jordan", "Sam", "Casey", "Morgan", "Taylor", "Riley", "Quinn",
  "Harper", "Avery", "Drew", "Reese", "Skyler", "Parker", "Blake", "Cameron",
  "Dakota", "Elliot", "Frankie", "Gray", "Hayden", "Indie", "Jess", "Kendall",
  "Logan", "Maddox", "Noa", "Oakley", "Phoenix", "Rowan", "Sage", "Toby",
  "Aria", "Bea", "Cleo", "Devin", "Eden", "Fin", "Gem", "Halle",
  "Iris", "Jolie", "Kai", "Luna", "Milo", "Nova", "Otto", "Piper",
]
const LAST_NAMES = [
  "Rivera", "Smith", "Lee", "Patel", "Nguyen", "Garcia", "Kim", "Brown",
  "Davis", "Lopez", "Wilson", "Martinez", "Anderson", "Taylor", "Thomas",
  "Hernandez", "Moore", "Martin", "Jackson", "Thompson", "White", "Harris",
  "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson", "Walker", "Perez",
  "Hall", "Young", "Allen", "King", "Wright", "Scott", "Torres", "Hill",
  "Flores", "Green", "Adams", "Nelson", "Baker", "Carter", "Mitchell",
  "Roberts", "Phillips", "Campbell", "Ortega",
]
const EVENT_NAMES = [
  { name: "Anatomy & Physiology", code: "ANP" },
  { name: "Astronomy", code: "AST" },
  { name: "Bridge", code: "BRG" },
  { name: "Chemistry Lab", code: "CLB" },
  { name: "Codebusters", code: "COD" },
  { name: "Detector Building", code: "DET" },
  { name: "Disease Detectives", code: "DIS" },
  { name: "Dynamic Planet", code: "DPN" },
  { name: "Ecology", code: "ECO" },
  { name: "Electric Vehicle", code: "EVL" },
  { name: "Entomology", code: "ENT" },
  { name: "Experimental Design", code: "EXP" },
  { name: "Forensics", code: "FOR" },
  { name: "Fossils", code: "FOS" },
  { name: "Geologic Mapping", code: "GEO" },
  { name: "Helicopter", code: "HEL" },
  { name: "It's About Time", code: "TIM" },
  { name: "Materials Science", code: "MAT" },
  { name: "Microbe Mission", code: "MIC" },
  { name: "Optics", code: "OPT" },
  { name: "Robot Tour", code: "ROB" },
  { name: "Wind Power", code: "WND" },
  { name: "Write It Do It", code: "WID" },
]

async function main() {
  console.log("Seeding LARGE database...")

  // Clean slate (cascades from Club)
  await prisma.club.deleteMany()

  const passwordHash = await bcrypt.hash("password123", 12)

  const club = await prisma.club.create({
    data: {
      name: "MAST Science Olympiad",
      slug: "mast-scioly",
      schoolName: "Maritime and Science Technology Academy",
      schoolDomain: "mast.edu",
    },
  })

  await prisma.clubEmailDomain.create({
    data: { clubId: club.id, domain: "mast.edu", isPrimary: true, isActive: true },
  })

  const currentSeason = await prisma.season.create({
    data: {
      clubId: club.id,
      name: "2025–2026 Season",
      schoolYear: "2025-2026",
      startsAt: new Date("2025-09-01"),
      endsAt: new Date("2026-06-01"),
      isActive: true,
    },
  })

  const priorSeason = await prisma.season.create({
    data: {
      clubId: club.id,
      name: "2024–2025 Season",
      schoolYear: "2024-2025",
      startsAt: new Date("2024-09-01"),
      endsAt: new Date("2025-06-01"),
      isActive: false,
    },
  })

  await prisma.event.createMany({
    data: EVENT_NAMES.map((e, i) => ({
      seasonId: currentSeason.id,
      name: e.name,
      code: e.code,
      minParticipants: 2,
      maxParticipants: 2,
      sortOrder: i,
    })),
  })

  await prisma.event.createMany({
    data: EVENT_NAMES.slice(0, 10).map((e, i) => ({
      seasonId: priorSeason.id,
      name: e.name,
      code: e.code,
      minParticipants: 2,
      maxParticipants: 2,
      sortOrder: i,
    })),
  })

  const [adminRole, boardRole, memberRole] = await Promise.all([
    prisma.clubRole.create({
      data: {
        clubId: club.id,
        name: "Admin",
        description: "Full access to all club management features.",
        permissions: adminPermissions(),
      },
    }),
    prisma.clubRole.create({
      data: {
        clubId: club.id,
        name: "Board Member",
        description: "Can view, create, and edit most content.",
        permissions: boardMemberPermissions(),
      },
    }),
    prisma.clubRole.create({
      data: {
        clubId: club.id,
        name: "Member",
        description: "View access plus submit hours and attempt practice.",
        permissions: memberPermissions(),
      },
    }),
  ])

  // Owner
  const owner = await prisma.user.create({
    data: {
      clubId: club.id,
      email: "owner@mast.edu",
      passwordHash,
      role: "WEBSITE_OWNER",
      firstName: "Alex",
      lastName: "Rivera",
    },
  })
  const ownerMs = await prisma.memberSeason.create({
    data: { userId: owner.id, seasonId: currentSeason.id, membershipStatus: "ACTIVE" },
  })
  await prisma.memberRole.create({
    data: { memberSeasonId: ownerMs.id, clubRoleId: adminRole.id },
  })

  // Board user
  const boardUser = await prisma.user.create({
    data: {
      clubId: club.id,
      email: "board@mast.edu",
      passwordHash,
      role: "MEMBER",
      firstName: "Jordan",
      lastName: "Smith",
    },
  })
  const boardMs = await prisma.memberSeason.create({
    data: { userId: boardUser.id, seasonId: currentSeason.id, membershipStatus: "ACTIVE" },
  })
  await prisma.memberRole.create({
    data: { memberSeasonId: boardMs.id, clubRoleId: boardRole.id },
  })

  // Default Member (matches small-seed credentials)
  const member = await prisma.user.create({
    data: {
      clubId: club.id,
      email: "member@mast.edu",
      passwordHash,
      role: "MEMBER",
      firstName: "Casey",
      lastName: "Lee",
    },
  })
  const memberMs = await prisma.memberSeason.create({
    data: { userId: member.id, seasonId: currentSeason.id, membershipStatus: "ACTIVE" },
  })
  await prisma.memberRole.create({
    data: { memberSeasonId: memberMs.id, clubRoleId: memberRole.id },
  })

  // 47 more members (total 50: 1 owner, 1 board, 48 members)
  const memberSeasonRefs: { id: string; userId: string }[] = [
    { id: memberMs.id, userId: member.id },
  ]
  for (let i = 0; i < 47; i++) {
    const fn = FIRST_NAMES[i % FIRST_NAMES.length]
    const ln = LAST_NAMES[i % LAST_NAMES.length]
    const email = `${fn.toLowerCase()}.${ln.toLowerCase()}${i + 1}@mast.edu`
    const u = await prisma.user.create({
      data: {
        clubId: club.id,
        email,
        passwordHash,
        role: "MEMBER",
        firstName: fn,
        lastName: ln,
      },
    })
    const ms = await prisma.memberSeason.create({
      data: { userId: u.id, seasonId: currentSeason.id, membershipStatus: "ACTIVE" },
    })
    await prisma.memberRole.create({
      data: { memberSeasonId: ms.id, clubRoleId: memberRole.id },
    })
    memberSeasonRefs.push({ id: ms.id, userId: u.id })
  }

  // 30 prior-season memberships (alumni)
  for (const m of memberSeasonRefs.slice(0, 30)) {
    await prisma.memberSeason.create({
      data: { userId: m.userId, seasonId: priorSeason.id, membershipStatus: "ALUMNI" },
    })
  }

  // 5 competitions: 3 past, 1 ongoing-ish, 1 upcoming
  const competitionData = [
    { name: "Fall Invitational 2025", startsAt: "2025-10-15" },
    { name: "Winter Tournament 2025", startsAt: "2025-12-10" },
    { name: "MIT Invitational", startsAt: "2026-01-20" },
    { name: "Spring Regional", startsAt: "2026-04-30" },
    { name: "State Championship", startsAt: "2026-05-15" },
  ]
  for (const c of competitionData) {
    const comp = await prisma.competition.create({
      data: {
        seasonId: currentSeason.id,
        name: c.name,
        type: "INVITATIONAL",
        location: "TBD",
        startsAt: new Date(c.startsAt),
        isPublished: true,
      },
    })
    await syncCompetitionEventsForCompetition(comp.id, prisma)
  }

  // Hour categories
  const hourCats = await Promise.all([
    prisma.hourCategory.create({
      data: {
        seasonId: currentSeason.id,
        name: "Study Sessions",
        description: "Independent or group study.",
        requiresApproval: false,
      },
    }),
    prisma.hourCategory.create({
      data: {
        seasonId: currentSeason.id,
        name: "Practice Tests",
        description: "Working through practice exams.",
        requiresApproval: true,
      },
    }),
    prisma.hourCategory.create({
      data: {
        seasonId: currentSeason.id,
        name: "Build Time",
        description: "Time spent building/testing.",
        requiresApproval: true,
      },
    }),
    prisma.hourCategory.create({
      data: {
        seasonId: currentSeason.id,
        name: "Volunteer Work",
        description: "Outreach and tournament help.",
        requiresApproval: true,
      },
    }),
  ])

  // 200 hour entries
  const hourStatusCycle: Array<"PENDING" | "APPROVED" | "REJECTED"> = [
    "PENDING", "APPROVED", "APPROVED", "REJECTED",
  ]
  for (let i = 0; i < 200; i++) {
    const ms = memberSeasonRefs[i % memberSeasonRefs.length]
    const cat = hourCats[i % hourCats.length]
    const status = hourStatusCycle[i % hourStatusCycle.length]
    await prisma.hourEntry.create({
      data: {
        memberSeasonId: ms.id,
        categoryId: cat.id,
        title: `Session #${i + 1}`,
        description: "Auto-seeded entry.",
        totalHours: ((i % 4) + 1) * 0.5,
        status,
        approvedAt: status === "APPROVED" ? new Date() : null,
        approvedById: status === "APPROVED" ? owner.id : null,
        rejectionReason: status === "REJECTED" ? "Insufficient detail." : null,
      },
    })
  }

  // 10 assessments × 3 parts × 5 prompts
  const eventsForAssessments = await prisma.event.findMany({
    where: { seasonId: currentSeason.id },
    take: 10,
    orderBy: { sortOrder: "asc" },
  })
  for (const ev of eventsForAssessments) {
    const a = await prisma.assessment.create({
      data: {
        seasonId: currentSeason.id,
        eventId: ev.id,
        title: `${ev.name} Practice 1`,
        format: "TEST",
        isPublished: true,
      },
    })
    for (let p = 0; p < 3; p++) {
      const part = await prisma.assessmentPart.create({
        data: {
          assessmentId: a.id,
          title: `Section ${p + 1}`,
          type: "SECTION",
          sortOrder: p,
        },
      })
      for (let q = 0; q < 5; q++) {
        await prisma.assessmentPrompt.create({
          data: {
            assessmentId: a.id,
            partId: part.id,
            promptNumber: p * 5 + q + 1,
            responseType: "SHORT_TEXT",
            pointsPossible: 1,
            answerKeyText: `Sample answer ${p}.${q}`,
            isRequired: true,
          },
        })
      }
    }
  }

  // 30 attempts × ~15 responses
  const allAssessments = await prisma.assessment.findMany({
    where: { seasonId: currentSeason.id },
    include: { prompts: true },
  })
  for (let i = 0; i < 30; i++) {
    const ms = memberSeasonRefs[i % memberSeasonRefs.length]
    const a = allAssessments[i % allAssessments.length]
    const att = await prisma.assessmentAttempt.create({
      data: {
        assessmentId: a.id,
        memberSeasonId: ms.id,
        status: "SCORED",
        scoreEarned: 12,
        scorePossible: 15,
        submittedAt: new Date(),
        gradedAt: new Date(),
      },
    })
    for (const prompt of a.prompts) {
      const correct = (i + prompt.promptNumber) % 3 !== 0
      await prisma.assessmentResponse.create({
        data: {
          attemptId: att.id,
          promptId: prompt.id,
          responseText: "Sample response.",
          isCorrect: correct,
          pointsAwarded: correct ? 1 : 0,
        },
      })
    }
  }

  // 3 form types × 30 submissions each
  const formTypes = await Promise.all([
    prisma.formType.create({
      data: {
        seasonId: currentSeason.id,
        name: "Photo Release",
        category: "PHOTO_RELEASE",
        isRequired: true,
      },
    }),
    prisma.formType.create({
      data: {
        seasonId: currentSeason.id,
        name: "Travel Waiver",
        category: "TRAVEL",
        isRequired: true,
      },
    }),
    prisma.formType.create({
      data: {
        seasonId: currentSeason.id,
        name: "Code of Conduct",
        category: "CODE_OF_CONDUCT",
        isRequired: true,
      },
    }),
  ])
  const subStatusCycle: Array<"NOT_STARTED" | "SUBMITTED" | "VERIFIED"> = [
    "NOT_STARTED", "SUBMITTED", "VERIFIED",
  ]
  for (const ft of formTypes) {
    for (let i = 0; i < 30; i++) {
      const ms = memberSeasonRefs[i % memberSeasonRefs.length]
      const status = subStatusCycle[i % subStatusCycle.length]
      await prisma.formSubmission.create({
        data: {
          formTypeId: ft.id,
          memberSeasonId: ms.id,
          status,
          acknowledgement: i % 2 === 0,
          submittedAt: status !== "NOT_STARTED" ? new Date() : null,
          verifiedAt: status === "VERIFIED" ? new Date() : null,
        },
      })
    }
  }

  // 15 membership applications
  const appStatusCycle: Array<
    "SUBMITTED" | "UNDER_REVIEW" | "APPROVED" | "WAITLISTED" | "DENIED"
  > = ["SUBMITTED", "UNDER_REVIEW", "APPROVED", "WAITLISTED", "DENIED"]
  for (let i = 0; i < 15; i++) {
    const fn = FIRST_NAMES[(48 + i) % FIRST_NAMES.length]
    const ln = LAST_NAMES[(48 + i) % LAST_NAMES.length]
    await prisma.membershipApplication.create({
      data: {
        clubId: club.id,
        seasonId: currentSeason.id,
        firstName: fn,
        lastName: ln,
        email: `${fn.toLowerCase()}.${ln.toLowerCase()}.applicant${i + 1}@mast.edu`,
        gradeLevel: 9 + (i % 4),
        whyJoin: "Excited to join the team.",
        status: appStatusCycle[i % appStatusCycle.length],
      },
    })
  }

  // Finance account + 40 entries
  const financeAccount = await prisma.financeAccount.create({
    data: {
      clubId: club.id,
      seasonId: currentSeason.id,
      name: "Main Account",
      type: "CHECKING",
      isDefault: true,
    },
  })
  const directionCycle: Array<"CREDIT" | "DEBIT"> = ["CREDIT", "DEBIT"]
  const categoryCycle: Array<
    | "DUES" | "DONATION" | "FUNDRAISER" | "REGISTRATION"
    | "TRAVEL" | "SUPPLIES" | "REIMBURSEMENT" | "OTHER"
  > = [
    "DUES", "DONATION", "FUNDRAISER", "REGISTRATION",
    "TRAVEL", "SUPPLIES", "REIMBURSEMENT", "OTHER",
  ]
  for (let i = 0; i < 40; i++) {
    await prisma.financeEntry.create({
      data: {
        clubId: club.id,
        seasonId: currentSeason.id,
        accountId: financeAccount.id,
        direction: directionCycle[i % 2],
        category: categoryCycle[i % categoryCycle.length],
        amountCents: (i + 1) * 1000,
        title: `Entry ${i + 1}`,
        occurredAt: new Date(2026, 0, 1 + (i % 28)),
      },
    })
  }

  console.log("LARGE seed complete.")
  console.log("  Owner:  owner@mast.edu / password123")
  console.log("  Board:  board@mast.edu / password123")
  console.log("  Member: member@mast.edu / password123")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
```

- [ ] **Step 2: Add `seed:large` script to `package.json`**

In `package.json`, add to the `scripts` block:

```json
"seed:large": "tsx prisma/seed-large.ts"
```

The full `scripts` block should become:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "seed:large": "tsx prisma/seed-large.ts"
}
```

- [ ] **Step 3: Run the seed**

```bash
npm run seed:large
```

Expected output (last few lines):

```
LARGE seed complete.
  Owner:  owner@mast.edu / password123
  Board:  board@mast.edu / password123
  Member: member@mast.edu / password123
```

If you see "DATABASE_URL looks like production", confirm `.env.local` points at your dev DB before continuing.

- [ ] **Step 4: Verify counts**

```bash
npx tsx -e '
import "dotenv/config"
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) })
;(async () => {
  console.log({
    users: await prisma.user.count(),
    members: await prisma.memberSeason.count(),
    competitions: await prisma.competition.count(),
    hourEntries: await prisma.hourEntry.count(),
    assessments: await prisma.assessment.count(),
    prompts: await prisma.assessmentPrompt.count(),
    attempts: await prisma.assessmentAttempt.count(),
    formSubmissions: await prisma.formSubmission.count(),
    applications: await prisma.membershipApplication.count(),
    financeEntries: await prisma.financeEntry.count(),
  })
  await prisma.$disconnect()
})()
'
```

Expected (numbers should match — if any are off, that section of the seed didn't run cleanly):

```
{
  users: 50,
  members: 80,            // 50 current + 30 prior
  competitions: 5,
  hourEntries: 200,
  assessments: 10,
  prompts: 150,           // 10 × 3 × 5
  attempts: 30,
  formSubmissions: 90,    // 3 × 30
  applications: 15,
  financeEntries: 40
}
```

- [ ] **Step 5: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: zero errors in `prisma/seed-large.ts` (errors inside `.next/` are fine — see global rule).

- [ ] **Step 6: Commit**

```bash
git add prisma/seed-large.ts package.json
git commit -m "audit: extended seed for realistic perf measurement"
```

---

### Task 3: Route configuration

**Files:**
- Create: `scripts/lib/route-config.ts`

- [ ] **Step 1: Create `scripts/lib/route-config.ts`**

```typescript
// scripts/lib/route-config.ts
// Route × role matrix for the perf audit. The script measures every (path, role)
// combination it lists here. Routes that 4xx/5xx for a role are still recorded —
// status code is reported alongside the timing.

export type Role = "WEBSITE_OWNER" | "MEMBER"

export type DynamicId = "firstCompetitionId" | "firstMemberSeasonId" | "firstAssessmentId" | "firstAttemptId"

export type RouteEntry = {
  path: string
  roles: Role[]
  dynamic?: DynamicId
}

// Standard scope: dashboard top-level + key detail pages.
export const routeMatrix: RouteEntry[] = [
  // Top-level dashboard
  { path: "/dashboard", roles: ["WEBSITE_OWNER", "MEMBER"] },
  { path: "/dashboard/applications", roles: ["WEBSITE_OWNER", "MEMBER"] },
  { path: "/dashboard/club-events", roles: ["WEBSITE_OWNER", "MEMBER"] },
  { path: "/dashboard/competitions", roles: ["WEBSITE_OWNER", "MEMBER"] },
  { path: "/dashboard/events", roles: ["WEBSITE_OWNER", "MEMBER"] },
  { path: "/dashboard/finances", roles: ["WEBSITE_OWNER", "MEMBER"] },
  { path: "/dashboard/forms", roles: ["WEBSITE_OWNER", "MEMBER"] },
  { path: "/dashboard/hours", roles: ["WEBSITE_OWNER", "MEMBER"] },
  { path: "/dashboard/members", roles: ["WEBSITE_OWNER", "MEMBER"] },
  { path: "/dashboard/practice", roles: ["WEBSITE_OWNER", "MEMBER"] },
  { path: "/dashboard/settings", roles: ["WEBSITE_OWNER", "MEMBER"] },

  // Detail pages (dynamic IDs resolved at runtime)
  {
    path: "/dashboard/competitions/{firstCompetitionId}",
    roles: ["WEBSITE_OWNER", "MEMBER"],
    dynamic: "firstCompetitionId",
  },
  {
    path: "/dashboard/members/{firstMemberSeasonId}",
    roles: ["WEBSITE_OWNER", "MEMBER"],
    dynamic: "firstMemberSeasonId",
  },
  {
    path: "/dashboard/practice/{firstAssessmentId}",
    roles: ["WEBSITE_OWNER", "MEMBER"],
    dynamic: "firstAssessmentId",
  },
  {
    path: "/dashboard/practice/attempts/{firstAttemptId}",
    roles: ["WEBSITE_OWNER", "MEMBER"],
    dynamic: "firstAttemptId",
  },
]

export const ROLE_CREDENTIALS: Record<Role, { email: string; password: string }> = {
  WEBSITE_OWNER: { email: "owner@mast.edu", password: "password123" },
  MEMBER: { email: "member@mast.edu", password: "password123" },
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: zero new errors.

- [ ] **Step 3: Commit**

```bash
git add scripts/lib/route-config.ts
git commit -m "audit: route × role matrix for perf measurement"
```

---

### Task 4: Diff helper with tests

**Files:**
- Create: `scripts/lib/diff.ts`
- Create: `scripts/lib/diff.test.ts`

This task uses TDD-lite: write a small standalone test first using `node:assert`, run it through `tsx`, confirm it fails, then implement.

- [ ] **Step 1: Write the failing test**

Create `scripts/lib/diff.test.ts`:

```typescript
// scripts/lib/diff.test.ts
// Standalone test runner — no test framework. Run via `npx tsx scripts/lib/diff.test.ts`.
import assert from "node:assert/strict"
import { diffPerf, type PerfRun } from "./diff"

const baseResult = {
  status: 200,
  serverTimingMs: null,
  bytes: 0,
  runs: [],
}

// Test 1: prev null → all entries marked as new (prevMs = null)
{
  const curr: PerfRun = {
    ranAt: "2026-05-02T10:00:00Z",
    seedSize: "large",
    results: [
      { route: "/x", role: "WEBSITE_OWNER", totalMs: 100, ...baseResult, runs: [100] },
    ],
  }
  const result = diffPerf(null, curr)
  assert.equal(result.length, 1)
  assert.equal(result[0].prevMs, null)
  assert.equal(result[0].newMs, 100)
  assert.equal(result[0].deltaMs, null)
  console.log("✓ prev=null produces NEW entries")
}

// Test 2: matching route → computes delta and percent
{
  const prev: PerfRun = {
    ranAt: "2026-05-01T10:00:00Z",
    seedSize: "large",
    results: [
      { route: "/x", role: "WEBSITE_OWNER", totalMs: 100, ...baseResult, runs: [100] },
    ],
  }
  const curr: PerfRun = {
    ranAt: "2026-05-02T10:00:00Z",
    seedSize: "large",
    results: [
      { route: "/x", role: "WEBSITE_OWNER", totalMs: 150, ...baseResult, runs: [150] },
    ],
  }
  const result = diffPerf(prev, curr)
  assert.equal(result[0].deltaMs, 50)
  assert.equal(result[0].deltaPct, 50)
  console.log("✓ matching route computes 50ms / 50% delta")
}

// Test 3: roles differentiated — same path, different role = different entries
{
  const prev: PerfRun = {
    ranAt: "x", seedSize: "large",
    results: [
      { route: "/y", role: "WEBSITE_OWNER", totalMs: 200, ...baseResult, runs: [200] },
    ],
  }
  const curr: PerfRun = {
    ranAt: "y", seedSize: "large",
    results: [
      { route: "/y", role: "WEBSITE_OWNER", totalMs: 210, ...baseResult, runs: [210] },
      { route: "/y", role: "MEMBER", totalMs: 90, ...baseResult, runs: [90] },
    ],
  }
  const result = diffPerf(prev, curr)
  const owner = result.find((e) => e.role === "WEBSITE_OWNER")!
  const member = result.find((e) => e.role === "MEMBER")!
  assert.equal(owner.deltaMs, 10)
  assert.equal(member.prevMs, null)
  console.log("✓ roles are differentiated by composite key")
}

// Test 4: prev had route, curr does not — diff only reports curr entries
{
  const prev: PerfRun = {
    ranAt: "x", seedSize: "large",
    results: [
      { route: "/removed", role: "WEBSITE_OWNER", totalMs: 100, ...baseResult, runs: [100] },
    ],
  }
  const curr: PerfRun = {
    ranAt: "y", seedSize: "large",
    results: [],
  }
  const result = diffPerf(prev, curr)
  assert.equal(result.length, 0)
  console.log("✓ dropped routes are absent from diff (caller can compute removals separately)")
}

console.log("\nAll diff tests passed.")
```

- [ ] **Step 2: Run the test (should fail because `diff.ts` does not exist yet)**

```bash
npx tsx scripts/lib/diff.test.ts
```

Expected: error like `Cannot find module './diff'`.

- [ ] **Step 3: Write the implementation**

Create `scripts/lib/diff.ts`:

```typescript
// scripts/lib/diff.ts
// Pure functions for comparing perf runs. No I/O — easy to test.

export type RouteResult = {
  route: string
  role: string
  status: number
  totalMs: number
  serverTimingMs: number | null
  bytes: number
  runs: number[]
}

export type PerfRun = {
  ranAt: string
  seedSize: "small" | "large"
  results: RouteResult[]
}

export type DiffEntry = {
  route: string
  role: string
  prevMs: number | null
  newMs: number
  deltaMs: number | null
  deltaPct: number | null
}

function key(r: { route: string; role: string }): string {
  return `${r.role}|${r.route}`
}

export function diffPerf(prev: PerfRun | null, curr: PerfRun): DiffEntry[] {
  const prevByKey = new Map<string, RouteResult>()
  if (prev) {
    for (const r of prev.results) prevByKey.set(key(r), r)
  }
  return curr.results.map((c) => {
    const p = prevByKey.get(key(c))
    if (!p) {
      return { route: c.route, role: c.role, prevMs: null, newMs: c.totalMs, deltaMs: null, deltaPct: null }
    }
    const deltaMs = c.totalMs - p.totalMs
    const deltaPct = p.totalMs > 0 ? (deltaMs / p.totalMs) * 100 : null
    return { route: c.route, role: c.role, prevMs: p.totalMs, newMs: c.totalMs, deltaMs, deltaPct }
  })
}

export function formatDiffTable(entries: DiffEntry[]): string {
  const sorted = [...entries].sort((a, b) => {
    if (a.deltaMs === null && b.deltaMs === null) return 0
    if (a.deltaMs === null) return 1
    if (b.deltaMs === null) return -1
    return Math.abs(b.deltaMs) - Math.abs(a.deltaMs)
  })
  const header = "route\trole\tnew\tdelta"
  const rows = sorted.map((e) => {
    const delta = e.deltaMs === null ? "NEW" : `${e.deltaMs > 0 ? "+" : ""}${e.deltaMs}ms`
    const pct = e.deltaPct === null ? "" : ` (${e.deltaPct > 0 ? "+" : ""}${e.deltaPct.toFixed(0)}%)`
    return `${e.route}\t${e.role}\t${e.newMs}ms\t${delta}${pct}`
  })
  return [header, ...rows].join("\n")
}
```

- [ ] **Step 4: Run the test (should now pass)**

```bash
npx tsx scripts/lib/diff.test.ts
```

Expected output:

```
✓ prev=null produces NEW entries
✓ matching route computes 50ms / 50% delta
✓ roles are differentiated by composite key
✓ dropped routes are absent from diff (caller can compute removals separately)

All diff tests passed.
```

- [ ] **Step 5: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: zero new errors.

- [ ] **Step 6: Commit**

```bash
git add scripts/lib/diff.ts scripts/lib/diff.test.ts
git commit -m "audit: diff helper with standalone tests"
```

---

### Task 5: Auth helper

**Files:**
- Create: `scripts/lib/auth.ts`

- [ ] **Step 1: Create `scripts/lib/auth.ts`**

```typescript
// scripts/lib/auth.ts
// Logs in via POST /api/auth/login and returns a Cookie header value usable
// in subsequent requests. Uses Node 20+ `getSetCookie()`.

export async function loginAndGetCookie(
  baseUrl: string,
  email: string,
  password: string,
): Promise<string> {
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Login failed for ${email} (${res.status}): ${body}`)
  }
  const setCookies = res.headers.getSetCookie()
  if (setCookies.length === 0) {
    throw new Error(`No Set-Cookie on login response for ${email}`)
  }
  // Take the name=value of each Set-Cookie (drop attributes), join with "; ".
  return setCookies.map((c) => c.split(";")[0]).join("; ")
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: zero new errors.

- [ ] **Step 3: Commit**

```bash
git add scripts/lib/auth.ts
git commit -m "audit: login helper that returns Cookie header"
```

---

### Task 6: Bootstrap IDs helper

**Files:**
- Create: `scripts/lib/bootstrap-ids.ts`

This resolves dynamic placeholders like `{firstCompetitionId}` in the route config to concrete IDs from the seeded DB.

- [ ] **Step 1: Create `scripts/lib/bootstrap-ids.ts`**

```typescript
// scripts/lib/bootstrap-ids.ts
import "dotenv/config"
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import type { DynamicId } from "./route-config"

export type IdMap = Record<DynamicId, string | null>

export async function bootstrapIds(): Promise<IdMap> {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
  })
  try {
    const [comp, ms, assess, attempt] = await Promise.all([
      prisma.competition.findFirst({
        orderBy: { startsAt: "asc" },
        select: { id: true },
      }),
      prisma.memberSeason.findFirst({
        orderBy: { joinedAt: "asc" },
        select: { id: true },
      }),
      prisma.assessment.findFirst({
        where: { isPublished: true },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      }),
      prisma.assessmentAttempt.findFirst({
        orderBy: { createdAt: "asc" },
        select: { id: true },
      }),
    ])
    return {
      firstCompetitionId: comp?.id ?? null,
      firstMemberSeasonId: ms?.id ?? null,
      firstAssessmentId: assess?.id ?? null,
      firstAttemptId: attempt?.id ?? null,
    }
  } finally {
    await prisma.$disconnect()
  }
}

// Returns the resolved path, or null if any placeholder couldn't be filled.
export function resolvePath(path: string, ids: IdMap): string | null {
  let missing = false
  const resolved = path.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = ids[key as DynamicId]
    if (!value) {
      missing = true
      return ""
    }
    return value
  })
  return missing ? null : resolved
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: zero new errors.

- [ ] **Step 3: Smoke-test the bootstrap (uses seeded DB)**

```bash
npx tsx -e '
import { bootstrapIds, resolvePath } from "./scripts/lib/bootstrap-ids"
;(async () => {
  const ids = await bootstrapIds()
  console.log(ids)
  console.log(resolvePath("/dashboard/competitions/{firstCompetitionId}", ids))
})()
'
```

Expected: prints an object with 4 cuid-shaped strings, then prints `/dashboard/competitions/<actual-cuid>`.

- [ ] **Step 4: Commit**

```bash
git add scripts/lib/bootstrap-ids.ts
git commit -m "audit: resolve dynamic IDs from seeded DB for route matrix"
```

---

### Task 7: Measurement helper

**Files:**
- Create: `scripts/lib/measure.ts`

- [ ] **Step 1: Create `scripts/lib/measure.ts`**

```typescript
// scripts/lib/measure.ts
import type { RouteResult } from "./diff"

function median(nums: number[]): number {
  const sorted = [...nums].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 0) return Math.round((sorted[mid - 1] + sorted[mid]) / 2)
  return sorted[mid]
}

// Parses Server-Timing header like "db;dur=420, total;dur=612" → 612 (sum of all durs).
function parseServerTiming(header: string | null): number | null {
  if (!header) return null
  const matches = [...header.matchAll(/dur=([\d.]+)/g)]
  if (matches.length === 0) return null
  const total = matches.reduce((sum, m) => sum + parseFloat(m[1]), 0)
  return Math.round(total)
}

export async function measureRoute(opts: {
  baseUrl: string
  path: string
  role: string
  cookie: string
  warmupRequests?: number
  measureRequests?: number
}): Promise<RouteResult> {
  const warmup = opts.warmupRequests ?? 1
  const measure = opts.measureRequests ?? 2
  const url = `${opts.baseUrl}${opts.path}`

  const allRuns: number[] = []
  let lastStatus = 0
  let lastBytes = 0
  let lastServerTiming: number | null = null

  for (let i = 0; i < warmup + measure; i++) {
    const t0 = performance.now()
    const res = await fetch(url, { headers: { cookie: opts.cookie } })
    const body = await res.arrayBuffer()
    const t1 = performance.now()
    const totalMs = Math.round(t1 - t0)
    allRuns.push(totalMs)
    lastStatus = res.status
    lastBytes = body.byteLength
    lastServerTiming = parseServerTiming(res.headers.get("server-timing"))
  }

  const measured = allRuns.slice(warmup)
  return {
    route: opts.path,
    role: opts.role,
    status: lastStatus,
    totalMs: median(measured),
    serverTimingMs: lastServerTiming,
    bytes: lastBytes,
    runs: allRuns,
  }
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: zero new errors.

- [ ] **Step 3: Commit**

```bash
git add scripts/lib/measure.ts
git commit -m "audit: per-route measurement helper with warmup + median"
```

---

### Task 8: Main perf script entry point

**Files:**
- Create: `scripts/measure-routes.ts`
- Modify: `package.json` (add `audit` script)

- [ ] **Step 1: Create `scripts/measure-routes.ts`**

```typescript
// scripts/measure-routes.ts
// Boots through the route matrix, logs in per role, measures each (path, role),
// writes JSON output, prints a diff vs the previous run if one exists.
//
// Prereqs: `next dev` running on :3000, `npm run seed:large` already executed.

import "dotenv/config"
import fs from "node:fs"
import path from "node:path"
import { routeMatrix, ROLE_CREDENTIALS, type Role } from "./lib/route-config"
import { loginAndGetCookie } from "./lib/auth"
import { bootstrapIds, resolvePath } from "./lib/bootstrap-ids"
import { measureRoute } from "./lib/measure"
import { diffPerf, formatDiffTable, type PerfRun, type RouteResult } from "./lib/diff"

const BASE_URL = process.env.AUDIT_BASE_URL ?? "http://localhost:3000"
const OUTPUT_DIR = "docs/audit"

async function pingDevServer(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/api/auth/me`)
    // 401/404 is fine — server is up. Network error is what we're catching.
    return res.status > 0
  } catch {
    return false
  }
}

function nowFilename(): string {
  const now = new Date()
  const pad = (n: number) => n.toString().padStart(2, "0")
  return `perf-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}.json`
}

async function main() {
  console.log(`[audit] base URL: ${BASE_URL}`)

  if (!(await pingDevServer())) {
    console.error(`[audit] dev server not reachable at ${BASE_URL}. Start \`next dev\` first.`)
    process.exit(1)
  }

  // Bootstrap dynamic IDs from the seeded DB
  console.log("[audit] resolving dynamic IDs...")
  const ids = await bootstrapIds()
  if (Object.values(ids).some((v) => v === null)) {
    console.error("[audit] one or more bootstrap IDs are null — DB likely empty. Run `npm run seed:large` first.")
    console.error(ids)
    process.exit(1)
  }

  // Log in per role once, capture cookies
  console.log("[audit] logging in...")
  const cookies: Record<Role, string> = {} as Record<Role, string>
  for (const [role, creds] of Object.entries(ROLE_CREDENTIALS) as [Role, { email: string; password: string }][]) {
    cookies[role] = await loginAndGetCookie(BASE_URL, creds.email, creds.password)
    console.log(`  ✓ ${role}`)
  }

  // Measure each (route, role) pair
  const results: RouteResult[] = []
  for (const entry of routeMatrix) {
    const resolved = resolvePath(entry.path, ids)
    if (!resolved) {
      console.warn(`[audit] skipping ${entry.path} — could not resolve dynamic ID`)
      continue
    }
    for (const role of entry.roles) {
      process.stdout.write(`[audit] measuring ${role} ${resolved}... `)
      try {
        const r = await measureRoute({
          baseUrl: BASE_URL,
          path: resolved,
          role,
          cookie: cookies[role],
        })
        results.push(r)
        console.log(`${r.status} in ${r.totalMs}ms`)
      } catch (err) {
        console.log(`ERR ${(err as Error).message}`)
      }
    }
  }

  const run: PerfRun = {
    ranAt: new Date().toISOString(),
    seedSize: "large",
    results,
  }

  // Write output
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  const outFile = path.join(OUTPUT_DIR, nowFilename())
  fs.writeFileSync(outFile, JSON.stringify(run, null, 2))
  console.log(`\n[audit] wrote ${outFile}`)

  // Diff vs previous (if any other perf-*.json existed before this one)
  const allPerfFiles = fs
    .readdirSync(OUTPUT_DIR)
    .filter((f) => f.startsWith("perf-") && f.endsWith(".json"))
    .sort()
  const prevFile = allPerfFiles.length > 1 ? allPerfFiles[allPerfFiles.length - 2] : null
  if (prevFile) {
    const prev = JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, prevFile), "utf-8")) as PerfRun
    const diff = diffPerf(prev, run)
    console.log(`\n[audit] diff vs ${prevFile}:`)
    console.log(formatDiffTable(diff))
  } else {
    console.log("[audit] no previous run to diff against.")
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
```

- [ ] **Step 2: Add `audit` script to `package.json`**

In `package.json` `scripts` block, add:

```json
"audit": "tsx scripts/measure-routes.ts"
```

The full block:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "seed:large": "tsx prisma/seed-large.ts",
  "audit": "tsx scripts/measure-routes.ts"
}
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: zero new errors.

- [ ] **Step 4: Smoke-test (terminal A: dev server; terminal B: audit)**

In one terminal, start the dev server:

```bash
npm run dev
```

Wait for `Ready` line. Then in another terminal:

```bash
npm run audit
```

Expected output (truncated):

```
[audit] base URL: http://localhost:3000
[audit] resolving dynamic IDs...
[audit] logging in...
  ✓ WEBSITE_OWNER
  ✓ MEMBER
[audit] measuring WEBSITE_OWNER /dashboard... 200 in 412ms
[audit] measuring MEMBER /dashboard... 200 in 380ms
... (24 lines total)
[audit] wrote docs/audit/perf-2026-05-02-1430.json
[audit] no previous run to diff against.
```

Inspect the JSON shape:

```bash
cat docs/audit/perf-*.json | head -40
```

Expected: a JSON object with `ranAt`, `seedSize: "large"`, and a `results` array containing entries with `route`, `role`, `status`, `totalMs`, `serverTimingMs`, `bytes`, `runs`.

If any route returns 500: that's a real bug — note the route, but don't block the plan. The audit's job is to find bugs.

- [ ] **Step 5: Run a second time to verify the diff path**

```bash
npm run audit
```

Expected: the script writes a new `perf-*.json` and prints a diff table comparing it to the previous run.

- [ ] **Step 6: Commit**

```bash
git add scripts/measure-routes.ts package.json docs/audit/
git commit -m "audit: measure-routes script with login, bootstrap, and diff"
```

---

### Task 9: Slash command playbook

**Files:**
- Create: `.claude/commands/audit-loop.md`

The slash command body is the playbook Claude will execute when the user types `/audit-loop`. It's prose with embedded shell commands and structured templates.

- [ ] **Step 1: Create the command file**

```bash
mkdir -p .claude/commands
```

Create `.claude/commands/audit-loop.md` with this exact content:

````markdown
---
description: Run a full audit cycle (perf + persona walks) and aggregate findings for triage
argument-hint: "[--measure-only | --no-fix | --reseed]"
---

# `/audit-loop` — feedback cycle

You are running the audit loop for the Scioly platform. Spec: `docs/superpowers/specs/2026-05-02-audit-loop-design.md`. Two co-equal tracks:

- **Track A — Engineering:** performance, dead code, refactor opportunities
- **Track B — Product:** missing functionality, UX, UI improvements

Today's date for filenames: use `date +%Y-%m-%d`.

## Flag handling

Parse the user's invocation:
- `--measure-only` → run step 3 only, exit after diff is printed
- `--no-fix` → run steps 1–6, write the digest, post a summary, exit before triage/implement
- `--reseed` → run `npm run seed:large` at step 1
- (no flags) → full cycle, all 11 steps

## Steps

### 1. Preflight

- Run `git status`. If the working tree is dirty (any non-`docs/audit/` changes), stop and tell the user — don't mix audit fixes with unrelated work.
- If `--reseed` was passed, run `npm run seed:large` and wait for it to complete.

### 2. Boot dev server

Start `next dev` in the background:

```bash
npm run dev
```

Run this with `run_in_background: true`. Then poll `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/auth/me` until it returns 200 or 401 (server is up).

### 3. Run perf script

```bash
npm run audit
```

Read the resulting `docs/audit/perf-*.json` (most recent) into context. If the script exits non-zero, stop and surface the error — don't proceed with stale data.

If `--measure-only`, stop here and post the diff output to the user.

### 4. Spawn 2 persona sub-agents in parallel

In a single message, dispatch two `Agent` calls (use `general-purpose` subagent_type). Each agent gets a self-contained brief.

**Agent A — Owner persona:**

```
You are role-playing as the WEBSITE_OWNER of a Science Olympiad club at http://localhost:3000.

Credentials: owner@mast.edu / password123. The DB has been seeded with realistic data (~50 members, 5 competitions, 200 hours, 30 assessment attempts, etc.).

Walk through these flows end-to-end. Use Bash + curl with cookies, and read code where it matters (lib/, app/dashboard/, components/). For each flow, describe what you tried, what worked, what didn't.

FLOWS:
1. Create a new competition → assign members to events → publish it.
2. Open the hour submissions queue → approve some, reject some.
3. Create a practice assessment.

OUTPUT (markdown fragment, ~700 words max):

## Track A — Engineering
### Broken
- ...
### Slow
- (only items that felt slow even after the perf script — e.g., interaction lag, hydration jank)
### Dead-code
- (anything you spotted while reading code that has zero importers / unused exports)
### Refactor
- (files that exceed ~500 lines and mix unrelated concerns)

## Track B — Product
### Missing
- ...
### UX
- ...
### UI
- ...

Sections may be empty — that's fine.
```

**Agent B — Member persona:**

```
You are role-playing as a regular MEMBER of a Science Olympiad club at http://localhost:3000.

Credentials: member@mast.edu / password123.

Walk through this flow end-to-end. Use Bash + curl with cookies, and read code where it matters.

FLOW:
- Log in → submit a new hour entry → view your assigned competitions → attempt one practice assessment end-to-end (start, answer prompts, submit).

OUTPUT: same markdown structure as Agent A — Track A (Broken/Slow/Dead-code/Refactor) and Track B (Missing/UX/UI).
```

### 5. Aggregate findings

Read the perf JSON + the two finding fragments. Write `docs/audit/<date>.md` with this exact structure:

```markdown
# Audit – <date>

## Performance (top 10 slowest)
| Route | Role | Median ms | vs prev | Notes |
|---|---|---|---|---|
| ... |

## Findings (<count>)

### P1 — Broken (<n>)
- [ ] (f1) <description> — <flagging agent>

---

### Track A — Engineering health

#### Slow with empirical backing (<n>)
- [ ] (f5) <route> took <ms>ms — <hypothesis>

#### Dead code (<n>)
- [ ] (f8) ...

#### Refactor (<n>)
- [ ] (f10) ...

---

### Track B — Product

#### Missing functionality (<n>)
- [ ] (f11) ...

#### UX rough (<n>)
- [ ] (f13) ...

#### UI improvement (<n>)
- [ ] (f15) ...

## Triage
For each finding, mark: fix-now / fix-later / skip / wontfix.

## Before / After
(filled after fix pass)
```

Stable IDs: number findings sequentially as `f1`, `f2`, `f3`, ... regardless of category.

### 6. Dedup against history

Read the last 3 days of `docs/audit/*.md` (excluding today's). For each finding in today's file:

- If a near-identical finding appeared in any of those files, append `(still present, day N)` after the description, where N is how many consecutive days it's appeared.
- Findings that appear today but not in those files are NEW — surface them in the digest.

A "near-identical" finding is one with the same finding type and references the same route/file. Be conservative — don't dedup overly aggressively or real regressions get hidden.

### 7. Stop here if `--no-fix`

Post a chat summary:

```
Audit complete. <n> findings written to docs/audit/<date>.md
- P1 Broken: <n> (<x> NEW)
- Track A: Slow <n>, Dead-code <n>, Refactor <n>
- Track B: Missing <n>, UX <n>, UI <n>
```

Exit without prompting for triage.

### 8. Wait for triage

Post a digest in chat with both tracks visible. Accept input like:
- `fix f1, f4, f7-f9; skip f2; later f10-f12`
- `auto-mechanical` (fix all P1 + Slow + Dead-code + Refactor)
- `auto-track-a` (everything in Track A)
- `auto-track-b` (everything in Track B)

### 9. Implement fix-now items

**Mechanical fixes** (perf, dead-code removal, small structural refactors): dispatch parallel fix sub-agents, one per fix. Each gets a brief like:

```
Fix finding <id> from docs/audit/<date>.md.

Description: <verbatim from finding>

File(s): <exact paths>

Apply the minimum change to address the finding. Verify with:
- npx tsc --noEmit
- For perf items: re-run `npm run audit` and confirm the affected route improved.

Output: a one-paragraph summary of what you changed and the verification result. Do not commit — return the change as a diff for review.
```

**Judgment fixes** (new features, UX rewrites, UI changes): handle sequentially in the main agent. Brainstorm with the user where the fix involves design choices.

All fixes must pass `npx tsc --noEmit` before commit.

### 10. Re-run perf script and append before/after

```bash
npm run audit
```

Read the new perf JSON. For every finding fixed in step 9 that affected a measured route, append a row to the "Before / After" table at the bottom of `docs/audit/<date>.md`:

| Finding | Route | Before (ms) | After (ms) | Delta |
|---|---|---|---|---|
| f4 | /dashboard/competitions/[id] | 1840 | 720 | -1120 (-61%) |

### 11. Wrap up

- Stop the background dev server.
- `git status`. Show the user what was changed/committed.
- If any findings were marked `fix-later`, list them so the user has a backlog.
- Recommend running `/audit-loop --measure-only` after a few code changes to see if perf drifted, or wait for the daily scheduled run.

## Commit message convention

One commit per finding-cluster:

```
audit(track-a): <short summary> [refs f4, f5]
audit(track-b): <short summary> [refs f11]
```

Body should include the verification (tsc clean, route X went from N to M ms).

## Stop conditions / abort points

- Dev server can't be reached → exit 1, tell user to start it
- `npm run seed:large` fails → exit 1, surface the error
- `npx tsc --noEmit` shows new errors after a fix → revert that fix, mark the finding as `needs-investigation` in the digest, continue with remaining fixes
- A persona agent fails (e.g., login broke) → record as a P1 Broken finding, continue with the other agent's findings
````

- [ ] **Step 2: Verify the file exists and is readable**

```bash
cat .claude/commands/audit-loop.md | head -20
```

Expected: prints the frontmatter and first heading.

- [ ] **Step 3: Commit**

```bash
git add .claude/commands/audit-loop.md
git commit -m "audit: /audit-loop slash command playbook"
```

---

### Task 10: Final TypeScript and integration check

**Files:** none (verification only)

- [ ] **Step 1: Full type check**

```bash
npx tsc --noEmit
```

Expected: zero errors in source files. Errors inside `.next/` are stale build artifacts and can be ignored per the global rule.

- [ ] **Step 2: End-to-end dry-run**

In one terminal:

```bash
npm run dev
```

In another, exercise the full pipeline:

```bash
npm run audit
```

Confirm:
- Both personas log in successfully
- All routes in the matrix get measured
- Output JSON written to `docs/audit/`
- Diff prints if at least one prior `perf-*.json` existed

- [ ] **Step 3: Verify the slash command file is picked up**

The slash command will be auto-discovered by Claude Code from `.claude/commands/audit-loop.md`. To verify it loads, list available skills/commands in your next Claude Code prompt — `/audit-loop` should appear.

- [ ] **Step 4: Final status**

```bash
git status
git log --oneline -10
```

Expected: working tree clean, recent commits include all task commits.

---

### Task 11: Wire up daily schedule

**Files:** none in repo (schedule lives in your harness config)

- [ ] **Step 1: Use the `/schedule` skill to create the routine**

Tell Claude Code to invoke `/schedule` to create a new daily routine:
- **Cron:** daily at 08:00 local time (configurable)
- **Command:** `/audit-loop --no-fix`
- **Output target:** writes to `docs/audit/<date>.md`, commits to a `audit/<date>` branch, opens a PR titled "Audit YYYY-MM-DD"

- [ ] **Step 2: Verify the first scheduled fire**

After the next 08:00, check that:
- A new `docs/audit/perf-*.json` exists
- A new `docs/audit/<date>.md` exists
- The PR was opened (or branch was pushed if PR step failed)

If anything is wrong, edit the schedule via `/schedule` rather than the route-config file — those are independent.

---

## Self-Review Notes

This plan covers the spec at `docs/superpowers/specs/2026-05-02-audit-loop-design.md`:

- ✓ Perf script (Component 1) → Tasks 3, 5, 6, 7, 8
- ✓ Slash command (Component 2) → Task 9
- ✓ Extended seed (Component 3) → Task 2
- ✓ Daily scheduled routine → Task 11
- ✓ Findings document format → embedded in Task 9 step 1
- ✓ Stage A (build) → Tasks 1–10
- ✓ Stage C (schedule) → Task 11
- ✓ Stage B (run the loop end-to-end) → not in this plan; that's "use the artifacts," done after the plan completes
- ✓ Track A and Track B equal weighting → reflected in Task 9 agent briefs and findings template
- ✓ Both personas covered (Owner + Member, the Standard scope) → Task 3 route matrix + Task 9 agents
- ✓ Empirical perf via Server-Timing + total response time → Task 7
- ✓ Prod-DB safety on seed → Task 2 step 1 (`isLikelyProd` check)
- ✓ Dedup logic for daily runs → Task 9 step 6

No placeholders, no TBD. Code blocks are complete.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-02-audit-loop.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration. Best for plans with clearly bounded tasks like this one.

**2. Inline Execution** — Execute tasks in this session, batch with checkpoints for review. Better when you want to watch every step.

Which approach?
