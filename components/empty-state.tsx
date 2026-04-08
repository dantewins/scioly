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
    <div className="flex flex-col items-center justify-center gap-3 rounded-[var(--radius)] border border-dashed py-16 text-center text-muted-foreground">
      <IconComponent className="size-10 opacity-25" />
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description && <p className="text-sm">{description}</p>}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  )
}
