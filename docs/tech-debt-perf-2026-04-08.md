# Tech Debt & Performance Cleanup — 2026-04-08

## Performance Fixes

### 1. Dashboard streaming skeleton (`app/dashboard/loading.tsx`) — NEW FILE
Added a `loading.tsx` at the dashboard layout level. Next.js automatically shows this skeleton while any dashboard page's data fetches, so users see the UI shell immediately instead of a blank screen. Estimated impact: **eliminates blank-screen wait entirely** (perceived load → near-instant).

### 2. Parallelized queries in `lib/practice-assessments.ts:listPracticeAssessmentsForMember`
`eventEnrollment.findMany` and `assessment.findMany` were running sequentially. Both are now dispatched in `Promise.all` since they are independent. Estimated impact: **~100–200ms savings** on the practice page.

### 3. Added `take: 20` limit on attempts in `buildPracticeAssessmentInclude`
Previously loaded **all** attempts per assessment with no limit. Capped at 20 most recent. Prevents unbounded query growth as clubs accumulate attempt history.

### 4. Removed redundant `force-dynamic` from 15 dashboard pages
All dashboard pages read cookies via `getCurrentUser()`, which already opts them into dynamic rendering in Next.js 15. The explicit `export const dynamic = "force-dynamic"` was dead weight. Removed from all 15 dashboard page files.

---

## Tech Debt Removed

### Deleted files (confirmed zero importers)
| File | Reason |
|------|--------|
| `lib/club-events.ts` | 11 exports (schemas, types, constants) — zero importers; pages use local types |
| `components/ui/right-detail-drawer.tsx` | `RightDetailDrawer` never imported anywhere |
| `components/ui/settings-panel.tsx` | `SettingRow`, `SettingsPanel` never imported anywhere |

### Removed dead exports (files kept)
| File | Removed | Reason |
|------|---------|--------|
| `lib/cookies.ts` | `clearSessionCookie()` | Never called anywhere in the codebase |
| `lib/format.ts` | `extractUploadedFileName()` | Never called anywhere in the codebase |

---

## Verification
- `npx tsc --noEmit` — zero errors
- No remaining `force-dynamic` in `app/dashboard/`
- No remaining imports from `lib/club-events`
