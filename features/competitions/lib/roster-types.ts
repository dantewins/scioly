// Shared types + helpers for the competition roster manager and its
// sub-components. Extracted from the original 895-line manager so the
// per-row markup can live in its own files without redeclaring shapes.

export type RosterMemberRole = "MEMBER" | "CAPTAIN" | "ALTERNATE"
export type CompetitionEntryStatus = "PLANNED" | "CONFIRMED" | "FINALIZED" | "DROPPED"
export type SciolyDivision = "B" | "C" | "OTHER"

export type AssessmentSlot = {
  id: string
  eventId: string | null
  label: string
  room: string | null
}

export type CompetitionRosterRecord = {
  id: string
  label: string
  division: SciolyDivision | null
  notes: string | null
  seasonRosterId: string | null
  assignments: Array<{
    id: string
    room: string | null
    block: string | null
    entryLabel: string | null
    status: CompetitionEntryStatus
    notes: string | null
    event: { id: string; name: string; code: string | null }
    schedule: {
      id: string
      timeSlot: number
      slotLabel: string | null
      room: string | null
      startsAt: string | Date | null
      endsAt: string | Date | null
    } | null
    slot: {
      id: string
      label: string
      room: string | null
      startsAt: string | Date | null
      endsAt: string | Date | null
    } | null
    participants: Array<{
      id: string
      role: RosterMemberRole
      seatNumber: number | null
      memberSeason: {
        id: string
        user: {
          id: string
          firstName: string
          lastName: string
          email: string
        }
      }
    }>
  }>
}

export type AssignmentRecord = CompetitionRosterRecord["assignments"][number]
export type ParticipantRecord = AssignmentRecord["participants"][number]
export type MemberSeasonRecord = ParticipantRecord["memberSeason"]

export interface EventOption {
  id: string
  name: string
  code: string | null
}

export interface SeasonRosterOption {
  id: string
  name: string
}

export interface MemberOption {
  id: string
  user: {
    firstName: string
    lastName: string
    email: string
  }
}

export interface ScheduleOption {
  id: string
  timeSlot: number
  startsAt: string | null
  event: { id: string; name: string; code: string | null }
}

// Status pill palette — single source of truth so AssignmentCard renders
// the same chip whether it's the scheduled or the unscheduled variant.
export const ENTRY_STATUS_BADGE: Record<CompetitionEntryStatus, string> = {
  PLANNED: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  CONFIRMED: "bg-azure-50 text-azure-700",
  FINALIZED: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  DROPPED: "bg-zinc-100 text-zinc-500 line-through dark:bg-zinc-800 dark:text-zinc-500",
}

export function memberLabel(member: MemberSeasonRecord): string {
  return `${member.user.firstName} ${member.user.lastName}`
}

export function getInitials(name: string): string {
  return name.split(" ").map((w) => w[0] ?? "").join("").slice(0, 2).toUpperCase()
}
