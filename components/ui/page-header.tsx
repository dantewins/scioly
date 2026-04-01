import { type ReactNode } from "react"

interface PageHeaderProps {
  title: string
  description?: string
  children?: ReactNode  // action slot (buttons)
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-base font-semibold text-foreground truncate">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground mt-0.5 truncate">{description}</p>
        )}
      </div>
      {children && (
        <div className="flex shrink-0 items-center gap-2">{children}</div>
      )}
    </div>
  )
}
