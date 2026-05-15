import Link from "next/link"
import { type LucideIcon } from "lucide-react"
import { type Icon } from "@tabler/icons-react"
import { cn } from "@/lib/utils"

type MetricTone = "brand" | "success" | "warning" | "danger" | "neutral"

const TONE_CHIP: Record<MetricTone, string> = {
  brand:   "bg-azure-50 text-azure-700",
  success: "bg-[var(--success-soft)] text-[var(--success)]",
  warning: "bg-[var(--warning-soft)] text-[var(--warning)]",
  danger:  "bg-[var(--danger-soft)] text-[var(--danger)]",
  neutral: "bg-muted text-muted-foreground",
}

interface MetricCardProps {
  label: string
  value: string | number
  sub?: string
  icon?: Icon | LucideIcon
  trend?: { value: string; up?: boolean }
  tone?: MetricTone
  href?: string
  className?: string
}

export function MetricCard({
  label, value, sub, icon: IconComponent, trend, tone = "neutral", href, className,
}: MetricCardProps) {
  const inner = (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="label-caps text-muted-foreground">{label}</p>
        <p className="mt-2 font-serif text-2xl sm:text-3xl tabular-nums leading-none text-foreground tracking-tight break-words">
          {value}
        </p>
        {sub && <p className="mt-1.5 text-xs text-muted-foreground">{sub}</p>}
        {trend && (
          <p className={cn(
            "mt-1.5 text-xs font-medium",
            trend.up === true ? "text-[var(--success)]" :
            trend.up === false ? "text-[var(--danger)]" :
            "text-muted-foreground",
          )}>
            {trend.value}
          </p>
        )}
      </div>
      {IconComponent && (
        <div className={cn(
          "shrink-0 rounded-[var(--control-radius)] p-2 transition-colors",
          TONE_CHIP[tone],
          href && "group-hover:bg-azure-100 group-hover:text-azure-700",
        )}>
          <IconComponent className="size-4" />
        </div>
      )}
    </div>
  )

  const baseClass = cn(
    "surface surface-pad relative overflow-hidden",
    href && "group transition-all duration-200 hover:-translate-y-0.5 hover:shadow-azure-soft cursor-pointer",
    className,
  )

  if (href) {
    return (
      <Link href={href} className={baseClass}>
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-px h-[2px] origin-left scale-x-0 bg-azure-500 transition-transform duration-300 group-hover:scale-x-100"
        />
        {inner}
      </Link>
    )
  }

  return <div className={baseClass}>{inner}</div>
}
