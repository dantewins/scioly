"use client"

import {
  IconMapPin,
  IconUsers,
  IconPencil,
  IconTrash,
  IconClockHour4,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { formatRelativeDate } from "@/lib/format"

// Club event card — signature: a colored "ticket stub" tile on the left
// showing the date/time. Content right with location + attendance.
// Distinct from competition card by the type-tinted full-height stub
// (vs the small ring-stamp) and the inline time-of-day on the stub.

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

const TYPE_STUB: Record<ClubEventType, { bg: string; fg: string }> = {
  MEETING:        { bg: "bg-azure-600",   fg: "text-azure-50" },
  SUPER_SATURDAY: { bg: "bg-violet-600",  fg: "text-violet-50" },
  FUNDRAISER:     { bg: "bg-emerald-600", fg: "text-emerald-50" },
  WORKSHOP:       { bg: "bg-amber-600",   fg: "text-amber-50" },
  FIELD_TRIP:     { bg: "bg-teal-600",    fg: "text-teal-50" },
  OTHER:          { bg: "bg-zinc-700",    fg: "text-zinc-50" },
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
}

interface Props {
  event: ClubEventCardData
  canManage: boolean
  onEdit: (event: ClubEventCardData) => void
  onDelete: (id: string) => void
}

export function ClubEventCard({ event, canManage, onEdit, onDelete }: Props) {
  const startsAt = new Date(event.startsAt)
  const month = startsAt.toLocaleDateString("en-US", { month: "short" }).toUpperCase()
  const day = startsAt.getDate()
  const stub = TYPE_STUB[event.type]
  const relative = formatRelativeDate(startsAt)
  const isPast = startsAt.getTime() < Date.now()

  return (
    <div className="group relative flex overflow-hidden rounded-[var(--radius)] border border-border/80 bg-card shadow-[0_1px_2px_0_color-mix(in_oklch,var(--azure-300),transparent_88%)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-azure-soft">
      {/* Ticket stub */}
      <div className={cn("flex w-[88px] shrink-0 flex-col items-center justify-center gap-1 px-3 py-4", stub.bg, stub.fg)}>
        <span className="font-mono text-[10px] font-semibold tracking-[0.18em] opacity-80">{month}</span>
        <span className="font-serif text-4xl leading-none tabular-nums">{day}</span>
        <span className="font-mono text-[10px] tabular-nums opacity-90">
          {formatTime(event.startsAt)}
        </span>
      </div>

      {/* Perforation */}
      <div aria-hidden className="relative w-px bg-border/60">
        <div className="absolute inset-y-2 left-1/2 -translate-x-1/2 w-px bg-[radial-gradient(circle_at_center,var(--border)_1px,transparent_1px)] bg-[length:1px_6px] bg-repeat-y" />
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col min-w-0 px-4 py-3 gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {TYPE_LABELS[event.type]}
            {event.hoursValue > 0 && (
              <>
                {" · "}
                <span className="text-foreground/80">{event.hoursValue}h credit</span>
              </>
            )}
          </span>
          {canManage && (
            <div className="flex items-center gap-0.5 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
              <Button variant="ghost" size="icon-sm" onClick={() => onEdit(event)} aria-label={`Edit ${event.name}`}>
                <IconPencil className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => onDelete(event.id)}
                aria-label={`Delete ${event.name}`}
              >
                <IconTrash className="size-3.5" />
              </Button>
            </div>
          )}
        </div>

        <h3 className="font-serif text-lg leading-tight tracking-tight text-foreground">
          {event.name}
        </h3>

        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted-foreground">
          {event.location && (
            <span className="inline-flex items-center gap-1 truncate">
              <IconMapPin className="size-3.5" aria-hidden />
              {event.location}
            </span>
          )}
          {event.endsAt && (
            <span className="inline-flex items-center gap-1">
              <IconClockHour4 className="size-3.5" aria-hidden />
              until {formatTime(event.endsAt)}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <IconUsers className="size-3.5" aria-hidden />
            <span className="text-foreground/80 tabular-nums">{event._count.attendance}</span> attended
          </span>
          {relative && (
            <span className={cn("ml-auto text-[11px] font-medium", isPast ? "text-muted-foreground" : "text-azure-700")}>
              {relative}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
