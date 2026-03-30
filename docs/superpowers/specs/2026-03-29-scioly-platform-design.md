# SciOly Club Management Platform — Design Spec
**Date:** 2026-03-29
**Status:** Approved

---

## Overview

A multi-tenant Science Olympiad club management SaaS platform. Schools self-register their club, configure their season, and manage members, events, teams, hours, finances, and practice tests — all through a single web portal. Modeled after Canvas in spirit: one deployment, many schools, each fully isolated.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Database | PostgreSQL via Prisma 7 |
| Auth | jose (JWT, HS256), bcryptjs, HTTP-only `app_session` cookie (7-day TTL) |
| Email | Resend |
| UI | shadcn/ui (new-york), Tailwind CSS, `@tabler/icons-react` |
| Tables | TanStack Table |
| Toasts | Sonner |
| Validation | Zod |
| Path alias | `@/*` → project root |

---

## Multi-Tenancy Model

- Every model is scoped by `clubId`
- `Club` has a `schoolDomain` field (e.g. `"mast.edu"`)
- On registration and login, the user's email domain is validated against their club's `schoolDomain`
- `WEBSITE_OWNER` role bypasses domain checks (platform-level super-admin)
- Clubs are fully isolated — no data leaks across club boundaries

---

## User Roles (RBAC)

`WEBSITE_OWNER > ADMIN > BOARD_MEMBER > MEMBER > APPLICANT`

- `WEBSITE_OWNER` — club founder/teacher sponsor, full access including club settings
- `ADMIN` — co-presidents, full club management
- `BOARD_MEMBER` — event managers, treasurer, etc. — manage their domain
- `MEMBER` — active season member
- `APPLICANT` — submitted application, not yet approved

---

## Routing

### Public
- `/` — landing/marketing page
- `/register` — club self-registration (teacher/president creates club + their account)
- `/login` — email + password login with school domain enforcement
- `/apply/[clubSlug]` — member application form (public, tied to club by its URL slug, e.g. `/apply/mast-scioly`)
- `/set-password` — token-based password setup (sent via email on application approval)

### Protected (`/dashboard/*`)
All dashboard pages are server components that call `getCurrentUser()` directly.

### API
- `/api/auth/*` — login, logout, register
- `/api/admin/*` — admin-only mutations
- `/api/member/*` — member-facing actions
- `/api/public/*` — public endpoints (application submission)

---

## Schema Redesign

### Key changes from existing schema

**1. Merge Tournament + Competition → single `Competition` model**

The old schema had both `Tournament` and `Competition` doing essentially the same thing. Every Science Olympiad event (invitational, regional, state) is a competition. One model with a `type` enum handles all cases.

```
CompetitionType: INVITATIONAL | REGIONAL | STATE | NATIONAL | PRACTICE | OTHER
```

Removes: `Tournament`, `TeamTournament`, `TournamentEventAssignment`
Replaces with: `Competition`, `CompetitionTeam`, `CompetitionEventAssignment`

**2. Practice tests redesigned for split-view PDF approach**

Old models (`Test`, `TestQuestion`, `TestAnswer`) assumed structured Q&A entry. New approach stores PDFs as-is and lets admins define answer keys as ordered JSON arrays.

New models:
- `PracticeTest` — linked to `Event` + `Season`, stores `pdfUrl`, `title`, `timeLimitMinutes`, `isActive`
- `AnswerKey` — one per `PracticeTest`, stores answers as `Json` (ordered array), created by admin
- `PracticeAttempt` — member's attempt, stores answers as `Json`, `startedAt`, `submittedAt`, computed `score`

**3. `schoolDomain` added to Club**

```
Club.schoolDomain  String?   // e.g. "mast.edu" — enforced on login/register
```

**4. Everything else retained**

