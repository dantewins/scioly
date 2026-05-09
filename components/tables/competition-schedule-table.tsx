"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { apiCall } from "@/lib/api-client"

interface Props {
  events: { id: string; name: string; code: string | null }[]
  initialSchedules: { id: string; timeSlot: number; startsAt: string | null; eventId: string }[]
  competitionId: string
  competitionStartsAt: string
  canManage: boolean
}

type RowState = { time: string }

function dateToTimeInput(value: string | null): string {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  const hh = date.getHours().toString().padStart(2, "0")
  const mm = date.getMinutes().toString().padStart(2, "0")
  return `${hh}:${mm}`
}

function combineDateAndTime(competitionStartsAt: string, time: string): string | null {
  if (!time) return null
  const [hourStr, minuteStr] = time.split(":")
  const h = parseInt(hourStr ?? "", 10)
  const m = parseInt(minuteStr ?? "", 10)
  if (Number.isNaN(h) || Number.isNaN(m)) return null
  const base = new Date(competitionStartsAt)
  if (Number.isNaN(base.getTime())) return null
  base.setHours(h, m, 0, 0)
  return base.toISOString()
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":")
  return parseInt(h ?? "0", 10) * 60 + parseInt(m ?? "0", 10)
}

function buildInitialMap(initialSchedules: Props["initialSchedules"]): Record<string, RowState> {
  const map: Record<string, RowState> = {}
  for (const s of initialSchedules) {
    map[s.eventId] = { time: dateToTimeInput(s.startsAt) }
  }
  return map
}

export function CompetitionScheduleTable({
  events,
  initialSchedules,
  competitionId,
  competitionStartsAt,
  canManage,
}: Props) {
  const [scheduleMap, setScheduleMap] = useState<Record<string, RowState>>(
    () => buildInitialMap(initialSchedules),
  )
  const [savedMap, setSavedMap] = useState<Record<string, RowState>>(
    () => buildInitialMap(initialSchedules),
  )
  const [saving, setSaving] = useState<Record<string, boolean>>({})

  // timeSlot is derived from chronological order of all rows that have a time set.
  const timeSlotByEvent = useMemo(() => {
    const sorted = events
      .map((e) => ({ id: e.id, time: scheduleMap[e.id]?.time ?? "" }))
      .filter((r) => r.time)
      .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time))
    const map: Record<string, number> = {}
    sorted.forEach((row, i) => {
      map[row.id] = i + 1
    })
    return map
  }, [events, scheduleMap])

  function isDirty(eventId: string) {
    return (scheduleMap[eventId]?.time ?? "") !== (savedMap[eventId]?.time ?? "")
  }

  function isValid(eventId: string) {
    return !!scheduleMap[eventId]?.time
  }

  async function handleSave(eventId: string) {
    const row = scheduleMap[eventId]
    if (!row) return
    const startsAt = combineDateAndTime(competitionStartsAt, row.time)
    if (!startsAt) {
      toast.error("Pick a valid time.")
      return
    }
    setSaving((s) => ({ ...s, [eventId]: true }))
    try {
      await apiCall(`/api/admin/competitions/${competitionId}/schedule`, {
        method: "POST",
        body: JSON.stringify({
          eventId,
          timeSlot: timeSlotByEvent[eventId] ?? 1,
          startsAt,
        }),
      })
      setSavedMap((s) => ({ ...s, [eventId]: { ...row } }))
      toast.success("Schedule saved.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save schedule.")
    } finally {
      setSaving((s) => ({ ...s, [eventId]: false }))
    }
  }

  function updateRow(eventId: string, patch: Partial<RowState>) {
    setScheduleMap((m) => ({
      ...m,
      [eventId]: { ...(m[eventId] ?? { time: "" }), ...patch },
    }))
  }

  return (
    <div className="overflow-x-auto">
      <div className="overflow-hidden rounded-[var(--radius)] border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Event</th>
              <th className="text-left px-4 py-2 font-medium">Time</th>
              {canManage && <th className="px-4 py-2" />}
            </tr>
          </thead>
          <tbody>
            {events.map((event) => {
              const row = scheduleMap[event.id] ?? { time: "" }
              return (
                <tr key={event.id} className="border-t">
                  <td className="px-4 py-2">
                    <span>{event.name}</span>
                  </td>
                  <td className="px-4 py-2">
                    {canManage ? (
                      <Input
                        type="time"
                        value={row.time}
                        onChange={(e) => updateRow(event.id, { time: e.target.value })}
                        className="h-8 w-32 text-xs"
                      />
                    ) : (
                      <span className="font-mono text-xs">{row.time || "—"}</span>
                    )}
                  </td>
                  {canManage && (
                    <td className="px-4 py-2 text-right">
                      <Button
                        size="xs"
                        variant="outline"
                        className="text-xs"
                        disabled={!isDirty(event.id) || !isValid(event.id) || !!saving[event.id]}
                        onClick={() => handleSave(event.id)}
                      >
                        {saving[event.id] ? "Saving…" : "Save"}
                      </Button>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
