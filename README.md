# SciOly Club Manager

A full-stack club management platform for Science Olympiad teams. One dashboard for the whole season — applications, hours, dues, forms, competitions, rosters, practice tests, results, resources, announcements, and email.

Built to replace the usual sprawl of Google Sheets, Drive folders, and group-chat reminders that most clubs run on.

## What it does

### Member lifecycle

A public `/apply/<club-slug>` page collects applications with event preferences. Admins review them on the Applications page — approve, deny, or waitlist, individually or in bulk. Approval auto-creates a 72-hour password-setup token and emails the link. Members who lose the link have a self-service `/forgot-password` flow and admins can resend the setup link from the member's profile. Applicants who haven't been admitted yet see a dedicated `/applicant` page with their status, decision notes, and a "withdraw" action.

### Hours

Members log hours against configurable categories (with per-category required totals and per-entry caps). Each entry goes to an admin review queue. Admins can approve or reject in bulk; reject requires a non-empty reason. Categories can opt into auto-approve. Every transition fires a transactional email to the member.

### Dues

Admins issue invoices, record partial payments (cash, check, Zelle, etc.), and the system maintains the running outstanding balance and a finance ledger. Overpayments are rejected; voiding a paid invoice is blocked. Members see their own invoices on `/dashboard/finances`.

### Competitions, rosters, results

Build competitions (invitational / regional / state / national / practice), publish them, and assign rosters per event with slots, rooms, and time blocks. The roster manager has conflict detection, auto-assign, and a calendar grid. After the competition runs, admins record per-event results (placement, score earned / possible, medal notes). Members see their personal results on each competition page.

### Practice assessments

Two flows side by side:

- **Curated tests**: admins create a published assessment, attach a source PDF, and edit per-prompt questions with a rich editor — short-text or multiple-choice, difficulty (easy / medium / hard), subtopic tags, and points. MCQ auto-grades on submit; short-text matches case-insensitive trim.
- **Generated tests**: members pick filters (event, count, time limit, MCQ / FRQ / both, difficulty, subtopics) on `/dashboard/practice/generate` and the server samples matching prompts from the club's published pool, clones them into a one-off assessment, and routes the member into a fresh attempt. Filters work as soon as admins tag their questions.

The attempt workspace adapts to viewport: a split PDF + prompts layout on tablet+ with a sticky status bar and countdown timer (auto-submits at 0:00), single column on phone. A score-trend sparkline on the practice feed shows the member's last 10 scored attempts.

### Forms, club events, announcements, resources

Admins define form types (waivers, medical, code of conduct, etc.). Members upload signed PDFs through the real `FileUpload` pipeline; admins verify or reject. Form deletes refuse to drop submissions silently — they require `?force=1`.

Club events (meetings, workshops, Super Saturdays, fundraisers) carry attendance and optionally award hours back to participating members.

Announcements support drafts, scheduled publishing, expiry, and pinning. Members see them on their dashboard.

Resources (links, docs, sheets, videos, folders) can be scoped season-wide, to an event, to a competition, or to a roster. Members see only what they're enrolled in or rostered to.

### Notifications

A bell in the top header surfaces a real unread feed derived from existing data — hours reviewed, forms verified / rejected, invoices issued, announcements published, competition results recorded. Mark-all-read tracks via `User.notificationsLastReadAt`, no separate notification model.

### Mobile

Every form-heavy modal swaps to a vaul bottom-sheet on mobile via a `ResponsiveDialog` primitive. Every admin table has a parallel card list shown below `md:`. The sidebar collapses to a sheet drawer. Touch targets meet the 32px minimum.

### Permissions

`WEBSITE_OWNER` is the bypass-everything role for the club owner. Below that, 40 granular permission flags (`view_*` / `create_*` / `edit_*` / `delete_*` across 10 areas) are bundled into custom `ClubRole`s. The roles manager surfaces every flag with sensible auto-enables (turn on `edit_competitions` and `view_competitions` flips on too). Role inputs sanitize unknown keys.

### Security + reliability

Transactional emails are best-effort and never block the mutation. Every API mutation accepts malformed JSON as a 400 (not a 500). Member self-edits respect status — you can't edit an approved hour entry. Member auto-approved entries don't claim the member approved themselves in the audit trail. JWT secret has a 32-char minimum. Rate limits cover login, registration, forgot-password, apply, generate-test, and admin email actions. Resource URLs are restricted to http(s) to block XSS-vector schemes.

Permissions hold up: members can't reach admin endpoints; applicants can't reach member endpoints; cross-club ID injection is filtered out by `withPermission` pulling `clubId` from the session.

## Tech stack

- **Next.js 16** — App Router, Server Components, API routes
- **TypeScript** — strict mode throughout
- **Prisma + PostgreSQL** — full relational data model with 40+ models
- **Custom JWT auth** — httpOnly cookie sessions, no NextAuth
- **Resend** — transactional email + a `RESEND_DEV_LOG_ONLY` flag for local-only development without keys
- **vaul** — mobile bottom-sheet drawers via the `ResponsiveDialog` wrapper
- **recharts** — score-trend sparkline
- **shadcn/ui + Tailwind CSS v4** — component library and styling

## Getting started

```bash
npm install
cp .env.example .env  # populate the variables below
npx prisma db push
npm run seed:large    # optional: load demo club + members + competitions
npm run dev
```

Seeded test users:
- `owner@mast.edu` / `password123` — WEBSITE_OWNER
- `member@mast.edu` / `password123` — MEMBER

## Environment variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `APP_JWT_SECRET` | Secret for signing session tokens (min 32 chars). `JWT_SECRET` is accepted as a legacy fallback. |
| `NEXT_PUBLIC_APP_URL` | Public base URL (e.g. `https://yourdomain.com`). Used in email CTA links and to derive the brand name. |
| `RESEND_API_KEY` | Resend API key for outbound email. |
| `EMAIL_FROM` | Sender address shown in emails (e.g. `onboarding@resend.dev` for Resend's no-domain-verification test mode). |
| `RESEND_DEV_LOG_ONLY` | Set to `1` in dev to log email payloads to stdout instead of calling Resend. Lets you exercise email flows without a real API key. |

## Auditing + verification

The repo carries a `docs/audit/` history of perf runs and findings. The bundled `npm run audit` script logs in as seeded users, hits every dashboard route, records median response times, and diffs against the previous run.

`npx tsc --noEmit` should always return zero source-file errors before pushing — Vercel builds fail otherwise.
