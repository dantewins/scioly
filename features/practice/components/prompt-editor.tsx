"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import {
  IconPlus, IconTrash, IconGripVertical, IconLoader2, IconChevronDown, IconChevronRight,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { apiCall } from "@/lib/api-client"

type ResponseType = "SHORT_TEXT" | "MULTIPLE_CHOICE"
type Difficulty = "EASY" | "MEDIUM" | "HARD"

interface EditablePrompt {
  // Stable client-side key (used for React lists). Re-used across server
  // upserts because the server re-numbers 1..N based on array order.
  key: string
  label: string
  responseType: ResponseType
  pointsPossible: string
  answerKeyText: string
  choiceOptions: string[]
  correctChoiceIndex: number | null
  difficulty: Difficulty | "NONE"
  subtopicsRaw: string
  instructions: string
  expanded: boolean
}

interface ServerPrompt {
  id: string
  promptNumber: number
  label: string | null
  responseType: string
  pointsPossible: number | null
  answerKeyText: string | null
  choiceOptions: string[] | null
  correctChoiceIndex: number | null
  difficulty: Difficulty | null
  subtopics: string[]
  instructions: string | null
}

interface Props {
  assessmentId: string
  assessmentTitle: string
  initial: ServerPrompt[]
  onSaved?: () => void
}

let keyCounter = 0
function makeKey(): string {
  keyCounter += 1
  return `k${Date.now()}-${keyCounter}`
}

function fromServer(p: ServerPrompt): EditablePrompt {
  const rt = p.responseType === "MULTIPLE_CHOICE" ? "MULTIPLE_CHOICE" : "SHORT_TEXT"
  return {
    key: makeKey(),
    label: p.label ?? "",
    responseType: rt,
    pointsPossible: p.pointsPossible !== null ? String(p.pointsPossible) : "",
    answerKeyText: p.answerKeyText ?? "",
    choiceOptions: rt === "MULTIPLE_CHOICE" && p.choiceOptions ? p.choiceOptions : ["", ""],
    correctChoiceIndex: rt === "MULTIPLE_CHOICE" ? p.correctChoiceIndex : null,
    difficulty: p.difficulty ?? "NONE",
    subtopicsRaw: p.subtopics.join(", "),
    instructions: p.instructions ?? "",
    expanded: false,
  }
}

function blankPrompt(): EditablePrompt {
  return {
    key: makeKey(),
    label: "",
    responseType: "SHORT_TEXT",
    pointsPossible: "1",
    answerKeyText: "",
    choiceOptions: ["", ""],
    correctChoiceIndex: null,
    difficulty: "NONE",
    subtopicsRaw: "",
    instructions: "",
    expanded: true,
  }
}

