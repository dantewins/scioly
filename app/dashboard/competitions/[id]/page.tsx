"use client"

import * as React from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import {
  IconArrowLeft,
  IconLoader2,
  IconWand,
  IconX,
  IconPlus,
  IconAlertTriangle,
  IconRefresh,
  IconCalendarWeek,
  IconSearch,
} from "@tabler/icons-react"
import { toast } from "sonner"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

// ─── Zod schemas ──────────────────────────────────────────────────────────────

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
  label: z.string().default("A"),
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
  isEnded: z.boolean().optional().default(false),
  eventSchedules: z.array(eventSlotSchema).default([]),
  teams: z.array(teamSchema).default([]),
  members: z.array(memberSchema).default([]),
})

// Schema for season events fetched when opening the Schedule dialog
const sciOlyEventSchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string().nullable().default(null),
  maxParticipants: z.number().default(2),
  sortOrder: z.number().nullable().default(null),
})

type CompetitionDetail = z.infer<typeof competitionDetailSchema>
type Team = z.infer<typeof teamSchema>
type SciOlyEvent = z.infer<typeof sciOlyEventSchema>

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  PRACTICE:     "Practice",
  INVITATIONAL: "Invitational",
  REGIONAL:     "Regional",
  STATE:        "State",
  NATIONAL:     "National",
  OTHER:        "Other",
}

function getInitials(name: string) {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
}

type ScheduleEntry = { eventId: string; timeSlot: string; slotLabel: string; checked: boolean }

// ─── Component ────────────────────────────────────────────────────────────────

