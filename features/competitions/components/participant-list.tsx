"use client"

import { IconPlus, IconX } from "@tabler/icons-react"
import { getInitials, memberLabel, type AssignmentRecord } from "@/features/competitions/lib/roster-types"

interface Props {
  assignment: AssignmentRecord
  canManage: boolean
  onAddParticipant: () => void
  onRemoveParticipant: (participantId: string) => void
  showRoleHint?: boolean
}

/**
 * The vertical list of participant chips inside an assignment card.
 * Previously inlined twice in competition-roster-manager (once for
 * scheduled assignments, once for unscheduled) — pulled out so the
 * duplication is gone and any chip-style change happens in one place.
 */
export function ParticipantList({
  assignment,
  canManage,
  onAddParticipant,
  onRemoveParticipant,
  showRoleHint = true,
}: Props) {
  return (
    <div className="space-y-1.5">
      {assignment.participants.map((participant) => (
        <div
          key={participant.id}
          className="flex items-center gap-1.5 rounded-md bg-muted/60 px-2 py-1"
        >
          <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-azure-100 text-[10px] font-bold text-azure-700">
            {getInitials(memberLabel(participant.memberSeason))}
          </div>
          <span className="flex-1 truncate text-xs font-medium">
            {memberLabel(participant.memberSeason)}
          </span>
          {showRoleHint && participant.role !== "MEMBER" && (
            <span className="shrink-0 text-[9px] uppercase text-muted-foreground">
              {participant.role[0]}
            </span>
          )}
          {canManage && (
            <button
              type="button"
              onClick={() => onRemoveParticipant(participant.id)}
              className="shrink-0 text-muted-foreground hover:text-foreground"
              aria-label={`Remove ${memberLabel(participant.memberSeason)}`}
            >
              <IconX className="size-3" />
            </button>
          )}
        </div>
      ))}

      {canManage && (
        <button
          type="button"
          onClick={onAddParticipant}
          className="flex h-7 w-full items-center justify-center rounded-md border border-dashed border-border text-muted-foreground transition-colors hover:border-azure-500 hover:text-azure-700"
          aria-label="Add participant"
        >
          <IconPlus className="size-3" />
        </button>
      )}

      {!canManage && assignment.participants.length === 0 && (
        <p className="text-[10px] italic text-muted-foreground">No members assigned</p>
      )}
    </div>
  )
}
