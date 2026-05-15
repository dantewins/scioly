"use client"

import { useEffect, useMemo, useState } from "react"
import {
  IconEdit,
  IconLoader2,
  IconPlus,
  IconTrash,
  IconWand,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { SectionCard } from "@/components/ui/section-card"
import {
  CompetitionRosterDialog,
  type CompetitionRosterFormValues,
} from "@/features/competitions/components/competition-roster-dialog"
import {
  CompetitionAssignmentDialog,
  type CompetitionAssignmentFormValues,
} from "@/features/competitions/components/competition-assignment-dialog"
import {
  CompetitionParticipantDialog,
  type CompetitionParticipantFormValues,
} from "@/features/competitions/components/competition-participant-dialog"
import {
  type AssignmentRecord,
  type CompetitionRosterRecord,
  type EventOption,
  type MemberOption,
  type SeasonRosterOption,
  type ScheduleOption,
  type AssessmentSlot,
} from "@/features/competitions/lib/roster-types"
import { AssignmentCard } from "@/features/competitions/components/assignment-card"
import { useRosterMutations } from "@/features/competitions/lib/use-roster-mutations"
import { availableMembersFor } from "@/features/competitions/lib/conflict-detection"

interface Props {
  competitionId: string
  initialRosters: CompetitionRosterRecord[]
  events: EventOption[]
  seasonRosters: SeasonRosterOption[]
  members: MemberOption[]
  slots: AssessmentSlot[]
  schedules: ScheduleOption[]
  canManage: boolean
}

type TimeRow = {
  key: string
  time: string
  sortValue: number
  schedules: ScheduleOption[]
}

function buildTimeRows(schedules: ScheduleOption[]): TimeRow[] {
  const map = new Map<string, TimeRow>()
  for (const s of schedules) {
    let key: string
    let time: string
    let sortValue: number
    if (!s.startsAt) {
      key = "no-time"
      time = "No time"
      sortValue = Number.MAX_SAFE_INTEGER
    } else {
      const date = new Date(s.startsAt)
      if (Number.isNaN(date.getTime())) continue
      key = String(date.getTime())
      time = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
      sortValue = date.getTime()
    }
    const existing = map.get(key)
    if (existing) existing.schedules.push(s)
    else map.set(key, { key, time, sortValue, schedules: [s] })
  }
  return [...map.values()].sort((a, b) => a.sortValue - b.sortValue)
}

export function CompetitionRosterManager({
  competitionId,
  initialRosters,
  events,
  seasonRosters,
  members,
  slots,
  schedules,
  canManage,
}: Props) {
  const [rosters, setRosters] = useState(initialRosters)
  const mutations = useRosterMutations({ competitionId, setRosters, rosters })

  // Dialog state
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
  const [selectedRosterId, setSelectedRosterId] = useState<string | null>(initialRosters[0]?.id ?? null)

  // Confirm-dialog state
  const [rosterToDelete, setRosterToDelete] = useState<CompetitionRosterRecord | null>(null)
  const [rosterDeleting, setRosterDeleting] = useState(false)
  const [assignmentToDelete, setAssignmentToDelete] = useState<{
    roster: CompetitionRosterRecord
    assignmentId: string
  } | null>(null)
  const [assignmentDeleting, setAssignmentDeleting] = useState(false)
  const [participantToRemove, setParticipantToRemove] = useState<{
    rosterId: string
    assignmentId: string
    participantId: string
    memberName?: string
  } | null>(null)
  const [participantRemoving, setParticipantRemoving] = useState(false)

  useEffect(() => {
    if (rosters.length === 0) {
      if (selectedRosterId !== null) setSelectedRosterId(null)
      return
    }
    if (!selectedRosterId || !rosters.some((r) => r.id === selectedRosterId)) {
      setSelectedRosterId(rosters[0].id)
    }
  }, [rosters, selectedRosterId])

  const selectedRoster = useMemo(
    () => rosters.find((r) => r.id === selectedRosterId) ?? null,
    [rosters, selectedRosterId],
  )

  const rosterMap = useMemo(
    () => Object.fromEntries(seasonRosters.map((roster) => [roster.id, roster.name])),
    [seasonRosters],
  )

  const activeAssignment = useMemo(() => {
    if (!participantDialog) return null
    return rosters
      .find((r) => r.id === participantDialog.rosterId)
      ?.assignments.find((a) => a.id === participantDialog.assignmentId) ?? null
  }, [participantDialog, rosters])

  const activeRoster = useMemo(() => {
    if (!participantDialog) return null
    return rosters.find((r) => r.id === participantDialog.rosterId) ?? null
  }, [participantDialog, rosters])

  const availableMembers = useMemo(() => {
    if (!activeAssignment || !activeRoster) return members
    return availableMembersFor(activeAssignment, activeRoster, members)
  }, [activeAssignment, activeRoster, members])

  const timeRows = useMemo<TimeRow[]>(() => buildTimeRows(schedules), [schedules])

  const assignmentByScheduleId = useMemo(() => {
    const map = new Map<string, AssignmentRecord>()
    if (!selectedRoster) return map
    for (const a of selectedRoster.assignments) if (a.schedule) map.set(a.schedule.id, a)
    return map
  }, [selectedRoster])

  const unscheduledAssignments = useMemo<AssignmentRecord[]>(
    () => selectedRoster?.assignments.filter((a) => !a.schedule) ?? [],
    [selectedRoster],
  )

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

  async function handleSubmitRoster(values: CompetitionRosterFormValues) {
    const ok = await mutations.submitRoster(values, editingRoster?.id ?? null)
    if (ok) closeRosterDialog()
  }

  async function handleConfirmDeleteRoster() {
    if (!rosterToDelete) return
    setRosterDeleting(true)
    const ok = await mutations.deleteRoster(rosterToDelete.id)
    setRosterDeleting(false)
    if (ok) setRosterToDelete(null)
  }

  function openCreateAssignment(roster: CompetitionRosterRecord) {
    setAssignmentDialog({ rosterId: roster.id, assignmentId: null })
    setAssignmentInitial(undefined)
  }
  // currently the only caller is the inline auto-add flow; preserve the public-ish handle.
  void openCreateAssignment

  function openEditAssignment(roster: CompetitionRosterRecord, assignment: AssignmentRecord) {
    setAssignmentDialog({ rosterId: roster.id, assignmentId: assignment.id })
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

  async function handleSubmitAssignment(values: CompetitionAssignmentFormValues) {
    if (!assignmentDialog) return
    const ok = await mutations.submitAssignment(
      values,
      assignmentDialog.rosterId,
      assignmentDialog.assignmentId,
    )
    if (ok) closeAssignmentDialog()
  }

  async function handleConfirmDeleteAssignment() {
    if (!assignmentToDelete) return
    setAssignmentDeleting(true)
    const ok = await mutations.deleteAssignment(
      assignmentToDelete.roster.id,
      assignmentToDelete.assignmentId,
    )
    setAssignmentDeleting(false)
    if (ok) setAssignmentToDelete(null)
  }

  function openParticipantDialog(roster: CompetitionRosterRecord, assignmentId: string) {
    setParticipantDialog({ rosterId: roster.id, assignmentId })
  }

  async function handleAddParticipant(values: CompetitionParticipantFormValues) {
    if (!participantDialog) return
    const ok = await mutations.addParticipant(values, participantDialog.rosterId, participantDialog.assignmentId)
    if (ok) setParticipantDialog(null)
  }

  function flagParticipantRemoval(rosterId: string, assignmentId: string, participantId: string) {
    const roster = rosters.find((r) => r.id === rosterId)
    const assignment = roster?.assignments.find((a) => a.id === assignmentId)
    const participant = assignment?.participants.find((p) => p.id === participantId)
    const memberName = participant
      ? `${participant.memberSeason.user.firstName} ${participant.memberSeason.user.lastName}`.trim() || undefined
      : undefined
    setParticipantToRemove({ rosterId, assignmentId, participantId, memberName })
  }

  async function handleConfirmRemoveParticipant() {
    if (!participantToRemove) return
    setParticipantRemoving(true)
    const ok = await mutations.removeParticipant(
      participantToRemove.rosterId,
      participantToRemove.assignmentId,
      participantToRemove.participantId,
    )
    setParticipantRemoving(false)
    if (ok) setParticipantToRemove(null)
  }

  async function handleAddScheduledEventInline(
    roster: CompetitionRosterRecord,
    scheduleId: string,
    eventId: string,
  ) {
    const created = await mutations.handleAddScheduledEvent(roster, scheduleId, eventId)
    if (created) setParticipantDialog({ rosterId: roster.id, assignmentId: created.id })
  }

  return (
    <div className="space-y-4">
      <SectionCard
        title="Canonical Rosters"
        description="Pick a roster to view its event calendar and assigned members."
        action={
          canManage ? (
            <Button size="sm" onClick={openCreateRoster}>
              <IconPlus className="mr-1.5 size-[15px]" />
              New Roster
            </Button>
          ) : undefined
        }
      >
        {rosters.length === 0 ? (
          <p className="text-sm text-muted-foreground">No canonical competition rosters yet.</p>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {rosters.map((roster) => {
                const isActive = roster.id === selectedRosterId
                return (
                  <button
                    key={roster.id}
                    type="button"
                    onClick={() => setSelectedRosterId(roster.id)}
                    className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {roster.label}
                    {roster.division && (
                      <span className={`ml-1.5 text-xs ${isActive ? "opacity-80" : "opacity-70"}`}>
                        {roster.division}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {selectedRoster && (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {selectedRoster.seasonRosterId && (
                        <Badge variant="secondary" className="text-xs">
                          Base roster: {rosterMap[selectedRoster.seasonRosterId] ?? "Linked"}
                        </Badge>
                      )}
                      <span>
                        {selectedRoster.assignments.length} event
                        {selectedRoster.assignments.length === 1 ? "" : "s"} assigned
                      </span>
                    </div>
                    {selectedRoster.notes && (
                      <p className="text-sm text-muted-foreground">{selectedRoster.notes}</p>
                    )}
                  </div>
                  {canManage && (
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => mutations.handleAutoAssign(selectedRoster)}
                        disabled={mutations.autoAssigning || selectedRoster.assignments.length === 0}
                      >
                        {mutations.autoAssigning ? (
                          <IconLoader2 className="mr-1.5 size-4 animate-spin" />
                        ) : (
                          <IconWand className="mr-1.5 size-4" />
                        )}
                        Auto Assign
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => openEditRoster(selectedRoster)}>
                        <IconEdit className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => setRosterToDelete(selectedRoster)}
                      >
                        <IconTrash className="size-4" />
                      </Button>
                    </div>
                  )}
                </div>

                {timeRows.length === 0 && unscheduledAssignments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No events scheduled. Add events on the <strong>Schedule</strong> tab to populate this calendar.
                  </p>
                ) : (
                  <div className="overflow-hidden rounded-[var(--radius)] border bg-card">
                    {timeRows.map((row, i) => (
                      <div
                        key={row.key}
                        className={`grid grid-cols-[88px_1fr] gap-3 px-3 py-3 ${i > 0 ? "border-t border-border" : ""}`}
                      >
                        <div className="font-mono text-sm font-semibold text-foreground pt-2">
                          {row.time}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {row.schedules.map((schedule) => {
                            const assignment = assignmentByScheduleId.get(schedule.id)
                            const eventName = schedule.event.name
                            const isCreating = mutations.createForSchedule === schedule.id

                            if (!assignment) {
                              return (
                                <button
                                  key={schedule.id}
                                  type="button"
                                  disabled={!canManage || isCreating}
                                  onClick={() => handleAddScheduledEventInline(selectedRoster, schedule.id, schedule.event.id)}
                                  className="group/card flex w-52 flex-col items-start gap-1 rounded-xl border border-dashed border-border bg-muted/20 p-3 text-left transition-colors enabled:hover:border-primary enabled:hover:bg-primary/5 disabled:opacity-60"
                                >
                                  <p className="text-xs font-semibold leading-tight text-muted-foreground group-enabled/card:hover:text-foreground">
                                    {eventName}
                                  </p>
                                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                    {isCreating ? (
                                      <>
                                        <IconLoader2 className="size-3 animate-spin" />
                                        Adding…
                                      </>
                                    ) : canManage ? (
                                      <>
                                        <IconPlus className="size-3" />
                                        Add to roster
                                      </>
                                    ) : (
                                      "Not on this roster"
                                    )}
                                  </span>
                                </button>
                              )
                            }

                            return (
                              <AssignmentCard
                                key={schedule.id}
                                assignment={assignment}
                                eventName={eventName}
                                canManage={canManage}
                                onEdit={() => openEditAssignment(selectedRoster, assignment)}
                                onDelete={() =>
                                  setAssignmentToDelete({ roster: selectedRoster, assignmentId: assignment.id })
                                }
                                onAddParticipant={() => openParticipantDialog(selectedRoster, assignment.id)}
                                onRemoveParticipant={(participantId) =>
                                  flagParticipantRemoval(selectedRoster.id, assignment.id, participantId)
                                }
                              />
                            )
                          })}
                        </div>
                      </div>
                    ))}

                    {unscheduledAssignments.length > 0 && (
                      <div className="grid grid-cols-[88px_1fr] gap-3 border-t border-border bg-muted/20 px-3 py-3">
                        <div className="pt-2 font-mono text-sm font-semibold text-muted-foreground">No time</div>
                        <div className="flex flex-wrap gap-2">
                          {unscheduledAssignments.map((assignment) => (
                            <AssignmentCard
                              key={assignment.id}
                              assignment={assignment}
                              eventName={assignment.event.name}
                              canManage={canManage}
                              onEdit={() => openEditAssignment(selectedRoster, assignment)}
                              onDelete={() =>
                                setAssignmentToDelete({ roster: selectedRoster, assignmentId: assignment.id })
                              }
                              onAddParticipant={() => openParticipantDialog(selectedRoster, assignment.id)}
                              onRemoveParticipant={(participantId) =>
                                flagParticipantRemoval(selectedRoster.id, assignment.id, participantId)
                              }
                              showRoleHint={false}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </SectionCard>

      <CompetitionRosterDialog
        open={showRosterDialog}
        onOpenChange={(open) => {
          if (!open) closeRosterDialog()
        }}
        initial={rosterInitial}
        isEditing={!!editingRoster}
        seasonRosters={seasonRosters}
        loading={mutations.loading}
        onSubmit={handleSubmitRoster}
      />

      <CompetitionAssignmentDialog
        open={!!assignmentDialog}
        onOpenChange={(open) => {
          if (!open) closeAssignmentDialog()
        }}
        initial={assignmentInitial}
        isEditing={!!assignmentDialog?.assignmentId}
        events={events}
        slots={slots}
        loading={mutations.loading}
        onSubmit={handleSubmitAssignment}
      />

      <CompetitionParticipantDialog
        open={!!participantDialog}
        onOpenChange={(open) => {
          if (!open) setParticipantDialog(null)
        }}
        availableMembers={availableMembers}
        loading={mutations.loading}
        onSubmit={handleAddParticipant}
      />

      <ConfirmDialog
        open={rosterToDelete !== null}
        title={rosterToDelete ? `Delete "${rosterToDelete.label}"?` : "Delete roster?"}
        description="All event assignments and participant slots on this roster will be removed. This cannot be undone."
        confirmLabel="Delete Roster"
        destructive
        loading={rosterDeleting}
        onConfirm={handleConfirmDeleteRoster}
        onCancel={() => setRosterToDelete(null)}
      />

      <ConfirmDialog
        open={assignmentToDelete !== null}
        title="Delete event assignment?"
        description="The assignment and all participant slots in it will be removed. This cannot be undone."
        confirmLabel="Delete Assignment"
        destructive
        loading={assignmentDeleting}
        onConfirm={handleConfirmDeleteAssignment}
        onCancel={() => setAssignmentToDelete(null)}
      />

      <ConfirmDialog
        open={participantToRemove !== null}
        title={
          participantToRemove?.memberName
            ? `Remove ${participantToRemove.memberName}?`
            : "Remove member from assignment?"
        }
        description="They will no longer be slotted for this event assignment. You can re-add them later."
        confirmLabel="Remove"
        destructive
        loading={participantRemoving}
        onConfirm={handleConfirmRemoveParticipant}
        onCancel={() => setParticipantToRemove(null)}
      />
    </div>
  )
}
