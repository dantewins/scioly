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
- `WEBSITE_OWNER` system role bypasses domain checks and all permission flags
- Clubs are fully isolated — no data leaks across club boundaries

---

## User Roles & Permissions

### System Roles (hardcoded, non-configurable)

`WEBSITE_OWNER > MEMBER > APPLICANT`

- `WEBSITE_OWNER` — platform super-admin; bypasses all permission checks and domain enforcement. Only one per club (the person who created it).
- `MEMBER` — active user; dashboard access determined entirely by assigned club roles and their permission flags.
- `APPLICANT` — submitted application, not yet approved; no dashboard access.

`ADMIN` and `BOARD_MEMBER` are **not** system roles anymore — they are default club roles (see below).

---

### Club Roles (Discord-style, fully configurable per club)

Each club defines its own roles (e.g. "President", "Treasurer", "Head Team Captain"). Each role has individual permission flags. Members can hold multiple roles; permissions are unioned across all assigned roles.

**Permission flags (26 total — each area has `view_` and `manage_`):**

| Area | `view_[area]` gates | `manage_[area]` gates |
|---|---|---|
| `members` | View member directory, profiles | Approve/reject applications, edit profiles, change roles |
| `teams` | View team rosters and assignments | Create/edit/delete teams, assign members |
| `events` | View Science Olympiad events, enrollments | Create/edit/delete events, manage enrollments |
| `competitions` | View competitions, schedules | Create/edit/delete competitions, publish schedules |
| `hours` | View own hour entries | Approve/reject submissions, create categories |
| `finances` | View own invoices | Create invoices, record payments, view all finances |
| `forms` | View own form submissions | Create form types, verify submissions |
| `club_events` | View club events calendar | Create/edit/delete events, take attendance |
| `resources` | View resources | Upload/delete resources |
| `announcements` | View announcements | Create/pin/delete announcements |
| `practice` | View and attempt practice tests | Upload PDFs, create/edit answer keys |
| `roles` | View club roles | Create/edit/delete roles, assign to members |
| `club_settings` | View club settings | Edit club name, domain, season settings |

> `manage_[area]` always implies `view_[area]`. `WEBSITE_OWNER` bypasses all flags.

**Default roles created on club setup:**

| Role | Default permissions |
|---|---|
| `Admin` | All `manage_*` flags enabled |
| `Board Member` | `manage_members`, `manage_teams`, `manage_events`, `manage_competitions`, `manage_hours`, `manage_forms`, `manage_club_events`, `manage_resources`, `manage_announcements`, `view_finances`, `view_roles`, `view_club_settings` |
| `Member` | All `view_*` flags enabled; no `manage_*` flags |

Clubs can rename, modify permissions on, or delete any of these. The club founder (WEBSITE_OWNER) is never subject to role permission checks.

### Schema: ClubRole redesign

`ClubRole` gains a `permissions` field — a `Json` column storing a flat object of `{ [flagName]: boolean }`. Example:

```json
{
  "view_members": true,
  "manage_members": true,
  "view_finances": true,
  "manage_finances": false
}
```

`MemberRole` (join table between `MemberSeason` and `ClubRole`) is unchanged. Permission resolution at runtime: union all flags across all of a member's roles for the current season.

### Permission check helpers (`lib/permissions.ts`)

```ts
hasPermission(memberRoles: ClubRole[], flag: PermissionFlag): boolean
canView(memberRoles: ClubRole[], area: PermissionArea): boolean
canManage(memberRoles: ClubRole[], area: PermissionArea): boolean
```

API wrappers updated:
- `withPermission(flag)` — replaces `withAdminAuth` / `withMemberAuth` for granular checks
- `withAdminAuth` retained as a convenience wrapper for `manage_club_settings` (backward compat)

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

**4. ClubRole redesigned for Discord-style permissions**

`ClubRole` gains a `permissions Json` column (flat flag object). `MemberRole` join table unchanged. See the "User Roles & Permissions" section for full details.

`UserRole` enum simplified to: `WEBSITE_OWNER | MEMBER | APPLICANT` — `ADMIN` and `BOARD_MEMBER` become default club roles, not system enum values.

**5. Everything else retained**

The following models are structurally sound and carry forward unchanged:
`Club`, `Season`, `User`, `PasswordSetupToken`, `MemberSeason`, `Event`, `EventEnrollment`, `HourCategory`, `HourEntry`, `FormType`, `FormSubmission`, `DuesInvoice`, `PaymentRecord`, `ClubEvent`, `ClubEventAttendance`, `Resource`, `Announcement`, `MemberRole`, `ActivityLog`

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
- Core lib files: `lib/auth.ts`, `lib/db.ts`, `lib/api.ts`, `lib/prisma.ts`, `lib/email.ts`, `lib/cookies.ts`, `lib/permissions.ts`
- Default club roles seeded on club creation: `Admin` (all manage flags), `Board Member` (partial manage), `Member` (all view flags)
- Seed script for a sample club with a season, default roles, and a WEBSITE_OWNER user

- Club settings page (`/dashboard/settings/`): club name, school domain, roles management (create/edit/delete roles, toggle permission flags per role)
- Role assignment UI: assign/remove roles from members (WEBSITE_OWNER only in Phase 1; available to `manage_roles` holders in Phase 2+)

**Deliverable:** Working auth, club registration, dashboard shell with placeholder pages, roles system functional, seed running cleanly.

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
- API routes: use `withPermission(flag)` from `lib/api.ts` for granular permission checks; `withAdminAuth` is a convenience alias for `manage_club_settings`
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
| Foundation | `prisma/`, `lib/`, `middleware.ts`, `app/layout.tsx`, `app/dashboard/layout.tsx`, `components/app-sidebar.tsx`, `components/site-header.tsx`, `app/login/`, `app/register/`, `app/set-password/`, `app/dashboard/settings/` |
| Member | `app/dashboard/applications/`, `app/dashboard/members/`, `app/dashboard/forms/`, `app/apply/`, `app/api/admin/applications/`, `app/api/admin/members/`, `app/api/member/forms/`, `app/api/public/apply/` |
| Operations | `app/dashboard/events/`, `app/dashboard/competitions/`, `app/dashboard/teams/`, `app/api/admin/events/`, `app/api/admin/competitions/`, `app/api/admin/teams/` |
| Activity | `app/dashboard/hours/`, `app/dashboard/finances/`, `app/dashboard/club-events/`, `app/api/admin/hours/`, `app/api/admin/finances/`, `app/api/admin/club-events/`, `app/api/member/hours/` |
| Practice Tests | `app/dashboard/practice/`, `app/dashboard/admin/practice/`, `app/api/admin/practice/`, `app/api/member/practice/` |
| Polish | `app/dashboard/page.tsx`, `app/dashboard/announcements/`, `app/dashboard/resources/`, `app/api/admin/announcements/`, `app/api/admin/resources/` |

**Shared (read-only for non-Foundation agents after Phase 1):** `prisma/schema.prisma`, `lib/*`, `components/ui/*`, `app/dashboard/layout.tsx`

> Note: On club self-registration (`/register`), the founding user's email domain becomes the club's `schoolDomain`. Domain enforcement only applies to subsequent logins and member registrations — not to the initial club founder creating the club.
