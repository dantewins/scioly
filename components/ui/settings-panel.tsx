import { type ReactNode } from "react"
import { cn } from "@/lib/utils"

interface SettingRowProps {
  label: string
  description?: string
  children: ReactNode
  className?: string
}

export function SettingRow({ label, description, children, className }: SettingRowProps) {
  return (
    <div className={cn(
      "flex items-start justify-between gap-6 py-[var(--card-py)] border-b border-border last:border-0",
      className,
    )}>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div className="shrink-0 flex items-center">{children}</div>
    </div>
  )
}

interface SettingsPanelProps {
  title?: string
  description?: string
  children: ReactNode
  className?: string
}

export function SettingsPanel({ title, description, children, className }: SettingsPanelProps) {
  return (
    <div className={cn("rounded-[var(--radius)] border border-border bg-card", className)}>
      {(title || description) && (
        <div className="border-b border-border px-[var(--card-px)] py-[var(--card-py)]">
          {title && <p className="text-sm font-medium text-foreground">{title}</p>}
          {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
        </div>
      )}
      <div className="px-[var(--card-px)]">
        {children}
      </div>
    </div>
  )
}
