# Phase 0 - Ontology And Migration

## Goal

Stabilize the platform foundation before more feature work lands. This phase exists to stop the schema, docs, and live routes from drifting apart.

## Scope

### 1. Schema baseline

- land the revised Prisma ontology
- keep legacy models only where the current UI still depends on them
- validate and generate Prisma client cleanly

### 2. Tenant access policy

- normalize club email-domain handling around `ClubEmailDomain`
- preserve `schoolDomain` only as a fallback/primary convenience field
- ensure login/apply/registration all use the same allowlist rules

### 3. Admissions bridge

- write `MembershipApplication` records from the public apply flow
- keep current applicant review screens functional
- sync approve/deny actions onto `MembershipApplication`

### 4. Migration notes

- mark `Team` as legacy for current UI only
- mark `PracticeTest` as legacy for current UI only
- document which new work must target `SeasonRoster` / `CompetitionRoster` / `Assessment`

### 5. Documentation reset

- add the April 6 architecture reset spec
- add missing plans for assessment and platform operations
- explicitly note that `scioly-drive` was unavailable locally during the audit

## Acceptance criteria

- `npx prisma validate` passes
- `npx prisma generate` passes
- `npx tsc --noEmit` passes
- the public apply route writes both the current operational records and the new application record
- auth and registration are compatible with multiple club email domains

## Risks

- the current app still reads from legacy team/practice tables, so a full cleanup must be staged
- the missing external source folder means the final hours/finance rules still need confirmation against real club spreadsheets

## Exit condition

After Phase 0, feature work can continue, but no new feature should be built on top of the legacy `Team` or `PracticeTest` abstractions unless it is explicitly a bridge task.
