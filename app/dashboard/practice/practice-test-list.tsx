"use client"

import {
  FilePdfIcon,
  TimerIcon,
  TrophyIcon,
  ArrowSquareOutIcon,
} from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

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
  pdfUrl: string
  timeLimitMinutes: number | null
  eventId: string | null
  isActive: boolean
  event: SciEvent | null
  answerKey: { id: string } | null
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
        No practice tests are available right now.
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
                    {attempted && (
                      <Badge variant="secondary" className="text-xs">Attempted</Badge>
                    )}
                  </div>
                  {test.event && (
                    <p className="text-xs text-muted-foreground mt-0.5">{test.event.name}</p>
                  )}
                </div>
                <Button size="sm" className="shrink-0 gap-1.5" asChild>
                  <a href={test.pdfUrl} target="_blank" rel="noopener noreferrer">
                    <FilePdfIcon size={14} />
                    Take Test
                    <ArrowSquareOutIcon size={12} />
                  </a>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                {test.timeLimitMinutes && (
                  <span className="flex items-center gap-1">
                    <TimerIcon size={12} />
                    {test.timeLimitMinutes} min
                  </span>
                )}
                {test.answerKey && attempted && best !== null && (
                  <span className="flex items-center gap-1 text-green-600 dark:text-green-400 font-medium">
                    <TrophyIcon size={12} />
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
