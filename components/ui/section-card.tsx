import { type ReactNode } from "react"
import { cn } from "@/lib/utils"

interface SectionCardProps {
  title?: string
  description?: string
  action?: ReactNode
  children: ReactNode
  className?: string
  flush?: boolean  // removes padding from children area (for tables)
}

export function SectionCard({
  title, description, action, children, className, flush = false,
}: SectionCardProps) {
  return (
    <div className={cn("rounded-[var(--radius)] border border-border bg-card", className)}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-4 border-b border-border px-[var(--card-px)] py-[var(--card-py)]">
          <div className="min-w-0">
            {title && <p className="text-sm font-medium text-foreground">{title}</p>}
            {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
          </div>
          {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
        </div>
      )}
      <div className={flush ? "" : "px-[var(--card-px)] py-[var(--card-py)]"}>
        {children}
      </div>
    </div>
  )
}
