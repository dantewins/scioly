import { StatusBadge } from "@/components/ui/status-badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableShell,
} from "@/components/ui/table"

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
    <TableShell>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Event</TableHead>
            <TableHead className="w-32">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {enrollments.map((e) => (
            <TableRow key={e.id}>
              <TableCell className="font-serif text-base leading-tight tracking-tight">
                {e.event.name}
                {e.event.code && <span className="ml-2 label-caps text-muted-foreground">{e.event.code}</span>}
              </TableCell>
              <TableCell><StatusBadge status={e.status} withDot /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableShell>
  )
}
