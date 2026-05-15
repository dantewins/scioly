"use client"

import { useState, type Dispatch, type SetStateAction } from "react"
import { toast } from "sonner"
import { apiCall } from "@/lib/api-client"
import type {
  AssignmentRecord,
  CompetitionRosterRecord,
} from "@/features/competitions/lib/roster-types"
import type { CompetitionRosterFormValues } from "@/features/competitions/components/competition-roster-dialog"
import type { CompetitionAssignmentFormValues } from "@/features/competitions/components/competition-assignment-dialog"
import type { CompetitionParticipantFormValues } from "@/features/competitions/components/competition-participant-dialog"

interface UseRosterMutationsOpts {
  competitionId: string
  setRosters: Dispatch<SetStateAction<CompetitionRosterRecord[]>>
  rosters: CompetitionRosterRecord[]
}

export interface RosterMutations {
  loading: boolean
  autoAssigning: boolean
  createForSchedule: string | null

  // Roster CRUD
  submitRoster: (
    values: CompetitionRosterFormValues,
    editingRosterId: string | null,
  ) => Promise<boolean>
  deleteRoster: (rosterId: string) => Promise<boolean>

  // Auto-assign
  handleAutoAssign: (roster: CompetitionRosterRecord) => Promise<void>

  // Assignment CRUD
  handleAddScheduledEvent: (
    roster: CompetitionRosterRecord,
    scheduleId: string,
    eventId: string,
  ) => Promise<AssignmentRecord | null>
  submitAssignment: (
    values: CompetitionAssignmentFormValues,
    rosterId: string,
    assignmentId: string | null,
  ) => Promise<boolean>
  deleteAssignment: (rosterId: string, assignmentId: string) => Promise<boolean>

  // Participant CRUD
  addParticipant: (
    values: CompetitionParticipantFormValues,
    rosterId: string,
    assignmentId: string,
  ) => Promise<boolean>
  removeParticipant: (
    rosterId: string,
    assignmentId: string,
    participantId: string,
  ) => Promise<boolean>
}

