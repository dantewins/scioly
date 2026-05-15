# Feature gaps to complete the Scioly platform

> Built from a live playtest against `main` at `1925ac2` (audit-loop merged + portable mobile primitives salvaged). All 11 owner routes and 9 member routes return 200; auth, email, the seven transactional triggers, hours/forms/dues lifecycles, competition rosters, and practice attempts all work end-to-end. The gaps below are what stand between "works for a demo" and "ready to run a real club season."

## P0 — Critical (block core club workflows)

| # | Gap | Why it matters | Rough effort |
|---|-----|----------------|--------------|
| 1 | **Competition score / placement tracking** | `Competition` and `CompetitionEventAssignment` have no `scoreEarned` / `placement` / `medal` fields. The only score columns in the schema are on practice attempts (`AssessmentAttempt.scoreEarned`). Today, after a regional, an admin has nowhere in-app to record "Team A placed 3rd in Anatomy & Physiology." This is the single biggest workflow gap — a Sci Oly club's primary record of work is medals/placements. | 1–2 days. New `CompetitionEventResult` model (or fields on `CompetitionEventAssignment`), admin entry UI, member-facing display. |
| 2 | **Announcements broken for members** | `Announcement` model + admin composer + API exist, BUT `app/api/member/hub/route.ts:631` hardcodes `announcements: []` and `features/dashboard/lib/load-member-dashboard.ts:306` does the same. Admin posts an announcement → members never see it. Fix the load functions to pull from `prisma.announcement` (the query is already in `loadAnnouncements` in the same file). | 1–2 hours. |
| 3 | **No announcements admin UI past "post one"** | The composer can create, but there's no list/edit/unpublish/delete page. Once posted, announcements are immutable from the UI. `/api/admin/announcements` is GET+POST only — needs PATCH+DELETE. | Half a day. |
| 4 | **No bulk applicant approve** | Approving 20 new members a season = 20 clicks + 20 confirms. `app/api/admin/applicants/route.ts` PATCH only handles one. Adding bulk action would also exercise the new email triggers in a batch. | 2–3 hours (API takes `memberSeasonIds[]`, UI checkbox + bulk action bar). |
| 5 | **Members table has no filter or search** | `app/dashboard/members/page.tsx` shows the full ~50-row table with sort but no filter on status, role, grade, or returning. Finding "all returning officers in grade 11" requires scrolling. | 3–4 hours (filter chips + search input, all client-side once the page passes the full list). |

## P1 — High (table-stakes for a real club)

