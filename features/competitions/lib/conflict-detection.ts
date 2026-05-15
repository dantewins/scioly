import type {
  AssignmentRecord,
  CompetitionRosterRecord,
  MemberOption,
} from "@/features/competitions/lib/roster-types"

function assignmentStartMs(a: AssignmentRecord): number | null {
  const raw = a.schedule?.startsAt ?? a.slot?.startsAt
  if (!raw) return null
  const t = new Date(raw).getTime()
  return Number.isNaN(t) ? null : t
}

// Members not already in this assignment and not double-booked at the same start time
// within the same roster. Returns the original list filtered.
export function availableMembersFor(
  assignment: AssignmentRecord,
  roster: CompetitionRosterRecord,
  allMembers: MemberOption[],
): MemberOption[] {
  const inThisAssignment = new Set(assignment.participants.map((p) => p.memberSeason.id))
  const activeTime = assignmentStartMs(assignment)

  const conflicting = new Set<string>()
  if (activeTime !== null) {
    for (const other of roster.assignments) {
      if (other.id === assignment.id) continue
      if (assignmentStartMs(other) !== activeTime) continue
      for (const p of other.participants) conflicting.add(p.memberSeason.id)
    }
  }
  return allMembers.filter((m) => !inThisAssignment.has(m.id) && !conflicting.has(m.id))
}
