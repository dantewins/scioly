# Platform Realignment Implementation Plan
**Date:** 2026-04-06  
**Status:** Active  
**Depends on:** `docs/superpowers/specs/2026-04-06-scioly-platform-realignment.md`

## Goal

Realign the app around a cleaner Science Olympiad ontology without breaking the current dashboard shell or throwing away already-working admin/member flows.

## Delivery Tracks

The work should proceed in three coordinated tracks.

### Track 1: Backend / Ontology

Owns:

- `prisma/schema.prisma`
- auth and application routes
- shared helpers under `lib/`
- migration and seed work

Responsibilities:

- move school identity from a single-domain assumption to an allow-list model
- split seasonal membership from application state
- add competition roster/slot/entry primitives
- add stations-aware practice structures
- extend hour categories for non-time contributions

### Track 2: Frontend Alignment

Owns:

- dashboard pages that surface the new data structures
- settings UI for email domains
- application/member pages
- competition and practice pages

Responsibilities:

- preserve the current dashboard visual language
- avoid a visual redesign during ontology migration
- expose new structures using current cards, tables, dialogs, and page headers

### Track 3: Merge / Integration

Owns:

- migration sequencing
- compile/test passes
- dual-write and compatibility cleanup
- doc drift prevention

Responsibilities:

- ensure old UI paths still work during migration
- keep schema changes additive until each view is migrated
- remove transitional duplication only after all affected routes/pages are switched

## Phase Order

## Phase 0: Missing Inputs

Required before serious PDF/import work:

- add the missing `scioly-drive` folder to the workspace
- identify real hour-sheet columns and finance-sheet conventions
- inventory actual packet types: straight tests, stations, image sheets, answer sheets, rubrics

Deliverable:

- a concrete artifact map for import work

## Phase 1: Identity and Application Foundation

Files:

- `prisma/schema.prisma`
- `prisma/seed.ts`
- `lib/email-domains.ts`
- `lib/db.ts`
- `lib/auth.ts`
- `app/api/auth/login/route.ts`
- `app/api/auth/register/route.ts`
- `app/api/public/apply/route.ts`
- `app/api/admin/applicants/route.ts`
- `app/api/admin/settings/route.ts`

Tasks:

1. Add `ClubEmailDomain`.
2. Add `MembershipApplication`.
3. Make register/settings maintain a primary allowed domain record.
4. Make login/apply validate against the allow-list, not only `schoolDomain`.
5. Make applications dual-write to `MemberSeason` and `MembershipApplication`.
6. Make applicant approval/denial update the application record.

Exit criteria:

- current auth still works
- public apply still works
- applicant review still works
- the schema now reflects school identity and applications cleanly

## Phase 2: Competition Ontology

Files:

- `prisma/schema.prisma`
- `app/dashboard/competitions/*`
- `app/dashboard/teams/*`
- `app/api/admin/competitions/*`
- `app/api/admin/teams/*`

Tasks:

1. Add `EventDefinition`.
2. Add `CompetitionEventSlot`.
3. Add `CompetitionRoster`, `CompetitionRosterMember`, and `CompetitionEntry`.
4. Keep existing `Team` pages alive while incrementally shifting semantics:
   `Team` becomes the event-team layer, not the whole competition model.
5. Add UI for slot assignment and roster assignment using current table/card patterns.

Exit criteria:

- a competition can define slots/rooms/stations
- a roster can exist independently of a single event-team record
- event participation is represented explicitly

## Phase 3: Practice System Realignment

Files:

- `prisma/schema.prisma`
- `app/dashboard/practice/*`
- `app/api/admin/practice/*`
- `app/api/member/practice/route.ts`

Tasks:

1. Use `PracticeMaterial` for packet attachments, image sheets, and answer documents.
2. Use `PracticeSection` for straight tests, station blocks, and hybrids.
3. Extend answer keys with rubric metadata and attempt score breakdown.
4. Keep the existing split-view PDF approach as the default UI.
5. Do not require parsed questions for launch readiness.

Exit criteria:

- the system supports PDF-first practice flows
- stations can be modeled without manual question entry
- the parser can remain optional

## Phase 4: Hour and Contribution Credit

Files:

- `app/dashboard/hours/*`
- `app/api/admin/hour-categories/*`
- `app/api/admin/hours/route.ts`
- `app/api/member/hours/route.ts`

Tasks:

1. Expose `creditUnit`, `evidenceRequirement`, and `defaultCreditValue`.
2. Let categories represent donations, sessions, and converted credit.
3. Preserve `totalHours` as the approved credit number while storing raw quantity separately.
4. Add category presets matching the states hour-log examples.

Exit criteria:

- non-time contributions are modeled cleanly
- hour categories map to real club policy instead of generic time tracking

## Phase 5: Cleanup

Tasks:

1. Move applicant/member pages fully onto `MembershipApplication`.
2. Remove duplicated application data from `MemberSeason` after migration.
3. Update seed/import utilities to use canonical event definitions and new practice structures.
4. Regenerate docs if any file ownership or routing assumptions changed.

Exit criteria:

- the transitional fields are no longer needed
- docs and code match again

## Guardrails

- Do not redesign the dashboard while migrating ontology.
- Prefer additive migrations until the last dependent UI path has been switched.
- Avoid renaming or removing heavily used models until replacements are wired through pages and APIs.
- Keep server-component page structure and current spacing/typography conventions intact.

## Immediate Next Steps

1. Validate the new Prisma schema and regenerate the client.
2. Add a migration once a live `DATABASE_URL` is available.
3. Surface the new allow-list and application data in settings/applicant UIs.
4. Wait on packet-import automation until the missing `scioly-drive` artifacts are added.
