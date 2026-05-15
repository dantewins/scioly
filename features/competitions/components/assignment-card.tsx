"use client"

import { IconEdit, IconTrash, IconTrophy } from "@tabler/icons-react"
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
  onRecordResult?: () => void
  showRoleHint?: boolean
}

function placementColor(placement: number): string {
  if (placement === 1) return "text-amber-600 bg-amber-50 ring-amber-200"
  if (placement === 2) return "text-slate-700 bg-slate-100 ring-slate-200"
  if (placement === 3) return "text-orange-700 bg-orange-50 ring-orange-200"
  if (placement <= 10) return "text-[var(--success)] bg-[var(--success-soft)] ring-[color-mix(in_oklch,var(--success),transparent_70%)]"
  return "text-muted-foreground bg-muted ring-border"
}

function ordinalSuffix(n: number): string {
  const last = n % 10
  const lastTwo = n % 100
  if (lastTwo >= 11 && lastTwo <= 13) return "th"
  if (last === 1) return "st"
  if (last === 2) return "nd"
  if (last === 3) return "rd"
  return "th"
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
  onRecordResult,
  showRoleHint = true,
}: Props) {
  const placement = assignment.placement
  const scoreEarned = assignment.scoreEarned !== null && assignment.scoreEarned !== undefined ? Number(assignment.scoreEarned) : null
  const scorePossible = assignment.scorePossible !== null && assignment.scorePossible !== undefined ? Number(assignment.scorePossible) : null
  const hasResult = placement !== null || scoreEarned !== null || scorePossible !== null || assignment.medalNotes !== null

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
            {onRecordResult && (
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={onRecordResult}
                aria-label={hasResult ? `Edit result for ${eventName}` : `Record result for ${eventName}`}
                title={hasResult ? "Edit result" : "Record result"}
              >
                <IconTrophy className="size-3" />
              </Button>
            )}
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

      {hasResult && (
        <div className="flex flex-wrap items-center gap-1.5 rounded-md bg-muted/40 px-2 py-1.5">
          {placement !== null && (
            <span
              className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${placementColor(placement)}`}
            >
              {placement}
              <span className="text-[8px] uppercase">{ordinalSuffix(placement)}</span>
            </span>
          )}
          {scoreEarned !== null && (
            <span className="font-mono tabular-nums text-[10px] text-foreground/80">
              {scoreEarned}{scorePossible !== null ? `/${scorePossible}` : ""}
            </span>
          )}
          {assignment.medalNotes && (
            <span className="text-[10px] text-muted-foreground truncate" title={assignment.medalNotes}>
              {assignment.medalNotes}
            </span>
          )}
        </div>
      )}

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
