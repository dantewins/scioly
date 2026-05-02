# Audit Loop — Design Spec

**Date:** 2026-05-02
**Status:** Approved, ready for implementation plan

## Goal

Build a reusable feedback loop that audits the Scioly platform for performance regressions and functional/UX gaps, with both a one-off in-session full cycle and a daily scheduled run. Performance is the headline priority — slow routes are the explicit complaint. Functional gaps and UX issues are secondary but in scope.

## Operating model

Hybrid: synthetic sub-agents do the breadth pass (every dashboard route, every persona, multi-step flows). The human (Danny) does the judgment pass (which findings actually matter, which features to build).

## Scope

**In scope (Standard config):**
- 2 personas: WEBSITE_OWNER, MEMBER (both already in seed)
- All dashboard pages including detail pages (`/dashboard/competitions/[id]` etc.)
- 3 multi-step flows (one continuous user journey each, not separate trips):
  - **Flow 1 (Owner):** create a new competition → assign members to events → publish
  - **Flow 2 (Owner):** open hour submissions queue → approve some, reject some, leave some pending
  - **Flow 3 (Member):** log in → submit a new hour entry → view assigned competitions → attempt one practice assessment end-to-end
- ~25 routes total in the route matrix

**Out of scope:**
- BOARD_MEMBER, public-unauthenticated, admin-only routes (deferred to Comprehensive scope, available via `--scope=comprehensive` flag later)
- Browser-driven perf measurement (Playwright)
- Production data dump
- GitHub Action variant of the schedule

## Architecture

```
┌───────────────────── audit-loop session ──────────────────────┐
│  1. Setup       ── npm run seed:large; next dev (background) │
│  2. Measure     ── scripts/measure-routes.ts                  │
│                    → docs/audit/perf-<date>.json              │
│  3. Investigate ── 2 sub-agents in parallel (owner, member)   │
│                    → finding fragments                         │
│  4. Aggregate   ── docs/audit/<date>.md                        │
│  5. Triage      ── human marks fix / skip / later             │
│  6. Implement   ── parallel fix agents for perf;              │
│                    sequential for features                     │
│  7. Verify      ── re-measure; append before/after table      │
└────────────────────────────────────────────────────────────────┘
```

Three artifacts:
1. `scripts/measure-routes.ts` + `scripts/lib/route-config.ts` (perf measurement, Claude-independent)
2. `.claude/commands/audit-loop.md` (orchestration playbook for the slash command)
3. `prisma/seed-large.ts` (extended fixtures for realistic perf signal)

Plus one infrastructure step:
4. Daily scheduled routine via the `/schedule` skill that fires `/audit-loop --no-fix`

## Component 1 — `scripts/measure-routes.ts`

**Behavior:**
1. Reads `scripts/lib/route-config.ts` (route + role matrix)
2. Logs in once per role via `POST /api/auth/login` with seed credentials, captures session cookie
3. Resolves dynamic IDs (e.g., `{firstId}` for `/dashboard/competitions/[id]`) via a bootstrap query at script start
4. For each (route, role) pair: 3 sequential GET requests (warm cache), records median of last 2 — captures `Server-Timing` header, total response time, response size, status code
5. Writes `docs/audit/perf-YYYY-MM-DD-HHmm.json`
6. If a previous `perf-*.json` exists, prints diff table to stdout
7. Exits 0; never modifies the DB

**Output schema:**
```ts
{
  ranAt: ISO8601,
  seedSize: "small" | "large",
  results: [
    {
      route: "/dashboard/competitions",
      role: "WEBSITE_OWNER",
      status: 200,
      totalMs: 847,
      serverTimingMs: 612,
      bytes: 124_443,
      runs: [820, 847, 851]
    }
  ]
}
```

**Failure modes:**
- Dev server not running on `:3000` → exit 1 with "start `next dev` first"
- Login fails → exit 1 with response body
- Any route 5xx → record with status, mark in output, continue
- DB empty → exit 1 with "run `npm run seed:large` first"

