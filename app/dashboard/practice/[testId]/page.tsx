"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import {
  IconLoader2,
  IconArrowLeft,
  IconClock,
  IconSend,
} from "@tabler/icons-react"
import { toast } from "sonner"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// ─── Schemas ──────────────────────────────────────────────────────────────────

const questionSchema = z.object({
  id: z.string(),
  order: z.number(),
  content: z.string(),
  type: z.enum(["MCQ", "SELECT_ALL", "MATCHING", "FREE_RESPONSE", "TRUE_FALSE", "FILL_IN_BLANK"]),
  options: z.any().nullable().default(null),
  answerKey: z.string().nullable().default(null),
  points: z.number().default(1),
  imageUrl: z.string().nullable().default(null),
  stationNumber: z.number().nullable().default(null),
  stationContext: z.string().nullable().default(null),
})

const testDetailSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable().default(null),
  timeLimitMinutes: z.number().nullable().default(null),
  questions: z.array(questionSchema),
})

type Question = z.infer<typeof questionSchema>
type McqOption = { label: string; text: string }
type MatchingOptions = { leftItems: { id: string; text: string }[]; rightItems: { id: string; text: string }[] }

// ─── Helpers ──────────────────────────────────────────────────────────────────

const textareaClassName =
  "w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 resize-y min-h-[72px]"

const selectClassName =
  "rounded-md border bg-background px-3 py-2 text-sm outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50"

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}

function isAnswered(type: Question["type"], value: unknown): boolean {
  if (value === null || value === undefined) return false
  if (type === "FREE_RESPONSE" || type === "MCQ" || type === "TRUE_FALSE" || type === "FILL_IN_BLANK") {
    return String(value).trim().length > 0
  }
  if (type === "SELECT_ALL") {
    try { return (JSON.parse(value as string) as string[]).length > 0 } catch { return false }
  }
  if (type === "MATCHING") {
    try {
      const pairs = value as { leftId: string; rightId: string }[]
      return Array.isArray(pairs) && pairs.length > 0
    } catch { return false }
  }
  return false
}

// ─── Question Renderer ────────────────────────────────────────────────────────

