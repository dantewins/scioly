import Link from "next/link"
import { IconArrowUpRight, IconMapPin } from "@tabler/icons-react"
import { formatRelativeDate } from "@/lib/format"
import { cn } from "@/lib/utils"

// Competition card — signature: a stacked date "stamp" on the left
// (MONTH / DAY / DAY-OF-WEEK), edition + status above the title on the right.
// Reads like a paper event flyer.

const TYPE_LABEL: Record<string, string> = {
  INVITATIONAL: "Invitational",
  REGIONAL: "Regional",
  STATE: "State",
  NATIONAL: "National",
  PRACTICE: "Practice",
  OTHER: "Other",
}

const TYPE_PALETTE: Record<string, { stamp: string; stampText: string; tag: string; ring: string }> = {
  INVITATIONAL: { stamp: "bg-azure-50",   stampText: "text-azure-700",   tag: "text-azure-700",   ring: "ring-azure-200/70" },
  REGIONAL:     { stamp: "bg-violet-50",  stampText: "text-violet-700",  tag: "text-violet-700",  ring: "ring-violet-200/70" },
  STATE:        { stamp: "bg-amber-50",   stampText: "text-amber-700",   tag: "text-amber-700",   ring: "ring-amber-200/70" },
  NATIONAL:     { stamp: "bg-rose-50",    stampText: "text-rose-700",    tag: "text-rose-700",    ring: "ring-rose-200/70" },
  PRACTICE:     { stamp: "bg-emerald-50", stampText: "text-emerald-700", tag: "text-emerald-700", ring: "ring-emerald-200/70" },
  OTHER:        { stamp: "bg-zinc-100",   stampText: "text-zinc-700",    tag: "text-zinc-700",    ring: "ring-zinc-200/70" },
}

interface CompetitionCardProps {
  id: string
  name: string
  type: string
  location: string | null
  startsAt: Date
  isPublished: boolean
  rosterCount: number
  eventCount: number
}

export function CompetitionCard({
  id, name, type, location, startsAt, isPublished, rosterCount, eventCount,
}: CompetitionCardProps) {
  const palette = TYPE_PALETTE[type] ?? TYPE_PALETTE.OTHER
  const month = startsAt.toLocaleDateString("en-US", { month: "short" }).toUpperCase()
  const day = startsAt.getDate()
  const weekday = startsAt.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase()
  const relative = formatRelativeDate(startsAt)
  const isPast = startsAt.getTime() < Date.now()

  return (
    <Link
      href={`/dashboard/competitions/${id}`}
      className="group relative block overflow-hidden rounded-[var(--radius)] border border-border/80 bg-card shadow-[0_1px_2px_0_color-mix(in_oklch,var(--azure-300),transparent_88%)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-azure-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <div className="flex">
        {/* Date stamp column */}
        <div className={cn("flex flex-col items-center justify-center gap-0.5 px-4 py-4 ring-1 ring-inset", palette.stamp, palette.ring)}>
          <span className={cn("font-mono text-[10px] font-semibold tracking-[0.18em]", palette.stampText)}>{month}</span>
          <span className={cn("font-serif text-3xl leading-none tabular-nums", palette.stampText)}>{day}</span>
          <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">{weekday}</span>
        </div>

        {/* Content column */}
        <div className="flex flex-1 flex-col min-w-0 px-4 py-4 gap-2">
          <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.14em]">
            <span className={palette.tag}>{TYPE_LABEL[type] ?? type}</span>
            <span aria-hidden className="size-1 rounded-full bg-border" />
            <span className={isPublished ? "text-[var(--success)]" : "text-muted-foreground"}>
              {isPublished ? "Live" : "Draft"}
            </span>
          </div>

          <h3 className="font-serif text-xl leading-[1.1] tracking-tight text-foreground sm:text-2xl">
            {name}
          </h3>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-muted-foreground">
            {location && (
              <span className="inline-flex items-center gap-1 truncate">
                <IconMapPin className="size-3 shrink-0" aria-hidden />
                {location}
              </span>
            )}
            {relative && (
              <>
                {location && <span aria-hidden className="text-border">·</span>}
                <span className={isPast ? "" : "text-foreground/70 font-medium"}>{relative}</span>
              </>
            )}
          </div>

          <div className="mt-auto flex items-center justify-between gap-2 pt-2 border-t border-border/60">
            <div className="flex items-center gap-3 text-[11px] font-mono tabular-nums text-muted-foreground">
              <span><span className="text-foreground/90">{rosterCount}</span> rosters</span>
              <span aria-hidden className="text-border">·</span>
              <span><span className="text-foreground/90">{eventCount}</span> events</span>
            </div>
            <IconArrowUpRight
              className="size-4 text-muted-foreground/60 transition-all duration-200 group-hover:text-foreground group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              aria-hidden
            />
          </div>
        </div>
      </div>
    </Link>
  )
}
