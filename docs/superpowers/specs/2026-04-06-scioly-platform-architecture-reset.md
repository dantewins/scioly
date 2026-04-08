# SciOly Platform Architecture Reset
**Date:** 2026-04-06
**Status:** Recommended baseline for ongoing work

## Why this reset exists

The March 29 design spec established the right product direction, but the implementation and the ontology drifted in three places that will keep causing churn if left alone:

- applicants are still being modeled too early as dashboard users
- season teams, competition rosters, and event pairings are collapsed into one loose `Team` model
- practice is still framed as `PDF + ordered answers`, which does not cover stations or PDF-first workflows

This reset keeps the current stack and current UI shell, but corrects the domain model underneath it.

## Audit findings

- The repo already has a stable frontend shell. New work should preserve the current dashboard spacing, typography, table density, and shadcn-based interaction patterns.
- The repo already has permission-gated server pages and client-side manager components. The architecture is sound; the schema was the unstable part.
- The March spec overstated the tenancy rule as "every model is scoped by clubId". In practice, many models are season-scoped and tenant isolation is enforced through relations.
- The referenced `scioly-drive` folder is not present anywhere under `/Users/musung/Desktop`, so this reset is based on the codebase plus the user requirements in chat, not on the external spreadsheets/PDF corpus.

## Revised domain model

### Tenant and identity

- `Club` remains the tenant boundary.
- `ClubEmailDomain` is now first-class so a club can support multiple school domains instead of one nullable string.
- `Club.joinPolicy` captures whether a club is domain-gated, open, or invite-based.
- `User` now distinguishes system role from account type. This is necessary if the platform later supports coaches, alumni, or advisors who should not be blocked by a student-only email rule.

### Admissions and membership

- `MembershipApplication` is the system of record for admissions.
- `MemberSeason` remains the season membership record.
- During transition, the existing applicant flow can still create `User` + `MemberSeason`, but the authoritative review metadata belongs on `MembershipApplication`.
- `ApplicationEventChoice` stores ranked event preferences independently of later event assignments.

### Science Olympiad operations

- `Event` stays season-scoped.
- `SeasonRoster` represents a real club roster for the season, such as Varsity, JV, or an internal training roster.
- `CompetitionRoster` represents the roster actually sent to a competition.
- `CompetitionEventAssignment` represents one competition roster's assignment to one event.
- `CompetitionAssignmentParticipant` represents the students competing in that event assignment.
- The old `Team` model is retained as a legacy bridge for the current UI and should not be expanded further.

### Hours and requirement campaigns

- `HourProgram` is the missing layer above `HourCategory`.
- Use `HourProgram` for campaign-like systems such as "States Hours", "Summer Work", or "Robotics Walk-In".
- Use `HourCategory` for the category within that program, such as Robotics Studying, Testers, Builders, Volunteering, or Donations.
- `HourEntry` remains the submission record, but now supports richer evidence policy and future asset-backed proof.

### Finance

- `DuesInvoice` and `PaymentRecord` still cover dues.
- `FinanceAccount` and `FinanceEntry` are the club-level ledger primitives needed for budgets, donations, snacks, reimbursements, travel costs, and fundraiser flows.
- If the product scope ever narrows back to dues-only, these models can remain dormant without harming the app.

### Assessments and practice

- `Assessment` is the new top-level practice/assessment object.
- `AssessmentAsset` stores PDFs and supporting files without requiring question parsing.
- `AssessmentPart` supports sections and stations.
- `AssessmentPrompt` stores numbered answer slots, not necessarily question text.
- `AssessmentAttempt` and `AssessmentResponse` support mixed auto/manual scoring and future review workflows.
- `PracticeTest` is retained only as a legacy bridge for the current practice UI.

This is the key product decision: the MVP should be PDF-first, not parser-first. The platform should let admins upload the source PDF, define sections/stations, define response slots, and optionally define answer keys. Parsing question text is an enhancement, not a dependency.

### Assets

- `Asset` is the shared file abstraction for practice PDFs, form uploads, proofs, and receipts.
- Existing URL fields remain during migration so current screens do not break.

## Product decisions locked by this reset

- Default views remain active-season-first, but the data model must preserve season history cleanly.
- Student access is domain-allowlisted, not single-domain-only.
- Coaches and other non-student roles are a supported future case, even if the current UI does not expose them yet.
- Station-based assessments are a first-class requirement.
- The platform should optimize for "we already have the PDF" workflows before trying to solve PDF parsing.

## Transition strategy

- Keep `Team` and `PracticeTest` alive while the UI is still bound to them.
- Build all new competition planning on `SeasonRoster`, `CompetitionRoster`, and `CompetitionEventAssignment`.
- Build all new practice work on `Assessment*`.
- Sync admissions state between the current applicant flow and `MembershipApplication` until the public apply/admin review UI is fully migrated.

## Immediate implementation priorities

1. Finish the ontology and migration groundwork.
2. Normalize club-domain policy throughout auth and public apply.
3. Migrate applicant review to treat `MembershipApplication` as the canonical review record.
4. Replace future team work with roster-based competition planning.
5. Build the assessment system around PDFs, sections/stations, and answer slots.

## Non-goals for this reset

- Full data migration SQL
- full assessment UI implementation
- replacing the current frontend shell

Those belong in the next plans, not in this architecture note.
