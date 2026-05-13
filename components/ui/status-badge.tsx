import { cn } from "@/lib/utils"

// One canonical badge for every status string in the app. Tone is resolved
// from a central dictionary so the same status string renders identically
// in every table, card, and detail page.

type StatusTone = "success" | "warning" | "info" | "danger" | "neutral" | "brand"

const STATUS_TONE: Record<string, StatusTone> = {
  // success
  active:    "success",
  approved:  "success",
  verified:  "success",
  paid:      "success",
  scored:    "success",
  published: "success",
  live:      "success",
  // warning
  pending:        "warning",
  submitted:      "warning",
  in_progress:    "warning",
  partially_paid: "warning",
  // info (azure-tinted)
  open:        "info",
  not_started: "info",
  recommended: "info",
  invited:     "info",
  // danger
  rejected: "danger",
  removed:  "danger",
  overdue:  "danger",
  failed:   "danger",
  // neutral
  draft:     "neutral",
  inactive:  "neutral",
  alumni:    "neutral",
  void:      "neutral",
  withdrawn: "neutral",
  archived:  "neutral",
}

const TONE_STYLES: Record<StatusTone, string> = {
  success: "bg-[var(--success-soft)] text-[var(--success)] border-[color-mix(in_oklch,var(--success),transparent_72%)]",
  warning: "bg-[var(--warning-soft)] text-[var(--warning)] border-[color-mix(in_oklch,var(--warning),transparent_72%)]",
  info:    "bg-[var(--info-soft)] text-[var(--info)] border-[color-mix(in_oklch,var(--info),transparent_72%)]",
  danger:  "bg-[var(--danger-soft)] text-[var(--danger)] border-[color-mix(in_oklch,var(--danger),transparent_72%)]",
  neutral: "bg-muted text-muted-foreground border-border",
  brand:   "bg-azure-50 text-azure-700 border-azure-200/60",
}

interface StatusBadgeProps {
  status: string
  label?: string
  className?: string
  tone?: StatusTone
  withDot?: boolean
}

function normalize(status: string): string {
  return status.toLowerCase().replace(/-/g, "_")
}

function resolveTone(status: string, override?: StatusTone): StatusTone {
  if (override) return override
  return STATUS_TONE[normalize(status)] ?? "neutral"
}

export function StatusBadge({ status, label, className, tone, withDot }: StatusBadgeProps) {
  const t = resolveTone(status, tone)
  const text = label ?? status.charAt(0).toUpperCase() + status.slice(1).toLowerCase().replace(/_/g, " ")
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[calc(var(--radius)-2px)] border px-1.5 py-0.5 text-[11px] font-medium leading-none",
        TONE_STYLES[t],
        className,
      )}
    >
      {withDot && (
        <span aria-hidden className="size-1.5 rounded-full" style={{ backgroundColor: "currentColor" }} />
      )}
      {text}
    </span>
  )
}
