"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import {
  IconArrowLeft,
  IconLoader2,
  IconWand,
  IconX,
  IconPlus,
  IconAlertTriangle,
  IconRefresh,
} from "@tabler/icons-react"
import { toast } from "sonner"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const assignmentSchema = z.object({
  id: z.string(),
  memberSeasonId: z.string(),
  role: z.string(),
  name: z.string(),
  grade: z.string().optional().default(""),
  skillRating: z.number().nullable().optional(),
  preferenceRank: z.number().nullable().optional(),
})

const teamSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  eventName: z.string(),
  maxParticipants: z.number().default(2),
  label: z.string(),
  status: z.string(),
  assignments: z.array(assignmentSchema).default([]),
})

const enrollmentSchema = z.object({
  eventId: z.string(),
  eventName: z.string(),
  preferenceRank: z.number().nullable().optional(),
  skillRating: z.number().nullable().optional(),
  partnerPreference: z.string().optional().default("NA"),
  partnerNames: z.string().nullable().optional(),
})

const memberSchema = z.object({
  id: z.string(),
  name: z.string(),
  grade: z.string().optional().default(""),
  assignedSlots: z.array(z.number()).default([]),
  enrollments: z.array(enrollmentSchema).default([]),
})

const eventSlotSchema = z.object({
  timeSlot: z.number(),
  slotLabel: z.string().nullable().optional(),
  events: z.array(z.object({
    id: z.string(),
    name: z.string(),
    maxParticipants: z.number().default(2),
  })).default([]),
})

const competitionDetailSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  location: z.string().optional().default(""),
  startsAt: z.string().optional().default(""),
  eventSchedules: z.array(eventSlotSchema).default([]),
  teams: z.array(teamSchema).default([]),
  members: z.array(memberSchema).default([]),
})

type CompetitionDetail = z.infer<typeof competitionDetailSchema>
type Member = z.infer<typeof memberSchema>
type Team = z.infer<typeof teamSchema>

const TYPE_LABELS: Record<string, string> = {
  PRACTICE: "Practice",
  INVITATIONAL: "Invitational",
  REGIONAL: "Regional",
  STATE: "State",
  NATIONAL: "National",
  OTHER: "Other",
}

function getInitials(name: string) {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
}

function SkillDots({ rating }: { rating: number | null | undefined }) {
  if (rating == null) return null
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className={`size-1.5 rounded-full ${i < rating ? "bg-primary" : "bg-border"}`}
        />
      ))}
    </div>
  )
}

