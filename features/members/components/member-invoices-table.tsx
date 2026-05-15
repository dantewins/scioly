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
    <>
      {/* Mobile: card list */}
      <ul className="space-y-2 md:hidden">
        {invoices.map((inv) => {
          const date = inv.dueAt instanceof Date ? inv.dueAt : inv.dueAt ? new Date(inv.dueAt) : null
          return (
            <li key={inv.id} className="rounded-[var(--radius)] border border-border/80 bg-card px-3 py-2.5">
              <div className="flex items-start justify-between gap-3">
                <p className="font-serif text-sm leading-tight tracking-tight min-w-0 flex-1 truncate">{inv.title}</p>
                <p className="font-mono tabular-nums text-sm font-medium shrink-0">{dollars(inv.amountCents)}</p>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <StatusBadge status={inv.status} withDot />
                {inv.amountPaidCents > 0 && (
                  <span className="font-mono tabular-nums">{dollars(inv.amountPaidCents)} paid</span>
                )}
                {date && <span className="font-mono tabular-nums">Due {formatDateCompact(date)}</span>}
              </div>
            </li>
          )
        })}
      </ul>

      {/* Desktop: table */}
      <TableShell className="hidden md:block">
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
    </>
  )
}