export function PromptEditor({ assessmentId, assessmentTitle, initial, onSaved }: Props) {
  const [prompts, setPrompts] = useState<EditablePrompt[]>(() =>
    initial.length > 0 ? initial.map(fromServer) : [blankPrompt()],
  )
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (initial.length > 0) setPrompts(initial.map(fromServer))
  }, [initial])

  function update(idx: number, patch: Partial<EditablePrompt>) {
    setPrompts((current) =>
      current.map((p, i) => (i === idx ? { ...p, ...patch } : p)),
    )
  }

  function addPrompt() {
    setPrompts((current) => [...current, blankPrompt()])
  }

  function removePrompt(idx: number) {
    setPrompts((current) => current.filter((_, i) => i !== idx))
  }

  function moveUp(idx: number) {
    if (idx === 0) return
    setPrompts((current) => {
      const next = [...current]
      ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
      return next
    })
  }

  function moveDown(idx: number) {
    setPrompts((current) => {
      if (idx >= current.length - 1) return current
      const next = [...current]
      ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
      return next
    })
  }

  function updateChoiceOption(promptIdx: number, optIdx: number, value: string) {
    setPrompts((current) =>
      current.map((p, i) => {
        if (i !== promptIdx) return p
        const next = [...p.choiceOptions]
        next[optIdx] = value
        return { ...p, choiceOptions: next }
      }),
    )
  }

  function addChoice(promptIdx: number) {
    setPrompts((current) =>
      current.map((p, i) => {
        if (i !== promptIdx) return p
        if (p.choiceOptions.length >= 10) return p
        return { ...p, choiceOptions: [...p.choiceOptions, ""] }
      }),
    )
  }

  function removeChoice(promptIdx: number, optIdx: number) {
    setPrompts((current) =>
      current.map((p, i) => {
        if (i !== promptIdx) return p
        if (p.choiceOptions.length <= 2) return p
        const next = p.choiceOptions.filter((_, j) => j !== optIdx)
        const correct =
          p.correctChoiceIndex === optIdx
            ? null
            : p.correctChoiceIndex !== null && p.correctChoiceIndex > optIdx
              ? p.correctChoiceIndex - 1
              : p.correctChoiceIndex
        return { ...p, choiceOptions: next, correctChoiceIndex: correct }
      }),
    )
  }

  async function handleSave() {
    setSaving(true)
    try {
      const payload = {
        prompts: prompts.map((p) => {
          const subtopics = p.subtopicsRaw
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
          const points = p.pointsPossible.trim() ? Number.parseFloat(p.pointsPossible) : null
          if (p.responseType === "MULTIPLE_CHOICE") {
            return {
              label: p.label.trim() || undefined,
              responseType: "MULTIPLE_CHOICE" as const,
              pointsPossible: points,
              choiceOptions: p.choiceOptions.map((c) => c.trim()).filter(Boolean),
              correctChoiceIndex: p.correctChoiceIndex,
              difficulty: p.difficulty === "NONE" ? null : p.difficulty,
              subtopics,
              instructions: p.instructions.trim() || null,
            }
          }
          return {
            label: p.label.trim() || undefined,
            responseType: "SHORT_TEXT" as const,
            pointsPossible: points,
            answerKeyText: p.answerKeyText.trim() || null,
            difficulty: p.difficulty === "NONE" ? null : p.difficulty,
            subtopics,
            instructions: p.instructions.trim() || null,
          }
        }),
      }

      // Validate locally before sending
      for (const [i, p] of payload.prompts.entries()) {
        if (p.responseType === "MULTIPLE_CHOICE") {
          if (!("choiceOptions" in p) || !p.choiceOptions || p.choiceOptions.length < 2) {
            toast.error(`Q${i + 1}: needs at least 2 choices`)
            setSaving(false)
            return
          }
          if (p.correctChoiceIndex === null || p.correctChoiceIndex === undefined) {
            toast.error(`Q${i + 1}: pick the correct choice`)
            setSaving(false)
            return
          }
          if (p.correctChoiceIndex >= p.choiceOptions.length) {
            toast.error(`Q${i + 1}: correct choice index out of range`)
            setSaving(false)
            return
          }
        }
      }

      await apiCall(`/api/admin/practice/${assessmentId}/prompts`, {
        method: "PUT",
        body: JSON.stringify(payload),
      })
      toast.success(`Saved ${prompts.length} ${prompts.length === 1 ? "question" : "questions"}.`)
      onSaved?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Questions for <span className="font-medium text-foreground">{assessmentTitle}</span>.
        Order matches the test. MCQ auto-grades on submit; short-text matches case-insensitive.
      </p>

      <ul className="space-y-2">
        {prompts.map((p, i) => (
          <li key={p.key} className="rounded-[var(--radius)] border border-border/80 bg-card">
            <button
              type="button"
              onClick={() => update(i, { expanded: !p.expanded })}
              className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-muted/30"
            >
              <IconGripVertical className="size-3.5 text-muted-foreground shrink-0" />
              {p.expanded ? (
                <IconChevronDown className="size-3.5 text-muted-foreground shrink-0" />
              ) : (
                <IconChevronRight className="size-3.5 text-muted-foreground shrink-0" />
              )}
              <span className="font-mono text-xs text-muted-foreground tabular-nums">Q{i + 1}</span>
              <span className="text-sm font-medium truncate flex-1">
                {p.label || (p.responseType === "MULTIPLE_CHOICE" ? "Multiple choice" : "Short text")}
              </span>
              {p.difficulty !== "NONE" && (
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  {p.difficulty.toLowerCase()}
                </span>
              )}
            </button>

            {p.expanded && (
              <div className="space-y-3 border-t border-border/60 px-3 py-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Label / question text</Label>
                    <Input
                      value={p.label}
                      onChange={(e) => update(i, { label: e.target.value })}
                      placeholder={`Q${i + 1}`}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Type</Label>
                      <Select
                        value={p.responseType}
                        onValueChange={(v) => update(i, { responseType: v as ResponseType })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SHORT_TEXT">Short text (FRQ)</SelectItem>
                          <SelectItem value="MULTIPLE_CHOICE">Multiple choice</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Points</Label>
                      <Input
                        type="number"
                        step={0.5}
                        min={0}
                        value={p.pointsPossible}
                        onChange={(e) => update(i, { pointsPossible: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {p.responseType === "SHORT_TEXT" ? (
                  <div className="space-y-1">
                    <Label className="text-xs">Answer key</Label>
                    <Input
                      value={p.answerKeyText}
                      onChange={(e) => update(i, { answerKeyText: e.target.value })}
                      placeholder="Expected answer (case-insensitive trim match)"
                    />
                    <p className="text-[11px] text-muted-foreground">Leave empty to skip auto-grading on this question.</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Choices ({p.choiceOptions.length})</Label>
                    <ul className="space-y-1.5">
                      {p.choiceOptions.map((opt, optIdx) => (
                        <li key={optIdx} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`correct-${p.key}`}
                            checked={p.correctChoiceIndex === optIdx}
                            onChange={() => update(i, { correctChoiceIndex: optIdx })}
                            className="size-4 accent-azure-600"
                            aria-label={`Mark choice ${optIdx + 1} as correct`}
                          />
                          <Input
                            value={opt}
                            onChange={(e) => updateChoiceOption(i, optIdx, e.target.value)}
                            placeholder={`Choice ${optIdx + 1}`}
                            className="text-sm"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => removeChoice(i, optIdx)}
                            disabled={p.choiceOptions.length <= 2}
                            className="text-muted-foreground"
                          >
                            <IconTrash className="size-3.5" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => addChoice(i)}
                      disabled={p.choiceOptions.length >= 10}
                    >
                      <IconPlus className="size-3.5 mr-1" />
                      Add choice
                    </Button>
                  </div>
                )}

                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Difficulty</Label>
                    <Select
                      value={p.difficulty}
                      onValueChange={(v) => update(i, { difficulty: v as EditablePrompt["difficulty"] })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NONE">Unset</SelectItem>
                        <SelectItem value="EASY">Easy</SelectItem>
                        <SelectItem value="MEDIUM">Medium</SelectItem>
                        <SelectItem value="HARD">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Subtopics (comma-separated)</Label>
                    <Input
                      value={p.subtopicsRaw}
                      onChange={(e) => update(i, { subtopicsRaw: e.target.value })}
                      placeholder="e.g. circulatory, blood vessels"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Instructions (optional)</Label>
                  <Textarea
                    value={p.instructions}
                    onChange={(e) => update(i, { instructions: e.target.value })}
                    rows={2}
                  />
                </div>

                <div className="flex items-center justify-between border-t border-border/60 pt-2">
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => moveUp(i)}
                      disabled={i === 0}
                    >
                      ↑ Up
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => moveDown(i)}
                      disabled={i === prompts.length - 1}
                    >
                      ↓ Down
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removePrompt(i)}
                    disabled={prompts.length <= 1}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <IconTrash className="size-3.5 mr-1" />
                    Remove
                  </Button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between gap-2 pt-1">
        <Button type="button" variant="outline" size="sm" onClick={addPrompt}>
          <IconPlus className="size-3.5 mr-1" />
          Add question
        </Button>
        <Button type="button" onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <IconLoader2 className="size-4 mr-1.5 animate-spin" />
              Saving…
            </>
          ) : (
            `Save ${prompts.length} ${prompts.length === 1 ? "question" : "questions"}`
          )}
        </Button>
      </div>
    </div>
  )
}
