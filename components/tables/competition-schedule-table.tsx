interface EventSchedule {
  id: string
  timeSlot: string | number
  slotLabel: string | null
  event: { id: string; name: string; code: string | null }
}

interface Props {
  schedules: EventSchedule[]
}

export function CompetitionScheduleTable({ schedules }: Props) {
  if (schedules.length === 0) {
    return <p className="text-sm text-muted-foreground">No events scheduled yet.</p>
  }

  return (
    <div className="overflow-x-auto">
    <div className="rounded-lg border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left px-4 py-2 font-medium">Slot</th>
            <th className="text-left px-4 py-2 font-medium">Event</th>
            <th className="text-left px-4 py-2 font-medium">Label</th>
          </tr>
        </thead>
        <tbody>
          {schedules.map((s) => (
            <tr key={s.id} className="border-t">
              <td className="px-4 py-2 font-mono text-xs">{s.timeSlot}</td>
              <td className="px-4 py-2">{s.event.name}</td>
              <td className="px-4 py-2 text-muted-foreground">{s.slotLabel ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    </div>
  )
}
