"use client"

import { IconCreditCard } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/status-badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableShell,
} from "@/components/ui/table"
import { formatDateCompact } from "@/lib/format"

export interface InvoiceRow {
  id: string
  title: string
  amountCents: number
  amountPaidCents: number
  status: string
  dueAt: string | null
  issuedAt: string
  memberSeasonId: string
  memberSeason: {
    id: string
    user: { id: string; firstName: string; lastName: string; email: string }
  }
  payments: { id: string; amountCents: number; method: string; paidAt: string; referenceNumber: string | null }[]
}

interface Props {
  invoices: InvoiceRow[]
  canEdit: boolean
  onRecordPayment: (invoice: InvoiceRow) => void
  onVoid: (invoiceId: string) => void
}

function dollars(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function InvoicesTable({ invoices, canEdit, onRecordPayment, onVoid }: Props) {
  if (invoices.length === 0) return null

  return (
    <>
      {/* Mobile: card list */}
      <ul className="space-y-2 md:hidden">
        {invoices.map((inv) => {
          const outstanding = Math.max(0, inv.amountCents - inv.amountPaidCents)
          return (
            <li
              key={inv.id}
              className="rounded-[var(--radius)] border border-border/80 bg-card px-3 py-3 shadow-[0_1px_2px_0_color-mix(in_oklch,var(--azure-300),transparent_88%)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-azure-700">
                    {inv.memberSeason.user.firstName} {inv.memberSeason.user.lastName}
                  </p>
                  <p className="font-serif text-base leading-tight tracking-tight mt-0.5 truncate">
                    {inv.title}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-mono tabular-nums text-base font-medium text-foreground">
                    {dollars(inv.amountCents)}
                  </p>
                  {inv.amountPaidCents > 0 && (
                    <p className="font-mono tabular-nums text-[11px] text-muted-foreground">
                      {dollars(inv.amountPaidCents)} paid
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <StatusBadge status={inv.status} withDot />
                {inv.dueAt && (
                  <span className="font-mono tabular-nums">Due {formatDateCompact(new Date(inv.dueAt))}</span>
                )}
                {outstanding > 0 && (
                  <span className="font-mono tabular-nums text-foreground/80">{dollars(outstanding)} outstanding</span>
                )}
              </div>
              {canEdit && (inv.status === "OPEN" || inv.status === "PARTIALLY_PAID" || (inv.status !== "VOID" && inv.status !== "PAID")) && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(inv.status === "OPEN" || inv.status === "PARTIALLY_PAID") && (
                    <Button size="xs" variant="outline" onClick={() => onRecordPayment(inv)}>
                      <IconCreditCard className="size-3 mr-1" />Record payment
                    </Button>
                  )}
                  {inv.status !== "VOID" && inv.status !== "PAID" && (
                    <Button size="xs" variant="ghost" className="text-muted-foreground" onClick={() => onVoid(inv.id)}>
                      Void
                    </Button>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ul>

      {/* Desktop: table */}
      <TableShell className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Invoice</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Due</TableHead>
              {canEdit && <TableHead className="text-right" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((inv) => (
              <TableRow key={inv.id}>
                <TableCell className="font-medium text-foreground">
                  {inv.memberSeason.user.firstName} {inv.memberSeason.user.lastName}
                </TableCell>
                <TableCell className="font-serif text-base leading-tight tracking-tight">{inv.title}</TableCell>
                <TableCell className="font-mono tabular-nums text-right text-foreground">
                  {dollars(inv.amountCents)}
                </TableCell>
                <TableCell className="font-mono tabular-nums text-right text-muted-foreground">
                  {dollars(inv.amountPaidCents)}
                </TableCell>
                <TableCell>
                  <StatusBadge status={inv.status} withDot />
                </TableCell>
                <TableCell className="font-mono tabular-nums text-muted-foreground">
                  {inv.dueAt ? formatDateCompact(new Date(inv.dueAt)) : "—"}
                </TableCell>
                {canEdit && (
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      {["OPEN", "PARTIALLY_PAID"].includes(inv.status) && (
                        <Button
                          size="xs"
                          variant="outline"
                          className="text-xs"
                          onClick={() => onRecordPayment(inv)}
                        >
                          <IconCreditCard className="size-3 mr-1" />Record
                        </Button>
                      )}
                      {inv.status !== "VOID" && inv.status !== "PAID" && (
                        <Button
                          size="xs"
                          variant="ghost"
                          className="text-xs text-muted-foreground"
                          onClick={() => onVoid(inv.id)}
                        >
                          Void
                        </Button>
                      )}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableShell>
    </>
  )
}
