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
import { Card, CardContent } from "@/components/ui/card"

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

export function PracticeTestCard({
  test,
  canManage,
  onEdit,
  onDelete,
  onSetAnswerKey,
}: PracticeTestCardProps) {
  return (
    <Card className="group">
      <CardContent className="space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium leading-none">{test.title}</p>
              <Badge variant={test.isPublished ? "default" : "secondary"} className="text-xs">
                {test.isPublished ? "Published" : "Draft"}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {test.format}
              </Badge>
              {test.answerKey && (
                <Badge variant="outline" className="text-xs gap-1">
                  <IconKey size={10} />
                  Answer key set
                </Badge>
              )}
            </div>
          </div>
          {canManage && (
            <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
              <Button
                variant="ghost"
                size="sm"
                className="px-2.5 text-xs gap-1"
                onClick={() => onSetAnswerKey(test)}
              >
                <IconKey size={12} />
                {test.answerKey ? "Update key" : "Set key"}
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => onEdit(test)}
              >
                <IconPencil size={13} />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => onDelete(test.id)}
              >
                <IconTrash size={13} />
              </Button>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {test.event && (
            <span className="font-medium text-foreground">{test.event.name}</span>
          )}
          {test.timeLimitMinutes && (
            <span className="flex items-center gap-1">
              <IconClock size={12} />
              {test.timeLimitMinutes} min
            </span>
          )}
          {test.parts.length > 0 && (
            <span className="flex items-center gap-1">
              <IconLayout size={12} />
              {test.parts.length} {test.format === "STATIONS" ? "station" : "part"}{test.parts.length !== 1 ? "s" : ""}
            </span>
          )}
          <span className="flex items-center gap-1">
            <IconUsers size={12} />
            {test.attemptCount} attempt{test.attemptCount !== 1 ? "s" : ""}
          </span>
          <a
            href={test.sourcePdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-foreground transition-colors"
          >
            <IconFileTypePdf size={12} />
            Open Packet
          </a>
          {test.answerKeyPdfUrl && (
            <a
              href={test.answerKeyPdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              Answer Key PDF
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
