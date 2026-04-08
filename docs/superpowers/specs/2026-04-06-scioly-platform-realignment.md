# SciOly Platform Realignment Spec
**Date:** 2026-04-06  
**Status:** Proposed  
**Supersedes:** `2026-03-29-scioly-platform-design.md`

## Why This Exists

The current app is already materially beyond the original phase documents, but the schema and plans still flatten several different SciOly concepts into the same records. The biggest problem is that `MemberSeason` currently acts as:

- the seasonal membership record
- the application record
- the role-assignment anchor
- the hour ledger owner
- the form ledger owner
- the finance ledger owner
- the practice-attempt owner

That works for a quick build, but it makes the platform harder to generalize across schools and harder to extend for real Science Olympiad workflows like stations, multi-roster competitions, contribution-style hour logs, and school email alias handling.

## Codebase Audit Summary

### Strong Parts

- The app shell is coherent and already reusable.
- Auth is simple and understandable.
- Permissions are centralized in `lib/permissions.ts`.
- Dashboard pages consistently use server components and shared layout primitives.
- The current design language is clear and should be preserved.

### Weak Parts

- School identity is modeled as a single `Club.schoolDomain`, but real schools often need multiple valid domains or aliases.
- Applications are not first-class data; they are embedded into `MemberSeason`.
- Practice tests assume one PDF plus one flat answer key, which is too weak for stations and hybrid packets.
- Team semantics are overloaded: seasonal rosters, competition rosters, and event teams are not clearly separated.
- Hour categories assume pure time logging, but real club contributions can be hours, items, sessions, or converted credit.

### Important Existing UI Constraints

These were observed in the current app and should remain the visual baseline:

- Keep the dashboard shell, spacing rhythm, and typography hierarchy already used in `app/dashboard/layout.tsx`, `components/app-sidebar.tsx`, and `components/ui/page-header.tsx`.
- Continue using shared cards, tables, and muted explanatory copy rather than inventing a new visual system.
- Preserve the current layout density: `py-4`, `md:py-6`, `sm:px-4`, `lg:px-6`, semibold headers, compact tables.

## Source Artifact Gap

The requested `scioly-drive` folder was not present under `/Users/musung/Desktop/scioly` or elsewhere under `/Users/musung/Desktop` during this audit. This realignment is therefore grounded in:

- the existing codebase
- the current docs under `docs/superpowers`
- the club workflow described in the task prompt

Before building PDF ingestion or school-specific workflows further, the actual spreadsheets, PDFs, and forms should be added to the workspace.

## Revised Domain Model

### 1. Club Identity

Keep `Club.schoolDomain` as the primary display domain for transition purposes, but introduce `ClubEmailDomain` as the real allow-list.

This supports:

- schools with multiple valid student domains
- future advisor/staff exceptions
- cleaner login and application validation logic

### 2. Membership and Applications

`MemberSeason` remains the canonical seasonal membership record.

Applications move into a separate `MembershipApplication` model.

This allows:

- one application per user per season
- explicit submitted / approved / denied state
- reviewer attribution and decision reasons
- eventual support for draft applications, resubmissions, and richer application UIs

For transition, the legacy essay fields remain on `MemberSeason` until the member-facing UI is migrated off them.

### 3. Canonical SciOly Events

Add `EventDefinition` as the reusable definition of an official Science Olympiad event. `Event` remains season-scoped but can now point to a canonical definition.

This supports:

- ruleset-year-aware event templates
- division-specific defaults
- cleaner season setup
- future cross-school analytics

### 4. Competition Structure

A real competition needs more than `Competition` + `EventSchedule`.

Add:

- `CompetitionEventSlot` for station/test blocks, rooms, and time windows
- `CompetitionRoster` for competition-level squads
- `CompetitionRosterMember` for assigning members to those rosters
- `CompetitionEntry` for the actual event participation record

This resolves the current ambiguity between:

- a season roster
- a competition roster
- an event team
- a scheduled entry at a specific tournament slot

### 5. Practice Tests

Do not make parsed questions the foundation of the practice system.

The foundation should be:

- `PracticeTest` as the practice container
- `PracticeMaterial` for packet PDFs, images, rubrics, answer sheets, station materials
- `PracticeSection` for page ranges, sections, stations, and timing metadata
- `AnswerKey` for structured scoring metadata
- `PracticeAttempt` for stored responses and score breakdown

This is the pragmatic path for PDF-heavy clubs:

- keep the source PDF intact
- optionally annotate sections/stations
- avoid requiring full manual question entry
- allow future parser-assisted enrichment without making parsing mandatory

### 6. Hours and Contributions

Hours need to support contribution categories that are not purely raw time.

Add to `HourCategory`:

- `creditUnit`
- `evidenceRequirement`
- `defaultCreditValue`
- `maxEntryValue`
- `unitLabel`

Add to `HourEntry`:

- `quantity`
- `proofText`
- `metadata`

This supports examples like:

- robotics lab walk-ins with proof
- testers with notes-history proof
- builders with estimated work totals
- volunteering/tutoring sessions
- snack donations converted into hour credit

## Ontology Decisions Implemented In Code

The Prisma schema now introduces:

- `ClubEmailDomain`
- `MembershipApplication`
- `EventDefinition`
- `CompetitionEventSlot`
- `CompetitionRoster`
- `CompetitionRosterMember`
- `CompetitionEntry`
- `PracticeSection`
- `PracticeMaterial`

It also enriches:

- `HourCategory`
- `HourEntry`
- `PracticeTest`
- `AnswerKey`
- `PracticeAttempt`
- `Team`
- `Competition`
- `Event`

## Transitional Strategy

This realignment is intentionally transitional rather than destructive.

- Existing models used heavily by the UI were preserved.
- New models were added around them.
- `MemberSeason` retains legacy application fields until the UI is migrated.
- `schoolDomain` remains available while auth begins using the new allow-list model.

That keeps the current app operable while creating a credible long-term ontology.

## What Should Happen Next

### Backend

- migrate applicant review and member detail pages to read `MembershipApplication`
- build admin UI for additional allowed email domains
- shift competition pages from implicit team semantics to roster + entry semantics
- expand practice APIs to use `PracticeSection` and `PracticeMaterial`

### Frontend

- keep the existing layout, typography, and spacing system
- surface new structures through current cards/tables rather than redesigning the dashboard
- add stations-aware practice and competition UIs as extensions of the current admin/member pages

### Data Ingestion

- ingest the missing club spreadsheets and PDFs
- map real hour categories, dues sheets, and test packet conventions into seed fixtures or import utilities
- only then decide whether an AI parser is worth adding beyond metadata extraction
