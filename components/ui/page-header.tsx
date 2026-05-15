import { type ReactNode } from "react"

interface PageHeaderProps {
  title: string
  description?: string
  kicker?: string
  children?: ReactNode  // action slot (buttons)
}

export function PageHeader({ title, description, kicker, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-3 border-b border-border/60 pb-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
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
        <div className="control-row flex-wrap sm:shrink-0">{children}</div>
      )}
    </div>
  )
}
