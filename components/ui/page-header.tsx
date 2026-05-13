import { type ReactNode } from "react"

interface PageHeaderProps {
  title: string
  description?: string
  kicker?: string
  children?: ReactNode  // action slot (buttons)
}

export function PageHeader({ title, description, kicker, children }: PageHeaderProps) {
  return (
    <div className="flex items-end justify-between gap-3 border-b border-border/60 pb-3">
      <div className="min-w-0">
        {kicker && (
          <p className="label-caps mb-1 text-azure-700">{kicker}</p>
        )}
        <h1 className="truncate font-serif text-2xl sm:text-3xl tracking-tight leading-[1.1] text-foreground">
          {title}
        </h1>
        {description && (
          <p className="mt-1 truncate text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {children && (
        <div className="control-row shrink-0">{children}</div>
      )}
    </div>
  )
}
