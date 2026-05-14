"use client"

import { IconEdit, IconTrash } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { ParticipantList } from "./participant-list"
import {
  ENTRY_STATUS_BADGE,
  type AssignmentRecord,
} from "@/features/competitions/lib/roster-types"

interface Props {
  assignment: AssignmentRecord
  eventName: string
  canManage: boolean
  onEdit: () => void
  onDelete: () => void
  onAddParticipant: () => void
  onRemoveParticipant: (participantId: string) => void
  showRoleHint?: boolean
}

/**
 * One assignment tile in the calendar — event name + status pill in
 * the header, hover-revealed edit/delete on the right, ParticipantList
 * below. Used by both the scheduled and unscheduled rows so the markup
 * lives in exactly one place.
 */
export function AssignmentCard({
  assignment,
  eventName,
  canManage,
  onEdit,
  onDelete,
  onAddParticipant,
  onRemoveParticipant,
  showRoleHint = true,
}: Props) {
  return (
    <div className="group/card relative w-52 space-y-2 rounded-xl border bg-card p-3">
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold leading-tight">{eventName}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1">
            <span
              className={`inline-flex rounded-full px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide ${ENTRY_STATUS_BADGE[assignment.status]}`}
            >
              {assignment.status}
            </span>
            {assignment.room && (
              <span className="text-[10px] text-muted-foreground">Room {assignment.room}</span>
            )}
          </div>
        </div>
        {canManage && (
          <div className="-mr-1 -mt-1 flex shrink-0 items-center opacity-0 transition-opacity group-hover/card:opacity-100">
            <Button variant="ghost" size="icon-xs" onClick={onEdit} aria-label={`Edit ${eventName}`}>
              <IconEdit className="size-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              className="text-muted-foreground hover:text-destructive"
              onClick={onDelete}
              aria-label={`Delete ${eventName}`}
            >
              <IconTrash className="size-3" />
            </Button>
          </div>
        )}
      </div>

      <ParticipantList
        assignment={assignment}
        canManage={canManage}
        onAddParticipant={onAddParticipant}
        onRemoveParticipant={onRemoveParticipant}
        showRoleHint={showRoleHint}
      />
    </div>
  )
}
