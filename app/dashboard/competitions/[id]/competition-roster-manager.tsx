"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import {
  IconClipboardList,
  IconEdit,
  IconPlus,
  IconTrash,
  IconUserPlus,
  IconUsersGroup,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { SectionCard } from "@/components/ui/section-card"
import {
  CompetitionRosterDialog,
  type CompetitionRosterFormValues,
} from "@/components/dialogs/competition-roster-dialog"
import {
  CompetitionAssignmentDialog,
  type CompetitionAssignmentFormValues,
} from "@/components/dialogs/competition-assignment-dialog"
import {
  CompetitionParticipantDialog,
  type CompetitionParticipantFormValues,
} from "@/components/dialogs/competition-participant-dialog"
import { apiCall } from "@/lib/api-client"

type RosterMemberRole = "MEMBER" | "CAPTAIN" | "ALTERNATE"
type CompetitionEntryStatus = "PLANNED" | "CONFIRMED" | "FINALIZED" | "DROPPED"
type SciolyDivision = "B" | "C" | "OTHER"
type AssessmentSlot = {
  id: string
  eventId: string | null
  label: string
  room: string | null
}

type CompetitionRosterRecord = {
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

interface EventOption {
  id: string
  name: string
  code: string | null
}

interface SeasonRosterOption {
  id: string
  name: string
}

interface MemberOption {
  id: string
  user: {
    firstName: string
    lastName: string
    email: string
  }
}

interface Props {
  competitionId: string
  initialRosters: CompetitionRosterRecord[]
  events: EventOption[]
  seasonRosters: SeasonRosterOption[]
  members: MemberOption[]
  slots: AssessmentSlot[]
  canManage: boolean
}

function memberLabel(member: CompetitionRosterRecord["assignments"][number]["participants"][number]["memberSeason"]) {
  return `${member.user.firstName} ${member.user.lastName}`
}

export function CompetitionRosterManager({
  competitionId,
  initialRosters,
  events,
  seasonRosters,
  members,
  slots,
  canManage,
}: Props) {
  const [rosters, setRosters] = useState(initialRosters)
  const [loading, setLoading] = useState(false)
  const [showRosterDialog, setShowRosterDialog] = useState(false)
  const [editingRoster, setEditingRoster] = useState<CompetitionRosterRecord | null>(null)
  const [rosterInitial, setRosterInitial] = useState<CompetitionRosterFormValues | undefined>()
  const [assignmentDialog, setAssignmentDialog] = useState<{
    rosterId: string
    assignmentId: string | null
  } | null>(null)
  const [assignmentInitial, setAssignmentInitial] = useState<CompetitionAssignmentFormValues | undefined>()
  const [participantDialog, setParticipantDialog] = useState<{
    rosterId: string
    assignmentId: string
  } | null>(null)

  const rosterMap = useMemo(
    () => Object.fromEntries(seasonRosters.map((roster) => [roster.id, roster.name])),
    [seasonRosters],
  )

  const activeAssignment = useMemo(() => {
    if (!participantDialog) return null
    return rosters
      .find((roster) => roster.id === participantDialog.rosterId)
      ?.assignments.find((assignment) => assignment.id === participantDialog.assignmentId) ?? null
  }, [participantDialog, rosters])

  const availableMembers = useMemo(() => {
    if (!activeAssignment) return members
    const assignedIds = new Set(activeAssignment.participants.map((item) => item.memberSeason.id))
    return members.filter((member) => !assignedIds.has(member.id))
  }, [activeAssignment, members])

  function upsertRoster(nextRoster: CompetitionRosterRecord) {
    setRosters((current) => {
      const existing = current.some((item) => item.id === nextRoster.id)
      const next = existing
        ? current.map((item) => (item.id === nextRoster.id ? nextRoster : item))
        : [...current, nextRoster]
      return next.sort((left, right) => left.label.localeCompare(right.label))
    })
  }

  function updateAssignment(rosterId: string, nextAssignment: CompetitionRosterRecord["assignments"][number]) {
    setRosters((current) =>
      current.map((roster) => {
        if (roster.id !== rosterId) return roster
        const assignments = roster.assignments.some((item) => item.id === nextAssignment.id)
          ? roster.assignments.map((item) => (item.id === nextAssignment.id ? nextAssignment : item))
          : [...roster.assignments, nextAssignment]
        return {
          ...roster,
          assignments: assignments.sort((left, right) => left.event.name.localeCompare(right.event.name)),
        }
      }),
    )
  }

  function removeAssignment(rosterId: string, assignmentId: string) {
    setRosters((current) =>
      current.map((roster) =>
        roster.id === rosterId
          ? { ...roster, assignments: roster.assignments.filter((item) => item.id !== assignmentId) }
          : roster,
      ),
    )
  }

  function openCreateRoster() {
    setEditingRoster(null)
    setRosterInitial(undefined)
    setShowRosterDialog(true)
  }

  function openEditRoster(roster: CompetitionRosterRecord) {
    setEditingRoster(roster)
    setRosterInitial({
      label: roster.label,
      division: roster.division ?? "__none",
      seasonRosterId: roster.seasonRosterId ?? "__none",
      notes: roster.notes ?? "",
    })
    setShowRosterDialog(true)
  }

  function closeRosterDialog() {
    setShowRosterDialog(false)
    setEditingRoster(null)
    setRosterInitial(undefined)
  }

  async function submitRoster(values: CompetitionRosterFormValues) {
    if (!values.label.trim()) {
      toast.error("Roster label is required.")
      return
    }

    setLoading(true)
    try {
      const body = {
        label: values.label.trim(),
        division: values.division === "__none" ? null : values.division,
        seasonRosterId: values.seasonRosterId === "__none" ? null : values.seasonRosterId,
        notes: values.notes.trim() || null,
      }
      const url = editingRoster
        ? `/api/admin/competitions/${competitionId}/rosters/${editingRoster.id}`
        : `/api/admin/competitions/${competitionId}/rosters`
      const data = await apiCall<CompetitionRosterRecord>(url, {
        method: editingRoster ? "PATCH" : "POST",
        body: JSON.stringify(body),
      })
      upsertRoster(data)
      toast.success(editingRoster ? "Roster updated." : "Roster created.")
      closeRosterDialog()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save roster.")
    } finally {
      setLoading(false)
    }
  }

  async function deleteRoster(roster: CompetitionRosterRecord) {
    if (!confirm(`Delete ${roster.label}?`)) return
    try {
      await apiCall(`/api/admin/competitions/${competitionId}/rosters/${roster.id}`, {
        method: "DELETE",
      })
      setRosters((current) => current.filter((item) => item.id !== roster.id))
      toast.success("Roster deleted.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete roster.")
    }
  }

  function openCreateAssignment(roster: CompetitionRosterRecord) {
    setAssignmentDialog({ rosterId: roster.id, assignmentId: null })
    setAssignmentInitial(undefined)
  }

  function openEditAssignment(roster: CompetitionRosterRecord, assignment: CompetitionRosterRecord["assignments"][number]) {
    setAssignmentDialog({
      rosterId: roster.id,
      assignmentId: assignment.id,
    })
    setAssignmentInitial({
      eventId: assignment.event.id,
      slotId: assignment.slot?.id ?? "__none",
      room: assignment.room ?? "",
      block: assignment.block ?? "",
      entryLabel: assignment.entryLabel ?? "",
      status: assignment.status,
      notes: assignment.notes ?? "",
    })
  }

  function closeAssignmentDialog() {
    setAssignmentDialog(null)
    setAssignmentInitial(undefined)
  }

  async function submitAssignment(values: CompetitionAssignmentFormValues) {
    if (!assignmentDialog) return
    if (!values.eventId) {
      toast.error("Select an event.")
      return
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
      const url = assignmentDialog.assignmentId
        ? `/api/admin/competitions/${competitionId}/rosters/${assignmentDialog.rosterId}/assignments/${assignmentDialog.assignmentId}`
        : `/api/admin/competitions/${competitionId}/rosters/${assignmentDialog.rosterId}/assignments`
      const data = await apiCall<CompetitionRosterRecord["assignments"][number]>(url, {
        method: assignmentDialog.assignmentId ? "PATCH" : "POST",
        body: JSON.stringify(body),
      })
      updateAssignment(assignmentDialog.rosterId, data)
      toast.success(assignmentDialog.assignmentId ? "Assignment updated." : "Assignment added.")
      closeAssignmentDialog()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save assignment.")
    } finally {
      setLoading(false)
    }
  }

  async function deleteAssignment(roster: CompetitionRosterRecord, assignmentId: string) {
    if (!confirm("Delete this event assignment?")) return
    try {
      await apiCall(
        `/api/admin/competitions/${competitionId}/rosters/${roster.id}/assignments/${assignmentId}`,
        { method: "DELETE" },
      )
      removeAssignment(roster.id, assignmentId)
      toast.success("Assignment deleted.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete assignment.")
    }
  }

  function openParticipantDialog(roster: CompetitionRosterRecord, assignmentId: string) {
    setParticipantDialog({
      rosterId: roster.id,
      assignmentId,
    })
  }

  function closeParticipantDialog() {
    setParticipantDialog(null)
  }

  async function addParticipant(values: CompetitionParticipantFormValues) {
    if (!participantDialog) return
    if (!values.memberSeasonId) {
      toast.error("Select a member.")
      return
    }
    setLoading(true)
    try {
      const data = await apiCall<CompetitionRosterRecord["assignments"][number]>(
        `/api/admin/competitions/${competitionId}/rosters/${participantDialog.rosterId}/assignments/${participantDialog.assignmentId}/participants`,
        {
          method: "POST",
          body: JSON.stringify({
            memberSeasonId: values.memberSeasonId,
            role: values.role,
            seatNumber: values.seatNumber ? parseInt(values.seatNumber, 10) : null,
          }),
        },
      )
      updateAssignment(participantDialog.rosterId, data)
      toast.success("Member added.")
      closeParticipantDialog()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add member.")
    } finally {
      setLoading(false)
    }
  }

  async function removeParticipant(rosterId: string, assignmentId: string, participantId: string) {
    if (!confirm("Remove this member from the assignment?")) return
    try {
      await apiCall(
        `/api/admin/competitions/${competitionId}/rosters/${rosterId}/assignments/${assignmentId}/participants`,
        {
          method: "DELETE",
          body: JSON.stringify({ participantId }),
        },
      )
      setRosters((current) =>
        current.map((roster) =>
          roster.id === rosterId
            ? {
                ...roster,
                assignments: roster.assignments.map((assignment) =>
                  assignment.id === assignmentId
                    ? {
                        ...assignment,
                        participants: assignment.participants.filter((participant) => participant.id !== participantId),
                      }
                    : assignment,
                ),
              }
            : roster,
        ),
      )
      toast.success("Member removed.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove member.")
    }
  }

  return (
    <div className="space-y-4">
      <SectionCard
        title="Canonical Rosters"
        description="Manage direct competition rosters, event entries, and assigned members."
        action={canManage ? (
          <Button size="sm" onClick={openCreateRoster}>
            <IconPlus className="mr-1.5 size-[15px]" />
            New Roster
          </Button>
        ) : undefined}
      >
        {rosters.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No canonical competition rosters yet.
          </p>
        ) : (
          <div className="space-y-3">
            {rosters.map((roster) => (
              <Card key={roster.id} className="px-[var(--card-px)] py-[var(--card-py)]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-2">
                        <IconUsersGroup className="size-4 text-muted-foreground" />
                        <p className="text-sm font-medium">{roster.label}</p>
                      </div>
                      {roster.division && <Badge variant="outline" className="text-xs">{roster.division}</Badge>}
                      {roster.seasonRosterId && (
                        <Badge variant="secondary" className="text-xs">
                          Base roster: {rosterMap[roster.seasonRosterId] ?? "Linked"}
                        </Badge>
                      )}
                    </div>
                    {roster.notes && (
                      <p className="text-sm text-muted-foreground">{roster.notes}</p>
                    )}
                  </div>
                  {canManage && (
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => openEditRoster(roster)}>
                        <IconEdit className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-destructive" onClick={() => deleteRoster(roster)}>
                        <IconTrash className="size-4" />
                      </Button>
                    </div>
                  )}
                </div>

                <div className="mt-4 space-y-3">
                  {roster.assignments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No event assignments yet.</p>
                  ) : (
                    roster.assignments.map((assignment) => (
                      <div key={assignment.id} className="rounded-[var(--radius)] border border-border/60 p-[var(--card-py)]">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-medium">{assignment.event.name}</p>
                              <Badge variant="secondary" className="text-xs">{assignment.status}</Badge>
                              {assignment.slot && (
                                <Badge variant="outline" className="text-xs">{assignment.slot.label}</Badge>
                              )}
                              {!assignment.slot && assignment.schedule?.slotLabel && (
                                <Badge variant="outline" className="text-xs">{assignment.schedule.slotLabel}</Badge>
                              )}
                              {assignment.room && (
                                <Badge variant="outline" className="text-xs">Room {assignment.room}</Badge>
                              )}
                            </div>
                            {(assignment.entryLabel || assignment.block) && (
                              <p className="mt-1 text-xs text-muted-foreground">
                                {[assignment.entryLabel, assignment.block].filter(Boolean).join(" · ")}
                              </p>
                            )}
                          </div>
                          {canManage && (
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="sm" className="px-2.5" onClick={() => openParticipantDialog(roster, assignment.id)}>
                                <IconUserPlus className="mr-1 size-4" />
                                Member
                              </Button>
                              <Button variant="ghost" size="icon-sm" onClick={() => openEditAssignment(roster, assignment)}>
                                <IconEdit className="size-4" />
                              </Button>
                              <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-destructive" onClick={() => deleteAssignment(roster, assignment.id)}>
                                <IconTrash className="size-4" />
                              </Button>
                            </div>
                          )}
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {assignment.participants.length > 0 ? (
                            assignment.participants.map((participant) => (
                              <div
                                key={participant.id}
                                className="flex items-center gap-2 rounded-[var(--control-radius)] border border-border/70 px-2 py-1 text-xs"
                              >
                                <span>{memberLabel(participant.memberSeason)}</span>
                                {participant.role !== "MEMBER" && (
                                  <span className="text-muted-foreground">({participant.role})</span>
                                )}
                                {participant.seatNumber && (
                                  <span className="text-muted-foreground">Seat {participant.seatNumber}</span>
                                )}
                                {canManage && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-xs"
                                    className="text-muted-foreground hover:text-destructive"
                                    onClick={() => removeParticipant(roster.id, assignment.id, participant.id)}
                                  >
                                    <IconTrash className="size-3.5" />
                                  </Button>
                                )}
                              </div>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground">No members assigned.</span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {canManage && (
                  <div className="mt-4">
                    <Button variant="outline" size="sm" onClick={() => openCreateAssignment(roster)}>
                      <IconClipboardList className="mr-1.5 size-4" />
                      Add Event Assignment
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </SectionCard>

      <CompetitionRosterDialog
        open={showRosterDialog}
        onOpenChange={(open) => { if (!open) closeRosterDialog() }}
        initial={rosterInitial}
        isEditing={!!editingRoster}
        seasonRosters={seasonRosters}
        loading={loading}
        onSubmit={submitRoster}
      />

      <CompetitionAssignmentDialog
        open={!!assignmentDialog}
        onOpenChange={(open) => { if (!open) closeAssignmentDialog() }}
        initial={assignmentInitial}
        isEditing={!!assignmentDialog?.assignmentId}
        events={events}
        slots={slots}
        loading={loading}
        onSubmit={submitAssignment}
      />

      <CompetitionParticipantDialog
        open={!!participantDialog}
        onOpenChange={(open) => { if (!open) closeParticipantDialog() }}
        availableMembers={availableMembers}
        loading={loading}
        onSubmit={addParticipant}
      />
    </div>
  )
}
