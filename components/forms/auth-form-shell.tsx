import type { ReactNode } from "react"
import Link from "next/link"
import { IconAtom } from "@tabler/icons-react"

interface AuthFormShellProps {
  title: string
  description: string
  children: ReactNode
  footer: ReactNode
  kicker?: string
}

export function AuthFormShell({
  title,
  description,
  children,
  footer,
  kicker = "Science Olympiad",
}: AuthFormShellProps) {
  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="flex flex-col items-center gap-3">
        <Link
          href="/"
          aria-label="Home"
          className="group relative flex size-12 items-center justify-center"
        >
          <span
            aria-hidden
            className="absolute inset-0 rounded-[calc(var(--radius)+2px)] bg-azure-500 opacity-25 blur-md transition-opacity group-hover:opacity-40"
          />
          <span className="relative flex size-12 items-center justify-center rounded-[calc(var(--radius)+2px)] bg-gradient-to-br from-azure-500 to-azure-700 text-white shadow-azure-soft transition-transform group-hover:-translate-y-0.5">
            <IconAtom className="size-6" strokeWidth={1.75} />
          </span>
        </Link>
        <p className="label-caps text-azure-700">{kicker}</p>
      </div>

      <div className="space-y-2 text-center">
        <h1 className="font-serif text-3xl tracking-tight text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="relative">
        <span
          aria-hidden
          className="absolute -top-px left-6 right-6 h-px bg-gradient-to-r from-transparent via-azure-400/60 to-transparent"
        />
        <div className="rounded-[var(--radius)] border border-border/70 bg-card/95 backdrop-blur-sm shadow-azure-soft px-[var(--card-px)] py-[var(--card-py)] sm:p-6">
          {children}
        </div>
      </div>

      <div className="text-center text-xs text-muted-foreground">{footer}</div>
    </div>
  )
}
