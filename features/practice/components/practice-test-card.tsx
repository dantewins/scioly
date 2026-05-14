"use client"

import {
  IconPencil,
  IconTrash,
  IconKey,
  IconFileTypePdf,
  IconClock,
  IconUsers,
  IconLayout,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// Practice test card (admin) — signature: a dense management row with
// pill cluster up top, title middle, inline stat chips bottom-left, and
// always-visible action buttons on the right. More utility, less editorial.

type AssessmentFormat = "TEST" | "STATIONS" | "HYBRID"
type AssessmentPartType = "SECTION" | "STATION"

interface SciEvent { id: string; name: string }

export interface PracticeTestCardData {
  id: string
  title: string
  description: string | null
  format: AssessmentFormat
  instructions: string | null
  sourcePdfUrl: string
  answerKeyPdfUrl: string | null
  timeLimitMinutes: number | null
  eventId: string | null
  isPublished: boolean
  isArchived: boolean
  event: SciEvent | null
  answerKey: { id: string } | null
  parts: Array<{
    id: string
    title: string
    type: AssessmentPartType
    instructions: string | null
    pageFrom: number | null
    pageTo: number | null
    timeLimitMinutes: number | null
  }>
  attemptCount: number
}

interface Props {
  test: PracticeTestCardData
  canManage: boolean
  onEdit: (test: PracticeTestCardData) => void
  onDelete: (id: string) => void
  onSetAnswerKey: (test: PracticeTestCardData) => void
}

const FORMAT_LABEL: Record<AssessmentFormat, string> = {
  TEST: "Test",
  STATIONS: "Stations",
  HYBRID: "Hybrid",
}

export function PracticeTestCard({ test, canManage, onEdit, onDelete, onSetAnswerKey }: Props) {
  const partLabel = test.format === "STATIONS" ? "station" : "part"
  return (
    <div className="group relative flex flex-col gap-3 rounded-[var(--radius)] border border-border/80 bg-card px-3 py-3 shadow-[0_1px_2px_0_color-mix(in_oklch,var(--azure-300),transparent_88%)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-azure-soft sm:grid sm:grid-cols-[1fr_auto] sm:items-center sm:gap-4 sm:px-4">
      {/* Content column */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em]",
                test.isPublished ? "bg-azure-50 text-azure-700" : "bg-muted text-muted-foreground",
              )}
            >
              {test.isPublished ? "Published" : "Draft"}
            </span>
            <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              {FORMAT_LABEL[test.format]}
            </span>
            {test.event && (
              <>
                <span aria-hidden className="text-border">·</span>
                <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground truncate">
                  {test.event.name}
                </span>
              </>
            )}
            {test.answerKey && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                <IconKey className="size-3" aria-hidden />
                Key set
              </span>
            )}
          </div>

          <h3 className="mt-1 font-serif text-lg leading-tight tracking-tight text-foreground truncate">
            {test.title}
          </h3>

          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
            {test.timeLimitMinutes && (
              <span className="inline-flex items-center gap-1">
                <IconClock className="size-3" aria-hidden />
                {test.timeLimitMinutes}m
              </span>
            )}
            {test.parts.length > 0 && (
              <span className="inline-flex items-center gap-1">
                <IconLayout className="size-3" aria-hidden />
                {test.parts.length} {partLabel}{test.parts.length !== 1 ? "s" : ""}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <IconUsers className="size-3" aria-hidden />
              <span className="text-foreground/80 tabular-nums">{test.attemptCount}</span> attempts
            </span>
            {test.sourcePdfUrl && (
              <a
                href={test.sourcePdfUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 underline-offset-4 hover:text-foreground hover:underline"
              >
                <IconFileTypePdf className="size-3" aria-hidden />
                Packet
              </a>
            )}
          </div>
        </div>
      </div>

      {canManage && (
        <div className="flex items-center gap-0.5 self-center shrink-0 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onSetAnswerKey(test)}
            aria-label={test.answerKey ? `Update answer key for ${test.title}` : `Set answer key for ${test.title}`}
            title={test.answerKey ? "Update answer key" : "Set answer key"}
          >
            <IconKey className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onEdit(test)}
            aria-label={`Edit ${test.title}`}
            title="Edit"
          >
            <IconPencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(test.id)}
            aria-label={`Delete ${test.title}`}
            title="Delete"
          >
            <IconTrash className="size-3.5" />
          </Button>
        </div>
      )}
    </div>
  )
}
