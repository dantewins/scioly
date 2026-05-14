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
    <TableShell>
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
  )
}
