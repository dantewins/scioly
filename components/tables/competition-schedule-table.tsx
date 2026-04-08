"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { apiCall } from "@/lib/api-client"

interface Props {
  events: { id: string; name: string; code: string | null }[]
  initialSchedules: { id: string; timeSlot: number; slotLabel: string | null; eventId: string }[]
  competitionId: string
  canManage: boolean
}

type RowState = { timeSlot: string; slotLabel: string }

function buildInitialMap(
  initialSchedules: Props["initialSchedules"],
): Record<string, RowState> {
  const map: Record<string, RowState> = {}
  for (const s of initialSchedules) {
    map[s.eventId] = { timeSlot: String(s.timeSlot), slotLabel: s.slotLabel ?? "" }
  }
  return map
}

export function CompetitionScheduleTable({
  events,
  initialSchedules,
  competitionId,
  canManage,
}: Props) {
  const [scheduleMap, setScheduleMap] = useState<Record<string, RowState>>(
    () => buildInitialMap(initialSchedules),
  )
  const [savedMap, setSavedMap] = useState<Record<string, RowState>>(
    () => buildInitialMap(initialSchedules),
  )
  const [saving, setSaving] = useState<Record<string, boolean>>({})

  function isDirty(eventId: string) {
    const current = scheduleMap[eventId] ?? { timeSlot: "", slotLabel: "" }
    const saved = savedMap[eventId] ?? { timeSlot: "", slotLabel: "" }
    return current.timeSlot !== saved.timeSlot || current.slotLabel !== saved.slotLabel
  }

  function isValid(eventId: string) {
    const val = scheduleMap[eventId]?.timeSlot ?? ""
    const n = parseInt(val, 10)
    return val.trim() !== "" && !isNaN(n) && n >= 1
  }

  async function handleSave(eventId: string) {
    const row = scheduleMap[eventId]
    if (!row) return
    setSaving((s) => ({ ...s, [eventId]: true }))
    try {
      await apiCall(`/api/admin/competitions/${competitionId}/schedule`, {
        method: "POST",
        body: JSON.stringify({
          eventId,
          timeSlot: parseInt(row.timeSlot, 10),
          slotLabel: row.slotLabel.trim() || undefined,
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
      [eventId]: { ...(m[eventId] ?? { timeSlot: "", slotLabel: "" }), ...patch },
    }))
  }

  return (
    <div className="overflow-x-auto">
      <div className="overflow-hidden rounded-[var(--radius)] border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Event</th>
              <th className="text-left px-4 py-2 font-medium">Slot #</th>
              <th className="text-left px-4 py-2 font-medium">Label</th>
              {canManage && <th className="px-4 py-2" />}
            </tr>
          </thead>
          <tbody>
            {events.map((event) => {
              const row = scheduleMap[event.id] ?? { timeSlot: "", slotLabel: "" }
              return (
                <tr key={event.id} className="border-t">
                  <td className="px-4 py-2">
                    <span>{event.name}</span>
                    {event.code && (
                      <Badge variant="outline" className="text-xs ml-2">{event.code}</Badge>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {canManage ? (
                      <Input
                        type="number"
                        min={1}
                        value={row.timeSlot}
                        onChange={(e) => updateRow(event.id, { timeSlot: e.target.value })}
                        className="h-8 w-20 text-xs"
                      />
                    ) : (
                      <span className="font-mono text-xs">{row.timeSlot || "—"}</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {canManage ? (
                      <Input
                        value={row.slotLabel}
                        onChange={(e) => updateRow(event.id, { slotLabel: e.target.value })}
                        className="h-8 w-32 text-xs"
                      />
                    ) : (
                      <span className="text-muted-foreground">{row.slotLabel || "—"}</span>
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
