import { IconTrophy, IconClock, IconMapPin, IconUsers, IconBookmarks } from "@tabler/icons-react"
import { SectionCard } from "@/components/ui/section-card"
import { StatusBadge } from "@/components/ui/status-badge"
import { EmptyState } from "@/components/empty-state"
import { formatDateOnly } from "@/lib/format"

export interface MyAssignment {
  id: string
  role: string
  seatNumber: number | null
  event: { id: string; name: string; code: string | null }
  rosterId: string
  rosterLabel: string | null
  division: string | null
  status: string
  room: string | null
  slotLabel: string | null
  startsAt: string | null
  endsAt: string | null
  partners: Array<{
    id: string
    firstName: string
    lastName: string
    role: string
    isSelf: boolean
  }>
}

export interface MyCompetitionViewProps {
  myAssignments: MyAssignment[]
  competitionStartsAt: string | null
  isPublished: boolean
}

function formatTimeRange(startsAt: string | null, endsAt: string | null): string | null {
  if (!startsAt) return null
  const start = new Date(startsAt)
  const fmt = (d: Date) =>
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
  if (!endsAt) return fmt(start)
  return `${fmt(start)} – ${fmt(new Date(endsAt))}`
}

export function MyCompetitionView({ myAssignments, isPublished }: MyCompetitionViewProps) {
  if (!isPublished) {
    return (
      <EmptyState
        icon={IconTrophy}
        title="Not yet published"
        description="This competition isn't published. Once your admin publishes it, your assigned events will appear here."
      />
    )
  }

  if (myAssignments.length === 0) {
    return (
      <EmptyState
        icon={IconBookmarks}
        title="No assignments yet"
        description="You haven't been assigned to an event for this competition. Talk to your admin if you think this is wrong."
      />
    )
  }

  const sorted = [...myAssignments].sort((a, b) => {
    const at = a.startsAt ? new Date(a.startsAt).getTime() : Infinity
    const bt = b.startsAt ? new Date(b.startsAt).getTime() : Infinity
    return at - bt
  })

  return (
    <SectionCard title={`Your Events (${myAssignments.length})`} flush>
      <ul className="divide-y divide-border/60">
        {sorted.map((a) => {
          const timeRange = formatTimeRange(a.startsAt, a.endsAt)
          const partners = a.partners.filter((p) => !p.isSelf)
          return (
            <li key={a.id} className="px-[var(--card-px)] py-4 space-y-2">
              <div className="flex items-baseline justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-serif text-lg leading-tight tracking-tight">
                    {a.event.name}
                  </p>
                  {a.event.code && (
                    <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mt-0.5">
                      {a.event.code}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge status={a.role.replace(/_/g, " ").toLowerCase()} tone="brand" />
                  {a.status !== "ACTIVE" && (
                    <StatusBadge status={a.status} tone="neutral" />
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                {a.startsAt && (
                  <span className="inline-flex items-center gap-1.5">
                    <IconClock className="size-3.5" />
                    <span className="font-mono tabular-nums">
                      {formatDateOnly(new Date(a.startsAt))}
                      {timeRange && ` · ${timeRange}`}
                    </span>
                  </span>
                )}
                {a.room && (
                  <span className="inline-flex items-center gap-1.5">
                    <IconMapPin className="size-3.5" />
                    {a.room}
                  </span>
                )}
                {a.slotLabel && (
                  <span className="font-mono tabular-nums">Slot {a.slotLabel}</span>
                )}
                {(a.rosterLabel || a.division) && (
                  <span>
                    {a.rosterLabel ?? ""}{a.rosterLabel && a.division ? " · " : ""}{a.division ? `Div ${a.division}` : ""}
                  </span>
                )}
              </div>

              {partners.length > 0 && (
                <div className="flex items-start gap-2 text-xs">
                  <IconUsers className="size-3.5 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="flex flex-wrap gap-x-2 gap-y-1">
                    <span className="text-muted-foreground">With:</span>
                    {partners.map((p) => (
                      <span key={p.id} className="font-medium text-foreground">
                        {p.firstName} {p.lastName}
                        {p.role !== "PRIMARY" && p.role !== "COMPETITOR" && (
                          <span className="text-muted-foreground"> ({p.role.toLowerCase()})</span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </SectionCard>
  )
}
