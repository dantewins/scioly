"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import {
  IconEdit,
  IconLoader2,
  IconPlus,
  IconTrash,
  IconWand,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
import { apiCall } from "@/lib/api-client"
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
  const [selectedRosterId, setSelectedRosterId] = useState<string | null>(initialRosters[0]?.id ?? null)

  // Keep selectedRosterId valid when rosters change (e.g. delete, create)
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
      .find((roster) => roster.id === participantDialog.rosterId)
      ?.assignments.find((assignment) => assignment.id === participantDialog.assignmentId) ?? null
  }, [participantDialog, rosters])

  const activeRoster = useMemo(() => {
    if (!participantDialog) return null
    return rosters.find((r) => r.id === participantDialog.rosterId) ?? null
  }, [participantDialog, rosters])

  const availableMembers = useMemo(() => {
    if (!activeAssignment || !activeRoster) return members
    const inThisAssignment = new Set(
      activeAssignment.participants.map((item) => item.memberSeason.id),
    )
    const activeTime = (() => {
      if (activeAssignment.schedule?.startsAt) {
        const t = new Date(activeAssignment.schedule.startsAt).getTime()
        return Number.isNaN(t) ? null : t
      }
      if (activeAssignment.slot?.startsAt) {
        const t = new Date(activeAssignment.slot.startsAt).getTime()
        return Number.isNaN(t) ? null : t
      }
      return null
    })()
    const conflictingMembers = new Set<string>()
    if (activeTime != null) {
      for (const a of activeRoster.assignments) {
        if (a.id === activeAssignment.id) continue
        const aTime = a.schedule?.startsAt
          ? new Date(a.schedule.startsAt).getTime()
          : a.slot?.startsAt
            ? new Date(a.slot.startsAt).getTime()
            : null
        if (aTime !== activeTime) continue
        for (const p of a.participants) conflictingMembers.add(p.memberSeason.id)
      }
    }
    return members.filter((m) => !inThisAssignment.has(m.id) && !conflictingMembers.has(m.id))
  }, [activeAssignment, activeRoster, members])

  const [autoAssigning, setAutoAssigning] = useState(false)
  const [createForSchedule, setCreateForSchedule] = useState<string | null>(null)

  // Build time rows from schedules — group events that share the same start time.
  type TimeRow = {
    key: string
    time: string
    sortValue: number
    schedules: ScheduleOption[]
  }
  const timeRows = useMemo<TimeRow[]>(() => {
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
      if (existing) {
        existing.schedules.push(s)
      } else {
        map.set(key, { key, time, sortValue, schedules: [s] })
      }
    }
    return [...map.values()].sort((a, b) => a.sortValue - b.sortValue)
  }, [schedules])

  // For the selected roster, look up assignment by scheduleId
  const assignmentByScheduleId = useMemo(() => {
    const map = new Map<string, AssignmentRecord>()
    if (!selectedRoster) return map
    for (const a of selectedRoster.assignments) {
      if (a.schedule) map.set(a.schedule.id, a)
    }
    return map
  }, [selectedRoster])

  // Assignments that aren't tied to any schedule (legacy or orphaned)
  const unscheduledAssignments = useMemo<AssignmentRecord[]>(() => {
    if (!selectedRoster) return []
    return selectedRoster.assignments.filter((a) => !a.schedule)
  }, [selectedRoster])

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

  async function handleAddScheduledEvent(roster: CompetitionRosterRecord, scheduleId: string, eventId: string) {
    setCreateForSchedule(scheduleId)
    try {
      const created = await apiCall<CompetitionRosterRecord["assignments"][number]>(
        `/api/admin/competitions/${competitionId}/rosters/${roster.id}/assignments`,
        {
          method: "POST",
          body: JSON.stringify({ eventId, scheduleId }),
        },
      )
      updateAssignment(roster.id, created)
      // Open participant dialog so the user can immediately add members
      setParticipantDialog({ rosterId: roster.id, assignmentId: created.id })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add event to roster.")
    } finally {
      setCreateForSchedule(null)
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
        description="Pick a roster to view its event calendar and assigned members."
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
          <div className="space-y-4">
            {/* Roster selector tabs (squad-style) */}
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
                {/* Selected roster's meta + Auto Assign + Edit/Delete */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {selectedRoster.seasonRosterId && (
                        <Badge variant="secondary" className="text-xs">
                          Base roster: {rosterMap[selectedRoster.seasonRosterId] ?? "Linked"}
                        </Badge>
                      )}
                      <span>
                        {selectedRoster.assignments.length} event{selectedRoster.assignments.length === 1 ? "" : "s"} assigned
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
                        onClick={() => handleAutoAssign(selectedRoster)}
                        disabled={autoAssigning || selectedRoster.assignments.length === 0}
                      >
                        {autoAssigning ? <IconLoader2 className="mr-1.5 size-4 animate-spin" /> : <IconWand className="mr-1.5 size-4" />}
                        Auto Assign
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => openEditRoster(selectedRoster)}>
                        <IconEdit className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-destructive" onClick={() => deleteRoster(selectedRoster)}>
                        <IconTrash className="size-4" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Vertical time-sidebar calendar */}
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
                        {/* Time label column */}
                        <div className="font-mono text-sm font-semibold text-foreground pt-2">
                          {row.time}
                        </div>

                        {/* Events at this time */}
                        <div className="flex flex-wrap gap-2">
                          {row.schedules.map((schedule) => {
                            const assignment = assignmentByScheduleId.get(schedule.id)
                            const eventName = schedule.event.name
                            const isCreating = createForSchedule === schedule.id

                            // Empty card — schedule exists but this roster has no assignment yet
                            if (!assignment) {
                              return (
                                <button
                                  key={schedule.id}
                                  type="button"
                                  disabled={!canManage || isCreating}
                                  onClick={() => handleAddScheduledEvent(selectedRoster, schedule.id, schedule.event.id)}
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
                                onDelete={() => deleteAssignment(selectedRoster, assignment.id)}
                                onAddParticipant={() => openParticipantDialog(selectedRoster, assignment.id)}
                                onRemoveParticipant={(participantId) =>
                                  removeParticipant(selectedRoster.id, assignment.id, participantId)
                                }
                              />
                            )
                          })}
                        </div>
                      </div>
                    ))}

                    {/* Unscheduled assignments fallback row */}
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
                              onDelete={() => deleteAssignment(selectedRoster, assignment.id)}
                              onAddParticipant={() => openParticipantDialog(selectedRoster, assignment.id)}
                              onRemoveParticipant={(participantId) =>
                                removeParticipant(selectedRoster.id, assignment.id, participantId)
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
