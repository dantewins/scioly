import { IconWallet, IconCash, IconReceipt2, IconCircleCheckFilled } from "@tabler/icons-react"
import { SectionCard } from "@/components/ui/section-card"
import { StatusBadge } from "@/components/ui/status-badge"
import { EmptyState } from "@/components/empty-state"
import { formatDateOnly } from "@/lib/format"

export interface MyInvoice {
  id: string
  title: string
  status: string
  amountCents: number
  amountPaidCents: number
  dueAt: string | null
  issuedAt: string
  paidAt: string | null
  notes: string | null
  payments: Array<{
    id: string
    amountCents: number
    method: string
    paidAt: string
    referenceNumber: string | null
  }>
}

function dollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function invoiceTone(status: string, outstandingCents: number): "warning" | "success" | "neutral" | "danger" {
  if (status === "PAID") return "success"
  if (status === "VOID") return "neutral"
  if (status === "OVERDUE") return "danger"
  if (outstandingCents > 0) return "warning"
  return "neutral"
}

export function MyFinancesView({ invoices }: { invoices: MyInvoice[] }) {
  const open = invoices.filter((i) => i.status !== "PAID" && i.status !== "VOID")
  const closed = invoices.filter((i) => i.status === "PAID" || i.status === "VOID")
  const totalOutstanding = open.reduce(
    (sum, i) => sum + Math.max(0, i.amountCents - i.amountPaidCents),
    0,
  )
  const totalPaid = invoices.reduce(
    (sum, i) => sum + (i.amountPaidCents > 0 ? i.amountPaidCents : 0),
    0,
  )

  if (invoices.length === 0) {
    return (
      <EmptyState
        icon={IconWallet}
        title="No invoices yet"
        description="Your admin hasn't issued any dues invoices to you yet."
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <SummaryStat
          icon={IconWallet}
          label="Outstanding"
          value={dollars(totalOutstanding)}
          tone={totalOutstanding > 0 ? "warning" : "success"}
        />
        <SummaryStat
          icon={IconReceipt2}
          label="Open Invoices"
          value={String(open.length)}
          tone={open.length > 0 ? "warning" : "neutral"}
        />
        <SummaryStat
          icon={IconCash}
          label="Lifetime Paid"
          value={dollars(totalPaid)}
          tone="neutral"
        />
      </div>

      {open.length > 0 && (
        <SectionCard
          title="Open Invoices"
          description="Talk to your club admin about how to pay these."
          flush
        >
          <ul className="divide-y divide-border/60">
            {open.map((inv) => {
              const outstanding = Math.max(0, inv.amountCents - inv.amountPaidCents)
              return (
                <li key={inv.id} className="px-[var(--card-px)] py-3">
                  <div className="flex items-baseline justify-between gap-3 mb-1">
                    <p className="font-serif text-base leading-tight tracking-tight">{inv.title}</p>
                    <p className="font-mono tabular-nums text-base font-medium text-foreground shrink-0">
                      {dollars(outstanding)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <StatusBadge status={inv.status} tone={invoiceTone(inv.status, outstanding)} />
                    {inv.dueAt && <span>Due {formatDateOnly(new Date(inv.dueAt))}</span>}
                    {inv.amountPaidCents > 0 && (
                      <span>· {dollars(inv.amountPaidCents)} of {dollars(inv.amountCents)} paid</span>
                    )}
                  </div>
                  {inv.notes && (
                    <p className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap">{inv.notes}</p>
                  )}
                </li>
              )
            })}
          </ul>
        </SectionCard>
      )}

      {closed.length > 0 && (
        <SectionCard title="History" flush>
          <ul className="divide-y divide-border/60">
            {closed.map((inv) => (
              <li key={inv.id} className="px-[var(--card-px)] py-3">
                <div className="flex items-baseline justify-between gap-3 mb-1">
                  <p className="font-serif text-base leading-tight tracking-tight">{inv.title}</p>
                  <p className="font-mono tabular-nums text-sm text-muted-foreground shrink-0">
                    {dollars(inv.amountCents)}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {inv.status === "PAID" ? (
                    <span className="inline-flex items-center gap-1 text-[var(--success)]">
                      <IconCircleCheckFilled className="size-3.5" />
                      Paid {inv.paidAt ? formatDateOnly(new Date(inv.paidAt)) : ""}
                    </span>
                  ) : (
                    <StatusBadge status={inv.status} tone="neutral" />
                  )}
                  {inv.payments.length > 0 && (
                    <span>· {inv.payments.length} payment{inv.payments.length === 1 ? "" : "s"}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}
    </div>
  )
}

function SummaryStat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof IconWallet
  label: string
  value: string
  tone: "warning" | "success" | "neutral" | "danger"
}) {
  const toneClass: Record<typeof tone, string> = {
    warning: "bg-[var(--warning-soft)] text-[var(--warning)]",
    success: "bg-[var(--success-soft)] text-[var(--success)]",
    danger: "bg-[var(--danger-soft)] text-[var(--danger)]",
    neutral: "bg-muted text-muted-foreground",
  }
  return (
    <div className="surface surface-pad flex items-center gap-3">
      <div className={`rounded-[var(--control-radius)] p-2 shrink-0 ${toneClass[tone]}`}>
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <p className="label-caps text-muted-foreground">{label}</p>
        <p className="font-serif text-xl tabular-nums leading-none mt-1 tracking-tight">{value}</p>
      </div>
    </div>
  )
}
