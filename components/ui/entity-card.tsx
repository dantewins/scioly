import Link from "next/link"
import { IconArrowUpRight } from "@tabler/icons-react"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/**
 * The single canonical card pattern for the app.
 * Used for: competitions, assessments, club events, hour entries, form types,
 * seasons, hours categories, members, applicants — anything that's a row in a list.
 *
 * Visual language:
 * - left-edge color accent stripe (3px → widens to 4px on hover)
 * - small-caps kicker line for meta info above the title
 * - serif title (Instrument Serif)
 * - mono tabular metrics row
 * - optional trailing slot (status badge, CTA, action buttons)
 * - subtle azure-tinted shadow + 200ms hover lift when interactive
 */

export type EntityCardTone =
  | "brand"     // azure (default for primary entities)
  | "success"   // approved/active/published
  | "warning"   // pending/in-progress
  | "danger"    // rejected/overdue/failed
  | "info"      // submitted/open
  | "neutral"   // draft/inactive
  | "violet"    // category accents (regional comps, super saturday, etc.)
  | "amber"     // trial, state-level
  | "rose"      // national-level
  | "emerald"   // practice/fundraiser
  | "teal"      // field-trip
  | "zinc"

const TONE_STRIPE: Record<EntityCardTone, string> = {
  brand:   "bg-azure-500",
  success: "bg-[var(--success)]",
  warning: "bg-[var(--warning)]",
  danger:  "bg-[var(--danger)]",
  info:    "bg-azure-500",
  neutral: "bg-zinc-300 dark:bg-zinc-700",
  violet:  "bg-violet-500",
  amber:   "bg-amber-500",
  rose:    "bg-rose-500",
  emerald: "bg-emerald-500",
  teal:    "bg-teal-500",
  zinc:    "bg-zinc-400",
}

const TONE_KICKER: Record<EntityCardTone, string> = {
  brand:   "text-azure-700",
  success: "text-[var(--success)]",
  warning: "text-[var(--warning)]",
  danger:  "text-[var(--danger)]",
  info:    "text-azure-700",
  neutral: "text-muted-foreground",
  violet:  "text-violet-700 dark:text-violet-300",
  amber:   "text-amber-700 dark:text-amber-300",
  rose:    "text-rose-700 dark:text-rose-300",
  emerald: "text-emerald-700 dark:text-emerald-300",
  teal:    "text-teal-700 dark:text-teal-300",
  zinc:    "text-zinc-700 dark:text-zinc-300",
}

export interface EntityCardProps {
  /** Color of the left accent stripe and kicker text. */
  tone?: EntityCardTone
  /** Small-caps meta line above the title (e.g., "INVITATIONAL · DRAFT"). */
  kicker?: ReactNode
  /** Serif title. Can be a string or ReactNode. */
  title: ReactNode
  /** Title size — "md" for list cards (default), "lg" for hero cards, "sm" for tight rows. */
  titleSize?: "sm" | "md" | "lg"
  /** Small body text under the title. */
  description?: ReactNode
  /** Mono tabular metrics row. */
  metrics?: ReactNode
  /** Custom body — rendered after description, before metrics. */
  children?: ReactNode
  /** Right-side slot — status badge, CTA, hover-revealed actions. */
  trailing?: ReactNode
  /** Status badge in the top-right corner of the card. */
  status?: ReactNode
  /** Make the whole card a Link. */
  href?: string
  /** External link target. */
  external?: boolean
  /** Custom onClick (when not using href). */
  onClick?: () => void
  /** Force hover lift even without href/onClick. */
  interactive?: boolean
  /** Show a trailing arrow icon (auto-on when href is set). */
  showArrow?: boolean
  /** Force-show actions / hide on hover. Defaults to hide-on-hover when there's a trailing slot. */
  alwaysShowTrailing?: boolean
  className?: string
}

const TITLE_SIZE: Record<NonNullable<EntityCardProps["titleSize"]>, string> = {
  sm: "text-base sm:text-lg",
  md: "text-xl sm:text-2xl",
  lg: "text-2xl sm:text-3xl",
}

export function EntityCard({
  tone = "brand",
  kicker,
  title,
  titleSize = "md",
  description,
  metrics,
  children,
  trailing,
  status,
  href,
  external,
  onClick,
  interactive,
  showArrow,
  alwaysShowTrailing,
  className,
}: EntityCardProps) {
  const isClickable = Boolean(href || onClick || interactive)
  const wantsArrow = showArrow ?? Boolean(href)

  const shellClasses = cn(
    "group relative block overflow-hidden rounded-[var(--radius)] border border-border/80 bg-card text-left",
    "shadow-[0_1px_2px_0_color-mix(in_oklch,var(--azure-300),transparent_88%)]",
    isClickable &&
      "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-azure-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer",
    !isClickable && "transition-shadow",
    className,
  )

  const inner = (
    <>
      <span
        aria-hidden
        className={cn(
          "absolute inset-y-0 left-0 w-[3px] transition-[width] duration-200",
          TONE_STRIPE[tone],
          isClickable && "group-hover:w-1",
        )}
      />

      <div className="relative grid gap-2.5 pl-4 pr-3 py-3 sm:pl-5 sm:pr-4 sm:py-4 sm:grid-cols-[1fr_auto] sm:items-start">
        <div className="min-w-0 space-y-2">
          {(kicker || status) && (
            <div className="flex items-center justify-between gap-2">
              {kicker ? (
                <span className={cn("label-caps inline-flex items-center gap-1.5", TONE_KICKER[tone])}>
                  {kicker}
                </span>
              ) : (
                <span aria-hidden />
              )}
              {status && <span className="shrink-0">{status}</span>}
            </div>
          )}

          <h3 className={cn("font-serif leading-[1.15] tracking-tight text-foreground", TITLE_SIZE[titleSize])}>
            {title}
          </h3>

          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}

          {children}

          {metrics && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-mono tabular-nums text-muted-foreground">
              {metrics}
            </div>
          )}
        </div>

        {(trailing || wantsArrow) && (
          <div
            className={cn(
              "flex items-center gap-2 self-start sm:self-center justify-self-end shrink-0",
              !alwaysShowTrailing && trailing && "opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity",
            )}
          >
            {trailing}
            {wantsArrow && (
              <IconArrowUpRight
                className="size-4 text-muted-foreground/60 transition-all duration-200 group-hover:text-foreground group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                aria-hidden
              />
            )}
          </div>
        )}
      </div>
    </>
  )

  if (href) {
    return external ? (
      <a href={href} target="_blank" rel="noreferrer noopener" className={shellClasses}>
        {inner}
      </a>
    ) : (
      <Link href={href} className={shellClasses}>
        {inner}
      </Link>
    )
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={shellClasses}>
        {inner}
      </button>
    )
  }

  return <div className={shellClasses}>{inner}</div>
}

/**
 * Helper for the canonical mono tabular metrics row.
 * Usage: <EntityCardMetrics>
 *   <EntityCardMetric label="rosters" value={6} />
 *   <EntityCardMetric label="events" value={23} />
 * </EntityCardMetrics>
 */
export function EntityCardMetric({
  label,
  value,
  icon,
}: {
  label?: string
  value: ReactNode
  icon?: ReactNode
}) {
  return (
    <span className="inline-flex items-center gap-1">
      {icon}
      <span className="text-foreground/80">{value}</span>
      {label && <span>{label}</span>}
    </span>
  )
}
