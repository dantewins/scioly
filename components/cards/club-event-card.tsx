"use client"

import { IconMapPin, IconUsers, IconPencil, IconTrash } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { EntityCard, type EntityCardTone } from "@/components/ui/entity-card"
import { formatDateCompact, formatRelativeDate } from "@/lib/format"

type ClubEventType =
  | "MEETING"
  | "SUPER_SATURDAY"
  | "FUNDRAISER"
  | "WORKSHOP"
  | "FIELD_TRIP"
  | "OTHER"

export interface ClubEventCardData {
  id: string
  name: string
  type: ClubEventType
  location: string | null
  startsAt: string
  endsAt: string | null
  hoursValue: number
  notes: string | null
  _count: { attendance: number }
}

const TYPE_LABELS: Record<ClubEventType, string> = {
  MEETING: "Meeting",
  SUPER_SATURDAY: "Super Saturday",
  FUNDRAISER: "Fundraiser",
  WORKSHOP: "Workshop",
  FIELD_TRIP: "Field Trip",
  OTHER: "Other",
}

const TYPE_TONE: Record<ClubEventType, EntityCardTone> = {
  MEETING:        "brand",
  SUPER_SATURDAY: "violet",
  FUNDRAISER:     "emerald",
  WORKSHOP:       "amber",
  FIELD_TRIP:     "teal",
  OTHER:          "zinc",
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
}

interface ClubEventCardProps {
  event: ClubEventCardData
  canManage: boolean
  onEdit: (event: ClubEventCardData) => void
  onDelete: (id: string) => void
}

export function ClubEventCard({ event, canManage, onEdit, onDelete }: ClubEventCardProps) {
  const startsAt = new Date(event.startsAt)
  const relative = formatRelativeDate(startsAt)
  const isPast = startsAt.getTime() < Date.now()

  return (
    <EntityCard
      tone={TYPE_TONE[event.type]}
      kicker={
        <>
          {TYPE_LABELS[event.type]}
          {event.hoursValue > 0 && (
            <>
              <span className="text-border" aria-hidden>·</span>
              <span className="text-muted-foreground">{event.hoursValue}h credit</span>
            </>
          )}
        </>
      }
      title={event.name}
      metrics={
        <>
          <span className="inline-flex items-baseline gap-1.5">
            <span className="text-foreground/90">{formatDateCompact(startsAt)}</span>
            <span>·</span>
            <span>{formatTime(event.startsAt)}{event.endsAt && `–${formatTime(event.endsAt)}`}</span>
          </span>
          {relative && (
            <span className={isPast ? "text-muted-foreground" : "text-foreground/70"}>· {relative}</span>
          )}
          {event.location && (
            <span className="inline-flex items-center gap-1">
              <IconMapPin className="size-3 shrink-0" aria-hidden />
              {event.location}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <IconUsers className="size-3 shrink-0" aria-hidden />
            <span className="text-foreground/80">{event._count.attendance}</span> attended
          </span>
        </>
      }
      trailing={
        canManage ? (
          <>
            <Button variant="ghost" size="icon-sm" onClick={() => onEdit(event)} aria-label={`Edit ${event.name}`}>
              <IconPencil size={13} />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(event.id)}
              aria-label={`Delete ${event.name}`}
            >
              <IconTrash size={13} />
            </Button>
          </>
        ) : undefined
      }
    />
  )
}