**Invocation:** `npx tsx scripts/measure-routes.ts`. Caller is responsible for ensuring `next dev` is running.

## Component 2 — `.claude/commands/audit-loop.md`

Slash command body. When the user types `/audit-loop`, the file's content becomes Claude's instructions for that turn.

**Flags:**
- `/audit-loop` — full cycle (default)
- `/audit-loop --measure-only` — runs perf script, prints diff, no agents
- `/audit-loop --no-fix` — full audit + report, stops before implement (used by daily schedule)
- `/audit-loop --reseed` — re-runs `npm run seed:large` before measuring (truncates + repopulates)
- `/audit-loop --scope=comprehensive` — expands route matrix and personas (future; not implemented in MVP)

**Body steps:**
1. **Preflight:** `git status` — bail if dirty. Confirm seed marker exists or honor `--reseed`.
2. **Boot dev server** in background. Wait for `:3000`.
3. **Run perf script** `npx tsx scripts/measure-routes.ts`. Read JSON into context.
4. **Spawn 2 persona sub-agents in parallel** (single message, two `Agent` calls). Each gets:
   - Role + seed credentials
   - 3 flows assigned to them
   - Instructions: walk flows end-to-end, read code where it matters, report (a) broken, (b) missing, (c) slow even after perf script, (d) UX-rough
   - Output format: markdown fragment, ~600 words max, sections: Broken / Missing / Slow / UX-rough
5. **Aggregate** perf JSON + 2 finding fragments into `docs/audit/<date>.md`:
   - Header table of top 10 slowest routes (with vs-prev delta)
   - Findings grouped by P1 Broken / P2 Slow (with empirical backing) / P3 Missing / P4 UX
   - Each finding has a stable ID (`f1`, `f2`, ...) for triage references
   - Triage section at bottom with checkboxes
6. **Dedup against history:** read last 3 days of `docs/audit/*.md`, mark recurring findings as "still present (n days)" and surface only NEW or REGRESSED items in the headline.
7. **If `--no-fix`:** stop here, post a digest summary, end.
8. **Otherwise — wait for triage:** post digest in chat. Accept input like `fix f1, f4, f7-f9; skip f2; later f10-f12` or `auto-perf`.
9. **Implement fix-now items:**
   - Perf items (mechanical: Promise.all, take limits, indexes, removing waterfalls): dispatch parallel fix sub-agents, one per fix
   - Feature/UX items: sequential, in main agent
   - All fixes must pass `npx tsc --noEmit`
10. **Re-run perf script.** Append "before/after" table to `docs/audit/<date>.md`.
11. **Stop dev server.** `git status`. Suggest follow-ups if backlog remains.

## Component 3 — `prisma/seed-large.ts`

Separate file (small seed stays simple). New `npm run seed:large` script in `package.json`.

**Volumes:**
| Entity | Count |
|---|---|
| Club | 1 (MAST) |
| ClubEmailDomain | 1 |
| Season | 2 (current + prior) |
| Events | 23 |
| Users | 50 (1 owner, 1 board, 48 members) |
| MemberSeason | 50 current + 30 prior |
| ClubRole | 3 |
| MemberRole assignments | 50 |
| Competitions | 5 (3 past, 1 ongoing, 1 upcoming) |
| CompetitionRoster + EventAssignments | full sweep across 5 |
| HourCategory | 4 |
| HourEntry | 200 (mixed status) |
| Assessment + Part + Prompt | 10 × 3 × 5 = 150 prompts |
| AssessmentAttempt + Response | 30 × ~15 = 450 rows |
| FormDefinition + FormResponse | 3 × 30 |
| Application | 15 (some pending) |
| Finance entries | 40 |

