"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  IconLoader2,
  IconSchool,
  IconClock,
  IconChevronRight,
} from "@tabler/icons-react"
import { toast } from "sonner"
import { z } from "zod"

import { PageHeader } from "@/components/page-header"
import { EmptyState } from "@/components/empty-state"
import { Badge } from "@/components/ui/badge"

// ─── Schemas ──────────────────────────────────────────────────────────────────

const testSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable().default(null),
  eventId: z.string().nullable().default(null),
  eventName: z.string().nullable().default(null),
  eventCode: z.string().nullable().default(null),
  questionCount: z.number().default(0),
  isActive: z.boolean().default(true),
  timeLimitMinutes: z.number().nullable().default(null),
  createdAt: z.string(),
})

const eventSchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string().nullable().default(null),
})

const myAttemptSchema = z.object({
  testId: z.string(),
  attemptCount: z.number(),
  bestScore: z.number().nullable(),
  totalPoints: z.number(),
  lastAttemptAt: z.string().nullable(),
})

type TestSummary = z.infer<typeof testSummarySchema>
type SciOlyEvent = z.infer<typeof eventSchema>
type MyAttempt = z.infer<typeof myAttemptSchema>

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PracticePage() {
  const router = useRouter()
  const [tests, setTests] = React.useState<TestSummary[]>([])
  const [events, setEvents] = React.useState<SciOlyEvent[]>([])
  const [myAttempts, setMyAttempts] = React.useState<Map<string, MyAttempt>>(new Map())
  const [loading, setLoading] = React.useState(true)
  const [selectedEventId, setSelectedEventId] = React.useState<string>("all")

  React.useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [testsRes, eventsRes, attemptsRes] = await Promise.all([
          fetch("/api/admin/tests", { cache: "no-store" }),
          fetch("/api/member/events", { cache: "no-store" }),
          fetch("/api/member/tests/my-attempts", { cache: "no-store" }),
        ])

        if (testsRes.ok) {
          const json = await testsRes.json()
          setTests(z.array(testSummarySchema).parse(json))
        }
        if (eventsRes.ok) {
          const json = await eventsRes.json()
          setEvents(z.array(eventSchema).parse(json))
        }
        if (attemptsRes.ok) {
          const json = await attemptsRes.json()
          const parsed = z.array(myAttemptSchema).parse(json)
          setMyAttempts(new Map(parsed.map(a => [a.testId, a])))
        }
      } catch {
        toast.error("Failed to load practice tests.")
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  const filtered = selectedEventId === "all"
    ? tests
    : selectedEventId === "general"
    ? tests.filter(t => !t.eventId)
    : tests.filter(t => t.eventId === selectedEventId)

  return (
    <div className="flex flex-col gap-6 px-4 py-4 lg:px-6 md:py-6">
      <PageHeader
        title="Practice Tests"
        description="Take practice tests to prepare for competitions."
      />

      {/* Event filter pills */}
      {!loading && events.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedEventId("all")}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors border ${
              selectedEventId === "all"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background hover:bg-muted border-border"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setSelectedEventId("general")}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors border ${
              selectedEventId === "general"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background hover:bg-muted border-border"
            }`}
          >
            General
          </button>
          {events.map(ev => (
            <button
              key={ev.id}
              onClick={() => setSelectedEventId(ev.id)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors border ${
                selectedEventId === ev.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background hover:bg-muted border-border"
              }`}
            >
              {ev.code ?? ev.name}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex h-48 items-center justify-center gap-2 text-sm text-muted-foreground">
          <IconLoader2 className="size-4 animate-spin" />
          Loading tests...
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={IconSchool}
          title="No practice tests available"
          description="No tests have been published for this filter yet."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(test => {
            const attempt = myAttempts.get(test.id)
            return (
              <button
                key={test.id}
                onClick={() => router.push(`/dashboard/practice/${test.id}`)}
                className="rounded-xl border bg-card p-5 text-left hover:bg-muted/40 transition-colors group flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm leading-snug truncate">{test.title}</p>
                    {test.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{test.description}</p>
                    )}
                  </div>
                  <IconChevronRight className="size-4 text-muted-foreground shrink-0 mt-0.5 group-hover:translate-x-0.5 transition-transform" />
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {test.eventName && (
                    <Badge variant="outline" className="text-xs">
                      {test.eventCode ? `${test.eventCode} — ` : ""}{test.eventName}
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-xs">
                    {test.questionCount} {test.questionCount === 1 ? "question" : "questions"}
                  </Badge>
                  {test.timeLimitMinutes && (
                    <Badge variant="outline" className="text-xs flex items-center gap-1">
                      <IconClock className="size-3" />
                      {test.timeLimitMinutes} min
                    </Badge>
                  )}
                </div>

                {attempt && attempt.attemptCount > 0 ? (
                  <div className="text-xs text-muted-foreground border-t pt-2">
                    {attempt.bestScore !== null
                      ? `Best: ${attempt.bestScore}/${attempt.totalPoints} pts`
                      : "Attempted"
                    }{" "}
                    · {attempt.attemptCount} attempt{attempt.attemptCount !== 1 ? "s" : ""}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground border-t pt-2">Not attempted yet</div>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
