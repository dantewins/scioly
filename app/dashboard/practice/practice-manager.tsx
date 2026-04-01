"use client"

import { useState } from "react"
import { toast } from "sonner"
import {
  Plus,
  PencilSimple,
  Trash,
  Key,
  FilePdf,
  Timer,
  CheckCircle,
  Users,
} from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface SciEvent {
  id: string
  name: string
}

interface PracticeTest {
  id: string
  title: string
  pdfUrl: string
  timeLimitMinutes: number | null
  eventId: string | null
  isActive: boolean
  event: SciEvent | null
  answerKey: { id: string } | null
  _count: { attempts: number }
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

const EMPTY_FORM: FormState = {
  title: "",
  pdfUrl: "",
  timeLimitMinutes: "",
  eventId: "",
  isActive: true,
}

export function PracticeManager({ initialTests, events, canCreate }: Props) {
  const [tests, setTests] = useState<PracticeTest[]>(initialTests)
  const [showCreate, setShowCreate] = useState(false)
  const [editingTest, setEditingTest] = useState<PracticeTest | null>(null)
  const [answerKeyTest, setAnswerKeyTest] = useState<PracticeTest | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [answerKeyText, setAnswerKeyText] = useState("")
  const [loading, setLoading] = useState(false)

  function field(key: keyof FormState, value: string | boolean) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function openEdit(test: PracticeTest) {
    setForm({
      title: test.title,
      pdfUrl: test.pdfUrl,
      timeLimitMinutes: test.timeLimitMinutes ? String(test.timeLimitMinutes) : "",
      eventId: test.eventId ?? "",
      isActive: test.isActive,
    })
    setEditingTest(test)
  }

  function openAnswerKey(test: PracticeTest) {
    setAnswerKeyText("")
    setAnswerKeyTest(test)
  }

  function closeDialogs() {
    setShowCreate(false)
    setEditingTest(null)
    setAnswerKeyTest(null)
    setForm(EMPTY_FORM)
    setAnswerKeyText("")
  }

  async function handleCreate() {
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

  async function handleUpdate() {
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

  const formFields = (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>Title <span className="text-destructive">*</span></Label>
        <Input
          value={form.title}
          onChange={(e) => field("title", e.target.value)}
          placeholder="e.g. Anatomy & Physiology Invitational 2024"
        />
      </div>
      <div className="space-y-1.5">
        <Label>PDF URL <span className="text-destructive">*</span></Label>
        <Input
          type="url"
          value={form.pdfUrl}
          onChange={(e) => field("pdfUrl", e.target.value)}
          placeholder="https://..."
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Time Limit (minutes)</Label>
          <Input
            type="number"
            min={1}
            max={300}
            value={form.timeLimitMinutes}
            onChange={(e) => field("timeLimitMinutes", e.target.value)}
            placeholder="30"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Science Event</Label>
          <Select
            value={form.eventId || "__none"}
            onValueChange={(v) => field("eventId", v === "__none" ? "" : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none">None</SelectItem>
              {events.map((e) => (
                <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input
          id="isActive"
          type="checkbox"
          checked={form.isActive}
          onChange={(e) => field("isActive", e.target.checked)}
          className="size-4 rounded border-border"
        />
        <Label htmlFor="isActive" className="cursor-pointer">Active (visible to members)</Label>
      </div>
    </div>
  )

  return (
    <div className="space-y-3">
      {canCreate && (
        <Button size="sm" onClick={() => { setForm(EMPTY_FORM); setShowCreate(true) }}>
          <Plus size={15} className="mr-1.5" />
          New Test
        </Button>
      )}

      {tests.length === 0 && (
        <p className="text-sm text-muted-foreground">No practice tests this season.</p>
      )}

      {tests.map((test) => (
        <Card key={test.id} className="group">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle className="text-sm font-medium">{test.title}</CardTitle>
                  <Badge variant={test.isActive ? "default" : "secondary"} className="text-xs">
                    {test.isActive ? "Active" : "Inactive"}
                  </Badge>
                  {test.answerKey && (
                    <Badge variant="outline" className="text-xs gap-1">
                      <Key size={10} />
                      Answer key set
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs gap-1"
                  onClick={() => openAnswerKey(test)}
                >
                  <Key size={12} />
                  {test.answerKey ? "Update key" : "Set key"}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  onClick={() => openEdit(test)}
                >
                  <PencilSimple size={13} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-muted-foreground hover:text-destructive"
                  onClick={() => handleDelete(test.id)}
                >
                  <Trash size={13} />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-1">
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              {test.event && (
                <span className="font-medium text-foreground">{test.event.name}</span>
              )}
              {test.timeLimitMinutes && (
                <span className="flex items-center gap-1">
                  <Timer size={12} />
                  {test.timeLimitMinutes} min
                </span>
              )}
              <span className="flex items-center gap-1">
                <Users size={12} />
                {test._count.attempts} attempt{test._count.attempts !== 1 ? "s" : ""}
              </span>
              <a
                href={test.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-foreground transition-colors"
              >
                <FilePdf size={12} />
                View PDF
              </a>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={(open) => !open && closeDialogs()}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New Practice Test</DialogTitle></DialogHeader>
          {formFields}
          <DialogFooter>
            <Button variant="outline" onClick={closeDialogs}>Cancel</Button>
            <Button onClick={handleCreate} disabled={loading}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editingTest} onOpenChange={(open) => !open && closeDialogs()}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Practice Test</DialogTitle></DialogHeader>
          {formFields}
          <DialogFooter>
            <Button variant="outline" onClick={closeDialogs}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={loading}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Answer key dialog */}
      <Dialog open={!!answerKeyTest} onOpenChange={(open) => !open && closeDialogs()}>
        <DialogContent className="max-w-md">
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
              rows={10}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              {answerKeyText.split("\n").filter((l) => l.trim()).length} answers entered
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialogs}>Cancel</Button>
            <Button onClick={handleSaveAnswerKey} disabled={loading}>
              <CheckCircle size={15} className="mr-1.5" />
              Save Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