**Behavior:**
- Truncates existing club data first (same `deleteMany` pattern as small seed) — re-runnable, deterministic
- Same primary credentials: `owner@mast.edu`, `member@mast.edu`, password `password123`
- Adds `board@mast.edu` for future Comprehensive scope
- **Safety:** aborts if `DATABASE_URL` looks like prod (heuristic: hostname matches a prod-suspect pattern like `vercel.app`/`neon.tech`/`supabase` AND lacks a `dev`/`local`/`staging` substring) unless `--force` is passed. `--force` overrides the safety check and is intended only for explicit local-prod-mirror situations.

## Daily scheduled routine

After Stage B verifies the artifacts work, set up via `/schedule`:

- Cron: daily; specific time configured at `/schedule` setup (default proposal: 08:00 local)
- Command: `/audit-loop --no-fix`
- Output: writes findings to `docs/audit/<date>.md`, commits and pushes to `audit/<date>` branch, opens a PR titled "Audit YYYY-MM-DD" with the digest
- Dedup logic in step 6 of the command body keeps daily noise low — only NEW or REGRESSED findings are headlined

If daily proves too costly or noisy after a week, drop to weekly by editing the cron — no other changes needed.

## Findings document format

Path: `docs/audit/YYYY-MM-DD.md` (the orchestration output).
Path: `docs/audit/perf-YYYY-MM-DD-HHmm.json` (raw perf data, kept indefinitely for diffing).

```markdown
# Audit – 2026-05-02

## Performance (top 10 slowest)
| Route | Role | Median ms | vs prev | Notes |
|---|---|---|---|---|
| /dashboard/competitions/[id] | OWNER | 1840 | +200 | possible N+1 in roster fetch |

## Findings (15)

### P1 — Broken
- [ ] (f1) <description> — <flagging agent>

### P2 — Slow (with empirical backing)
- [ ] (f4) /dashboard/competitions/[id] took 1840ms — <hypothesis>

### P3 — Missing functionality
- [ ] (f7) ...

### P4 — UX-rough
- [ ] (f12) ...

## Triage
For each finding: fix-now / fix-later / skip / wontfix

## Before / After (filled after fix pass)
| Finding | Route | Before | After | Delta |
```

## In-session execution plan

**Stage A — Build artifacts (no app behavior changes)**
1. Write `prisma/seed-large.ts`
2. Add `seed:large` script to `package.json`
3. Run it once locally — confirm it populates without errors
4. Write `scripts/lib/route-config.ts` (~25 entries)
5. Write `scripts/measure-routes.ts`
6. Run it once — confirm valid output shape, sane diff
7. Write `.claude/commands/audit-loop.md`
8. `npx tsc --noEmit` — zero source-file errors
9. Commit: `audit: add /audit-loop command and perf measurement script`

**Checkpoint:** show perf JSON to user for gut-check on route list / output shape.

**Stage B — Run the loop end-to-end**
10. Invoke `/audit-loop`
11. Persona agents run, findings aggregate to `docs/audit/<today>.md`
12. **User triages** findings
13. Implement fix-now items (perf parallel, features sequential)
14. Re-measure, append before/after table
15. `npx tsc --noEmit` — zero errors
16. Commit fixes (one commit per finding-cluster, messages reference finding IDs)

**Checkpoint:** show diffs before commit, user approves.

**Stage C — Daily schedule**
17. Use `/schedule` to create daily routine running `/audit-loop --no-fix`
18. First fire confirms it works

## Stop conditions / abort points

- `npm run seed:large` fails → abort Stage A, fix seed first
- Perf script can't log in → abort, fix auth flow first
- `npx tsc --noEmit` shows new errors after a fix → revert that fix, re-triage
- `git status` dirty at preflight → bail with message; don't mix audit fixes with unrelated work

## Non-goals

- Not building a CI-integrated perf budget (no failing builds on regressions in MVP)
- Not building a dashboard / UI for findings — markdown + JSON only
- Not measuring client-side metrics (LCP, CLS, etc.) — server-side timings only
- Not adding indexes proactively without empirical evidence — wait for the perf script to flag them
- Not refactoring code that the audit reveals as "ugly but fast enough"

## Open questions

None — all decisions locked during brainstorming.
