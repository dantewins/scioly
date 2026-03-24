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
  IconUpload,
  IconCheck,
  IconX,
  IconGripVertical,
  IconKey,
  IconEye,
  IconEyeOff,
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
  createdAt: z.string(),
})

const mcqOptionSchema = z.object({
  label: z.string(),
  text: z.string(),
})

const questionSchema = z.object({
  id: z.string().optional(),
  order: z.number(),
  content: z.string(),
  type: z.enum(["MCQ", "FREE_RESPONSE"]).default("MCQ"),
  options: z.array(mcqOptionSchema).nullable().default(null),
  answerKey: z.string().nullable().default(null),
  points: z.number().default(1),
})

const testDetailSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable().default(null),
  eventId: z.string().nullable().default(null),
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
  }
}

const selectClassName =
  "w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50"

const textareaClassName =
  "w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 resize-y min-h-[72px]"

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
  const isMCQ = question.type === "MCQ"

  return (
    <div className="rounded-xl border bg-card p-4 space-y-4">
      {/* Question header */}
      <div className="flex items-start gap-3">
        <IconGripVertical className="size-4 mt-1 text-muted-foreground shrink-0 cursor-grab" />
        <div className="flex-1 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-muted-foreground">Q{index + 1}</span>
            <div className="flex items-center gap-2">
              {/* Type toggle */}
              <div className="flex rounded-md border overflow-hidden text-xs">
                <button
                  type="button"
                  onClick={() => onChange({ ...question, type: "MCQ", options: question.options ?? DEFAULT_MCQ_OPTIONS.map(o => ({ ...o })) })}
                  className={`px-2 py-1 transition-colors ${isMCQ ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                >
                  MCQ
                </button>
                <button
                  type="button"
                  onClick={() => onChange({ ...question, type: "FREE_RESPONSE" })}
                  className={`px-2 py-1 transition-colors ${!isMCQ ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                >
                  Free
                </button>
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
      {isMCQ && (
        <div className="ml-7 space-y-2">
          {(question.options ?? DEFAULT_MCQ_OPTIONS).map((opt, i) => (
            <div key={opt.label} className="flex items-center gap-2">
              {/* Correct answer radio */}
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
                  const newOptions = (question.options ?? DEFAULT_MCQ_OPTIONS).map((o, oi) =>
                    oi === i ? { ...o, text: e.target.value } : o
                  )
                  onChange({ ...question, options: newOptions })
                }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Free response answer key */}
      {!isMCQ && (
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
    </div>
  )
}

// ─── Test Editor ──────────────────────────────────────────────────────────────

function TestEditor({
  testId,
  initialTitle,
  initialDescription,
  initialEventId,
  initialQuestions,
  availableEvents,
  onSaved,
  onBack,
}: {
  testId: string | null
  initialTitle: string
  initialDescription: string
  initialEventId: string
  initialQuestions: Question[]
  availableEvents: SciOlyEvent[]
  onSaved: (id: string) => void
  onBack: () => void
}) {
  const [title, setTitle] = React.useState(initialTitle)
  const [description, setDescription] = React.useState(initialDescription)
  const [eventId, setEventId] = React.useState(initialEventId)
  const [questions, setQuestions] = React.useState<Question[]>(initialQuestions)
  const [saving, setSaving] = React.useState(false)
  const [parsing, setParsing] = React.useState(false)
  const fileRef = React.useRef<HTMLInputElement>(null)

  const updateQuestion = (index: number, q: Question) => {
    setQuestions(prev => prev.map((old, i) => (i === index ? q : old)))
  }

  const addQuestion = () => {
    setQuestions(prev => [...prev, makeNewQuestion(prev.length + 1)])
  }

  const removeQuestion = (index: number) => {
    setQuestions(prev => prev.filter((_, i) => i !== index).map((q, i) => ({ ...q, order: i + 1 })))
  }

  // Upload a file and parse via Gemini
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setParsing(true)
    try {
      const formData = new FormData()
      formData.append("file", file)

      const res = await fetch("/api/admin/tests/parse", {
        method: "POST",
        body: formData,
      })
      if (!res.ok) {
        const json = await res.json() as { error?: string }
        throw new Error(json.error ?? "Parse failed")
      }

      const json = await res.json() as { questions: Question[] }
      // Merge: replace current questions if empty, otherwise append
      const parsed = json.questions.map((q, i) => ({
        ...q,
        order: questions.length + i + 1,
        options: q.options ?? (q.type === "MCQ" ? DEFAULT_MCQ_OPTIONS.map(o => ({ ...o })) : null),
      }))

      if (questions.length === 0 || questions.every(q => !q.content.trim())) {
        setQuestions(parsed.map((q, i) => ({ ...q, order: i + 1 })))
      } else {
        setQuestions(prev => [...prev, ...parsed.map((q, i) => ({ ...q, order: prev.length + i + 1 }))])
      }

      toast.success(`Extracted ${parsed.length} question${parsed.length === 1 ? "" : "s"} from file.`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to parse file.")
    } finally {
      setParsing(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  const handleSave = async () => {
    if (!title.trim()) { toast.error("Title is required."); return }

    setSaving(true)
    try {
      let id = testId

      // Create or update the test metadata
      const metaRes = await fetch("/api/admin/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: id ? "edit" : "create",
          ...(id ? { id } : {}),
          title: title.trim(),
          description: description.trim() || null,
          eventId: eventId || null,
        }),
      })
      if (!metaRes.ok) throw new Error()
      const metaJson = await metaRes.json() as { id?: string }
      if (!id) id = metaJson.id!

      // Save questions
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
            options: q.type === "MCQ" ? q.options : null,
            answerKey: q.answerKey ?? null,
            points: q.points,
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
      {/* Back button */}
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
        <p className="text-sm text-muted-foreground">Build a test manually or upload a PDF/DOCX to extract questions automatically.</p>
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
          <select
            id="t-event"
            value={eventId}
            onChange={e => setEventId(e.target.value)}
            className={selectClassName}
          >
            <option value="">— General / unassigned —</option>
            {availableEvents.map(ev => (
              <option key={ev.id} value={ev.id}>
                {ev.code ? `${ev.code} — ` : ""}{ev.name}
              </option>
            ))}
          </select>
        </Field>
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
          <div className="flex items-center gap-2">
            {/* Upload via Gemini */}
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.doc,.docx"
              className="hidden"
              onChange={e => void handleFileUpload(e)}
            />
            <Button
              variant="outline"
              size="sm"
              disabled={parsing}
              onClick={() => fileRef.current?.click()}
            >
              {parsing
                ? <><IconLoader2 className="size-4 animate-spin" /> Parsing...</>
                : <><IconUpload className="size-4" /> Upload PDF/DOCX</>
              }
            </Button>
            <Button size="sm" onClick={addQuestion}>
              <IconPlus className="size-4" /> Add question
            </Button>
          </div>
        </div>

        {questions.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-10 text-center">
            <IconReport className="size-8 opacity-20" />
            <p className="text-sm text-muted-foreground">No questions yet. Add one manually or upload a PDF.</p>
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

  // Editor state — null means list view, string id means editing, "new" means creating
  const [editing, setEditing] = React.useState<string | "new" | null>(null)
  const [editingData, setEditingData] = React.useState<{
    title: string
    description: string
    eventId: string
    questions: Question[]
  } | null>(null)
  const [editLoading, setEditLoading] = React.useState(false)

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = React.useState<TestSummary | null>(null)
  const [deleting, setDeleting] = React.useState(false)

  // Answer key dialog
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
      // Non-fatal — event picker just stays empty
    }
  }, [])

  React.useEffect(() => {
    void loadTests()
    void loadEvents()
  }, [loadTests, loadEvents])

  // ── Open new / edit ────────────────────────────────────────────────────────

  const openNew = () => {
    setEditingData({ title: "", description: "", eventId: "", questions: [] })
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
          description="Create a test manually or upload a PDF to extract questions automatically."
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
                  <span>
                    {q.type === "MCQ"
                      ? (q.answerKey ?? "—")
                      : (q.answerKey ?? <em className="text-muted-foreground">No model answer</em>)
                    }
                  </span>
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
