import { IconMapPin } from "@tabler/icons-react"
import { EntityCard, type EntityCardTone } from "@/components/ui/entity-card"
import { StatusBadge } from "@/components/ui/status-badge"
import { formatDateCompact, formatRelativeDate } from "@/lib/format"

const TYPE_LABEL: Record<string, string> = {
  INVITATIONAL: "Invitational",
  REGIONAL: "Regional",
  STATE: "State",
  NATIONAL: "National",
  PRACTICE: "Practice",
  OTHER: "Other",
}

// Brand azure anchors the most common type; rest stagger up the visual scale.
const TYPE_TONE: Record<string, EntityCardTone> = {
  INVITATIONAL: "brand",
  REGIONAL:     "violet",
  STATE:        "amber",
  NATIONAL:     "rose",
  PRACTICE:     "emerald",
  OTHER:        "zinc",
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
  const relative = formatRelativeDate(startsAt)
  const isPast = startsAt.getTime() < Date.now()

  return (
    <EntityCard
      href={`/dashboard/competitions/${id}`}
      tone={TYPE_TONE[type] ?? "zinc"}
      kicker={TYPE_LABEL[type] ?? type}
      status={<StatusBadge status={isPublished ? "Live" : "Draft"} withDot />}
      title={name}
      metrics={
        <>
          <span className="inline-flex items-baseline gap-1.5">
            <span className="text-foreground font-medium">{formatDateCompact(startsAt)}</span>
            {relative && (
              <span className={isPast ? "text-muted-foreground" : "text-foreground/70"}>· {relative}</span>
            )}
          </span>
          {location && (
            <span className="inline-flex items-center gap-1">
              <IconMapPin className="size-3 shrink-0" aria-hidden />
              {location}
            </span>
          )}
          <span>
            <span className="text-foreground/80">{rosterCount}</span> roster{rosterCount !== 1 ? "s" : ""}
          </span>
          <span>
            <span className="text-foreground/80">{eventCount}</span> event{eventCount !== 1 ? "s" : ""}
          </span>
        </>
      }
    />
  )
}
