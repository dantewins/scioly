# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start development server (localhost:3000)
npm run build     # Production build
npm run lint      # ESLint
```

### Database
```bash
npx prisma migrate dev        # Run migrations (dev)
npx prisma migrate deploy     # Run migrations (production)
npx prisma generate           # Regenerate Prisma client after schema changes
npx prisma studio             # Open Prisma Studio GUI
tsx prisma/seed.ts            # Seed the database (or: npx prisma migrate reset)
```

Required env vars: `DATABASE_URL`, `APP_JWT_SECRET`

## Architecture

**Next.js 15 App Router** with a PostgreSQL database via Prisma (using `@prisma/adapter-pg` — the driver adapter, not the default engine). UI is shadcn/ui on Tailwind CSS v4.

### Data model

The core hierarchy is: `Club → Season → [Members, Events, Competitions, Teams, ClubEvents, Tests]`. Nearly every entity belongs to a `Season`. Members join via `MemberSeason` (a junction that tracks per-season status, enrollment, forms, dues, hours).

Key relationships:
- `User` ↔ `Season` via `MemberSeason` (holds `MembershipStatus`, enrollment data, application answers)
- `EventEnrollment` links `MemberSeason` to `Event` (tracks interest/tryout/active status and partner prefs)
- `Team` links `Event` + optional `Competition` + `Season`; members assigned via `TeamAssignment`
- `ClubEvent` + `ClubEventAttendance` + `HourEntry` are tightly coupled — attending a club event can auto-create an `HourEntry`
- `Test` + `TestQuestion` (MCQ or free-response, options stored as JSON) belong to a season/event

### Auth

Custom JWT-based session auth — **no Clerk despite the `clerkId` field in the schema**. Session stored in an `app_session` httpOnly cookie (7-day TTL).

- `lib/auth.ts` — `signSession`, `verifySession`, `getUserId`, `getCurrentUser`
- `lib/cookies.ts` — `setSessionCookie`, `clearSessionCookie`
- `context/AuthContext.tsx` — client-side `AuthProvider` seeded with `initialUser` from the server layout; exposes `useAuth()` hook with role helpers

User roles (in ascending privilege): `APPLICANT → MEMBER → BOARD_MEMBER → ADMIN → WEBSITE_OWNER`

### API routes

All under `app/api/`:
- `api/auth/login` / `api/auth/logout` — session management
- `api/admin/*` — protected routes using `withAdminAuth()` wrapper from `lib/api.ts`
- `api/public/*` — unauthenticated endpoints
- `api/apply/*`, `api/events/*` — applicant/member-facing

`lib/api.ts` exports `withAdminAuth(handler)` (wraps admin routes), `ok(data)` / `err(message, status)` helpers, and `ADMIN_ROLES` set.

`lib/db.ts` — `getActiveSeason(clubId)` helper used throughout API routes.

### Page structure

- `/login` — public auth page
- `/apply` — public application form (`components/forms/apply-form.tsx`)
- `/dashboard/*` — authenticated area with sidebar layout (`components/app-sidebar.tsx`)
  - `members/` — member management with `MembersTable` + `ApplicantsTable`
  - `events/` — Science Olympiad event management
  - `competitions/` — competition scheduling
  - `teams/` — team assignment
  - `club-events/` — meeting/workshop attendance
  - `tests/` — practice test management with AI question parsing (`app/api/admin/tests/parse/`)

### AI integration

`@google/generative-ai` is used for parsing uploaded test files into structured questions. The parse endpoint is at `app/api/admin/tests/parse/route.ts`.
