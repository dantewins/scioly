# Frontend Handoff: Canonical Backend Alignment

## Purpose

The backend and Prisma schema now treat rosters and assessments as the canonical organizational model.
Legacy team-backed paths have been removed from the server and database layer.
Frontend work should now align to that model instead of preserving old team-era assumptions.

## Backend Changes Already Landed

- `Team`, `TeamAssignment`, `PracticeTest`, `AnswerKey`, and `PracticeAttempt` are removed from the Prisma schema.
- Competition planning is now canonical through:
  - `SeasonRoster`
  - `SeasonRosterMember`
  - `CompetitionRoster`
  - `CompetitionEventAssignment`
  - `CompetitionAssignmentParticipant`
- Competitions now inherit the full season event set automatically.
  - every competition gets one canonical `EventSchedule` per season event
  - every competition also gets a canonical `CompetitionEventSlot` per season event
  - competitions can still have different times, rooms, labels, and schedule metadata per event
  - competitions should no longer be treated as having a custom subset of season events
- Practice is now canonical through:
  - `Assessment`
  - `AssessmentAsset`
  - `AssessmentPart`
  - `AssessmentPrompt`
  - `AssessmentAttempt`
  - `AssessmentResponse`
- `Resource` and `Announcement` are roster-aware:
  - `seasonRosterId`
  - `competitionRosterId`
- Team permissions are removed from the permission model.
- Club email domain management now assumes the canonical `ClubEmailDomain` table exists.

## Required Frontend Changes

### 1. Competition Flow

- Treat competition rosters as the primary planning object.
- Remove remaining UI language that implies `teams` are the source of truth for competitions.
- Treat the season event list as the competition event list.
- Do not build UI that assumes an admin can add or remove events from a single competition.
- The schedule UI should assume:
  - all season events already exist for the competition
  - admins are editing schedule metadata, not choosing which events belong to the competition
  - each competition can still have unique times, rooms, slot labels, and start/end timestamps for the same event
- On competition detail, the main editable surface should stay roster-first:
  - roster metadata
  - event assignments
  - participant assignment
  - assignment status
- The schedule surface should be event-complete and schedule-edit-first:
  - one row per season event
  - editable slot/time metadata per competition
  - no “delete event from competition” affordance
- Use these APIs as the canonical source:
  - [app/api/admin/competitions/route.ts](/Users/musung/Desktop/scioly/app/api/admin/competitions/route.ts)
  - [app/api/admin/competitions/[id]/route.ts](/Users/musung/Desktop/scioly/app/api/admin/competitions/[id]/route.ts)
  - [app/api/admin/competitions/[id]/schedule/route.ts](/Users/musung/Desktop/scioly/app/api/admin/competitions/[id]/schedule/route.ts)
  - [app/api/admin/competitions/[id]/rosters/route.ts](/Users/musung/Desktop/scioly/app/api/admin/competitions/[id]/rosters/route.ts)
  - [app/api/admin/competitions/[id]/rosters/[rosterId]/route.ts](/Users/musung/Desktop/scioly/app/api/admin/competitions/[id]/rosters/[rosterId]/route.ts)
  - [app/api/admin/competitions/[id]/rosters/[rosterId]/assignments/route.ts](/Users/musung/Desktop/scioly/app/api/admin/competitions/[id]/rosters/[rosterId]/assignments/route.ts)
  - [app/api/admin/competitions/[id]/rosters/[rosterId]/assignments/[assignmentId]/route.ts](/Users/musung/Desktop/scioly/app/api/admin/competitions/[id]/rosters/[rosterId]/assignments/[assignmentId]/route.ts)
  - [app/api/admin/competitions/[id]/rosters/[rosterId]/assignments/[assignmentId]/participants/route.ts](/Users/musung/Desktop/scioly/app/api/admin/competitions/[id]/rosters/[rosterId]/assignments/[assignmentId]/participants/route.ts)

### 2. Practice Flow

- Replace remaining “Practice Test” language with “Assessment” in the admin and member flows.
- Keep the current visual layout, but update labels and empty states to match the canonical backend.
- The assessment editor should assume:
  - one assessment record
  - source packet asset URL
  - optional answer key asset URL
  - optional section/station parts
  - prompt-backed answer key data
- Use these APIs as canonical:
  - [app/api/admin/practice/route.ts](/Users/musung/Desktop/scioly/app/api/admin/practice/route.ts)
  - [app/api/admin/practice/[id]/route.ts](/Users/musung/Desktop/scioly/app/api/admin/practice/[id]/route.ts)
  - [app/api/admin/practice/[id]/answer-key/route.ts](/Users/musung/Desktop/scioly/app/api/admin/practice/[id]/answer-key/route.ts)
  - [app/api/member/practice/route.ts](/Users/musung/Desktop/scioly/app/api/member/practice/route.ts)
- Member attempt creation now requires `assessmentId`, not any legacy test identifier.

### 3. Settings And Roles

- Do not render team permissions anywhere.
- Settings should assume `emailDomains` always come from the canonical domain table.
- Remove any fallback UI behavior that fabricates a primary domain row from `club.schoolDomain`.
- The settings UI should continue using:
  - [app/api/admin/settings/route.ts](/Users/musung/Desktop/scioly/app/api/admin/settings/route.ts)
  - [app/api/admin/settings/domains/route.ts](/Users/musung/Desktop/scioly/app/api/admin/settings/domains/route.ts)
  - [app/api/admin/settings/domains/[id]/route.ts](/Users/musung/Desktop/scioly/app/api/admin/settings/domains/[id]/route.ts)

### 4. Events, Resources, And Announcements

- Event pages should not show team counts or team-based management controls.
- Any new resource or announcement UI must scope to:
  - season-wide
  - event
  - competition
  - season roster
  - competition roster
- Do not build any new frontend against `teamId`; that field no longer exists in the schema.

## Recommended Frontend Sequence

1. Rename competition UI language from `team` to `roster` wherever the data is competition-specific.
2. Update competition schedule views so they render the full inherited event set and edit per-competition schedule metadata instead of event membership.
3. Rename practice UI language from `test` to `assessment` without changing spacing or existing layout rhythm.
4. Remove any residual team permission toggles or hidden team-only views.
5. Add roster-scoped targeting controls for future announcements/resources screens.

## Payload Notes

- Competition roster responses come back with nested assignments and participants. The canonical shape is defined in [lib/competition-ontology.ts](/Users/musung/Desktop/scioly/lib/competition-ontology.ts).
- Competition schedule data should be interpreted as competition-specific metadata layered on top of the season’s canonical event set.
- Practice assessment responses come back in the compatibility shape defined in [lib/practice-assessments.ts](/Users/musung/Desktop/scioly/lib/practice-assessments.ts). The naming is still partially transitional in frontend-facing fields, but the backend data source is fully canonical.

## Constraint

Maintain the current spacing, typography, and dashboard interaction patterns.
This handoff is for model alignment, not a redesign.
