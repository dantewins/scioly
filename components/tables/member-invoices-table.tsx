import { StatusBadge } from "@/components/ui/status-badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableShell,
} from "@/components/ui/table"
import { formatDateCompact } from "@/lib/format"

interface Invoice {
  id: string
  title: string
  amountCents: number
  amountPaidCents: number
  status: string
  dueAt: string | Date | null
}

interface Props {
  invoices: Invoice[]
}

function dollars(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function MemberInvoicesTable({ invoices }: Props) {
  if (invoices.length === 0) {
    return <p className="text-sm text-muted-foreground">No invoices.</p>
  }

  return (
    <TableShell>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="text-right">Paid</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Due</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((inv) => {
            const date = inv.dueAt instanceof Date ? inv.dueAt : inv.dueAt ? new Date(inv.dueAt) : null
            return (
              <TableRow key={inv.id}>
                <TableCell className="font-serif text-base leading-tight tracking-tight">{inv.title}</TableCell>
                <TableCell className="font-mono tabular-nums text-right text-foreground">{dollars(inv.amountCents)}</TableCell>
                <TableCell className="font-mono tabular-nums text-right text-muted-foreground">{dollars(inv.amountPaidCents)}</TableCell>
                <TableCell><StatusBadge status={inv.status} withDot /></TableCell>
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