The following models are structurally sound and carry forward unchanged:
`Club`, `Season`, `User`, `PasswordSetupToken`, `MemberSeason`, `Event`, `EventEnrollment`, `HourCategory`, `HourEntry`, `FormType`, `FormSubmission`, `DuesInvoice`, `PaymentRecord`, `ClubEvent`, `ClubEventAttendance`, `Resource`, `Announcement`, `ClubRole`, `MemberRole`, `ActivityLog`

---

## Agent Team Structure

### Phase 1 — Foundation Agent
*Human reviews and approves before Phase 2 begins.*

**Responsibilities:**
- Clean wipe of existing pages/routes (keep stack, config, `package.json`)
- New Prisma schema (merged Competition, redesigned practice tests, `schoolDomain`)
- Auth: login, club self-registration (`/register`), `set-password`, JWT sessions, school domain enforcement
- Next.js middleware for protected route redirects
- Dashboard shell: sidebar navigation, layout, site header
- Core lib files: `lib/auth.ts`, `lib/db.ts`, `lib/api.ts`, `lib/prisma.ts`, `lib/email.ts`, `lib/cookies.ts`
- Seed script for a sample club with a season and admin user

**Deliverable:** Working auth, club registration, dashboard shell with placeholder pages, seed running cleanly.

---

### Phase 2 — Three Parallel Agents
*Run simultaneously after Phase 1 approval. Human reviews after all three complete.*

#### Member Agent
**Owns:**
- `app/dashboard/applications/` — application list, review modal, approve/reject
- `app/dashboard/members/` — member directory, member detail/profile page
- `app/dashboard/forms/` — form types management (admin), form submission (member)
- `app/api/admin/applications/`, `app/api/admin/members/`, `app/api/member/forms/`, `app/api/public/apply/`

**Builds:**
- Public `/apply/[clubSlug]` page: multi-step application form scoped to club by URL slug
- Application review flow: table, approve/reject with status reason, email trigger on approval
- Password setup email sent on approval → `/set-password` token flow
- Member directory: searchable/filterable table with role badges, membership status
- Member detail: profile, season history, current enrollments
- Forms management: admin creates form types (name, category, due date, requires upload), members submit/upload

#### Operations Agent
**Owns:**
- `app/dashboard/events/` — Science Olympiad event list, event detail
- `app/dashboard/competitions/` — competition list, competition detail, event schedule
- `app/dashboard/teams/` — team list, team detail, member assignment
- Corresponding API routes under `app/api/admin/events/`, `app/api/admin/competitions/`, `app/api/admin/teams/`

**Builds:**
- Events: CRUD for season events (name, code, min/max participants, trial event flag)
- Event enrollment: members express interest/tryout for events; admin sets status (INTERESTED → TRYOUT_PENDING → ACTIVE)
- Competitions: CRUD with type, location, dates; publish/unpublish
- Competition event schedule: assign time slots to events within a competition
- Teams: create teams per competition+event, assign members with roles (MEMBER/CAPTAIN/ALTERNATE)
- Competition event assignments: which team competes in which event at which competition

#### Activity Agent
**Owns:**
- `app/dashboard/hours/` — hour log categories (admin), submission (member), approval queue (admin)
- `app/dashboard/finances/` — dues invoices, payment records
- `app/dashboard/club-events/` — club event calendar, attendance tracking
- Corresponding API routes

**Builds:**
- Hour categories: admin creates categories per season (name, description, required hours, requires approval, proof instructions)
- Hour submission: member submits entry (category, title, description, hours, optional proof/file)
- Approval workflow: admin sees pending queue, approves/rejects with reason
- Dues invoices: admin creates invoices per member, tracks amount, due date, status
- Payment records: admin logs payment against invoice (method, amount, reference)
- Club events: admin creates events (meeting, super saturday, fundraiser, etc.), members check in, attendance auto-generates hour entry if category linked

---

### Phase 3 — Practice Tests Agent
*After Phase 2 approval.*

**Owns:**
- `app/dashboard/practice/` — practice test library (member), test attempt UI
- `app/dashboard/admin/practice/` — admin upload + answer key management
- `app/api/admin/practice/`, `app/api/member/practice/`

