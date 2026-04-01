"use client"

import { useState } from "react"
import { toast } from "sonner"
import { PlusIcon, CheckCircleIcon } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { PracticeTestCard, type PracticeTestCardData } from "@/components/cards/practice-test-card"
import { PracticeTestForm } from "@/components/forms/practice-test-form"

interface SciEvent {
  id: string
  name: string
}

interface PracticeTest extends PracticeTestCardData {
  createdAt: string
  updatedAt: string
}

interface Props {
  initialTests: PracticeTest[]
  events: SciEvent[]
  canCreate: boolean
}

interface FormState {
  title: string
  pdfUrl: string
  timeLimitMinutes: string
  eventId: string
  isActive: boolean
}

export function PracticeManager({ initialTests, events, canCreate }: Props) {
  const [tests, setTests] = useState<PracticeTest[]>(initialTests)
  const [showCreate, setShowCreate] = useState(false)
  const [editingTest, setEditingTest] = useState<PracticeTest | null>(null)
  const [answerKeyTest, setAnswerKeyTest] = useState<PracticeTest | null>(null)
  const [answerKeyText, setAnswerKeyText] = useState("")
  const [loading, setLoading] = useState(false)

  function openEdit(test: PracticeTestCardData) {
    const full = tests.find((t) => t.id === test.id)
    if (full) setEditingTest(full)
  }

  function openAnswerKey(test: PracticeTestCardData) {
    const full = tests.find((t) => t.id === test.id)
    if (full) {
      setAnswerKeyText("")
      setAnswerKeyTest(full)
    }
  }

  function closeDialogs() {
    setShowCreate(false)
    setEditingTest(null)
    setAnswerKeyTest(null)
    setAnswerKeyText("")
  }

  async function handleCreate(form: FormState) {
    if (!form.title.trim()) { toast.error("Title is required."); return }
    if (!form.pdfUrl.trim()) { toast.error("PDF URL is required."); return }
    setLoading(true)
    try {
      const body: Record<string, unknown> = {
        title: form.title.trim(),
        pdfUrl: form.pdfUrl.trim(),
        isActive: form.isActive,
      }
      if (form.timeLimitMinutes) body.timeLimitMinutes = parseInt(form.timeLimitMinutes)
      if (form.eventId) body.eventId = form.eventId

      const res = await fetch("/api/admin/practice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error(data.message ?? "Failed to create test.")
        return
      }
      const created = await res.json()
      const event = events.find((e) => e.id === created.eventId) ?? null
      setTests((t) => [
        {
          ...created,
          event,
          answerKey: null,
          _count: { attempts: 0 },
        },
        ...t,
      ])
      closeDialogs()
      toast.success("Practice test created.")
    } finally {
      setLoading(false)
    }
  }

  async function handleUpdate(form: FormState) {
    if (!editingTest) return
    if (!form.title.trim()) { toast.error("Title is required."); return }
    if (!form.pdfUrl.trim()) { toast.error("PDF URL is required."); return }
    setLoading(true)
    try {
      const body: Record<string, unknown> = {
        title: form.title.trim(),
        pdfUrl: form.pdfUrl.trim(),
        isActive: form.isActive,
        timeLimitMinutes: form.timeLimitMinutes ? parseInt(form.timeLimitMinutes) : null,
        eventId: form.eventId || null,
      }

      const res = await fetch(`/api/admin/practice/${editingTest.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error(data.message ?? "Failed to update test.")
        return
      }
      const updated = await res.json()
      const event = events.find((e) => e.id === updated.eventId) ?? null
      setTests((t) =>
        t.map((x) =>
          x.id === editingTest.id
            ? { ...updated, event, answerKey: x.answerKey, _count: x._count }
            : x
        )
      )
      closeDialogs()
      toast.success("Test updated.")
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this practice test? All attempts will be lost.")) return
    const res = await fetch(`/api/admin/practice/${id}`, { method: "DELETE" })
    if (!res.ok) { toast.error("Failed to delete test."); return }
    setTests((t) => t.filter((x) => x.id !== id))
    toast.success("Test deleted.")
  }

  async function handleSaveAnswerKey() {
    if (!answerKeyTest) return
    const answers = answerKeyText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
    if (answers.length === 0) { toast.error("Enter at least one answer."); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/practice/${answerKeyTest.id}/answer-key`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      })
      if (!res.ok) { toast.error("Failed to save answer key."); return }
      setTests((t) =>
        t.map((x) =>
          x.id === answerKeyTest.id ? { ...x, answerKey: { id: "set" } } : x
        )
      )
      closeDialogs()
      toast.success(`Answer key saved (${answers.length} answers).`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      {canCreate && (
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <PlusIcon size={15} className="mr-1.5" />
          New Test
        </Button>
      )}

      {tests.length === 0 && (
        <p className="text-sm text-muted-foreground">No practice tests this season.</p>
      )}

      {tests.map((test) => (
        <PracticeTestCard
          key={test.id}
          test={test}
          canManage={canCreate}
          onEdit={openEdit}
          onDelete={handleDelete}
          onSetAnswerKey={openAnswerKey}
        />
      ))}

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={(open) => !open && closeDialogs()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Practice Test</DialogTitle></DialogHeader>
          <PracticeTestForm
            events={events}
            onSubmit={handleCreate}
            loading={loading}
            onCancel={closeDialogs}
            submitLabel="Create"
          />
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editingTest} onOpenChange={(open) => !open && closeDialogs()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Practice Test</DialogTitle></DialogHeader>
          {editingTest && (
            <PracticeTestForm
              events={events}
              defaultValues={{
                title: editingTest.title,
                pdfUrl: editingTest.pdfUrl,
                timeLimitMinutes: editingTest.timeLimitMinutes ? String(editingTest.timeLimitMinutes) : "",
                eventId: editingTest.eventId ?? "",
                isActive: editingTest.isActive,
              }}
              onSubmit={handleUpdate}
              loading={loading}
              onCancel={closeDialogs}
              submitLabel="Save"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Answer key dialog */}
      <Dialog open={!!answerKeyTest} onOpenChange={(open) => !open && closeDialogs()}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Answer Key — {answerKeyTest?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Enter one answer per line. The order must match the question order.
            </p>
            <Textarea
              value={answerKeyText}
              onChange={(e) => setAnswerKeyText(e.target.value)}
              placeholder={"A\nB\nC2H6\nTrue\n..."}
              rows={6}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              {answerKeyText.split("\n").filter((l) => l.trim()).length} answers entered
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialogs}>Cancel</Button>
            <Button onClick={handleSaveAnswerKey} disabled={loading}>
              <CheckCircleIcon size={15} className="mr-1.5" />
              Save Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
