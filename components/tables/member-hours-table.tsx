import { StatusBadge } from "@/components/ui/status-badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableShell,
} from "@/components/ui/table"
import { formatDateCompact } from "@/lib/format"

interface HourEntry {
  id: string
  title: string
  totalHours: { toString(): string } | string | number
  status: string
  submittedAt: string | Date | null
}

interface Props {
  entries: HourEntry[]
}

export function MemberHoursTable({ entries }: Props) {
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">No hour entries.</p>
  }

  return (
    <TableShell>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead className="text-right">Hours</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Submitted</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((h) => {
            const date = h.submittedAt instanceof Date ? h.submittedAt : h.submittedAt ? new Date(h.submittedAt) : null
            return (
              <TableRow key={h.id}>
                <TableCell className="font-serif text-base leading-tight tracking-tight">{h.title}</TableCell>
                <TableCell className="font-mono tabular-nums text-right text-foreground">
                  {parseFloat(String(h.totalHours)).toFixed(1)}
                </TableCell>
                <TableCell><StatusBadge status={h.status} withDot /></TableCell>
                <TableCell className="font-mono tabular-nums text-muted-foreground">
                  {date ? formatDateCompact(date) : "—"}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </TableShell>
  )
}
