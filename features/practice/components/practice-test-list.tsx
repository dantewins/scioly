"use client"

import {
  IconFileTypePdf,
  IconLayout,
  IconClock,
  IconTrophy,
  IconExternalLink,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type AssessmentFormat = "TEST" | "STATIONS" | "HYBRID" | "GENERATED"
type AssessmentPartType = "SECTION" | "STATION"

interface SciEvent {
  id: string
  name: string
}

interface Attempt {
  id: string
  score: number | null
  startedAt: string
  submittedAt: string | null
}

interface PracticeTest {
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
  attempts: Attempt[]
  createdAt: string
  updatedAt: string
}

interface Props {
  tests: PracticeTest[]
}

function bestScore(attempts: Attempt[]): number | null {
  const scores = attempts.map((a) => a.score).filter((s): s is number => s !== null)
  return scores.length > 0 ? Math.max(...scores) : null
}

export function PracticeTestList({ tests }: Props) {
  if (tests.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No assessments are available right now.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {tests.map((test) => {
        const attempted = test.attempts.length > 0
        const best = bestScore(test.attempts)

        return (
          <Card key={test.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CardTitle className="text-sm font-medium">{test.title}</CardTitle>
                    <Badge variant="outline" className="text-xs">{test.format}</Badge>
                    {attempted && (
                      <Badge variant="secondary" className="text-xs">Attempted</Badge>
                    )}
                  </div>
                  {test.event && (
                    <p className="text-xs text-muted-foreground mt-0.5">{test.event.name}</p>
                  )}
                  {test.description && (
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{test.description}</p>
                  )}
                </div>
                <Button size="sm" className="shrink-0 gap-1.5" asChild>
                  <a href={test.sourcePdfUrl} target="_blank" rel="noopener noreferrer">
                    <IconFileTypePdf size={14} />
                    Open Packet
                    <IconExternalLink size={12} />
                  </a>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
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
                {test.answerKey && attempted && best !== null && (
                  <span className="flex items-center gap-1 text-[var(--success)] font-medium">
                    <IconTrophy size={12} />
                    Best: {best} correct
                  </span>
                )}
                {test.answerKey && attempted && best === null && (
                  <span className="text-muted-foreground">
                    {test.attempts.length} attempt{test.attempts.length !== 1 ? "s" : ""} — not yet scored
                  </span>
                )}
                {!attempted && (
                  <span>Not yet attempted</span>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
