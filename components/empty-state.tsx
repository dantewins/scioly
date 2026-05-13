import type { Icon } from "@tabler/icons-react"
import type { ReactNode } from "react"

interface EmptyStateProps {
  icon: Icon
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ icon: IconComponent, title, description, action }: EmptyStateProps) {
  return (
    <div className="relative flex flex-col items-center justify-center gap-4 overflow-hidden rounded-[var(--radius)] border border-dashed border-border/70 bg-azure-50/30 py-16 px-6 text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 size-40 rounded-full bg-azure-200/40 blur-3xl"
      />
      <div className="relative flex size-12 items-center justify-center rounded-full bg-azure-50 ring-1 ring-azure-200/50">
        <IconComponent className="size-5 text-azure-700" />
      </div>
      <div className="relative space-y-1 max-w-sm">
        <p className="font-serif text-xl tracking-tight text-foreground">{title}</p>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="relative mt-1">{action}</div>}
    </div>
  )
}
