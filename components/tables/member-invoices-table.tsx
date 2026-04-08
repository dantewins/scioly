import { Badge } from "@/components/ui/badge"
import { formatDateOnly } from "@/lib/format"

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

export function MemberInvoicesTable({ invoices }: Props) {
  if (invoices.length === 0) {
    return <p className="text-sm text-muted-foreground">No invoices.</p>
  }

  return (
    <div className="overflow-x-auto">
    <div className="overflow-hidden rounded-[var(--radius)] border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left px-4 py-2 font-medium">Invoice</th>
            <th className="text-left px-4 py-2 font-medium">Amount</th>
            <th className="text-left px-4 py-2 font-medium">Paid</th>
            <th className="text-left px-4 py-2 font-medium">Status</th>
            <th className="text-left px-4 py-2 font-medium">Due</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv) => (
            <tr key={inv.id} className="border-t">
              <td className="px-4 py-2">{inv.title}</td>
              <td className="px-4 py-2">${(inv.amountCents / 100).toFixed(2)}</td>
              <td className="px-4 py-2">${(inv.amountPaidCents / 100).toFixed(2)}</td>
              <td className="px-4 py-2"><Badge variant="outline">{inv.status}</Badge></td>
              <td className="px-4 py-2 text-muted-foreground">
                {formatDateOnly(inv.dueAt instanceof Date ? inv.dueAt : inv.dueAt ? new Date(inv.dueAt) : undefined)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    </div>
  )
}
