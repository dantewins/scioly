import { Badge } from "@/components/ui/badge"
import { formatDateOnly } from "@/lib/format"

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
    <div className="overflow-x-auto">
    <div className="overflow-hidden rounded-[var(--radius)] border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left px-4 py-2 font-medium">Title</th>
            <th className="text-left px-4 py-2 font-medium">Hours</th>
            <th className="text-left px-4 py-2 font-medium">Status</th>
            <th className="text-left px-4 py-2 font-medium">Submitted</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((h) => (
            <tr key={h.id} className="border-t">
              <td className="px-4 py-2">{h.title}</td>
              <td className="px-4 py-2">{parseFloat(String(h.totalHours)).toFixed(1)}</td>
              <td className="px-4 py-2"><Badge variant="outline">{h.status}</Badge></td>
              <td className="px-4 py-2 text-muted-foreground">
                {formatDateOnly(h.submittedAt instanceof Date ? h.submittedAt : h.submittedAt ? new Date(h.submittedAt) : undefined)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    </div>
  )
}
