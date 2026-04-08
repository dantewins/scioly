# Member Practice Frontend Handoff (Backend Ready)

## Scope

This handoff covers member-facing practice APIs and the member hub API.
Admin practice APIs remain unchanged except for shared helper improvements.

## What Backend Added

- Rich member feed data (continue/recommended/recent attempts).
- Assessment detail endpoint for member view.
- Attempt detail endpoint with prompt-level responses.
- Autosave endpoint for in-progress attempts.
- Resumable start behavior for assessments.
- Submit flow now supports either explicit answers or previously autosaved responses.
- Unified member hub payload for dashboard/home surfaces.
- Rate limits on high-traffic member practice actions and auth/public entry routes.

Implemented in:
- [practice-assessments.ts](/Users/musung/Desktop/scioly/lib/practice-assessments.ts)
- [member practice root route](/Users/musung/Desktop/scioly/app/api/member/practice/route.ts)
- [member practice feed route](/Users/musung/Desktop/scioly/app/api/member/practice/feed/route.ts)
- [member assessment route](/Users/musung/Desktop/scioly/app/api/member/practice/[assessmentId]/route.ts)
- [member attempt route](/Users/musung/Desktop/scioly/app/api/member/practice/attempts/[attemptId]/route.ts)
- [member hub route](/Users/musung/Desktop/scioly/app/api/member/hub/route.ts)
- [rate-limit helper](/Users/musung/Desktop/scioly/lib/rate-limit.ts)
- [auth login route](/Users/musung/Desktop/scioly/app/api/auth/login/route.ts)
- [auth register route](/Users/musung/Desktop/scioly/app/api/auth/register/route.ts)
- [public apply route](/Users/musung/Desktop/scioly/app/api/public/apply/route.ts)

## API Contracts

### 1. `GET /api/member/practice`

Legacy list mode remains.
Returns assessment cards ordered for member priority:
- in-progress first
- recommended next
- newest activity after

New per-assessment fields now included:
- `recommended`
- `hasInProgressAttempt`
- `latestAttemptId`
- `latestAttemptStatus`
- attempt-level `status`, `scorePossible`, `answeredCount`, `promptCount`, `progressPercent`

### 2. `GET /api/member/practice?view=feed`
Alternative: `GET /api/member/practice/feed`

Returns:
- `assessments`: full member assessment list with priority metadata
- `continueAttempts`: flattened in-progress attempts
- `recommendedAssessments`: subset where event aligns to member event enrollments
- `recentAttempts`: recent submitted/scored attempts

Use this as the main member dashboard payload.

### 3. `GET /api/member/practice/[assessmentId]`

Returns member-safe assessment detail:
- metadata (`title`, `format`, `instructions`, `timeLimitMinutes`, `event`)
- packet assets (`sourcePdfUrl`, `answerKeyPdfUrl`, plus full asset list)
- parts/stations
- prompt definitions for answer sheet rendering
- member attempt summaries
- `currentAttemptId` for resume CTA

### 4. `POST /api/member/practice/[assessmentId]`

Starts or resumes attempt.
Request body:
- `{ "forceNew": true }` optional

Response:
- `id` (attempt id)
- `resumed` boolean
- `attempt` (full attempt detail payload)

Behavior:
- default resumes latest open `IN_PROGRESS` attempt
- `forceNew: true` always creates a new in-progress attempt

### 5. `GET /api/member/practice/attempts/[attemptId]`

Returns attempt workspace payload:
- attempt status/score/progress
- `canEdit`
- assessment metadata
- prompt list with current `responseText` and scoring fields when available

### 6. `PATCH /api/member/practice/attempts/[attemptId]`

Autosave partial responses.
Request body:
```json
{
  "responses": [
    { "promptId": "cuid...", "responseText": "A" },
    { "promptNumber": 2, "responseText": "C2H6" }
  ]
}
```

Either `promptId` or `promptNumber` is accepted per row.
Returns updated attempt detail.

### 7. `POST /api/member/practice/attempts/[attemptId]`

Submit attempt.
Request body options:
- `{}` to submit autosaved responses
- `{ "answers": ["A", "B", "C"] }` to submit explicit sequence

Returns final attempt detail.

### 8. Legacy action route (still supported)

`POST /api/member/practice` supports:
- `action: "start"`
- `action: "save"`
- `action: "submit"`

This is kept for compatibility, but frontend should prefer the explicit routes above.

### 9. `GET /api/member/hub`

Returns a single member-home payload combining:
- `member`, `season`
- `tasks` (suggestions, pending required forms, open invoices)
- `practice` feed + stats
- `hours` summary + category targets + recent entries
- `forms` completion summary + recent submissions
- `finances` outstanding totals
- `events` (enrollments, upcoming club events, season roster memberships)
- `competition` (all scoped assignment details + upcoming assignments)
- `announcements` (scope-aware active announcements)
- `resources` (scope-aware resources)
- `meta.generatedAt`

Scope rules for announcements/resources:
- always includes global items (no event/roster/competition target)
- includes targeted items only when member belongs to matching event/roster/competition scope
- expired announcements are excluded

This is the preferred top-level payload for the member dashboard.

## Rate Limits

Frontend should handle `429` with user feedback and retry backoff.

- `POST /api/member/practice/[assessmentId]` start/resume: `30 / 60s` per user
- `POST /api/member/practice` action start: `30 / 60s` per user
- `PATCH /api/member/practice/attempts/[attemptId]` autosave: `120 / 60s` per user+attempt
- `POST /api/member/practice` action save: `120 / 60s` per user+attempt
- `POST /api/member/practice/attempts/[attemptId]` submit: `10 / 300s` per user+attempt
- `POST /api/member/practice` action submit: `10 / 300s` per user+attempt
- `GET /api/member/hub`: `90 / 60s` per user
- `POST /api/auth/login`: IP and account keyed limits
- `POST /api/auth/register`: IP keyed limit
- `POST /api/public/apply`: club/IP and email keyed limits

For autosave UX:
- debounce saves to at least 400–800ms
- avoid background save loops faster than 1 request/second
- on 429, pause autosave timer and retry after a short cooldown

## Frontend Implementation Notes

### Member Dashboard

- Drive the page from `GET /api/member/practice/feed`.
- Render sections:
  - Continue Practice (`continueAttempts`)
  - Recommended for Your Events (`recommendedAssessments`)
  - All Assessments (`assessments`)
  - Recent Results (`recentAttempts`)

### Assessment View

- Use `GET /api/member/practice/[assessmentId]`.
- Show packet button, instructions, parts/stations, attempt history.
- CTA logic:
  - if `currentAttemptId` exists => “Resume Attempt”
  - else => “Start Attempt”

### Attempt Workspace

- Load `GET /api/member/practice/attempts/[attemptId]`.
- Bind responses to prompt list by `promptId`.
- Autosave on debounce or explicit save button via PATCH.
- Final submit via POST.

### Error Handling

Expected user-facing errors:
- `403` not member this season
- `404` assessment/attempt not found
- `400` attempt not editable
- `400` already submitted

## Recommended Frontend Sequence

1. Build member dashboard around `/api/member/hub`.
2. Use `practice` section from hub for home cards; use `/api/member/practice/feed` for dedicated practice pages when needed.
3. Build assessment detail page (`/api/member/practice/[assessmentId]`).
4. Build attempt workspace with PATCH autosave + POST submit + 429 backoff handling.
5. Replace old member flow that only opens packet URLs.
