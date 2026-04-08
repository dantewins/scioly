import { type LucideIcon } from "lucide-react"
import { type Icon } from "@tabler/icons-react"
import { cn } from "@/lib/utils"

interface MetricCardProps {
  label: string
  value: string | number
  sub?: string
  icon?: Icon | LucideIcon
  trend?: { value: string; up?: boolean }
  className?: string
}

export function MetricCard({ label, value, sub, icon: IconComponent, trend, className }: MetricCardProps) {
  return (
    <div className={cn(
      "surface surface-pad",
      className,
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground leading-none">{value}</p>
          {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
          {trend && (
            <p className={cn(
              "mt-1.5 text-xs font-medium",
              trend.up === true ? "text-emerald-600 dark:text-emerald-400" :
              trend.up === false ? "text-red-600 dark:text-red-400" :
              "text-muted-foreground",
            )}>
              {trend.value}
            </p>
          )}
        </div>
        {IconComponent && (
          <div className="shrink-0 rounded-[var(--control-radius)] bg-muted p-2">
            <IconComponent className="size-4 text-muted-foreground" />
          </div>
        )}
      </div>
    </div>
  )
}