export default function TeamBuilderPage() {
  const params = useParams()
  const router = useRouter()
  const competitionId = params.teamId as string

  const [competition, setCompetition] = React.useState<CompetitionDetail | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [selectedMemberId, setSelectedMemberId] = React.useState<string | null>(null)
  const [autoAssigning, setAutoAssigning] = React.useState(false)
  const [resetting, setResetting] = React.useState(false)
  const [confirmReset, setConfirmReset] = React.useState(false)
  const [actionLoading, setActionLoading] = React.useState<string | null>(null)
  const [memberSearch, setMemberSearch] = React.useState("")

  const loadCompetition = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/competitions?id=${competitionId}`, { cache: "no-store" })
      if (!res.ok) throw new Error()
      const json = await res.json()
      setCompetition(competitionDetailSchema.parse(json))
    } catch {
      toast.error("Failed to load competition.")
    } finally {
      setLoading(false)
    }
  }, [competitionId])

  React.useEffect(() => { void loadCompetition() }, [loadCompetition])

  const teamsByEventId = React.useMemo(() => {
    if (!competition) return new Map<string, Team>()
    const m = new Map<string, Team>()
    for (const t of competition.teams) m.set(t.eventId, t)
    return m
  }, [competition])

  const eventToSlot = React.useMemo(() => {
    if (!competition) return new Map<string, number>()
    const m = new Map<string, number>()
    for (const slot of competition.eventSchedules) {
      for (const ev of slot.events) m.set(ev.id, slot.timeSlot)
    }
    return m
  }, [competition])

  const memberAssignedSlots = React.useMemo(() => {
    const m = new Map<string, Set<number>>()
    if (!competition) return m
    for (const member of competition.members) {
      m.set(member.id, new Set(member.assignedSlots))
    }
    return m
  }, [competition])

  const isConflict = React.useCallback((memberId: string, eventId: string) => {
    const slot = eventToSlot.get(eventId)
    if (slot == null) return false
    const slots = memberAssignedSlots.get(memberId)
    if (!slots) return false
    return slots.has(slot)
  }, [eventToSlot, memberAssignedSlots])

  const isAlreadyOnTeam = React.useCallback((memberId: string, eventId: string) => {
    const team = teamsByEventId.get(eventId)
    if (!team) return false
    return team.assignments.some(a => a.memberSeasonId === memberId)
  }, [teamsByEventId])

  const selectedMember = React.useMemo(() => {
    if (!selectedMemberId || !competition) return null
    return competition.members.find(m => m.id === selectedMemberId) ?? null
  }, [selectedMemberId, competition])

  const filteredMembers = React.useMemo(() => {
    if (!competition) return []
    const q = memberSearch.toLowerCase().trim()
    if (!q) return competition.members
    return competition.members.filter(m => m.name.toLowerCase().includes(q))
  }, [competition, memberSearch])

  const handleAssign = React.useCallback(async (eventId: string) => {
    if (!selectedMemberId || !competition) return

    if (isAlreadyOnTeam(selectedMemberId, eventId)) {
      toast.error("Member is already on this team.")
      return
    }

    if (isConflict(selectedMemberId, eventId)) {
      toast.error("This member has a scheduling conflict in this time slot.")
      return
    }

    const team = teamsByEventId.get(eventId)
    const slot = competition.eventSchedules.find(s => s.events.some(e => e.id === eventId))
    const ev = slot?.events.find(e => e.id === eventId)
    if (ev && team && team.assignments.length >= ev.maxParticipants) {
      toast.error("Team is already full.")
      return
    }

    setActionLoading(eventId)
    try {
      const res = await fetch("/api/admin/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "assign", competitionId: competition.id, eventId, memberSeasonId: selectedMemberId }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.message ?? "Failed to assign member.")
        return
      }
      setSelectedMemberId(null)
      await loadCompetition()
    } catch {
      toast.error("Failed to assign member.")
    } finally {
      setActionLoading(null)
    }
  }, [selectedMemberId, competition, isAlreadyOnTeam, isConflict, teamsByEventId, loadCompetition])

  const handleUnassign = React.useCallback(async (assignmentId: string) => {
    setActionLoading(assignmentId)
    try {
      const res = await fetch("/api/admin/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unassign", assignmentId }),
      })
      if (!res.ok) throw new Error()
      await loadCompetition()
    } catch {
      toast.error("Failed to remove member.")
    } finally {
      setActionLoading(null)
    }
  }, [loadCompetition])

  const handleAutoAssign = React.useCallback(async () => {
    if (!competition) return
    setAutoAssigning(true)
    try {
      const res = await fetch("/api/admin/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "auto-assign", competitionId: competition.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error()
      toast.success(`Auto-assigned ${data.membersAssigned} members across ${data.teamsCreated > 0 ? `${data.teamsCreated} new teams` : "teams"}.`)
      await loadCompetition()
    } catch {
      toast.error("Auto-assign failed.")
    } finally {
      setAutoAssigning(false)
    }
  }, [competition, loadCompetition])

  const handleReset = React.useCallback(async () => {
    if (!competition) return
    setResetting(true)
    setConfirmReset(false)
    try {
      for (const team of competition.teams) {
        for (const assignment of team.assignments) {
          await fetch("/api/admin/teams", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "unassign", assignmentId: assignment.id }),
          })
        }
      }
      toast.success("All assignments cleared.")
      await loadCompetition()
    } catch {
      toast.error("Failed to reset assignments.")
    } finally {
      setResetting(false)
    }
  }, [competition, loadCompetition])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center gap-2 text-sm text-muted-foreground">
        <IconLoader2 className="size-4 animate-spin" />
        Loading team builder...
      </div>
    )
  }

  if (!competition) {
    return (
      <div className="px-4 py-4 lg:px-6 md:py-6 space-y-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/teams")} className="-ml-2">
          <IconArrowLeft className="size-4" /> Back to teams
        </Button>
        <p className="text-sm text-muted-foreground">Competition not found.</p>
      </div>
    )
  }

  const totalAssigned = competition.teams.reduce((s, t) => s + t.assignments.length, 0)
  const totalSlots = competition.eventSchedules.reduce((s, sl) => s + sl.events.length * 2, 0)

  return (
    <div className="flex flex-col gap-0 h-full">
      <div className="px-4 lg:px-6 py-4 md:py-6 border-b flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2 text-muted-foreground hover:text-foreground"
            onClick={() => router.push("/dashboard/teams")}
          >
            <IconArrowLeft className="size-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold">{competition.name}</h1>
              <span className="text-xs text-muted-foreground border rounded-full px-2 py-0.5">
                {TYPE_LABELS[competition.type] ?? competition.type}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {competition.startsAt} {competition.location ? `· ${competition.location}` : ""}
              {" · "}
              <span className="font-medium text-foreground">{totalAssigned}</span> / {totalSlots} slots filled
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfirmReset(true)}
            disabled={resetting || autoAssigning}
          >
            {resetting ? <IconLoader2 className="size-4 animate-spin" /> : <IconRefresh className="size-4" />}
            Reset
          </Button>
          <Button
            size="sm"
            onClick={() => void handleAutoAssign()}
            disabled={autoAssigning || resetting}
          >
            {autoAssigning ? <IconLoader2 className="size-4 animate-spin" /> : <IconWand className="size-4" />}
            Auto Assign
          </Button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className="w-72 shrink-0 border-r flex flex-col bg-muted/20">
          <div className="p-3 border-b">
            <Input
              placeholder="Search members..."
              value={memberSearch}
              onChange={e => setMemberSearch(e.target.value)}
              className="h-8 text-sm bg-background"
            />
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredMembers.map(member => {
              const isSelected = selectedMemberId === member.id
              const topEvents = member.enrollments.slice(0, 3)
              const assignedCount = member.assignedSlots.length

              return (
                <button
                  key={member.id}
                  onClick={() => setSelectedMemberId(isSelected ? null : member.id)}
                  className={`w-full text-left rounded-lg p-2.5 transition-all border ${
                    isSelected
                      ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                      : "border-transparent hover:border-border hover:bg-background"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="size-7 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                        {getInitials(member.name)}
                      </div>
                      <span className="text-sm font-medium truncate">{member.name}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {member.grade && (
                        <span className="text-xs text-muted-foreground border rounded px-1">{member.grade}</span>
                      )}
                      {assignedCount > 0 && (
                        <span className="text-xs font-medium text-primary bg-primary/10 rounded px-1">
                          {assignedCount}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {topEvents.map(e => (
                      <span key={e.eventId} className="text-xs text-muted-foreground bg-muted rounded px-1.5 py-0.5 truncate max-w-[120px]">
                        {e.eventName}
                      </span>
                    ))}
                    {member.enrollments.length > 3 && (
                      <span className="text-xs text-muted-foreground">+{member.enrollments.length - 3}</span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
          {selectedMember && (
            <div className="border-t p-3 space-y-2 bg-background">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Selected</span>
                <button onClick={() => setSelectedMemberId(null)} className="text-muted-foreground hover:text-foreground">
                  <IconX className="size-3.5" />
                </button>
              </div>
              <p className="text-sm font-medium">{selectedMember.name}</p>
              <p className="text-xs text-muted-foreground">
                Click an empty slot on any event card to assign.
              </p>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 lg:px-6 md:py-6 space-y-8">
          {competition.eventSchedules.map(slot => (
            <div key={slot.timeSlot} className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="text-sm font-semibold">
                  Slot {slot.timeSlot}
                  {slot.slotLabel && (
                    <span className="font-normal text-muted-foreground"> — {slot.slotLabel}</span>
                  )}
                </div>
                <Separator className="flex-1" />
              </div>

              <div className="flex flex-wrap gap-3">
                {slot.events.map(ev => {
                  const team = teamsByEventId.get(ev.id)
                  const assignments = team?.assignments ?? []
                  const isEmpty = assignments.length === 0
                  const isFull = assignments.length >= ev.maxParticipants

                  const hasConflictWithSelected =
                    selectedMemberId != null &&
                    isConflict(selectedMemberId, ev.id)

                  const alreadyOnTeam =
                    selectedMemberId != null &&
                    isAlreadyOnTeam(selectedMemberId, ev.id)

                  const canAssign =
                    selectedMemberId != null &&
                    !hasConflictWithSelected &&
                    !alreadyOnTeam &&
                    !isFull

                  const isLoading = actionLoading === ev.id

                  return (
                    <div
                      key={ev.id}
                      className={`w-48 rounded-xl border bg-card p-3 space-y-2 transition-all ${
                        hasConflictWithSelected
                          ? "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/20"
                          : canAssign
                          ? "border-primary/50 bg-primary/5 cursor-pointer hover:border-primary hover:bg-primary/10"
                          : ""
                      }`}
                      onClick={canAssign ? () => void handleAssign(ev.id) : undefined}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <p className="text-xs font-semibold leading-tight">{ev.name}</p>
                        {hasConflictWithSelected && (
                          <IconAlertTriangle className="size-3.5 text-red-500 shrink-0" />
                        )}
                      </div>

                      <div className="space-y-1.5">
                        {assignments.map(a => (
                          <div
                            key={a.id}
                            className="flex items-center gap-1.5 rounded-md bg-muted/60 px-2 py-1"
                            onClick={e => e.stopPropagation()}
                          >
                            <div className="size-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                              {getInitials(a.name)}
                            </div>
                            <span className="text-xs font-medium truncate flex-1">{a.name}</span>
                            {a.skillRating != null && (
                              <span className="text-[10px] text-muted-foreground shrink-0">{a.skillRating}/10</span>
                            )}
                            <button
                              onClick={() => void handleUnassign(a.id)}
                              disabled={actionLoading === a.id}
                              className="text-muted-foreground hover:text-destructive shrink-0"
                            >
                              {actionLoading === a.id
                                ? <IconLoader2 className="size-3 animate-spin" />
                                : <IconX className="size-3" />
                              }
                            </button>
                          </div>
                        ))}

                        {Array.from({ length: Math.max(0, ev.maxParticipants - assignments.length) }).map((_, i) => (
                          <div
                            key={`empty-${i}`}
                            className={`flex items-center justify-center rounded-md border border-dashed h-7 ${
                              canAssign
                                ? "border-primary/60 text-primary"
                                : "border-border text-muted-foreground/50"
                            }`}
                          >
                            {isLoading
                              ? <IconLoader2 className="size-3 animate-spin" />
                              : <IconPlus className="size-3" />
                            }
                          </div>
                        ))}
                      </div>

                      {hasConflictWithSelected && (
                        <p className="text-[10px] text-red-500 font-medium">Slot conflict</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <Dialog open={confirmReset} onOpenChange={setConfirmReset}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Reset all assignments?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            This will remove all team assignments for this competition. This cannot be undone.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmReset(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => void handleReset()}>
              Reset all
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
