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
