"use client"

import { IconCreditCard } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatDateOnly } from "@/lib/format"

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

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-800",
  PARTIALLY_PAID: "bg-yellow-100 text-yellow-800",
  PAID: "bg-green-100 text-green-800",
  OVERDUE: "bg-red-100 text-red-800",
  DRAFT: "bg-gray-100 text-gray-800",
  VOID: "bg-gray-100 text-gray-500",
}

interface Props {
  invoices: InvoiceRow[]
  canEdit: boolean
  onRecordPayment: (invoice: InvoiceRow) => void
  onVoid: (invoiceId: string) => void
}

export function InvoicesTable({ invoices, canEdit, onRecordPayment, onVoid }: Props) {
  if (invoices.length === 0) {
    return <p className="text-sm text-muted-foreground">No invoices yet.</p>
  }

  return (
    <div className="overflow-x-auto">
    <div className="rounded-lg border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left px-4 py-2 font-medium">Member</th>
            <th className="text-left px-4 py-2 font-medium">Invoice</th>
            <th className="text-left px-4 py-2 font-medium">Amount</th>
            <th className="text-left px-4 py-2 font-medium">Paid</th>
            <th className="text-left px-4 py-2 font-medium">Status</th>
            <th className="text-left px-4 py-2 font-medium">Due</th>
            {canEdit && <th className="px-4 py-2" />}
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv) => (
            <tr key={inv.id} className="border-t">
              <td className="px-4 py-2 text-xs">
                {inv.memberSeason.user.firstName} {inv.memberSeason.user.lastName}
              </td>
              <td className="px-4 py-2 font-medium">{inv.title}</td>
              <td className="px-4 py-2">${(inv.amountCents / 100).toFixed(2)}</td>
              <td className="px-4 py-2">${(inv.amountPaidCents / 100).toFixed(2)}</td>
              <td className="px-4 py-2">
                <Badge variant="outline" className={`text-xs ${STATUS_COLORS[inv.status] ?? ""}`}>
                  {inv.status}
                </Badge>
              </td>
              <td className="px-4 py-2 text-muted-foreground">
                {formatDateOnly(inv.dueAt ? new Date(inv.dueAt) : undefined)}
              </td>
              {canEdit && (
                <td className="px-4 py-2">
                  <div className="flex gap-1">
                    {["OPEN", "PARTIALLY_PAID"].includes(inv.status) && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => onRecordPayment(inv)}
                      >
                        <IconCreditCard className="size-3 mr-1" />Record
                      </Button>
                    )}
                    {inv.status !== "VOID" && inv.status !== "PAID" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-muted-foreground"
                        onClick={() => onVoid(inv.id)}
                      >
                        Void
                      </Button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    </div>
  )
}
