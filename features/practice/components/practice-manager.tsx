"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { IconPlus } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { apiCall } from "@/lib/api-client"
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogFooter,
} from "@/components/ui/responsive-dialog"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { PracticeTestCard, type PracticeTestCardData } from "@/features/practice/components/practice-test-card"
import { PracticeTestForm } from "@/features/practice/components/practice-test-form"
import { PromptEditor } from "@/features/practice/components/prompt-editor"

type AssessmentFormat = "TEST" | "STATIONS" | "HYBRID" | "GENERATED"
type AssessmentPartType = "SECTION" | "STATION"

interface SciEvent {
  id: string
  name: string
  code?: string | null
}

interface PracticeTest extends PracticeTestCardData {
  createdAt: string
  updatedAt: string
}

interface Props {
  initialTests: PracticeTest[]
  events: SciEvent[]
  canManage: boolean
  canCreate: boolean
}

interface FormState {
  title: string
  description: string
  format: AssessmentFormat
  instructions: string
  sourcePdfUrl: string
  answerKeyPdfUrl: string
  timeLimitMinutes: string
  eventId: string
  isPublished: boolean
  parts: Array<{
    title: string
    type: AssessmentPartType
    instructions: string
    pageFrom: string
    pageTo: string
    timeLimitMinutes: string
  }>
}

interface ServerPromptDTO {
  id: string
  promptNumber: number
  label: string | null
  responseType: string
  pointsPossible: number | null
  answerKeyText: string | null
  choiceOptions: string[] | null
  correctChoiceIndex: number | null
  difficulty: "EASY" | "MEDIUM" | "HARD" | null
  subtopics: string[]
  instructions: string | null
}

async function loadPrompts(assessmentId: string): Promise<{ prompts: ServerPromptDTO[] }> {
  return apiCall<{ prompts: ServerPromptDTO[] }>(`/api/admin/practice/${assessmentId}/prompts`, {
    method: "GET",
  })
}

