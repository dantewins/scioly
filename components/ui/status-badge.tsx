import { cn } from "@/lib/utils"

type StatusVariant =
  | "active"
  | "pending"
  | "inactive"
  | "removed"
  | "alumni"
  | "approved"
  | "rejected"
  | "verified"
  | "open"
  | "paid"
  | "overdue"
  | "draft"
  | "void"
  | "default"

const VARIANT_STYLES: Record<StatusVariant, string> = {
  active:   "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800",
  verified: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800",
  paid:     "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800",
  pending:  "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800",
  open:     "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800",
  draft:    "bg-muted text-muted-foreground border-border",
  inactive: "bg-muted text-muted-foreground border-border",
  alumni:   "bg-muted text-muted-foreground border-border",
  void:     "bg-muted text-muted-foreground border-border",
  rejected: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800",
  removed:  "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800",
  overdue:  "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800",
  default:  "bg-muted text-muted-foreground border-border",
}

interface StatusBadgeProps {
  status: string
  label?: string
  className?: string
}

function toVariant(status: string): StatusVariant {
  return (status.toLowerCase() as StatusVariant) in VARIANT_STYLES
    ? (status.toLowerCase() as StatusVariant)
    : "default"
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const variant = toVariant(status)
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[calc(var(--radius)-2px)] border px-1.5 py-0.5 text-[11px] font-medium leading-none",
        VARIANT_STYLES[variant],
        className,
      )}
    >
      {label ?? status.charAt(0).toUpperCase() + status.slice(1).toLowerCase().replace(/_/g, " ")}
    </span>
  )
}