**Builds:**
- Admin: upload PDF test (linked to event), set title, time limit, active status
- Admin: answer key entry — ordered list of answers (letter for MCQ, text for FRQ), one per question number
- Member: practice test library filtered by event enrollment
- Split-view attempt UI: PDF viewer (right panel, iframe/embed) + answer input form (left panel, one input per question)
- On submit: compare against answer key, display score, mark attempt complete
- Attempt history: member can review past attempts and scores

---

### Phase 4 — Polish Agent
*After Phase 3.*

- Dashboard home page: real stats (active members, pending apps, upcoming competitions, pending hours), quick actions
- Announcements: create/pin/publish scoped to club, event, team, or all members
- Resources: upload/link files scoped to club, event, team, or competition
- Activity log viewer (admin): audit trail of actions
- Mobile responsiveness audit across all pages
- Empty states, loading skeletons, error boundaries throughout
- Dark mode consistency check

---

## Coding Conventions (All Agents)

- Dashboard pages: server components, call `getCurrentUser()` directly, no client-side auth
- API routes: always use `withAdminAuth` or `withMemberAuth` wrappers from `lib/api.ts`
- Responses: always use `ok(data)` and `err(message, status)` helpers
- Validation: Zod schemas for all API inputs
- Tables: TanStack Table via shared table components
- Toasts: Sonner only
- UI components: shadcn/ui only, no custom component libraries
- Icons: `@tabler/icons-react` only
- All admin routes: export `dynamic = "force-dynamic"`
- Prefer `lib/db.ts` helpers for common queries (e.g. `getActiveSeason`, `getMemberSeason`); direct `prisma.*` calls are acceptable in API route handlers for one-off queries
- File uploads: `multipart/form-data`

---

## Human Checkpoints

| Point | Trigger | What you review |
|---|---|---|
| After Phase 1 | Foundation Agent completes | Schema, auth flows, dashboard shell, seed |
| After Phase 2 | All three parallel agents complete | Member management, teams/events, hours/finances |
| After Phase 3 | Practice Tests Agent completes | PDF split-view, answer keys, scoring |
| After Phase 4 | Polish Agent completes | Full platform review before launch |

---

## File Ownership Map

| Agent | Owns (exclusive write access) |
|---|---|
| Foundation | `prisma/`, `lib/`, `middleware.ts`, `app/layout.tsx`, `app/dashboard/layout.tsx`, `components/app-sidebar.tsx`, `components/site-header.tsx`, `app/login/`, `app/register/`, `app/set-password/` |
| Member | `app/dashboard/applications/`, `app/dashboard/members/`, `app/dashboard/forms/`, `app/apply/`, `app/api/admin/applications/`, `app/api/admin/members/`, `app/api/member/forms/`, `app/api/public/apply/` |
| Operations | `app/dashboard/events/`, `app/dashboard/competitions/`, `app/dashboard/teams/`, `app/api/admin/events/`, `app/api/admin/competitions/`, `app/api/admin/teams/` |
| Activity | `app/dashboard/hours/`, `app/dashboard/finances/`, `app/dashboard/club-events/`, `app/api/admin/hours/`, `app/api/admin/finances/`, `app/api/admin/club-events/`, `app/api/member/hours/` |
| Practice Tests | `app/dashboard/practice/`, `app/dashboard/admin/practice/`, `app/api/admin/practice/`, `app/api/member/practice/` |
| Polish | `app/dashboard/page.tsx`, `app/dashboard/announcements/`, `app/dashboard/resources/`, `app/api/admin/announcements/`, `app/api/admin/resources/` |

**Shared (read-only for non-Foundation agents after Phase 1):** `prisma/schema.prisma`, `lib/*`, `components/ui/*`, `app/dashboard/layout.tsx`

> Note: On club self-registration (`/register`), the founding user's email domain becomes the club's `schoolDomain`. Domain enforcement only applies to subsequent logins and member registrations — not to the initial club founder creating the club.
