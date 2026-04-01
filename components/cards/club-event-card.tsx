"use client"

import {
  CalendarBlankIcon,
  MapPinIcon,
  ClockIcon,
  UsersIcon,
  PencilSimpleIcon,
  TrashIcon,
} from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

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

const TYPE_COLORS: Record<ClubEventType, string> = {
  MEETING: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  SUPER_SATURDAY: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  FUNDRAISER: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  WORKSHOP: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  FIELD_TRIP: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  OTHER: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  })
}

interface ClubEventCardProps {
  event: ClubEventCardData
  canManage: boolean
  onEdit: (event: ClubEventCardData) => void
  onDelete: (id: string) => void
}

export function ClubEventCard({ event, canManage, onEdit, onDelete }: ClubEventCardProps) {
  return (
    <Card className="group">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-sm font-medium">{event.name}</CardTitle>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[event.type]}`}
              >
                {TYPE_LABELS[event.type]}
              </span>
            </div>
          </div>
          {canManage && (
            <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() => onEdit(event)}
              >
                <PencilSimpleIcon size={13} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground hover:text-destructive"
                onClick={() => onDelete(event.id)}
              >
                <TrashIcon size={13} />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-1.5">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarBlankIcon size={12} />
          <span>
            {formatDate(event.startsAt)} at {formatTime(event.startsAt)}
            {event.endsAt && ` — ${formatTime(event.endsAt)}`}
          </span>
        </div>
        {event.location && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPinIcon size={12} />
            <span>{event.location}</span>
          </div>
        )}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {event.hoursValue > 0 && (
            <span className="flex items-center gap-1">
              <ClockIcon size={12} />
              {event.hoursValue}h
            </span>
          )}
          <span className="flex items-center gap-1">
            <UsersIcon size={12} />
            {event._count.attendance} attended
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
