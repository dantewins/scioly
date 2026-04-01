import { Badge } from "@/components/ui/badge"

interface EventEnrollment {
  id: string
  status: string
  event: { id: string; name: string; code: string | null }
}

interface Props {
  enrollments: EventEnrollment[]
}

export function MemberEventsTable({ enrollments }: Props) {
  if (enrollments.length === 0) {
    return <p className="text-sm text-muted-foreground">No event enrollments.</p>
  }

  return (
    <div className="overflow-x-auto">
    <div className="rounded-lg border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left px-4 py-2 font-medium">Event</th>
            <th className="text-left px-4 py-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {enrollments.map((e) => (
            <tr key={e.id} className="border-t">
              <td className="px-4 py-2">{e.event.name}</td>
              <td className="px-4 py-2">
                <Badge variant="outline">{e.status}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    </div>
  )
}
