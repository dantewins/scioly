"use client"

import { IconCheck, IconX } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"

export interface PendingEntry {
  id: string
  title: string
  totalHours: string | number
  description: string | null
  proofUrl: string | null
  memberSeason: { user: { id: string; firstName: string; lastName: string } }
  category: { id: string; name: string }
}

interface Props {
  entry: PendingEntry
  selected: boolean
  loading: boolean
  onToggleSelect: (id: string) => void
  onApprove: (id: string) => void
  onReject: (id: string) => void
}

export function HoursPendingRow({ entry, selected, loading, onToggleSelect, onApprove, onReject }: Props) {
  return (
    <div
      className={cn(
        "group relative flex items-start gap-3 rounded-[var(--radius)] border bg-card px-3 py-3 shadow-[0_1px_2px_0_color-mix(in_oklch,var(--azure-300),transparent_88%)] transition-all",
        selected ? "border-azure-300/60 bg-azure-50/30" : "border-border/80",
      )}
    >
      <Checkbox
        className="mt-1"
        checked={selected}
        onCheckedChange={() => onToggleSelect(entry.id)}
        aria-label={`Select ${entry.title}`}
      />

      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-azure-700">
          {entry.memberSeason.user.firstName} {entry.memberSeason.user.lastName}
        </p>
        <p className="mt-0.5 font-medium text-sm truncate">{entry.title}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          <span className="font-mono tabular-nums text-foreground/80">
            {Number(entry.totalHours).toFixed(1)}h
          </span>
          <span className="mx-1.5" aria-hidden>·</span>
          {entry.category.name}
        </p>
        {entry.description && (
          <p className="mt-1 text-xs text-muted-foreground line-clamp-1">{entry.description}</p>
        )}
        {entry.proofUrl && (
          <a
            href={entry.proofUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-block text-[11px] text-azure-700 underline-offset-4 hover:underline"
          >
            View proof →
          </a>
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <Button
          size="icon-sm"
          variant="outline"
          className="text-[var(--success)] border-[color-mix(in_oklch,var(--success),transparent_75%)] hover:bg-[var(--success-soft)]"
          onClick={() => onApprove(entry.id)}
          disabled={loading}
          aria-label={`Approve ${entry.title}`}
        >
          <IconCheck className="size-4" />
        </Button>
        <Button
          size="icon-sm"
          variant="outline"
          className="text-destructive border-destructive/30 hover:bg-destructive/5"
          onClick={() => onReject(entry.id)}
          disabled={loading}
          aria-label={`Reject ${entry.title}`}
        >
          <IconX className="size-4" />
        </Button>
      </div>
    </div>
  )
}