function QuestionRenderer({
  question,
  value,
  onChange,
}: {
  question: Question
  value: unknown
  onChange: (val: unknown) => void
}) {
  const { type, options } = question

  if (type === "MCQ") {
    const opts = (options as McqOption[] | null) ?? []
    return (
      <div className="space-y-2">
        {opts.map(opt => (
          <label
            key={opt.label}
            className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors hover:bg-muted/50 ${
              value === opt.label ? "border-primary bg-primary/5" : ""
            }`}
          >
            <div className={`size-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
              value === opt.label ? "border-primary bg-primary" : "border-muted-foreground/40"
            }`}>
              {value === opt.label && <div className="size-2 rounded-full bg-primary-foreground" />}
            </div>
            <span className="text-sm font-medium w-5 shrink-0">{opt.label}.</span>
            <span className="text-sm">{opt.text}</span>
            <input
              type="radio"
              className="sr-only"
              checked={value === opt.label}
              onChange={() => onChange(opt.label)}
            />
          </label>
        ))}
      </div>
    )
  }

  if (type === "SELECT_ALL") {
    const opts = (options as McqOption[] | null) ?? []
    let selected: string[] = []
    try { selected = JSON.parse(value as string ?? "[]") as string[] } catch { /* empty */ }

    return (
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">Select all that apply.</p>
        {opts.map(opt => {
          const checked = selected.includes(opt.label)
          return (
            <label
              key={opt.label}
              className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors hover:bg-muted/50 ${
                checked ? "border-primary bg-primary/5" : ""
              }`}
            >
              <div className={`size-4 rounded border-2 shrink-0 flex items-center justify-center ${
                checked ? "border-primary bg-primary" : "border-muted-foreground/40"
              }`}>
                {checked && <svg className="size-3 text-primary-foreground" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </div>
              <span className="text-sm font-medium w-5 shrink-0">{opt.label}.</span>
              <span className="text-sm">{opt.text}</span>
              <input
                type="checkbox"
                className="sr-only"
                checked={checked}
                onChange={() => {
                  const next = checked
                    ? selected.filter(l => l !== opt.label)
                    : [...selected, opt.label]
                  onChange(JSON.stringify(next.sort()))
                }}
              />
            </label>
          )
        })}
      </div>
    )
  }

  if (type === "MATCHING") {
    let opts: MatchingOptions = { leftItems: [], rightItems: [] }
    try { opts = options as MatchingOptions } catch { /* empty */ }
    const pairs = (value as { leftId: string; rightId: string }[] | null) ?? []

    return (
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">Match each term on the left to its definition on the right.</p>
        {opts.leftItems.map(left => {
          const pair = pairs.find(p => p.leftId === left.id)
          return (
            <div key={left.id} className="flex items-center gap-3 text-sm">
              <span className="w-5 font-medium shrink-0 text-muted-foreground">{left.id}.</span>
              <span className="flex-1">{left.text}</span>
              <span className="text-muted-foreground">→</span>
              <Select
                value={pair?.rightId ?? ""}
                onValueChange={val => {
                  const existing = pairs.filter(p => p.leftId !== left.id)
                  const next = val
                    ? [...existing, { leftId: left.id, rightId: val }]
                    : existing
                  onChange(next)
                }}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="— select —" />
                </SelectTrigger>
                <SelectContent>
                  {opts.rightItems.map(r => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.id}. {r.text}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )
        })}
      </div>
    )
  }

  if (type === "TRUE_FALSE") {
    return (
      <div className="flex gap-3">
        {(["true", "false"] as const).map(val => (
          <label
            key={val}
            className={`flex-1 flex items-center justify-center gap-2 rounded-lg border p-3 cursor-pointer transition-colors hover:bg-muted/50 ${
              value === val ? "border-primary bg-primary/5" : ""
            }`}
          >
            <div className={`size-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
              value === val ? "border-primary bg-primary" : "border-muted-foreground/40"
            }`}>
              {value === val && <div className="size-2 rounded-full bg-primary-foreground" />}
            </div>
            <span className="text-sm font-medium capitalize">{val === "true" ? "True" : "False"}</span>
            <input type="radio" className="sr-only" checked={value === val} onChange={() => onChange(val)} />
          </label>
        ))}
      </div>
    )
  }

  if (type === "FILL_IN_BLANK") {
    return (
      <div className="space-y-1">
        <Input
          placeholder="Your answer..."
          value={String(value ?? "")}
          onChange={e => onChange(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">Answer is matched case-insensitively.</p>
      </div>
    )
  }

  // FREE_RESPONSE
  return (
    <div className="space-y-1">
      <textarea
        className={textareaClassName}
        placeholder="Your answer..."
        value={String(value ?? "")}
        onChange={e => onChange(e.target.value)}
      />
      <p className="text-xs text-muted-foreground">This answer will not be auto-graded. You&apos;ll see the model answer after submitting.</p>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PracticeTestPage() {
  const params = useParams()
  const router = useRouter()
  const testId = params.testId as string

  const [test, setTest] = React.useState<z.infer<typeof testDetailSchema> | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [attemptId, setAttemptId] = React.useState<string | null>(null)
  const [answers, setAnswers] = React.useState<Record<string, unknown>>({})
  const [submitting, setSubmitting] = React.useState(false)
  const [confirmOpen, setConfirmOpen] = React.useState(false)

  // Timer state
  const [secondsLeft, setSecondsLeft] = React.useState<number | null>(null)
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Load test + start attempt ─────────────────────────────────────────────

  React.useEffect(() => {
    const init = async () => {
      setLoading(true)
      try {
        const [testRes, attemptRes] = await Promise.all([
          fetch(`/api/admin/tests?id=${testId}`, { cache: "no-store" }),
          fetch("/api/member/tests/attempt", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "start", testId }),
          }),
        ])

        if (!testRes.ok) { toast.error("Test not found."); router.back(); return }
        if (!attemptRes.ok) { toast.error("Could not start attempt."); router.back(); return }

        const testJson = await testRes.json()
        const parsed = testDetailSchema.parse(testJson)
        setTest(parsed)

        const atkJson = await attemptRes.json() as {
          attemptId: string
          startedAt: string
          timeLimitMinutes: number | null
        }
        setAttemptId(atkJson.attemptId)

        if (atkJson.timeLimitMinutes) {
          const startedAt = new Date(atkJson.startedAt).getTime()
          const deadline = startedAt + atkJson.timeLimitMinutes * 60 * 1000
          const remaining = Math.max(0, Math.floor((deadline - Date.now()) / 1000))
          setSecondsLeft(remaining)
        }
      } catch {
        toast.error("Failed to load test.")
        router.back()
      } finally {
        setLoading(false)
      }
    }
    void init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testId])

  // ── Timer ─────────────────────────────────────────────────────────────────

  const handleSubmit = React.useCallback(async () => {
    if (!attemptId || !test) return
    setSubmitting(true)
    setConfirmOpen(false)
    try {
      const answerPayload = test.questions.map(q => ({
        questionId: q.id,
        response: answers[q.id] ?? null,
      }))

      const res = await fetch("/api/member/tests/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId, answers: answerPayload }),
      })

      if (!res.ok) {
        const json = await res.json() as { message?: string }
        throw new Error(json.message ?? "Submit failed")
      }

      router.push(`/dashboard/practice/${testId}/results/${attemptId}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to submit test.")
      setSubmitting(false)
    }
  }, [attemptId, test, answers, testId, router])

  React.useEffect(() => {
    if (secondsLeft === null) return
    if (secondsLeft <= 0) {
      void handleSubmit()
      return
    }
    timerRef.current = setInterval(() => {
      setSecondsLeft(s => {
        if (s === null || s <= 1) { clearInterval(timerRef.current!); return 0 }
        return s - 1
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [secondsLeft === null ? null : "active", handleSubmit]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Station grouping ──────────────────────────────────────────────────────

  const setAnswer = (questionId: string, value: unknown) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }))
  }

  const answeredCount = test?.questions.filter(q => isAnswered(q.type, answers[q.id])).length ?? 0
  const totalCount = test?.questions.length ?? 0

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center gap-2 text-sm text-muted-foreground">
        <IconLoader2 className="size-4 animate-spin" />
        Loading test...
      </div>
    )
  }

  if (!test) return null

  // Group questions: track which station numbers we've already rendered a header for
  const renderedStations = new Set<number>()

  return (
    <div className="flex flex-col gap-6 px-4 py-4 lg:px-6 md:py-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2 text-muted-foreground hover:text-foreground"
            onClick={() => router.push("/dashboard/practice")}
          >
            <IconArrowLeft className="size-4" />
            Back to tests
          </Button>
          <h1 className="text-xl font-semibold mt-2">{test.title}</h1>
          {test.description && (
            <p className="text-sm text-muted-foreground mt-1">{test.description}</p>
          )}
        </div>
        {secondsLeft !== null && (
          <div className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-mono font-medium shrink-0 ${
            secondsLeft < 60 ? "border-red-300 text-red-600 bg-red-50" : "border-border"
          }`}>
            <IconClock className="size-4" />
            {formatTime(secondsLeft)}
          </div>
        )}
      </div>

      {/* Progress */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{answeredCount} of {totalCount} answered</span>
          <span>{Math.round((answeredCount / Math.max(totalCount, 1)) * 100)}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${(answeredCount / Math.max(totalCount, 1)) * 100}%` }}
          />
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-4">
        {test.questions.map((q, i) => {
          const isFirstInStation =
            q.stationNumber !== null && !renderedStations.has(q.stationNumber)
          if (q.stationNumber !== null) renderedStations.add(q.stationNumber)

          return (
            <React.Fragment key={q.id}>
              {/* Station header */}
              {isFirstInStation && q.stationContext && (
                <div className="rounded-xl border border-dashed bg-muted/30 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                    Station {q.stationNumber}
                  </p>
                  <p className="text-sm">{q.stationContext}</p>
                </div>
              )}

              {/* Question card */}
              <div className={`rounded-xl border bg-card p-5 space-y-4 ${
                isAnswered(q.type, answers[q.id]) ? "border-primary/30" : ""
              }`}>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-medium text-muted-foreground shrink-0">Q{i + 1}</span>
                  <span className="text-xs text-muted-foreground shrink-0">{q.points} {q.points === 1 ? "pt" : "pts"}</span>
                </div>

                <p className="text-sm font-medium leading-relaxed">{q.content}</p>

                {q.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={q.imageUrl}
                    alt={`Question ${i + 1} image`}
                    className="rounded-lg border max-w-full"
                  />
                )}

                <QuestionRenderer
                  question={q}
                  value={answers[q.id]}
                  onChange={val => setAnswer(q.id, val)}
                />
              </div>
            </React.Fragment>
          )
        })}
      </div>

      {/* Submit bar */}
      <div className="flex items-center justify-between gap-4 pt-2 pb-8 border-t">
        <span className="text-sm text-muted-foreground">
          {answeredCount}/{totalCount} answered
        </span>
        <Button
          onClick={() => setConfirmOpen(true)}
          disabled={submitting || answeredCount === 0}
        >
          {submitting && <IconLoader2 className="size-4 animate-spin" />}
          <IconSend className="size-4" />
          Submit test
        </Button>
      </div>

      {/* Confirm submit dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Submit test?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            You&apos;ve answered {answeredCount} of {totalCount} questions.
            {answeredCount < totalCount && (
              <> <strong>{totalCount - answeredCount} question{totalCount - answeredCount !== 1 ? "s" : ""} unanswered.</strong></>
            )}
            {" "}This cannot be undone.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Keep reviewing</Button>
            <Button onClick={() => void handleSubmit()} disabled={submitting}>
              {submitting && <IconLoader2 className="size-4 animate-spin" />}
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
