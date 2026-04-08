"use client"

import Link from "next/link"
import { IconPlayerPlay, IconTrophy } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { SectionCard } from "@/components/ui/section-card"
import { AssessmentCard } from "@/components/cards/assessment-card"
import { formatMonthDay } from "@/lib/format"
import type { MemberPracticeFeed } from "@/lib/practice-assessments"

interface Props {
  feed: MemberPracticeFeed
}

export function PracticeFeed({ feed }: Props) {
  const { continueAttempts, recommendedAssessments, assessments, recentAttempts } = feed

  if (assessments.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No assessments are available right now.</p>
    )
  }

  return (
    <div className="space-y-6">
      {continueAttempts.length > 0 && (
        <SectionCard title="Continue Practice">
          <div className="space-y-2">
            {continueAttempts.map((attempt) => (
              <Card
                key={attempt.attemptId}
                className="flex flex-row items-center justify-between gap-3 px-[var(--card-px)] py-[var(--card-py)]"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium truncate">{attempt.title}</p>
                    {attempt.eventName && (
                      <span className="text-xs text-muted-foreground">{attempt.eventName}</span>
                    )}
                  </div>
                  <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                    {attempt.promptCount > 0 ? (
                      <>
                        <div className="h-1.5 w-24 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${attempt.progressPercent}%` }}
                          />
                        </div>
                        <span>{attempt.answeredCount}/{attempt.promptCount} answered</span>
                      </>
                    ) : (
                      <span>Started {formatMonthDay(attempt.startedAt)}</span>
                    )}
                  </div>
                </div>
                <Button size="sm" asChild>
                  <Link href={`/dashboard/practice/attempts/${attempt.attemptId}`}>
                    <IconPlayerPlay className="size-3.5 mr-1" />
                    Continue
                  </Link>
                </Button>
              </Card>
            ))}
          </div>
        </SectionCard>
      )}

      {recommendedAssessments.length > 0 && (
        <SectionCard title="Recommended for Your Events">
          <div className="space-y-3">
            {recommendedAssessments.map((assessment) => (
              <AssessmentCard key={assessment.id} assessment={assessment} />
            ))}
          </div>
        </SectionCard>
      )}

      <SectionCard title="All Assessments">
        <div className="space-y-3">
          {assessments.map((assessment) => (
            <AssessmentCard key={assessment.id} assessment={assessment} />
          ))}
        </div>
      </SectionCard>

      {recentAttempts.length > 0 && (
        <SectionCard title="Recent Results">
          <div className="space-y-2">
            {recentAttempts.map((attempt) => (
              <Card
                key={attempt.attemptId}
                className="flex flex-row items-center justify-between gap-3 px-[var(--card-px)] py-[var(--card-py)]"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium truncate">{attempt.title}</p>
                    {attempt.eventName && (
                      <span className="text-xs text-muted-foreground">{attempt.eventName}</span>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                    {attempt.status === "SCORED" && attempt.score !== null && attempt.scorePossible !== null ? (
                      <span className="flex items-center gap-1 text-green-600 dark:text-green-400 font-medium">
                        <IconTrophy className="size-3" />
                        {attempt.score}/{attempt.scorePossible}
                      </span>
                    ) : (
                      <span>Submitted · pending score</span>
                    )}
                    <span>·</span>
                    <span>{formatMonthDay(attempt.submittedAt)}</span>
                  </div>
                </div>
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/dashboard/practice/attempts/${attempt.attemptId}`}>
                    Review
                  </Link>
                </Button>
              </Card>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  )
}
