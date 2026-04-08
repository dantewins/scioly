import type { ReactNode } from "react"
import Link from "next/link"
import { IconAtom } from "@tabler/icons-react"

interface AuthFormShellProps {
  title: string
  description: string
  children: ReactNode
  footer: ReactNode
}

export function AuthFormShell({
  title,
  description,
  children,
  footer,
}: AuthFormShellProps) {
  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="flex justify-center">
        <Link
          href="/"
          className="flex size-10 items-center justify-center rounded-[var(--radius)] bg-primary text-primary-foreground transition-opacity hover:opacity-80"
        >
          <IconAtom className="size-6" strokeWidth={1.75} />
        </Link>
      </div>

      <div className="space-y-1 text-center">
        <h1 className="text-lg font-semibold text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="rounded-[var(--radius)] border border-border bg-card px-[var(--card-px)] py-[var(--card-py)] sm:p-6">
        {children}
      </div>

      <div className="text-center text-xs text-muted-foreground">{footer}</div>
    </div>
  )
}
