"use client"

import * as React from "react"
import {
  IconArrowLeft,
  IconReport,
  IconPlus,
  IconLoader2,
  IconTrash,
  IconEdit,
  IconDots,
  IconCheck,
  IconX,
  IconGripVertical,
  IconKey,
  IconEye,
  IconEyeOff,
  IconChevronDown,
  IconChevronUp,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Field, FieldLabel } from "@/components/ui/field"
import { EmptyState } from "@/components/empty-state"
import { PageHeader } from "@/components/page-header"
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

const mcqOptionSchema = z.object({
  label: z.string(),
  text: z.string(),
})

const matchingOptionsSchema = z.object({
  leftItems: z.array(z.object({ id: z.string(), text: z.string() })),
  rightItems: z.array(z.object({ id: z.string(), text: z.string() })),
})

const questionSchema = z.object({
  id: z.string().optional(),
  order: z.number(),
  content: z.string(),
  type: z.enum(["MCQ", "SELECT_ALL", "MATCHING", "FREE_RESPONSE", "TRUE_FALSE", "FILL_IN_BLANK"]).default("MCQ"),
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
  eventId: z.string().nullable().default(null),
  timeLimitMinutes: z.number().nullable().default(null),
  event: z.object({ id: z.string(), name: z.string(), code: z.string().nullable() }).nullable().default(null),
  questions: z.array(questionSchema),
})

const eventSchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string().nullable().default(null),
})

type TestSummary = z.infer<typeof testSummarySchema>
type Question = z.infer<typeof questionSchema>
type SciOlyEvent = z.infer<typeof eventSchema>
type MatchingOptions = z.infer<typeof matchingOptionsSchema>

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DEFAULT_MCQ_OPTIONS = [
  { label: "A", text: "" },
  { label: "B", text: "" },
  { label: "C", text: "" },
  { label: "D", text: "" },
]

function makeNewQuestion(order: number): Question {
  return {
    order,
    content: "",
    type: "MCQ",
    options: DEFAULT_MCQ_OPTIONS.map(o => ({ ...o })),
    answerKey: null,
    points: 1,
    imageUrl: null,
    stationNumber: null,
    stationContext: null,
  }
}

const selectClassName =
  "w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50"

const textareaClassName =
  "w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 resize-y min-h-[72px]"

// Parse SELECT_ALL answerKey (JSON string of string[])
function parseSelectAllKey(key: string | null): string[] {
  if (!key) return []
  try { return JSON.parse(key) as string[] } catch { return [] }
}

// Parse MATCHING answerKey (JSON string of {leftId, rightId}[])
function parseMatchingKey(key: string | null): { leftId: string; rightId: string }[] {
  if (!key) return []
  try { return JSON.parse(key) as { leftId: string; rightId: string }[] } catch { return [] }
}

// Human-readable MATCHING answer key display
function formatMatchingKey(key: string | null, opts: MatchingOptions | null): string {
  const pairs = parseMatchingKey(key)
  if (!opts || pairs.length === 0) return "—"
  return pairs
    .map(p => {
      const leftText = opts.leftItems.find(l => l.id === p.leftId)?.id ?? p.leftId
      const rightText = opts.rightItems.find(r => r.id === p.rightId)?.id ?? p.rightId
      return `${leftText} → ${rightText}`
    })
    .join(", ")
}

// ─── Question Editor ──────────────────────────────────────────────────────────

