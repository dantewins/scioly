"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { toast } from "sonner"
import {
  IconCheck,
  IconX,
  IconTrophy,
  IconDeviceFloppy,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { StatusBadge } from "@/components/ui/status-badge"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/ui/page-header"
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList,
  BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
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
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false)
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

  function handleSubmit() {
    setShowSubmitConfirm(true)
  }

  async function confirmSubmit() {
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    setSubmitting(true)
    try {
      const updated = await apiCall<MemberPracticeAttemptDetail>(`/api/member/practice/attempts/${attemptId}`, {
        method: "POST",
        body: JSON.stringify({}),
      })
      setAttempt(updated)
      toast.success("Attempt submitted!")
      setShowSubmitConfirm(false)
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
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/dashboard/practice">Assessments</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href={`/dashboard/practice/${assessment.id}`}>{assessment.title}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Attempt</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

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

      <ConfirmDialog
        open={showSubmitConfirm}
        title="Submit attempt?"
        description="Once submitted, your responses are scored and you can't make further changes."
        confirmLabel="Submit Attempt"
        loading={submitting}
        onConfirm={confirmSubmit}
        onCancel={() => setShowSubmitConfirm(false)}
      >
        {(() => {
          const total = prompts.length
          const answered = prompts.reduce(
            (n, p) => (responses[p.id]?.trim() ? n + 1 : n),
            0,
          )
          const blank = total - answered
          return (
            <div className="rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-sm">
              <p className="font-medium">
                You&rsquo;ve answered {answered} of {total} prompts.
              </p>
              {blank > 0 && (
                <p className="mt-1 text-xs text-[var(--warning)]">
                  {blank} prompt{blank === 1 ? "" : "s"} will be submitted blank.
                </p>
              )}
            </div>
          )
        })()}
      </ConfirmDialog>
    </div>
  )
}

interface PromptRowProps {
  prompt: Prompt
  response: string
  canEdit: boolean
  onChange: (val: string) => void
}

const DIFFICULTY_CHIP: Record<"EASY" | "MEDIUM" | "HARD", string> = {
  EASY: "bg-[var(--success-soft)] text-[var(--success)]",
  MEDIUM: "bg-[var(--warning-soft)] text-[var(--warning)]",
  HARD: "bg-[var(--danger-soft)] text-[var(--danger)]",
}

function PromptRow({ prompt, response, canEdit, onChange }: PromptRowProps) {
  const isMCQ = prompt.responseType === "MULTIPLE_CHOICE"
  const options = Array.isArray(prompt.choiceOptions) ? prompt.choiceOptions : null

  return (
    <div className="rounded-[var(--radius)] border border-border/60 px-[var(--card-px)] py-[var(--card-py)]">
      <div className="flex items-start gap-3">
        <span className="text-xs text-muted-foreground font-mono w-6 shrink-0 pt-0.5">
          {prompt.promptNumber}.
        </span>
        <div className="flex-1 space-y-1.5 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {prompt.label && (
              <p className="text-sm font-medium">{prompt.label}</p>
            )}
            {prompt.difficulty && (
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ${DIFFICULTY_CHIP[prompt.difficulty]}`}>
                {prompt.difficulty.toLowerCase()}
              </span>
            )}
            {prompt.subtopics?.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
          {prompt.instructions && (
            <p className="text-xs text-muted-foreground">{prompt.instructions}</p>
          )}
          {canEdit ? (
            isMCQ && options && options.length > 0 ? (
              <div className="space-y-1">
                {options.map((option, idx) => {
                  const id = `${prompt.id}-opt-${idx}`
                  return (
                    <label
                      key={id}
                      htmlFor={id}
                      className="flex cursor-pointer items-start gap-2 rounded-md border border-border/60 px-3 py-2 hover:bg-azure-50/40"
                    >
                      <input
                        id={id}
                        type="radio"
                        name={prompt.id}
                        value={idx}
                        checked={response === String(idx)}
                        onChange={() => onChange(String(idx))}
                        className="mt-0.5 size-4 accent-azure-600"
                      />
                      <span className="text-sm">{option}</span>
                    </label>
                  )
                })}
              </div>
            ) : (
              <Input
                value={response}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Your answer"
                className="text-sm"
              />
            )
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {isMCQ && options && prompt.responseText !== null
                  ? options[Number(prompt.responseText)] ?? prompt.responseText
                  : prompt.responseText ?? <em className="text-xs">No answer</em>}
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