export default function TeamBuilderPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const competitionId = params.id as string

  const [competition, setCompetition] = React.useState<CompetitionDetail | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [selectedMemberId, setSelectedMemberId] = React.useState<string | null>(null)
  // Pre-select squad from URL query param (?squad=B) for deep-links from Teams roster
  const [selectedSquad, setSelectedSquad] = React.useState<string>(searchParams.get("squad") ?? "A")
  const [autoAssigning, setAutoAssigning] = React.useState(false)
  const [addingSquad, setAddingSquad] = React.useState(false)
  const [resetting, setResetting] = React.useState(false)
  const [confirmReset, setConfirmReset] = React.useState(false)
  const [actionLoading, setActionLoading] = React.useState<string | null>(null)
  const [memberSearch, setMemberSearch] = React.useState("")

  // Mobile: member picker opens as a Dialog instead of a sidebar
  const [mobilePickerOpen, setMobilePickerOpen] = React.useState(false)

  // Schedule Events dialog state
  const [scheduleOpen, setScheduleOpen] = React.useState(false)
  const [allEvents, setAllEvents] = React.useState<SciOlyEvent[]>([])
  const [scheduleEntries, setScheduleEntries] = React.useState<ScheduleEntry[]>([])
  const [savingSchedule, setSavingSchedule] = React.useState(false)
  const [loadingEvents, setLoadingEvents] = React.useState(false)

  // ── Data loading ────────────────────────────────────────────────────────────

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

  // Opens the Schedule Events dialog and fetches season events to populate the checklist
  const openScheduleDialog = React.useCallback(async () => {
    setLoadingEvents(true)
    setScheduleOpen(true)
    try {
      const res = await fetch("/api/admin/events", { cache: "no-store" })
      if (!res.ok) throw new Error()
      const json = await res.json()
      const events = z.array(sciOlyEventSchema).parse(json)
      setAllEvents(events)

      // Pre-populate entries from the competition's current schedule
      const scheduledEventIds = new Set(
        (competition?.eventSchedules ?? []).flatMap(s => s.events.map(e => e.id))
      )
      const slotMap = new Map<string, { timeSlot: number; slotLabel: string | null }>()
      for (const slot of competition?.eventSchedules ?? []) {
        for (const ev of slot.events) {
          slotMap.set(ev.id, { timeSlot: slot.timeSlot, slotLabel: slot.slotLabel ?? null })
        }
      }

      setScheduleEntries(events.map(e => ({
        eventId: e.id,
        timeSlot: scheduledEventIds.has(e.id) ? String(slotMap.get(e.id)?.timeSlot ?? 1) : "1",
        slotLabel: scheduledEventIds.has(e.id) ? (slotMap.get(e.id)?.slotLabel ?? "") : "",
        checked: scheduledEventIds.has(e.id),
      })))
    } catch {
      toast.error("Failed to load events.")
    } finally {
      setLoadingEvents(false)
    }
  }, [competition])

  // Saves checked events via PATCH and removes unchecked ones that were previously scheduled
  const handleSaveSchedule = React.useCallback(async () => {
    if (!competition) return
    setSavingSchedule(true)
    try {
      const scheduledSet = new Set(
        competition.eventSchedules.flatMap(s => s.events.map(e => e.id))
      )
      const toAdd = scheduleEntries.filter(e => e.checked)
      const toRemove = scheduleEntries.filter(e => !e.checked && scheduledSet.has(e.eventId))

      for (const entry of toAdd) {
        const res = await fetch("/api/admin/competitions", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "add-event",
            competitionId: competition.id,
            eventId: entry.eventId,
            timeSlot: parseInt(entry.timeSlot) || 1,
            slotLabel: entry.slotLabel.trim() || undefined,
          }),
        })
        if (!res.ok) {
          const data = await res.json() as { message?: string }
          toast.error(data.message ?? "Failed to schedule event.")
          return
        }
      }

      for (const entry of toRemove) {
        const res = await fetch("/api/admin/competitions", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "remove-event",
            competitionId: competition.id,
            eventId: entry.eventId,
          }),
        })
        if (!res.ok) {
          const data = await res.json() as { message?: string }
          toast.error(data.message ?? "Cannot remove event with existing assignments.")
          return
        }
      }

      toast.success("Schedule saved.")
      setScheduleOpen(false)
      await loadCompetition()
    } catch {
      toast.error("Failed to save schedule.")
    } finally {
      setSavingSchedule(false)
    }
  }, [competition, scheduleEntries, loadCompetition])

  // ── Derived state ────────────────────────────────────────────────────────────

  // Distinct squad labels from the teams list, defaulting to ["A"] when empty
  const squads = React.useMemo(() => {
    if (!competition) return ["A"]
    const labels = [...new Set(competition.teams.map(t => t.label))].sort()
    return labels.length > 0 ? labels : ["A"]
  }, [competition])

  // Map of eventId → Team for the currently selected squad (for fast lookup in the grid)
  const teamsByEventId = React.useMemo(() => {
    if (!competition) return new Map<string, Team>()
    const m = new Map<string, Team>()
    for (const t of competition.teams) {
      if (t.label === selectedSquad) m.set(t.eventId, t)
    }
    return m
  }, [competition, selectedSquad])

  // Map of eventId → timeSlot for conflict checking
  const eventToSlot = React.useMemo(() => {
    if (!competition) return new Map<string, number>()
    const m = new Map<string, number>()
    for (const slot of competition.eventSchedules) {
      for (const ev of slot.events) m.set(ev.id, slot.timeSlot)
    }
    return m
  }, [competition])

  // Map of memberId → Set<timeSlot> — which slots each member is already in
  const memberAssignedSlots = React.useMemo(() => {
    const m = new Map<string, Set<number>>()
    if (!competition) return m
    for (const member of competition.members) {
      m.set(member.id, new Set(member.assignedSlots))
    }
    return m
  }, [competition])

  // Returns true if the member is already in another event in the same time slot
  const isConflict = React.useCallback((memberId: string, eventId: string) => {
    const slot = eventToSlot.get(eventId)
    if (slot == null) return false
    return memberAssignedSlots.get(memberId)?.has(slot) ?? false
  }, [eventToSlot, memberAssignedSlots])

  // Returns true if the member is already on this specific team
  const isAlreadyOnTeam = React.useCallback((memberId: string, eventId: string) => {
    return teamsByEventId.get(eventId)?.assignments.some(a => a.memberSeasonId === memberId) ?? false
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

  // ── Actions ──────────────────────────────────────────────────────────────────

  const handleAssign = React.useCallback(async (eventId: string) => {
    if (!selectedMemberId || !competition) return
    if (isAlreadyOnTeam(selectedMemberId, eventId)) { toast.error("Member is already on this team."); return }
    if (isConflict(selectedMemberId, eventId)) { toast.error("This member has a scheduling conflict in this time slot."); return }
    const team = teamsByEventId.get(eventId)
    const slot = competition.eventSchedules.find(s => s.events.some(e => e.id === eventId))
    const ev = slot?.events.find(e => e.id === eventId)
    if (ev && team && team.assignments.length >= ev.maxParticipants) { toast.error("Team is already full."); return }

    setActionLoading(eventId)
    try {
      const res = await fetch("/api/admin/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "assign", competitionId: competition.id, eventId, memberSeasonId: selectedMemberId, label: selectedSquad }),
      })
      const data = await res.json() as { message?: string }
      if (!res.ok) { toast.error(data.message ?? "Failed to assign member."); return }
      setSelectedMemberId(null)
      setMobilePickerOpen(false)
      await loadCompetition()
    } catch {
      toast.error("Failed to assign member.")
    } finally {
      setActionLoading(null)
    }
  }, [selectedMemberId, competition, isAlreadyOnTeam, isConflict, teamsByEventId, loadCompetition, selectedSquad])

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
        body: JSON.stringify({ action: "auto-assign", competitionId: competition.id, label: selectedSquad }),
      })
      const data = await res.json() as { membersAssigned?: number; teamsCreated?: number }
      if (!res.ok) throw new Error()
      toast.success(`Auto-assigned ${data.membersAssigned} members across ${data.teamsCreated ? `${data.teamsCreated} new teams` : "teams"}.`)
      await loadCompetition()
    } catch {
      toast.error("Auto-assign failed.")
    } finally {
      setAutoAssigning(false)
    }
  }, [competition, loadCompetition, selectedSquad])

  const handleReset = React.useCallback(async () => {
    if (!competition) return
    setResetting(true)
    setConfirmReset(false)
    try {
      const res = await fetch("/api/admin/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset", competitionId: competition.id, label: selectedSquad }),
      })
      if (!res.ok) throw new Error()
      toast.success(`Squad ${selectedSquad} assignments cleared.`)
      await loadCompetition()
    } catch {
      toast.error("Failed to reset assignments.")
    } finally {
      setResetting(false)
    }
  }, [competition, selectedSquad, loadCompetition])

  // Creates teams for a new squad label (next letter after the last existing one)
  const handleAddSquad = React.useCallback(async () => {
    if (!competition) return
    const nextLabel = String.fromCharCode(65 + squads.length) // A=65, B=66, ...
    if (squads.includes(nextLabel)) return
    setAddingSquad(true)
    try {
      for (const slot of competition.eventSchedules) {
        for (const ev of slot.events) {
          await fetch("/api/admin/teams", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "create", competitionId: competition.id, eventId: ev.id, label: nextLabel }),
          })
        }
      }
      await loadCompetition()
      setSelectedSquad(nextLabel)
    } catch {
      toast.error("Failed to add squad.")
    } finally {
      setAddingSquad(false)
    }
  }, [competition, squads, loadCompetition])

  // ── Render ───────────────────────────────────────────────────────────────────

  const isEnded = competition?.isEnded ?? false
  const hasSchedule = (competition?.eventSchedules.length ?? 0) > 0

  // Reusable member list — used both in the desktop sidebar and the mobile dialog
  const MemberList = (
    <div className="flex-1 overflow-y-auto p-2 space-y-1">
      {filteredMembers.map(member => {
        const isSelected = selectedMemberId === member.id
        const topEvents = member.enrollments.slice(0, 3)
        const assignedCount = member.assignedSlots.length

        return (
          <button
            key={member.id}
            onClick={() => {
              setSelectedMemberId(isSelected ? null : member.id)
              // On mobile, close the picker after selecting
              if (!isSelected) setMobilePickerOpen(false)
            }}
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
      {filteredMembers.length === 0 && (
        <p className="py-6 text-center text-xs text-muted-foreground">No members match your search.</p>
      )}
    </div>
  )

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
        <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/competitions")} className="-ml-2">
          <IconArrowLeft className="size-4" /> Back to competitions
        </Button>
        <p className="text-sm text-muted-foreground">Competition not found.</p>
      </div>
    )
  }

  const squadTeams = competition.teams.filter(t => t.label === selectedSquad)
  const totalAssigned = squadTeams.reduce((s, t) => s + t.assignments.length, 0)
  const totalSlots = competition.eventSchedules.reduce((s, sl) => s + sl.events.length * 2, 0)

  return (
    <div className="flex flex-col gap-0 h-full">

      {/* ── Top header bar ── */}
      <div className="px-4 lg:px-6 py-4 md:py-6 border-b flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2 text-muted-foreground hover:text-foreground"
            onClick={() => router.push("/dashboard/competitions")}
          >
            <IconArrowLeft className="size-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-semibold">{competition.name}</h1>
              <span className="text-xs text-muted-foreground border rounded-full px-2 py-0.5">
                {TYPE_LABELS[competition.type] ?? competition.type}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {competition.startsAt} {competition.location ? `· ${competition.location}` : ""}
              {hasSchedule && (
                <>
                  {" · "}
                  <span className="font-medium text-foreground">{totalAssigned}</span> / {totalSlots} slots filled
                </>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {!isEnded && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => void openScheduleDialog()}
            >
              <IconCalendarWeek className="size-4" />
              Schedule Events
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfirmReset(true)}
            disabled={resetting || autoAssigning || isEnded || !hasSchedule}
          >
            {resetting ? <IconLoader2 className="size-4 animate-spin" /> : <IconRefresh className="size-4" />}
            Reset
          </Button>
          <Button
            size="sm"
            onClick={() => void handleAutoAssign()}
            disabled={autoAssigning || resetting || isEnded || !hasSchedule}
          >
            {autoAssigning ? <IconLoader2 className="size-4 animate-spin" /> : <IconWand className="size-4" />}
            Auto Assign
          </Button>
        </div>
      </div>

      {/* ── Read-only banner when competition has ended ── */}
      {isEnded && (
        <div className="px-4 lg:px-6 py-2 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800 text-sm text-amber-800 dark:text-amber-300">
          This competition has ended — assignments are view-only.
        </div>
      )}

      {/* ── No schedule state (no dashed border, just a plain centered message) ── */}
      {!hasSchedule ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center">
          <IconCalendarWeek className="size-10 opacity-20" />
          <div className="space-y-1">
            <p className="text-sm font-medium">No events scheduled</p>
            <p className="text-sm text-muted-foreground">
              Add the Science Olympiad events for this competition to start building squads.
            </p>
          </div>
          {!isEnded && (
            <Button size="sm" variant="outline" onClick={() => void openScheduleDialog()}>
              <IconCalendarWeek className="size-4" />
              Schedule Events
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* ── Squad selector tabs ── */}
          <div className="px-4 lg:px-6 py-2 border-b flex items-center gap-2 flex-wrap">
            {squads.map(sq => (
              <button
                key={sq}
                onClick={() => { setSelectedSquad(sq); setSelectedMemberId(null) }}
                className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                  sq === selectedSquad
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                Squad {sq}
              </button>
            ))}
            {!isEnded && squads.length < 8 && (
              <button
                onClick={() => void handleAddSquad()}
                disabled={addingSquad}
                className="rounded-full px-3 py-1 text-sm font-medium text-muted-foreground border border-dashed hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
              >
                {addingSquad ? <IconLoader2 className="size-3 animate-spin inline" /> : "+ New Squad"}
              </button>
            )}
          </div>

          {/* ── Mobile: member picker bar (shown when a member isn't selected yet) ── */}
          {!isEnded && (
            <div className="md:hidden flex items-center gap-2 border-b px-4 py-2">
              {selectedMember ? (
                <>
                  <div className="size-6 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                    {getInitials(selectedMember.name)}
                  </div>
                  <span className="text-sm font-medium flex-1 truncate">{selectedMember.name} selected</span>
                  <button onClick={() => setSelectedMemberId(null)} className="text-muted-foreground hover:text-foreground">
                    <IconX className="size-4" />
                  </button>
                </>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={() => setMobilePickerOpen(true)}
                >
                  <IconSearch className="size-4" />
                  Pick a member to assign
                </Button>
              )}
            </div>
          )}

          {/* ── Main two-pane layout ── */}
          <div className="flex flex-1 min-h-0 overflow-hidden">

            {/* Desktop member sidebar — hidden on mobile */}
            {!isEnded && (
              <div className="hidden md:flex w-72 shrink-0 border-r flex-col bg-muted/20">
                <div className="p-3 border-b">
                  <Input
                    placeholder="Search members..."
                    value={memberSearch}
                    onChange={e => setMemberSearch(e.target.value)}
                    className="h-8 text-sm bg-background"
                  />
                </div>
                {MemberList}
                {selectedMember && (
                  <div className="border-t p-3 space-y-2 bg-background">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Selected</span>
                      <button onClick={() => setSelectedMemberId(null)} className="text-muted-foreground hover:text-foreground">
                        <IconX className="size-3.5" />
                      </button>
                    </div>
                    <p className="text-sm font-medium">{selectedMember.name}</p>
                    <p className="text-xs text-muted-foreground">Click an empty slot on any event card to assign.</p>
                  </div>
                )}
              </div>
            )}

            {/* Event grid */}
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
                      const isFull = assignments.length >= ev.maxParticipants

                      // Conflict and assignability checks against the currently selected member
                      const hasConflict = selectedMemberId != null && isConflict(selectedMemberId, ev.id)
                      const alreadyOnTeam = selectedMemberId != null && isAlreadyOnTeam(selectedMemberId, ev.id)
                      const canAssign = selectedMemberId != null && !hasConflict && !alreadyOnTeam && !isFull
                      const isLoading = actionLoading === ev.id

                      return (
                        <div
                          key={ev.id}
                          className={`w-48 rounded-xl border bg-card p-3 space-y-2 transition-all ${
                            // Amber for conflict (neutral tone, not red)
                            hasConflict
                              ? "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20"
                              : canAssign
                              ? "border-primary/50 bg-primary/5 cursor-pointer hover:border-primary hover:bg-primary/10"
                              : ""
                          }`}
                          onClick={canAssign ? () => void handleAssign(ev.id) : undefined}
                        >
                          <div className="flex items-start justify-between gap-1">
                            <p className="text-xs font-semibold leading-tight">{ev.name}</p>
                            {hasConflict && (
                              <IconAlertTriangle className="size-3.5 text-amber-500 shrink-0" />
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
                                {!isEnded && (
                                  <button
                                    onClick={() => void handleUnassign(a.id)}
                                    disabled={actionLoading === a.id}
                                    className="text-muted-foreground hover:text-foreground shrink-0"
                                  >
                                    {actionLoading === a.id
                                      ? <IconLoader2 className="size-3 animate-spin" />
                                      : <IconX className="size-3" />
                                    }
                                  </button>
                                )}
                              </div>
                            ))}

                            {/* Empty slots shown only when not in view-only mode */}
                            {!isEnded && Array.from({ length: Math.max(0, ev.maxParticipants - assignments.length) }).map((_, i) => (
                              <div
                                key={`empty-${i}`}
                                className={`flex items-center justify-center rounded-md border border-dashed h-7 ${
                                  canAssign ? "border-primary/60 text-primary" : "border-border text-muted-foreground/50"
                                }`}
                              >
                                {isLoading ? <IconLoader2 className="size-3 animate-spin" /> : <IconPlus className="size-3" />}
                              </div>
                            ))}
                          </div>

                          {/* Conflict label in amber */}
                          {hasConflict && (
                            <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">Slot conflict</p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── Reset confirmation dialog ── */}
      <Dialog open={confirmReset} onOpenChange={setConfirmReset}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Reset Squad {selectedSquad}?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            This will remove all assignments for Squad {selectedSquad} in this competition. This cannot be undone.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmReset(false)}>Cancel</Button>
            {/* Using default (dark) variant instead of destructive (red) */}
            <Button variant="default" onClick={() => void handleReset()}>Reset all</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Mobile member picker dialog ── */}
      <Dialog open={mobilePickerOpen} onOpenChange={setMobilePickerOpen}>
        <DialogContent className="sm:max-w-sm max-h-[80vh] flex flex-col p-0">
          <DialogHeader className="px-4 pt-4 pb-2">
            <DialogTitle>Select a member</DialogTitle>
          </DialogHeader>
          <div className="px-3 pb-2 border-b">
            <Input
              placeholder="Search members..."
              value={memberSearch}
              onChange={e => setMemberSearch(e.target.value)}
              className="h-8 text-sm"
              autoFocus
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            {MemberList}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Schedule Events dialog ── */}
      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Schedule events</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            {loadingEvents ? (
              <div className="flex h-32 items-center justify-center gap-2 text-sm text-muted-foreground">
                <IconLoader2 className="size-4 animate-spin" />
                Loading events...
              </div>
            ) : allEvents.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No events found. Create Science Olympiad disciplines on the Events page first.
              </div>
            ) : (
              <div className="space-y-1">
                <div className="grid grid-cols-[auto_1fr_80px_120px] gap-3 px-3 py-2 text-xs font-medium text-muted-foreground border-b">
                  <span></span>
                  <span>Event</span>
                  <span>Slot #</span>
                  <span>Slot label</span>
                </div>
                {scheduleEntries.map((entry, i) => {
                  const event = allEvents.find(e => e.id === entry.eventId)
                  if (!event) return null
                  return (
                    <div key={entry.eventId} className="grid grid-cols-[auto_1fr_80px_120px] gap-3 items-center px-3 py-2 rounded-lg hover:bg-muted/30">
                      <input
                        type="checkbox"
                        checked={entry.checked}
                        onChange={e => setScheduleEntries(prev => prev.map((en, idx) => idx === i ? { ...en, checked: e.target.checked } : en))}
                        className="size-4"
                      />
                      <div className="min-w-0">
                        <span className="text-sm font-medium">{event.name}</span>
                        {event.code && <span className="ml-1.5 text-xs text-muted-foreground">{event.code}</span>}
                      </div>
                      <input
                        type="number"
                        min={1}
                        max={12}
                        value={entry.timeSlot}
                        disabled={!entry.checked}
                        onChange={e => setScheduleEntries(prev => prev.map((en, idx) => idx === i ? { ...en, timeSlot: e.target.value } : en))}
                        className="w-full rounded border bg-background px-2 py-1 text-sm disabled:opacity-40"
                      />
                      <input
                        type="text"
                        placeholder="e.g. 9:00 AM"
                        value={entry.slotLabel}
                        disabled={!entry.checked}
                        onChange={e => setScheduleEntries(prev => prev.map((en, idx) => idx === i ? { ...en, slotLabel: e.target.value } : en))}
                        className="w-full rounded border bg-background px-2 py-1 text-sm disabled:opacity-40"
                      />
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 border-t pt-4">
            <Button variant="outline" onClick={() => setScheduleOpen(false)} disabled={savingSchedule}>
              Cancel
            </Button>
            <Button onClick={() => void handleSaveSchedule()} disabled={savingSchedule || loadingEvents}>
              {savingSchedule && <IconLoader2 className="size-4 animate-spin" />}
              Save schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
