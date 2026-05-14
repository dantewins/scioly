import { type ReactNode } from "react"

interface PageHeaderProps {
  title: string
  description?: string
  kicker?: string
  children?: ReactNode  // action slot (buttons)
}

export function PageHeader({ title, description, kicker, children }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border/60 pb-3">
      <div className="min-w-0 flex-1">
        {kicker && (
          <p className="label-caps mb-1 text-azure-700 truncate">{kicker}</p>
        )}
        <h1 className="font-serif text-xl sm:text-3xl tracking-tight leading-[1.1] text-foreground break-words">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground break-words">{description}</p>
        )}
      </div>
      {children && (
        <div className="control-row shrink-0 flex-wrap">{children}</div>
      )}
    </div>
  )
}
