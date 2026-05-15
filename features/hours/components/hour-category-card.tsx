import { Badge } from "@/components/ui/badge"

export interface HourCategoryRecord {
  id: string
  name: string
  description: string | null
  requiredHours: string | number | null
  requiresApproval: boolean
  _count: { hourEntries: number }
}

export function HourCategoryCard({ category: cat }: { category: HourCategoryRecord }) {
  return (
    <div className="group relative flex items-center gap-4 rounded-[var(--radius)] border border-border/80 bg-card px-4 py-3 shadow-[0_1px_2px_0_color-mix(in_oklch,var(--azure-300),transparent_88%)]">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm truncate">{cat.name}</p>
          {!cat.requiresApproval && (
            <Badge variant="success" className="text-[10px]">Auto-approve</Badge>
          )}
        </div>
        {cat.description && (
          <p className="mt-1 text-xs text-muted-foreground line-clamp-1">{cat.description}</p>
        )}
        <p className="mt-1 text-[11px] font-mono tabular-nums text-muted-foreground">
          <span className="text-foreground/80">{cat._count.hourEntries}</span> entries logged
        </p>
      </div>
      {cat.requiredHours ? (
        <div className="flex flex-col items-end justify-center shrink-0 text-right">
          <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Target
          </span>
          <span className="font-serif text-2xl leading-none tabular-nums text-foreground">
            {Number(cat.requiredHours)}
            <span className="text-sm text-muted-foreground">h</span>
          </span>
        </div>
      ) : (
        <span className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground shrink-0">
          No target
        </span>
      )}
    </div>
  )
}