| # | Gap | Why it matters | Rough effort |
|---|-----|----------------|--------------|
| 6 | **Resources / study materials** | `Resource` model exists with 6 parent relations (Season, User, Event, Competition, Club, MemberSeason) and `ResourceType` enum — zero API, zero UI. Members can't see linked study packets, drives, websites. Hub returns hardcoded `resources: []`. | 1 day (CRUD route + member-side card list per event/competition + admin upload UI). |
| 7 | **Calendar export (.ics)** | Schedules and club events have full date/time data but no `webcal://` feed or .ics download. Members copy-paste times manually. | Half a day (one endpoint emitting iCalendar for a member's assignments). |
| 8 | **In-app notifications + unread state** | Toasts on action only. New announcement, hour approval, invoice issued — members get email but nothing in the UI. No "X new since last visit" badge on sidebar items. | 1 day (notification model OR derive from existing data with a `lastReadAt` per user; small bell icon + drawer in `SiteHeader`). |
| 9 | **Cmd-K command palette / global search** | No way to jump to a member, competition, event, or page from anywhere. Heavy admins want this — every other admin tool has it. | 1 day (radix Combobox + index pulled from `/api/admin/members`, `/api/admin/competitions`, etc.). |
| 10 | **SSO (Google / Microsoft)** | Schools use Google Workspace or M365. Forcing students to set a password is friction; in some districts password auth on personal email is against policy. NextAuth / Auth.js with Google/Microsoft providers, gated on the club's verified domains (already in `ClubEmailDomain`). | 1–2 days. |
| 11 | **Travel / transportation per competition** | No fields on `Competition` for departure time, return time, transportation mode, driver assignments. Sci Oly travel logistics are real work and currently live in spreadsheets. | 1 day (add fields + `CompetitionTravelAssignment` join model + per-competition tab in admin UI). |
| 12 | **Partner pairing UI** | Auto-assign exists but no manual "I want to be paired with X" workflow. Members can rank event preferences but not partner preferences. | Half a day (preference field on `EventEnrollment` + admin view that shows mutual interest). |
| 13 | **CSV import for members / events** | Onboarding a club mid-season means re-entering 30 members by hand. Roster import from a spreadsheet would land a club faster. | 1 day per importer; events first, then members. |
| 14 | **CSV / PDF export of everything** | No way to hand a finance treasurer a year-end invoice list, or hand a coach a printable roster. | Half a day for CSV via existing `Table` data; PDFs are 1+ day. |
| 15 | **Mobile pass not yet executed (per-page)** | Only 4 primitives salvaged from the Ultraplan branch (`responsive-dialog`, `tabs` scroll, `page-header` stacking, dashboard sm: breakpoint). All the per-feature mobile work — the 9 dialog migrations, the 7 table card-fallbacks, the roster-grid mobile layout — was on stale paths and didn't merge. Needs to be redone on the current `features/` structure. | 1–2 days. |

## P2 — Medium (polish, expansion)

| # | Gap | Why it matters | Rough effort |
|---|-----|----------------|--------------|
| 16 | **Re-approve / undo rejected hour entries** | Once an admin rejects, the entry is stuck REJECTED. No UI to flip it back to PENDING or APPROVED on appeal. | 1 hour (add action to existing PATCH endpoint, "Reinstate" button on rejected card). |
| 17 | **No member-to-member messaging** | No DMs, no event-level threads. Email is the only async channel. | 2–3 days if done right; consider deferring or relying on email/Discord. |
| 18 | **Public club page** (`/`) | Only `/apply/[slug]` is public. No "About Mast Sci Oly" / past results / officers / contact page. Helps with recruiting. | 1 day, opinionated layout. |
| 19 | **Alumni mode** | `MembershipStatus.ALUMNI` exists, never written. No "graduating senior → alumni" flow, no alumni roster view, no alumni email lookup. | Half a day. |
| 20 | **Audit log surface** | `ActivityLog` model + `lib/activity.ts` exist; only competition publish + hour review actions write to it. No admin UI to view, filter, or export the log. | Half a day for a basic log viewer. |
| 21 | **Hour entry: re-approval after rejection** | Same family as #16; once rejected, member can't resubmit cleanly without a new entry. | Folded into #16 if both are tackled together. |
| 22 | **Practice: timed mode / countdown** | `Assessment.timeLimitMinutes` exists but no countdown in the attempt workspace; member sees no clock or auto-submit. | Half a day (client-side countdown + autosubmit on expiry). |
| 23 | **Practice: warm-up screen** | "Start Attempt" immediately POSTs and routes; no preface explaining "you have 50 min, X questions, here's the format." `instructions` field exists. | 2 hours. |
| 24 | **Onboarding flow for new members** | After approval + password set, the member lands on the dashboard with no tour. No "complete your profile" step. | Half a day (lightweight checklist on first login). |
| 25 | **Settings: club branding** (logo, colors, name) | All branding is hard-coded. A multi-club deployment shows "Scioly" everywhere — no per-club identity. | Half a day. |
| 26 | **Reporting: season summary** | No "Y season hit X% of hour targets, raised $Y in dues, won Z medals." Useful for end-of-year wrap-up. | 1 day after #1 (placements) lands. |
| 27 | **Form types: conditional fields** | Forms today are file-upload-only or noop. No "if minor, parent signature line" or multi-page forms. | Real work, 2+ days. |
| 28 | **Time-zone handling** | Times stored as DateTime (UTC) but no explicit `timezone` per club. Multi-state competitions show wrong local times. | 1 hour to add `Club.timezone`, then format everywhere with it. |
| 29 | **Profile photo / avatars** | Sidebar avatar uses initials. No upload, no Gravatar. | Half a day. |
| 30 | **Roster history / change tracking** | Roster changes overwrite. No "X was on the Regional A roster but moved to Regional B on 2026-04-01." | 1 day (denormalize into ActivityLog or a dedicated table). |

## P3 — Nice-to-have

- 2FA (TOTP) for admins
- Resend webhook for bounces → flag a `User.emailBounced` flag
- Email preferences / unsubscribe for non-transactional emails
- Push notifications (web push for desktop, Expo for native)
- Public scoreboard / standings page (once #1 lands)
- Slack / Discord bridge for announcements
- Practice PDF annotation
- Flashcards / study-mode for practice
- Squad chat per competition
- Drag-and-drop schedule builder
- Map view of competitions (regional venues)
- Print-friendly templates: roster sheet, schedule, sign-in sheet
- Per-member event readiness score (combines hours + practice attempts + completion)
- Officer election / voting workflow
- Tournament bracket / dual-meet support
- Coach / advisor / parent roles (read-only views)
- Discord bot for daily digest
- API tokens / webhooks for third-party integrations
- Theme system / dark mode polish (`next-themes` is installed but barely used)

## What's actually working today

> So the gap list reads in context.

**Member can:** apply, get receipt email, log in via password setup link (which also writes `emailVerifiedAt`), submit hours (with file upload), view + edit pending hours, view assigned competitions with partner names + time + room, submit required forms via real `FileUpload`, see open invoices and history, attempt practice assessments end-to-end (start → autosave → submit), see continue/recommended/recent-results on the dashboard, manage profile + change password.

**Admin/owner can:** browse + filter applicants (one at a time), approve/deny/waitlist with auto-email, manage members, create/edit/publish competitions with rosters + schedule + auto-assign, manage Science Olympiad events list, run the hours approval queue with required reject reasons, manage form types and review submissions, create dues invoices and record payments (with finance ledger entries), manage club events with attendance auto-syncing to hour entries, create + manage practice assessments, manage custom roles with a 40-flag permission grid, manage seasons, post announcements (but no list view), trigger bulk reminder emails for hours/dues/forms.

**Email triggers wired** (best-effort): application received, password setup, application denied (with reason), application waitlisted, hours approved/rejected, form verified/rejected, invoice issued, plus three admin-triggered bulk reminders.

**Security/hardening:** active-membership joins on every member-area request, admin-area dataset access checks, HTML escaping in all email templates, JWT secret minimum length, password rate-limit (5 min cooldown), transactional dues payments with finance entries.

**Recent perf wins:** owner routes -50–70% after splitting `loadCurrentUser` into a fast-path that skips the `seasonMemberships` join.
