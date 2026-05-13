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
import { Badge } from "@/components/ui/badge"
import { EntityCard } from "@/components/ui/entity-card"
import { StatusBadge } from "@/components/ui/status-badge"

type AssessmentFormat = "TEST" | "STATIONS" | "HYBRID"
type AssessmentPartType = "SECTION" | "STATION"

interface SciEvent {
  id: string
  name: string
}

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

interface PracticeTestCardProps {
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

export function PracticeTestCard({
  test, canManage, onEdit, onDelete, onSetAnswerKey,
}: PracticeTestCardProps) {
  const partLabel = test.format === "STATIONS" ? "station" : "part"
  return (
    <EntityCard
      tone={test.isPublished ? "brand" : "neutral"}
      kicker={
        <>
          {FORMAT_LABEL[test.format]}
          {test.event && <span className="text-border" aria-hidden>·</span>}
          {test.event && <span className="text-muted-foreground">{test.event.name}</span>}
          {test.answerKey && (
            <>
              <span className="text-border" aria-hidden>·</span>
              <Badge variant="info" className="text-[10px] gap-1">
                <IconKey size={10} />
                Key set
              </Badge>
            </>
          )}
        </>
      }
      status={<StatusBadge status={test.isPublished ? "Published" : "Draft"} withDot />}
      title={test.title}
      metrics={
        <>
          {test.timeLimitMinutes && (
            <span className="inline-flex items-center gap-1">
              <IconClock size={12} aria-hidden />
              {test.timeLimitMinutes} min
            </span>
          )}
          {test.parts.length > 0 && (
            <span className="inline-flex items-center gap-1">
              <IconLayout size={12} aria-hidden />
              {test.parts.length} {partLabel}{test.parts.length !== 1 ? "s" : ""}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <IconUsers size={12} aria-hidden />
            <span className="text-foreground/80">{test.attemptCount}</span> attempt{test.attemptCount !== 1 ? "s" : ""}
          </span>
          {test.sourcePdfUrl && (
            <a
              href={test.sourcePdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 underline-offset-4 hover:text-foreground hover:underline"
            >
              <IconFileTypePdf size={12} aria-hidden />
              Packet
            </a>
          )}
          {test.answerKeyPdfUrl && (
            <a
              href={test.answerKeyPdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 underline-offset-4 hover:text-foreground hover:underline"
            >
              Answer Key
            </a>
          )}
        </>
      }
      trailing={
        canManage ? (
          <>
            <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => onSetAnswerKey(test)}>
              <IconKey size={12} />
              {test.answerKey ? "Update key" : "Set key"}
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={() => onEdit(test)} aria-label={`Edit ${test.title}`}>
              <IconPencil size={13} />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(test.id)}
              aria-label={`Delete ${test.title}`}
            >
              <IconTrash size={13} />
            </Button>
          </>
        ) : undefined
      }
      interactive={!canManage}
    />
  )
}
