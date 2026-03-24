"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  IconLoader2,
  IconUsers,
  IconTrophy,
} from "@tabler/icons-react"
import { toast } from "sonner"
import { z } from "zod"

import { EmptyState } from "@/components/empty-state"
import { PageHeader } from "@/components/page-header"

const squadSchema = z.object({
  label: z.string(),
  eventCount: z.number().default(0),
  memberCount: z.number().default(0),
})

const competitionRosterSchema = z.object({
  competitionId: z.string(),
  competitionName: z.string(),
  competitionType: z.string(),
  squads: z.array(squadSchema).default([]),
})

type CompetitionRoster = z.infer<typeof competitionRosterSchema>

const TYPE_LABELS: Record<string, string> = {
  PRACTICE: "Practice",
  INVITATIONAL: "Invitational",
  REGIONAL: "Regional",
  STATE: "State",
  NATIONAL: "National",
  OTHER: "Other",
}

export default function TeamsPage() {
  const router = useRouter()
  const [data, setData] = React.useState<CompetitionRoster[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await fetch("/api/admin/teams", { cache: "no-store" })
        if (!res.ok) throw new Error()
        const json = await res.json()
        setData(z.array(competitionRosterSchema).parse(json))
      } catch {
        toast.error("Failed to load teams.")
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  return (
    <div className="flex flex-col gap-6 px-8 py-4 lg:px-12 md:py-6">
      <PageHeader
        title="Teams"
        description="View squad assignments across all competitions."
      />

      {loading ? (
        <div className="flex h-48 items-center justify-center gap-2 text-sm text-muted-foreground">
          <IconLoader2 className="size-4 animate-spin" />
          Loading teams...
        </div>
      ) : data.length === 0 ? (
        <EmptyState
          icon={IconUsers}
          title="No teams yet"
          description="Open a competition to start building squads."
        />
      ) : (
        <div className="space-y-8">
          {data.map(comp => (
            <div key={comp.competitionId} className="space-y-3">
              <div className="flex items-center gap-2">
                <IconTrophy className="size-4 text-muted-foreground shrink-0" />
                <h2 className="text-base font-semibold">{comp.competitionName}</h2>
                <span className="text-xs text-muted-foreground border rounded-full px-2 py-0.5">
                  {TYPE_LABELS[comp.competitionType] ?? comp.competitionType}
                </span>
              </div>
              <div className="flex flex-wrap gap-3">
                {comp.squads.map(squad => (
                  <button
                    key={squad.label}
                    onClick={() => router.push(`/dashboard/competitions/${comp.competitionId}?squad=${squad.label}`)}
                    className="flex flex-col items-start gap-1 rounded-xl border bg-card px-4 py-3 hover:border-primary/40 hover:bg-primary/5 transition-colors text-left hover:cursor-pointer"
                  >
                    <span className="text-sm font-semibold">Squad {squad.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {squad.memberCount} {squad.memberCount === 1 ? "member" : "members"} · {squad.eventCount} {squad.eventCount === 1 ? "event" : "events"}
                    </span>
                  </button>
                ))}
                {comp.squads.length === 0 && (
                  <p className="text-sm text-muted-foreground">No squads yet.</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
