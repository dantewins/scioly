# Audit Loop — Design Spec

**Date:** 2026-05-02
**Status:** Approved, ready for implementation plan

## Goal

Build a reusable feedback loop that audits the Scioly platform across two co-equal primary tracks:

- **Track A — Engineering health:** performance regressions, slow routes, dead code, refactor opportunities
- **Track B — Product:** missing functionality, UX rough edges, UI improvements

Both tracks get equal weight at every stage: agents look for findings in both, the digest gives them equal billing, and the user triages them as one combined list. The loop runs both as a one-off in-session full cycle and as a daily scheduled run.

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
│  6. Implement   ── parallel agents for mechanical fixes       │
│                    (perf, dead-code); sequential for          │
│                    judgment-required changes (features, UI)   │
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
   - Instructions: walk flows end-to-end and read code where it matters. Track A (engineering): report (a) broken, (b) slow even after perf script, (c) dead code or unused exports/components/files spotted while reading, (d) refactor opportunities (e.g., file >500 lines doing too many things). Track B (product): report (e) missing functionality the persona would expect, (f) UX rough edges (confusing copy, missing feedback, bad empty states), (g) UI improvements (visual inconsistencies, layout issues, polish gaps).
   - Output format: markdown fragment, ~700 words max, sections in order: Broken / Slow / Dead-code / Refactor / Missing / UX / UI. Each section may be empty — that's fine.
5. **Aggregate** perf JSON + 2 finding fragments into `docs/audit/<date>.md`:
   - Header table of top 10 slowest routes (with vs-prev delta)
   - Findings sectioned by category, with both tracks given equal billing:
     - **P1 — Broken** (always at top; broken is broken)
     - **Track A categories:** Slow (with empirical backing) / Dead code / Refactor
     - **Track B categories:** Missing functionality / UX rough / UI improvement
   - Each finding has a stable ID (`f1`, `f2`, ...) for triage references
   - Track A and Track B sections appear side by side in the digest, not one prioritized over the other
   - Triage section at bottom with checkboxes
6. **Dedup against history:** read last 3 days of `docs/audit/*.md`, mark recurring findings as "still present (n days)" and surface only NEW or REGRESSED items in the headline.
7. **If `--no-fix`:** stop here, post a digest summary, end.
8. **Otherwise — wait for triage:** post digest in chat with both tracks visible. Accept input like `fix f1, f4, f7-f9; skip f2; later f10-f12`, or shortcuts: `auto-mechanical` (fix all P1 + Slow + Dead-code + Refactor without asking each), `auto-track-a` (engineering only), `auto-track-b` (product only).
9. **Implement fix-now items:**
   - **Mechanical fixes** (perf optimizations like `Promise.all` / `take` limits / index hints / waterfall removal; dead-code removal where the import graph confirms zero usage; small refactors like splitting a too-large file): dispatch parallel fix sub-agents, one per fix. Each agent verifies with `npx tsc --noEmit` and a re-measure of any affected route.
   - **Judgment fixes** (new features, UX changes that involve copy/flow rewrites, UI changes that need design choices): sequential in main agent — these need user feedback as work progresses, can't parallelize.
   - All fixes must pass `npx tsc --noEmit` before commit.
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

### P1 — Broken (4)
- [ ] (f1) <description> — <flagging agent>

---

### Track A — Engineering health

#### Slow (with empirical backing) (3)
- [ ] (f5) /dashboard/competitions/[id] took 1840ms — <hypothesis>

#### Dead code (2)
- [ ] (f8) `lib/old-helper.ts` has zero importers — safe to delete

#### Refactor (1)
- [ ] (f10) `app/dashboard/competitions/[id]/page.tsx` is 720 lines, mixes data-loading + 3 unrelated UI sections — propose splitting

---

### Track B — Product

#### Missing functionality (2)
- [ ] (f11) Owner can't bulk-approve hour entries — currently must click each one

#### UX rough (2)
- [ ] (f13) Practice attempt has no autosave; refreshing loses progress

#### UI improvement (1)
- [ ] (f15) Members table column widths feel cramped on 1280px screens

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
11. Persona agents run, findings aggregate to `docs/audit/<today>.md` with both tracks
12. **User triages** findings — Track A and Track B presented side by side, no implicit ordering
13. Implement fix-now items (mechanical fixes parallel, judgment fixes sequential)
14. Re-measure, append before/after table for any perf-affecting fix
15. `npx tsc --noEmit` — zero errors
16. Commit fixes (one commit per finding-cluster, messages reference finding IDs and tag track: `audit(track-a): ...` or `audit(track-b): ...`)

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
- Not doing stylistic refactors of working code (e.g., renaming variables, reformatting). Dead-code removal and structural refactors (splitting files that mix unrelated concerns) ARE in scope; cosmetic-only changes are not.
- Not redesigning major UI flows from scratch — UI findings should be incremental polish, not "rebuild this page". Big redesigns belong in their own brainstorming session.

## Open questions

None — all decisions locked during brainstorming.