function QuestionEditor({
  question,
  index,
  onChange,
  onRemove,
}: {
  question: Question
  index: number
  onChange: (q: Question) => void
  onRemove: () => void
}) {
  const [showExtra, setShowExtra] = React.useState(
    !!(question.imageUrl || question.stationNumber !== null)
  )

  const type = question.type

  // ── Matching helpers ─────────────────────────────────────────────────────

  const matchingOpts: MatchingOptions = React.useMemo(() => {
    if (type !== "MATCHING" || !question.options) {
      return { leftItems: [{ id: "A", text: "" }], rightItems: [{ id: "1", text: "" }] }
    }
    try {
      return matchingOptionsSchema.parse(question.options)
    } catch {
      return { leftItems: [{ id: "A", text: "" }], rightItems: [{ id: "1", text: "" }] }
    }
  }, [type, question.options])

  const matchingPairs = parseMatchingKey(question.answerKey)

  const updateMatchingOpts = (newOpts: MatchingOptions) => {
    onChange({ ...question, options: newOpts })
  }

  const updateMatchingPairs = (pairs: { leftId: string; rightId: string }[]) => {
    onChange({ ...question, answerKey: JSON.stringify(pairs) })
  }

  // ── Type change ──────────────────────────────────────────────────────────

  const changeType = (newType: Question["type"]) => {
    if (newType === "MCQ" || newType === "SELECT_ALL") {
      onChange({
        ...question,
        type: newType,
        options: question.type === "MCQ" || question.type === "SELECT_ALL"
          ? question.options
          : DEFAULT_MCQ_OPTIONS.map(o => ({ ...o })),
        answerKey: null,
      })
    } else if (newType === "MATCHING") {
      onChange({
        ...question,
        type: "MATCHING",
        options: { leftItems: [{ id: "A", text: "" }], rightItems: [{ id: "1", text: "" }] },
        answerKey: null,
      })
    } else if (newType === "TRUE_FALSE") {
      onChange({ ...question, type: "TRUE_FALSE", options: null, answerKey: "true" })
    } else if (newType === "FILL_IN_BLANK") {
      onChange({ ...question, type: "FILL_IN_BLANK", options: null, answerKey: null })
    } else {
      onChange({ ...question, type: "FREE_RESPONSE", options: null, answerKey: null })
    }
  }

  const TYPE_LABELS: { key: Question["type"]; label: string }[] = [
    { key: "MCQ", label: "MCQ" },
    { key: "SELECT_ALL", label: "Select All" },
    { key: "MATCHING", label: "Matching" },
    { key: "TRUE_FALSE", label: "T/F" },
    { key: "FILL_IN_BLANK", label: "Fill In" },
    { key: "FREE_RESPONSE", label: "Free" },
  ]

  return (
    <div className="rounded-xl border bg-card p-4 space-y-4">
      {/* Question header */}
      <div className="flex items-start gap-3">
        <IconGripVertical className="size-4 mt-1 text-muted-foreground shrink-0 cursor-grab" />
        <div className="flex-1 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-sm font-medium text-muted-foreground">Q{index + 1}</span>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Type selector */}
              <div className="flex rounded-md border overflow-hidden text-xs">
                {TYPE_LABELS.map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => changeType(key)}
                    className={`px-2 py-1 transition-colors ${type === key ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {/* Points */}
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">pts</span>
                <Input
                  type="number"
                  min={1}
                  value={question.points}
                  onChange={e => onChange({ ...question, points: parseInt(e.target.value) || 1 })}
                  className="w-14 h-7 text-xs px-2"
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground hover:text-foreground"
                onClick={onRemove}
              >
                <IconX className="size-4" />
              </Button>
            </div>
          </div>

          {/* Question content */}
          <textarea
            className={textareaClassName}
            placeholder="Question text..."
            value={question.content}
            onChange={e => onChange({ ...question, content: e.target.value })}
          />
        </div>
      </div>

      {/* MCQ options */}
      {type === "MCQ" && (
        <div className="ml-7 space-y-2">
          {(question.options as typeof DEFAULT_MCQ_OPTIONS ?? DEFAULT_MCQ_OPTIONS).map((opt, i) => (
            <div key={opt.label} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onChange({ ...question, answerKey: opt.label })}
                className={`size-5 shrink-0 rounded-full border-2 transition-colors flex items-center justify-center ${
                  question.answerKey === opt.label
                    ? "border-primary bg-primary"
                    : "border-muted-foreground/40 hover:border-primary"
                }`}
                title={`Mark ${opt.label} as correct`}
              >
                {question.answerKey === opt.label && (
                  <IconCheck className="size-3 text-primary-foreground" />
                )}
              </button>
              <span className="text-sm font-medium w-5 shrink-0">{opt.label}</span>
              <Input
                placeholder={`Option ${opt.label}`}
                value={opt.text}
                onChange={e => {
                  const opts = (question.options as typeof DEFAULT_MCQ_OPTIONS ?? DEFAULT_MCQ_OPTIONS)
                  const newOptions = opts.map((o, oi) =>
                    oi === i ? { ...o, text: e.target.value } : o
                  )
                  onChange({ ...question, options: newOptions })
                }}
              />
            </div>
          ))}
        </div>
      )}

      {/* SELECT_ALL options (checkboxes) */}
      {type === "SELECT_ALL" && (
        <div className="ml-7 space-y-2">
          <p className="text-xs text-muted-foreground">Check all correct answers.</p>
          {(question.options as typeof DEFAULT_MCQ_OPTIONS ?? DEFAULT_MCQ_OPTIONS).map((opt, i) => {
            const selected = parseSelectAllKey(question.answerKey)
            const isChecked = selected.includes(opt.label)
            return (
              <div key={opt.label} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const next = isChecked
                      ? selected.filter(l => l !== opt.label)
                      : [...selected, opt.label]
                    onChange({ ...question, answerKey: JSON.stringify(next.sort()) })
                  }}
                  className={`size-5 shrink-0 rounded border-2 transition-colors flex items-center justify-center ${
                    isChecked
                      ? "border-primary bg-primary"
                      : "border-muted-foreground/40 hover:border-primary"
                  }`}
                  title={`Toggle ${opt.label} as correct`}
                >
                  {isChecked && <IconCheck className="size-3 text-primary-foreground" />}
                </button>
                <span className="text-sm font-medium w-5 shrink-0">{opt.label}</span>
                <Input
                  placeholder={`Option ${opt.label}`}
                  value={opt.text}
                  onChange={e => {
                    const opts = (question.options as typeof DEFAULT_MCQ_OPTIONS ?? DEFAULT_MCQ_OPTIONS)
                    const newOptions = opts.map((o, oi) =>
                      oi === i ? { ...o, text: e.target.value } : o
                    )
                    onChange({ ...question, options: newOptions })
                  }}
                />
              </div>
            )
          })}
        </div>
      )}

      {/* MATCHING builder */}
      {type === "MATCHING" && (
        <div className="ml-7 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Left items */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Left column (terms)</p>
              {matchingOpts.leftItems.map((item, i) => (
                <div key={item.id} className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground w-5 shrink-0">{item.id}</span>
                  <Input
                    placeholder={`Term ${item.id}`}
                    value={item.text}
                    onChange={e => {
                      const newLeft = matchingOpts.leftItems.map((l, li) =>
                        li === i ? { ...l, text: e.target.value } : l
                      )
                      updateMatchingOpts({ ...matchingOpts, leftItems: newLeft })
                    }}
                    className="h-8 text-xs"
                  />
                  {matchingOpts.leftItems.length > 1 && (
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        const newLeft = matchingOpts.leftItems.filter((_, li) => li !== i)
                        updateMatchingOpts({ ...matchingOpts, leftItems: newLeft })
                        // Remove any pairs referencing this item
                        updateMatchingPairs(matchingPairs.filter(p => p.leftId !== item.id))
                      }}
                    >
                      <IconX className="size-3" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                onClick={() => {
                  const nextId = String.fromCharCode(65 + matchingOpts.leftItems.length)
                  updateMatchingOpts({
                    ...matchingOpts,
                    leftItems: [...matchingOpts.leftItems, { id: nextId, text: "" }],
                  })
                }}
              >
                <IconPlus className="size-3" /> Add term
              </button>
            </div>

            {/* Right items */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Right column (definitions)</p>
              {matchingOpts.rightItems.map((item, i) => (
                <div key={item.id} className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground w-5 shrink-0">{item.id}</span>
                  <Input
                    placeholder={`Definition ${item.id}`}
                    value={item.text}
                    onChange={e => {
                      const newRight = matchingOpts.rightItems.map((r, ri) =>
                        ri === i ? { ...r, text: e.target.value } : r
                      )
                      updateMatchingOpts({ ...matchingOpts, rightItems: newRight })
                    }}
                    className="h-8 text-xs"
                  />
                  {matchingOpts.rightItems.length > 1 && (
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        const newRight = matchingOpts.rightItems.filter((_, ri) => ri !== i)
                        updateMatchingOpts({ ...matchingOpts, rightItems: newRight })
                        updateMatchingPairs(matchingPairs.filter(p => p.rightId !== item.id))
                      }}
                    >
                      <IconX className="size-3" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                onClick={() => {
                  const nextId = String(matchingOpts.rightItems.length + 1)
                  updateMatchingOpts({
                    ...matchingOpts,
                    rightItems: [...matchingOpts.rightItems, { id: nextId, text: "" }],
                  })
                }}
              >
                <IconPlus className="size-3" /> Add definition
              </button>
            </div>
          </div>

          {/* Pair assignments */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Correct matches</p>
            {matchingOpts.leftItems.map(leftItem => {
              const pair = matchingPairs.find(p => p.leftId === leftItem.id)
              return (
                <div key={leftItem.id} className="flex items-center gap-2 text-sm">
                  <span className="w-28 shrink-0 truncate text-xs">
                    <span className="font-medium">{leftItem.id}.</span>{" "}
                    {leftItem.text || <em className="text-muted-foreground">Term {leftItem.id}</em>}
                  </span>
                  <span className="text-muted-foreground text-xs">→</span>
                  <Select
                    value={pair?.rightId ?? ""}
                    onValueChange={val => {
                      const existing = matchingPairs.filter(p => p.leftId !== leftItem.id)
                      if (val) {
                        updateMatchingPairs([...existing, { leftId: leftItem.id, rightId: val }])
                      } else {
                        updateMatchingPairs(existing)
                      }
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs flex-1">
                      <SelectValue placeholder="— select —" />
                    </SelectTrigger>
                    <SelectContent>
                      {matchingOpts.rightItems.map(r => (
                        <SelectItem key={r.id} value={r.id} className="text-xs">
                          {r.id}. {r.text || `Definition ${r.id}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* TRUE_FALSE answer key */}
      {type === "TRUE_FALSE" && (
        <div className="ml-7">
          <Field>
            <FieldLabel>Correct answer</FieldLabel>
            <div className="flex gap-2">
              {(["true", "false"] as const).map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => onChange({ ...question, answerKey: val })}
                  className={`flex-1 rounded-md border py-2 text-sm font-medium capitalize transition-colors ${
                    question.answerKey === val
                      ? "border-primary bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                >
                  {val === "true" ? "True" : "False"}
                </button>
              ))}
            </div>
          </Field>
        </div>
      )}

      {/* FILL_IN_BLANK answer key */}
      {type === "FILL_IN_BLANK" && (
        <div className="ml-7">
          <Field>
            <FieldLabel>Exact answer (matched case-insensitively)</FieldLabel>
            <Input
              placeholder="e.g. Mitosis, NaCl, Caesar cipher..."
              value={question.answerKey ?? ""}
              onChange={e => onChange({ ...question, answerKey: e.target.value || null })}
            />
          </Field>
        </div>
      )}

      {/* FREE_RESPONSE answer key */}
      {type === "FREE_RESPONSE" && (
        <div className="ml-7">
          <Field>
            <FieldLabel>Model answer (optional)</FieldLabel>
            <textarea
              className={textareaClassName}
              placeholder="Expected answer or grading rubric..."
              value={question.answerKey ?? ""}
              onChange={e => onChange({ ...question, answerKey: e.target.value || null })}
            />
          </Field>
        </div>
      )}

      {/* Extra fields: image + station (collapsible) */}
      <div className="ml-7">
        <button
          type="button"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => setShowExtra(v => !v)}
        >
          {showExtra ? <IconChevronUp className="size-3" /> : <IconChevronDown className="size-3" />}
          {showExtra ? "Hide" : "Add"} image / station
        </button>
        {showExtra && (
          <div className="mt-3 space-y-3">
            <Field>
              <FieldLabel>Image URL (optional)</FieldLabel>
              <Input
                placeholder="https://..."
                value={question.imageUrl ?? ""}
                onChange={e => onChange({ ...question, imageUrl: e.target.value || null })}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel>Station number</FieldLabel>
                <Input
                  type="number"
                  min={1}
                  placeholder="e.g. 1"
                  value={question.stationNumber ?? ""}
                  onChange={e => onChange({
                    ...question,
                    stationNumber: e.target.value ? parseInt(e.target.value) : null,
                  })}
                />
              </Field>
              <Field>
                <FieldLabel>Station context</FieldLabel>
                <Input
                  placeholder="Station header text..."
                  value={question.stationContext ?? ""}
                  onChange={e => onChange({ ...question, stationContext: e.target.value || null })}
                />
              </Field>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Test Editor ──────────────────────────────────────────────────────────────

function TestEditor({
  testId,
  initialTitle,
  initialDescription,
  initialEventId,
  initialTimeLimitMinutes,
  initialQuestions,
  availableEvents,
  onSaved,
  onBack,
}: {
  testId: string | null
  initialTitle: string
  initialDescription: string
  initialEventId: string
  initialTimeLimitMinutes: number | null
  initialQuestions: Question[]
  availableEvents: SciOlyEvent[]
  onSaved: (id: string) => void
  onBack: () => void
}) {
  const [title, setTitle] = React.useState(initialTitle)
  const [description, setDescription] = React.useState(initialDescription)
  const [eventId, setEventId] = React.useState(initialEventId)
  const [timeLimitMinutes, setTimeLimitMinutes] = React.useState<number | null>(initialTimeLimitMinutes)
  const [questions, setQuestions] = React.useState<Question[]>(initialQuestions)
  const [saving, setSaving] = React.useState(false)

  const updateQuestion = (index: number, q: Question) => {
    setQuestions(prev => prev.map((old, i) => (i === index ? q : old)))
  }

  const addQuestion = () => {
    setQuestions(prev => [...prev, makeNewQuestion(prev.length + 1)])
  }

  const removeQuestion = (index: number) => {
    setQuestions(prev => prev.filter((_, i) => i !== index).map((q, i) => ({ ...q, order: i + 1 })))
  }

  const handleSave = async () => {
    if (!title.trim()) { toast.error("Title is required."); return }

    setSaving(true)
    try {
      let id = testId

      const metaRes = await fetch("/api/admin/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: id ? "edit" : "create",
          ...(id ? { id } : {}),
          title: title.trim(),
          description: description.trim() || null,
          eventId: eventId || null,
          timeLimitMinutes: timeLimitMinutes ?? null,
        }),
      })
      if (!metaRes.ok) throw new Error()
      const metaJson = await metaRes.json() as { id?: string }
      if (!id) id = metaJson.id!

      const qRes = await fetch("/api/admin/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save-questions",
          id,
          questions: questions.map((q, i) => ({
            order: i + 1,
            content: q.content,
            type: q.type,
            options: (q.type === "MCQ" || q.type === "SELECT_ALL")
              ? q.options
              : q.type === "MATCHING"
              ? q.options
              : null,
            answerKey: q.answerKey ?? null,
            points: q.points,
            imageUrl: q.imageUrl ?? null,
            stationNumber: q.stationNumber ?? null,
            stationContext: q.stationContext ?? null,
          })),
        }),
      })
      if (!qRes.ok) throw new Error()

      toast.success(testId ? "Test updated." : "Test created.")
      onSaved(id)
    } catch {
      toast.error("Failed to save test.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 px-8 py-4 lg:px-12 md:py-6">
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2 text-muted-foreground hover:text-foreground"
        onClick={onBack}
      >
        <IconArrowLeft className="size-4" />
        Back to tests
      </Button>

      <div className="space-y-1">
        <h1 className="text-xl font-semibold">{testId ? "Edit test" : "New test"}</h1>
        <p className="text-sm text-muted-foreground">Build questions manually. Supports MCQ, Select All, Matching, True/False, Fill in the Blank, and Free Response.</p>
      </div>

      {/* Metadata */}
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold">Test details</h2>
        <Field>
          <FieldLabel htmlFor="t-title">Title</FieldLabel>
          <Input
            id="t-title"
            placeholder="e.g. 2025 Regional Practice Test"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="t-event">Event (optional)</FieldLabel>
          <Select value={eventId || "_none"} onValueChange={val => setEventId(val === "_none" ? "" : val)}>
            <SelectTrigger id="t-event">
              <SelectValue placeholder="General / unassigned" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">General / unassigned</SelectItem>
              {availableEvents.map(ev => (
                <SelectItem key={ev.id} value={ev.id}>
                  {ev.code ? `${ev.code} — ` : ""}{ev.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field>
            <FieldLabel htmlFor="t-timelimit">Time limit (minutes, optional)</FieldLabel>
            <Input
              id="t-timelimit"
              type="number"
              min={1}
              placeholder="Leave blank for untimed"
              value={timeLimitMinutes ?? ""}
              onChange={e => setTimeLimitMinutes(e.target.value ? parseInt(e.target.value) : null)}
            />
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="t-desc">Description (optional)</FieldLabel>
          <textarea
            id="t-desc"
            className={textareaClassName}
            placeholder="Notes about this test..."
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
        </Field>
      </div>

      {/* Questions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Questions ({questions.length})</h2>
          <Button size="sm" onClick={addQuestion}>
            <IconPlus className="size-4" /> Add question
          </Button>
        </div>

        {questions.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-10 text-center">
            <IconReport className="size-8 opacity-20" />
            <p className="text-sm text-muted-foreground">No questions yet. Click "Add question" to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {questions.map((q, i) => (
              <QuestionEditor
                key={i}
                question={q}
                index={i}
                onChange={updated => updateQuestion(i, updated)}
                onRemove={() => removeQuestion(i)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Save bar */}
      <div className="flex items-center justify-end gap-2 pt-2 pb-6">
        <Button variant="outline" onClick={onBack} disabled={saving}>Cancel</Button>
        <Button onClick={() => void handleSave()} disabled={saving}>
          {saving && <IconLoader2 className="size-4 animate-spin" />}
          {testId ? "Save changes" : "Create test"}
        </Button>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TestsPage() {
  const [tests, setTests] = React.useState<TestSummary[]>([])
  const [loading, setLoading] = React.useState(true)
  const [events, setEvents] = React.useState<SciOlyEvent[]>([])

  const [editing, setEditing] = React.useState<string | "new" | null>(null)
  const [editingData, setEditingData] = React.useState<{
    title: string
    description: string
    eventId: string
    timeLimitMinutes: number | null
    questions: Question[]
  } | null>(null)
  const [editLoading, setEditLoading] = React.useState(false)

  const [deleteTarget, setDeleteTarget] = React.useState<TestSummary | null>(null)
  const [deleting, setDeleting] = React.useState(false)

  const [answerKeyTarget, setAnswerKeyTarget] = React.useState<TestSummary | null>(null)
  const [answerKeyQuestions, setAnswerKeyQuestions] = React.useState<Question[] | null>(null)
  const [answerKeyLoading, setAnswerKeyLoading] = React.useState(false)

  // ── Data loading ──────────────────────────────────────────────────────────

  const loadTests = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/tests", { cache: "no-store" })
      if (!res.ok) throw new Error()
      const json = await res.json()
      setTests(z.array(testSummarySchema).parse(json))
    } catch {
      toast.error("Failed to load tests.")
    } finally {
      setLoading(false)
    }
  }, [])

  const loadEvents = React.useCallback(async () => {
    try {
      const res = await fetch("/api/admin/events", { cache: "no-store" })
      if (!res.ok) return
      const json = await res.json()
      setEvents(z.array(eventSchema).parse(json))
    } catch {
      // Non-fatal
    }
  }, [])

  React.useEffect(() => {
    void loadTests()
    void loadEvents()
  }, [loadTests, loadEvents])

  // ── Open new / edit ────────────────────────────────────────────────────────

  const openNew = () => {
    setEditingData({ title: "", description: "", eventId: "", timeLimitMinutes: null, questions: [] })
    setEditing("new")
  }

  const openEdit = async (t: TestSummary) => {
    setEditLoading(true)
    setEditing(t.id)
    try {
      const res = await fetch(`/api/admin/tests?id=${t.id}`, { cache: "no-store" })
      if (!res.ok) throw new Error()
      const json = await res.json()
      const detail = testDetailSchema.parse(json)
      setEditingData({
        title: detail.title,
        description: detail.description ?? "",
        eventId: detail.eventId ?? "",
        timeLimitMinutes: detail.timeLimitMinutes ?? null,
        questions: detail.questions,
      })
    } catch {
      toast.error("Failed to load test.")
      setEditing(null)
    } finally {
      setEditLoading(false)
    }
  }

  const handleSaved = async (_id: string) => {
    setEditing(null)
    setEditingData(null)
    await loadTests()
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  const handleDelete = React.useCallback(async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch("/api/admin/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id: deleteTarget.id }),
      })
      if (!res.ok) throw new Error()
      toast.success("Test deleted.")
      setDeleteTarget(null)
      await loadTests()
    } catch {
      toast.error("Failed to delete test.")
    } finally {
      setDeleting(false)
    }
  }, [deleteTarget, loadTests])

  // ── Toggle active ──────────────────────────────────────────────────────────

  const toggleActive = async (t: TestSummary) => {
    try {
      const res = await fetch("/api/admin/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle-active", id: t.id }),
      })
      if (!res.ok) throw new Error()
      toast.success(t.isActive ? "Test deactivated." : "Test activated.")
      await loadTests()
    } catch {
      toast.error("Failed to update test.")
    }
  }

  // ── Answer key ─────────────────────────────────────────────────────────────

  const openAnswerKey = async (t: TestSummary) => {
    setAnswerKeyTarget(t)
    setAnswerKeyQuestions(null)
    setAnswerKeyLoading(true)
    try {
      const res = await fetch(`/api/admin/tests?id=${t.id}`, { cache: "no-store" })
      if (!res.ok) throw new Error()
      const json = await res.json()
      const detail = testDetailSchema.parse(json)
      setAnswerKeyQuestions(detail.questions)
    } catch {
      toast.error("Failed to load answer key.")
      setAnswerKeyTarget(null)
    } finally {
      setAnswerKeyLoading(false)
    }
  }

  const renderAnswerKey = (q: Question) => {
    if (q.type === "MCQ") return q.answerKey ?? "—"
    if (q.type === "SELECT_ALL") {
      const labels = parseSelectAllKey(q.answerKey)
      return labels.length ? labels.join(", ") : "—"
    }
    if (q.type === "MATCHING") {
      let opts: MatchingOptions | null = null
      try { opts = matchingOptionsSchema.parse(q.options) } catch { /* ignore */ }
      return formatMatchingKey(q.answerKey, opts)
    }
    if (q.type === "TRUE_FALSE") return q.answerKey ? (q.answerKey === "true" ? "True" : "False") : "—"
    if (q.type === "FILL_IN_BLANK") return q.answerKey ?? "—"
    return q.answerKey ?? <em className="text-muted-foreground">No model answer</em>
  }

  // ── Editor loading ─────────────────────────────────────────────────────────

  if (editing !== null) {
    if (editLoading || !editingData) {
      return (
        <div className="flex h-48 items-center justify-center gap-2 text-sm text-muted-foreground">
          <IconLoader2 className="size-4 animate-spin" />
          Loading test...
        </div>
      )
    }

    return (
      <TestEditor
        testId={editing === "new" ? null : editing}
        initialTitle={editingData.title}
        initialDescription={editingData.description}
        initialEventId={editingData.eventId}
        initialTimeLimitMinutes={editingData.timeLimitMinutes}
        initialQuestions={editingData.questions}
        availableEvents={events}
        onSaved={id => void handleSaved(id)}
        onBack={() => { setEditing(null); setEditingData(null) }}
      />
    )
  }

  // ── List view ──────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6 px-8 py-4 lg:px-12 md:py-6">
      <PageHeader
        title="Tests"
        description="Create and manage Science Olympiad practice tests."
      >
        <Button onClick={openNew}>
          <IconPlus className="size-4" />
          New test
        </Button>
      </PageHeader>

      {loading ? (
        <div className="flex h-48 items-center justify-center gap-2 text-sm text-muted-foreground">
          <IconLoader2 className="size-4 animate-spin" />
          Loading tests...
        </div>
      ) : tests.length === 0 ? (
        <EmptyState
          icon={IconReport}
          title="No tests yet"
          description="Create a test and add questions manually."
          action={
            <Button size="sm" onClick={openNew}>
              <IconPlus className="size-4" />
              New test
            </Button>
          }
        />
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Title</th>
                <th className="px-4 py-3 text-left font-medium hidden sm:table-cell">Event</th>
                <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Questions</th>
                <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Created</th>
                <th className="px-4 py-3 text-center font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {tests.map(t => (
                <tr
                  key={t.id}
                  className={`hover:bg-muted/30 transition-colors cursor-pointer${!t.isActive ? " opacity-60" : ""}`}
                  onClick={() => void openEdit(t)}
                >
                  <td className="px-4 py-3 font-medium">
                    <div className="flex items-center gap-2 flex-wrap">
                      {t.title}
                      {!t.isActive && (
                        <Badge variant="outline" className="text-xs">Inactive</Badge>
                      )}
                      {t.timeLimitMinutes && (
                        <Badge variant="outline" className="text-xs">{t.timeLimitMinutes} min</Badge>
                      )}
                    </div>
                    {t.description && (
                      <div className="text-xs text-muted-foreground font-normal truncate max-w-xs">
                        {t.description}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    {t.eventName ? (
                      <Badge variant="outline" className="text-xs">
                        {t.eventCode ? `${t.eventCode} — ` : ""}{t.eventName}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                    {t.questionCount} {t.questionCount === 1 ? "question" : "questions"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                    {new Date(t.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8">
                          <IconDots className="size-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => void openEdit(t)}>
                          <IconEdit className="size-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => void openAnswerKey(t)}>
                          <IconKey className="size-4" /> View answer key
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => void toggleActive(t)}>
                          {t.isActive
                            ? <><IconEyeOff className="size-4" /> Deactivate</>
                            : <><IconEye className="size-4" /> Activate</>
                          }
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setDeleteTarget(t)}>
                          <IconTrash className="size-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Answer key dialog */}
      <Dialog open={!!answerKeyTarget} onOpenChange={open => !open && setAnswerKeyTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Answer Key — {answerKeyTarget?.title}</DialogTitle>
          </DialogHeader>
          {answerKeyLoading ? (
            <div className="flex h-24 items-center justify-center gap-2 text-sm text-muted-foreground">
              <IconLoader2 className="size-4 animate-spin" />
              Loading...
            </div>
          ) : answerKeyQuestions && answerKeyQuestions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">This test has no questions yet.</p>
          ) : (
            <div className="max-h-96 overflow-y-auto py-1 space-y-0">
              {answerKeyQuestions?.map((q, i) => (
                <div key={i} className="flex gap-3 text-sm py-2 border-b last:border-0">
                  <span className="font-medium w-8 shrink-0 text-muted-foreground">Q{i + 1}</span>
                  <span className="text-xs text-muted-foreground shrink-0 w-16">{q.type}</span>
                  <span>{renderAnswerKey(q)}</span>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAnswerKeyTarget(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete test?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <strong>{deleteTarget?.title}</strong>? All questions will be permanently removed.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</Button>
            <Button variant="default" onClick={() => void handleDelete()} disabled={deleting}>
              {deleting && <IconLoader2 className="size-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
