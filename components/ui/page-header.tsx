import { type ReactNode } from "react"

interface PageHeaderProps {
  title: string
  description?: string
  children?: ReactNode  // action slot (buttons)
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="truncate text-xl font-semibold leading-tight text-foreground">{title}</h1>
        {description && (
          <p className="mt-0.5 truncate text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {children && (
        <div className="control-row shrink-0">{children}</div>
      )}
    </div>
  )
}