export function useRosterMutations({
  competitionId,
  setRosters,
  rosters,
}: UseRosterMutationsOpts): RosterMutations {
  const [loading, setLoading] = useState(false)
  const [autoAssigning, setAutoAssigning] = useState(false)
  const [createForSchedule, setCreateForSchedule] = useState<string | null>(null)

  function upsertRoster(next: CompetitionRosterRecord) {
    setRosters((current) => {
      const exists = current.some((r) => r.id === next.id)
      const merged = exists
        ? current.map((r) => (r.id === next.id ? next : r))
        : [...current, next]
      return merged.sort((a, b) => a.label.localeCompare(b.label))
    })
  }

  function updateAssignment(rosterId: string, next: AssignmentRecord) {
    setRosters((current) =>
      current.map((roster) => {
        if (roster.id !== rosterId) return roster
        const assignments = roster.assignments.some((a) => a.id === next.id)
          ? roster.assignments.map((a) => (a.id === next.id ? next : a))
          : [...roster.assignments, next]
        return {
          ...roster,
          assignments: assignments.sort((a, b) => a.event.name.localeCompare(b.event.name)),
        }
      }),
    )
  }

  function removeAssignmentFromState(rosterId: string, assignmentId: string) {
    setRosters((current) =>
      current.map((r) =>
        r.id === rosterId
          ? { ...r, assignments: r.assignments.filter((a) => a.id !== assignmentId) }
          : r,
      ),
    )
  }

  async function submitRoster(values: CompetitionRosterFormValues, editingRosterId: string | null) {
    if (!values.label.trim()) {
      toast.error("Roster label is required.")
      return false
    }
    setLoading(true)
    try {
      const body = {
        label: values.label.trim(),
        division: values.division === "__none" ? null : values.division,
        seasonRosterId: values.seasonRosterId === "__none" ? null : values.seasonRosterId,
        notes: values.notes.trim() || null,
      }
      const url = editingRosterId
        ? `/api/admin/competitions/${competitionId}/rosters/${editingRosterId}`
        : `/api/admin/competitions/${competitionId}/rosters`
      const data = await apiCall<CompetitionRosterRecord>(url, {
        method: editingRosterId ? "PATCH" : "POST",
        body: JSON.stringify(body),
      })
      upsertRoster(data)
      toast.success(editingRosterId ? "Roster updated." : "Roster created.")
      return true
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save roster.")
      return false
    } finally {
      setLoading(false)
    }
  }

  async function deleteRoster(rosterId: string) {
    try {
      await apiCall(`/api/admin/competitions/${competitionId}/rosters/${rosterId}`, {
        method: "DELETE",
      })
      setRosters((current) => current.filter((r) => r.id !== rosterId))
      toast.success("Roster deleted.")
      return true
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete roster.")
      return false
    }
  }

  async function handleAutoAssign(roster: CompetitionRosterRecord) {
    setAutoAssigning(true)
    try {
      const result = await apiCall<{ roster: CompetitionRosterRecord; added: number }>(
        `/api/admin/competitions/${competitionId}/rosters/${roster.id}/auto-assign`,
        { method: "POST" },
      )
      upsertRoster(result.roster)
      if (result.added === 0) {
        toast.info("No eligible members to assign — all slots are filled or no enrollment data found.")
      } else {
        toast.success(`Auto-assigned ${result.added} member${result.added === 1 ? "" : "s"}.`)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Auto-assign failed.")
    } finally {
      setAutoAssigning(false)
    }
  }

  async function handleAddScheduledEvent(
    roster: CompetitionRosterRecord,
    scheduleId: string,
    eventId: string,
  ): Promise<AssignmentRecord | null> {
    setCreateForSchedule(scheduleId)
    try {
      const created = await apiCall<AssignmentRecord>(
        `/api/admin/competitions/${competitionId}/rosters/${roster.id}/assignments`,
        {
          method: "POST",
          body: JSON.stringify({ eventId, scheduleId }),
        },
      )
      updateAssignment(roster.id, created)
      return created
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add event to roster.")
      return null
    } finally {
      setCreateForSchedule(null)
    }
  }

  async function submitAssignment(
    values: CompetitionAssignmentFormValues,
    rosterId: string,
    assignmentId: string | null,
  ) {
    if (!values.eventId) {
      toast.error("Select an event.")
      return false
    }
    setLoading(true)
    try {
      const body = {
        eventId: values.eventId,
        slotId: values.slotId === "__none" ? null : values.slotId,
        room: values.room.trim() || null,
        block: values.block.trim() || null,
        entryLabel: values.entryLabel.trim() || null,
        status: values.status,
        notes: values.notes.trim() || null,
      }
      const url = assignmentId
        ? `/api/admin/competitions/${competitionId}/rosters/${rosterId}/assignments/${assignmentId}`
        : `/api/admin/competitions/${competitionId}/rosters/${rosterId}/assignments`
      const data = await apiCall<AssignmentRecord>(url, {
        method: assignmentId ? "PATCH" : "POST",
        body: JSON.stringify(body),
      })
      updateAssignment(rosterId, data)
      toast.success(assignmentId ? "Assignment updated." : "Assignment added.")
      return true
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save assignment.")
      return false
    } finally {
      setLoading(false)
    }
  }

  async function deleteAssignment(rosterId: string, assignmentId: string) {
    try {
      await apiCall(
        `/api/admin/competitions/${competitionId}/rosters/${rosterId}/assignments/${assignmentId}`,
        { method: "DELETE" },
      )
      removeAssignmentFromState(rosterId, assignmentId)
      toast.success("Assignment deleted.")
      return true
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete assignment.")
      return false
    }
  }

  async function addParticipant(
    values: CompetitionParticipantFormValues,
    rosterId: string,
    assignmentId: string,
  ) {
    if (!values.memberSeasonId) {
      toast.error("Select a member.")
      return false
    }
    setLoading(true)
    try {
      const data = await apiCall<AssignmentRecord>(
        `/api/admin/competitions/${competitionId}/rosters/${rosterId}/assignments/${assignmentId}/participants`,
        {
          method: "POST",
          body: JSON.stringify({
            memberSeasonId: values.memberSeasonId,
            role: values.role,
            seatNumber: values.seatNumber ? parseInt(values.seatNumber, 10) : null,
          }),
        },
      )
      updateAssignment(rosterId, data)
      toast.success("Member added.")
      return true
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add member.")
      return false
    } finally {
      setLoading(false)
    }
  }

  async function removeParticipant(rosterId: string, assignmentId: string, participantId: string) {
    try {
      await apiCall(
        `/api/admin/competitions/${competitionId}/rosters/${rosterId}/assignments/${assignmentId}/participants`,
        {
          method: "DELETE",
          body: JSON.stringify({ participantId }),
        },
      )
      setRosters((current) =>
        current.map((r) =>
          r.id === rosterId
            ? {
                ...r,
                assignments: r.assignments.map((a) =>
                  a.id === assignmentId
                    ? { ...a, participants: a.participants.filter((p) => p.id !== participantId) }
                    : a,
                ),
              }
            : r,
        ),
      )
      toast.success("Member removed.")
      return true
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove member.")
      return false
    }
  }

  // Lint reassurance: rosters is read by callers via setState closures, not directly here.
  void rosters

  return {
    loading,
    autoAssigning,
    createForSchedule,
    submitRoster,
    deleteRoster,
    handleAutoAssign,
    handleAddScheduledEvent,
    submitAssignment,
    deleteAssignment,
    addParticipant,
    removeParticipant,
  }
}