export function PracticeManager({ initialTests, events, canManage, canCreate }: Props) {
  const [tests, setTests] = useState<PracticeTest[]>(initialTests)
  const [showCreate, setShowCreate] = useState(false)
  const [editingTest, setEditingTest] = useState<PracticeTest | null>(null)
  const [answerKeyTest, setAnswerKeyTest] = useState<PracticeTest | null>(null)
  const [editorPrompts, setEditorPrompts] = useState<Awaited<ReturnType<typeof loadPrompts>> | null>(null)
  const [deletingTest, setDeletingTest] = useState<PracticeTest | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [loading, setLoading] = useState(false)

  function openEdit(test: PracticeTestCardData) {
    const full = tests.find((t) => t.id === test.id)
    if (full) setEditingTest(full)
  }

  function openAnswerKey(test: PracticeTestCardData) {
    const full = tests.find((t) => t.id === test.id)
    if (full) {
      setEditorPrompts(null)
      setAnswerKeyTest(full)
    }
  }

  function closeDialogs() {
    setShowCreate(false)
    setEditingTest(null)
    setAnswerKeyTest(null)
    setEditorPrompts(null)
  }

  useEffect(() => {
    if (!answerKeyTest) return
    let cancelled = false
    loadPrompts(answerKeyTest.id).then((res) => {
      if (!cancelled) setEditorPrompts(res)
    }).catch((err) => {
      toast.error(err instanceof Error ? err.message : "Failed to load questions.")
    })
    return () => { cancelled = true }
  }, [answerKeyTest])

  async function handleCreate(form: FormState) {
    if (!form.title.trim()) { toast.error("Title is required."); return }
    if (!form.sourcePdfUrl.trim()) { toast.error("Packet URL is required."); return }
    setLoading(true)
    try {
      const body: Record<string, unknown> = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        format: form.format,
        instructions: form.instructions.trim() || null,
        sourcePdfUrl: form.sourcePdfUrl.trim(),
        answerKeyPdfUrl: form.answerKeyPdfUrl.trim() || null,
        isPublished: form.isPublished,
        parts: form.parts
          .filter((part) => part.title.trim())
          .map((part) => ({
            title: part.title.trim(),
            type: part.type,
            instructions: part.instructions.trim() || null,
            pageFrom: part.pageFrom ? parseInt(part.pageFrom, 10) : null,
            pageTo: part.pageTo ? parseInt(part.pageTo, 10) : null,
            timeLimitMinutes: part.timeLimitMinutes ? parseInt(part.timeLimitMinutes, 10) : null,
          })),
      }
      if (form.timeLimitMinutes) body.timeLimitMinutes = parseInt(form.timeLimitMinutes)
      if (form.eventId) body.eventId = form.eventId

      const created = await apiCall<PracticeTest & { eventId: string | null }>("/api/admin/practice", {
        method: "POST",
        body: JSON.stringify(body),
      })
      const event = events.find((e) => e.id === created.eventId) ?? null
      setTests((t) => [
        {
          ...created,
          event,
          attempts: [],
        },
        ...t,
      ])
      closeDialogs()
      toast.success("Assessment created.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create test.")
    } finally {
      setLoading(false)
    }
  }

  async function handleUpdate(form: FormState) {
    if (!editingTest) return
    if (!form.title.trim()) { toast.error("Title is required."); return }
    if (!form.sourcePdfUrl.trim()) { toast.error("Packet URL is required."); return }
    setLoading(true)
    try {
      const body: Record<string, unknown> = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        format: form.format,
        instructions: form.instructions.trim() || null,
        sourcePdfUrl: form.sourcePdfUrl.trim(),
        answerKeyPdfUrl: form.answerKeyPdfUrl.trim() || null,
        isPublished: form.isPublished,
        timeLimitMinutes: form.timeLimitMinutes ? parseInt(form.timeLimitMinutes) : null,
        eventId: form.eventId || null,
        parts: form.parts
          .filter((part) => part.title.trim())
          .map((part) => ({
            title: part.title.trim(),
            type: part.type,
            instructions: part.instructions.trim() || null,
            pageFrom: part.pageFrom ? parseInt(part.pageFrom, 10) : null,
            pageTo: part.pageTo ? parseInt(part.pageTo, 10) : null,
            timeLimitMinutes: part.timeLimitMinutes ? parseInt(part.timeLimitMinutes, 10) : null,
          })),
      }

      const updated = await apiCall<PracticeTest & { eventId: string | null }>(`/api/admin/practice/${editingTest.id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      })
      const event = events.find((e) => e.id === updated.eventId) ?? null
      setTests((t) =>
        t.map((x) =>
          x.id === editingTest.id
            ? { ...updated, event }
            : x
        )
      )
      closeDialogs()
      toast.success("Assessment updated.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update assessment.")
    } finally {
      setLoading(false)
    }
  }

  function handleDelete(id: string) {
    const target = tests.find((t) => t.id === id)
    if (target) setDeletingTest(target)
  }

  async function confirmDelete() {
    if (!deletingTest) return
    setDeleting(true)
    try {
      await apiCall(`/api/admin/practice/${deletingTest.id}`, { method: "DELETE" })
      setTests((t) => t.filter((x) => x.id !== deletingTest.id))
      toast.success("Assessment deleted.")
      setDeletingTest(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete assessment.")
    } finally {
      setDeleting(false)
    }
  }

  function handleEditorSaved() {
    if (!answerKeyTest) return
    setTests((t) =>
      t.map((x) =>
        x.id === answerKeyTest.id ? { ...x, answerKey: { id: "set" } } : x
      )
    )
    closeDialogs()
  }

  return (
    <div className="space-y-6">
      {canCreate && (
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <IconPlus size={15} className="mr-1.5" />
          New Assessment
        </Button>
      )}

      {tests.length === 0 && (
        <p className="text-sm text-muted-foreground">No assessments this season.</p>
      )}

      {tests.map((test) => (
          <PracticeTestCard
            key={test.id}
            test={test}
            canManage={canManage}
            onEdit={openEdit}
            onDelete={handleDelete}
            onSetAnswerKey={openAnswerKey}
        />
      ))}

      {/* Create dialog */}
      <ResponsiveDialog open={showCreate} onOpenChange={(open) => !open && closeDialogs()}>
        <ResponsiveDialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <ResponsiveDialogHeader><ResponsiveDialogTitle>New Assessment</ResponsiveDialogTitle></ResponsiveDialogHeader>
          <PracticeTestForm
            events={events}
            onSubmit={handleCreate}
            loading={loading}
            onCancel={closeDialogs}
            submitLabel="Create"
          />
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      {/* Edit dialog */}
      <ResponsiveDialog open={!!editingTest} onOpenChange={(open) => !open && closeDialogs()}>
        <ResponsiveDialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <ResponsiveDialogHeader><ResponsiveDialogTitle>Edit Assessment</ResponsiveDialogTitle></ResponsiveDialogHeader>
          {editingTest && (
            <PracticeTestForm
              events={events}
              defaultValues={{
                title: editingTest.title,
                description: editingTest.description ?? "",
                format: editingTest.format,
                instructions: editingTest.instructions ?? "",
                sourcePdfUrl: editingTest.sourcePdfUrl,
                answerKeyPdfUrl: editingTest.answerKeyPdfUrl ?? "",
                timeLimitMinutes: editingTest.timeLimitMinutes ? String(editingTest.timeLimitMinutes) : "",
                eventId: editingTest.eventId ?? "",
                isPublished: editingTest.isPublished,
                parts: editingTest.parts.map((part) => ({
                  title: part.title,
                  type: part.type,
                  instructions: part.instructions ?? "",
                  pageFrom: part.pageFrom ? String(part.pageFrom) : "",
                  pageTo: part.pageTo ? String(part.pageTo) : "",
                  timeLimitMinutes: part.timeLimitMinutes ? String(part.timeLimitMinutes) : "",
                })),
              }}
              onSubmit={handleUpdate}
              loading={loading}
              onCancel={closeDialogs}
              submitLabel="Save"
            />
          )}
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      {/* Questions editor (MCQ + difficulty + subtopics) */}
      <ResponsiveDialog open={!!answerKeyTest} onOpenChange={(open) => !open && closeDialogs()}>
        <ResponsiveDialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Questions — {answerKeyTest?.title}</ResponsiveDialogTitle>
          </ResponsiveDialogHeader>
          {answerKeyTest && editorPrompts ? (
            <PromptEditor
              assessmentId={answerKeyTest.id}
              assessmentTitle={answerKeyTest.title}
              initial={editorPrompts.prompts}
              onSaved={handleEditorSaved}
            />
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">Loading questions…</p>
          )}
          <ResponsiveDialogFooter>
            <Button variant="outline" onClick={closeDialogs}>Close</Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      <ConfirmDialog
        open={deletingTest !== null}
        title={deletingTest ? `Delete "${deletingTest.title}"?` : "Delete assessment?"}
        description="The assessment, its parts, answer key, and every attempt and response will be permanently removed. This cannot be undone."
        confirmLabel="Delete Assessment"
        destructive
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeletingTest(null)}
      />
    </div>
  )
}
