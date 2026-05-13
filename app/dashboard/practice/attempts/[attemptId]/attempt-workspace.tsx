"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { toast } from "sonner"
import {
  IconArrowLeft,
  IconCheck,
  IconX,
  IconTrophy,
  IconDeviceFloppy,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/status-badge"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/ui/page-header"
import type { MemberPracticeAttemptDetail } from "@/lib/practice-assessments"
import { apiCall, ApiError } from "@/lib/api-client"

type SaveStatus = "saved" | "saving" | "unsaved" | "error"

type Prompt = MemberPracticeAttemptDetail["assessment"]["prompts"][number]

interface Props {
  initialAttempt: MemberPracticeAttemptDetail
}

export function AttemptWorkspace({ initialAttempt }: Props) {
  const attemptId = initialAttempt.id
  const [attempt, setAttempt] = useState(initialAttempt)
  const [responses, setResponses] = useState<Record<string, string>>(
    () =>
      Object.fromEntries(
        initialAttempt.assessment.prompts.map((p) => [p.id, p.responseText ?? ""]),
      ),
  )
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved")
  const [submitting, setSubmitting] = useState(false)
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pausedUntil = useRef(0)

  useEffect(() => {
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    }
  }, [])

  async function doAutosave(currentResponses: Record<string, string>) {
    if (Date.now() < pausedUntil.current) return
    setSaveStatus("saving")
    try {
      await apiCall(`/api/member/practice/attempts/${attemptId}`, {
        method: "PATCH",
        body: JSON.stringify({
          responses: Object.entries(currentResponses).map(([promptId, responseText]) => ({
            promptId,
            responseText: responseText || null,
          })),
        }),
      })
      setSaveStatus("saved")
    } catch (error) {
      setSaveStatus("error")
      if (error instanceof ApiError && error.status === 429) {
        pausedUntil.current = Date.now() + 5_000
      }
    }
  }

  function updateResponse(promptId: string, value: string) {
    setResponses((prev) => {
      const next = { ...prev, [promptId]: value }
      setSaveStatus("unsaved")
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
      autosaveTimer.current = setTimeout(() => doAutosave(next), 600)
      return next
    })
  }

  async function handleManualSave() {
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    await doAutosave(responses)
  }

  async function handleSubmit() {
    if (!confirm("Submit your answers? You cannot make changes after submitting.")) return
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    setSubmitting(true)
    try {
      const updated = await apiCall<MemberPracticeAttemptDetail>(`/api/member/practice/attempts/${attemptId}`, {
        method: "POST",
        body: JSON.stringify({}),
      })
      setAttempt(updated)
      toast.success("Attempt submitted!")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit.")
    } finally {
      setSubmitting(false)
    }
  }

  const { assessment } = attempt
  const prompts = assessment.prompts
  const parts = assessment.parts
  const canEdit = attempt.canEdit

  // Group prompts by part
  const promptsByPart: Record<string, Prompt[]> = {}
  const unpartedPrompts: Prompt[] = []
  for (const prompt of prompts) {
    if (prompt.partId) {
      if (!promptsByPart[prompt.partId]) promptsByPart[prompt.partId] = []
      promptsByPart[prompt.partId].push(prompt)
    } else {
      unpartedPrompts.push(prompt)
    }
  }

  return (
    <div className="layout-page">
      <Link
        href={`/dashboard/practice/${assessment.id}`}
        className="group inline-flex items-center gap-1.5 label-caps text-muted-foreground hover:text-azure-700 transition-colors w-fit"
      >
        <IconArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
        {assessment.title}
      </Link>

      <PageHeader
        title={assessment.title}
        description={assessment.event?.name ?? undefined}
      />

      {/* Status bar */}
      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge status={attempt.status} withDot />
        {attempt.status === "SCORED" && attempt.score !== null && attempt.scorePossible !== null && (
          <span className="flex items-center gap-1.5 text-sm font-mono tabular-nums font-medium text-[var(--success)]">
            <IconTrophy className="size-4" />
            {attempt.score} / {attempt.scorePossible}
          </span>
        )}
        {canEdit && attempt.promptCount > 0 && (
          <span className="text-sm text-muted-foreground">
            {attempt.answeredCount}/{attempt.promptCount} answered
          </span>
        )}
        {canEdit && (
          <span className="text-xs text-muted-foreground ml-auto">
            {saveStatus === "saving" ? "Saving…" :
             saveStatus === "saved" ? "Saved" :
             saveStatus === "error" ? "Save failed — will retry" :
             "Unsaved changes"}
          </span>
        )}
      </div>

      {/* Prompt list */}
      {prompts.length === 0 ? (
        <p className="text-sm text-muted-foreground">No answer sheet for this assessment.</p>
      ) : (
        <div className="space-y-4">
          {parts.length > 0 ? (
            <>
              {parts.map((part) => (
                <div key={part.id} className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-medium">{part.title}</h2>
                    {part.timeLimitMinutes && (
                      <span className="text-xs text-muted-foreground">{part.timeLimitMinutes} min</span>
                    )}
                  </div>
                  {part.instructions && (
                    <p className="text-xs text-muted-foreground">{part.instructions}</p>
                  )}
                  <div className="space-y-2">
                    {(promptsByPart[part.id] ?? []).map((prompt) => (
                      <PromptRow
                        key={prompt.id}
                        prompt={prompt}
                        response={responses[prompt.id] ?? ""}
                        canEdit={canEdit}
                        onChange={(val) => updateResponse(prompt.id, val)}
                      />
                    ))}
                  </div>
                </div>
              ))}
              {unpartedPrompts.length > 0 && (
                <div className="space-y-2">
                  {unpartedPrompts.map((prompt) => (
                    <PromptRow
                      key={prompt.id}
                      prompt={prompt}
                      response={responses[prompt.id] ?? ""}
                      canEdit={canEdit}
                      onChange={(val) => updateResponse(prompt.id, val)}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="space-y-2">
              {prompts.map((prompt) => (
                <PromptRow
                  key={prompt.id}
                  prompt={prompt}
                  response={responses[prompt.id] ?? ""}
                  canEdit={canEdit}
                  onChange={(val) => updateResponse(prompt.id, val)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {canEdit && (
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualSave}
            disabled={saveStatus === "saving" || saveStatus === "saved"}
          >
            <IconDeviceFloppy className="size-4 mr-1.5" />
            Save
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Submitting…" : "Submit Attempt"}
          </Button>
        </div>
      )}
    </div>
  )
}

interface PromptRowProps {
  prompt: Prompt
  response: string
  canEdit: boolean
  onChange: (val: string) => void
}

function PromptRow({ prompt, response, canEdit, onChange }: PromptRowProps) {
  return (
    <div className="rounded-[var(--radius)] border border-border/60 px-[var(--card-px)] py-[var(--card-py)]">
      <div className="flex items-start gap-3">
        <span className="text-xs text-muted-foreground font-mono w-6 shrink-0 pt-0.5">
          {prompt.promptNumber}.
        </span>
        <div className="flex-1 space-y-1.5">
          {prompt.label && (
            <p className="text-sm font-medium">{prompt.label}</p>
          )}
          {prompt.instructions && (
            <p className="text-xs text-muted-foreground">{prompt.instructions}</p>
          )}
          {canEdit ? (
            <Input
              value={response}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Your answer"
              className="text-sm"
            />
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {prompt.responseText ?? <em className="text-xs">No answer</em>}
              </span>
              {prompt.isCorrect === true && (
                <span className="flex items-center gap-1 text-xs text-[var(--success)]">
                  <IconCheck className="size-3.5" />
                  {prompt.pointsAwarded !== null ? `${prompt.pointsAwarded} pt` : "Correct"}
                </span>
              )}
              {prompt.isCorrect === false && (
                <span className="flex items-center gap-1 text-xs text-destructive">
                  <IconX className="size-3.5" />
                  {prompt.pointsPossible !== null ? `0/${prompt.pointsPossible} pt` : "Incorrect"}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
