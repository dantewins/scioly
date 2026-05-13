"use client"

import Link from "next/link"
import { IconPlayerPlay, IconTrophy } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { SectionCard } from "@/components/ui/section-card"
import { EntityCard } from "@/components/ui/entity-card"
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
        <SectionCard title="Continue Practice" flush>
          <div className="space-y-2 p-[var(--card-px)]">
            {continueAttempts.map((attempt) => (
              <EntityCard
                key={attempt.attemptId}
                tone="warning"
                title={attempt.title}
                titleSize="sm"
                kicker={attempt.eventName ?? undefined}
                trailing={
                  <Button size="sm" asChild>
                    <Link href={`/dashboard/practice/attempts/${attempt.attemptId}`}>
                      <IconPlayerPlay className="size-3.5 mr-1" />
                      Continue
                    </Link>
                  </Button>
                }
                alwaysShowTrailing
              >
                {attempt.promptCount > 0 ? (
                  <div className="flex items-center gap-2 text-[11px] font-mono tabular-nums text-muted-foreground">
                    <div className="h-1 w-28 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-azure-500 transition-all"
                        style={{ width: `${attempt.progressPercent}%` }}
                      />
                    </div>
                    <span>{attempt.answeredCount}/{attempt.promptCount} answered</span>
                  </div>
                ) : (
                  <p className="text-[11px] font-mono tabular-nums text-muted-foreground">
                    Started {formatMonthDay(attempt.startedAt)}
                  </p>
                )}
              </EntityCard>
            ))}
          </div>
        </SectionCard>
      )}

      {recommendedAssessments.length > 0 && (
        <SectionCard title="Recommended for Your Events" flush>
          <div className="space-y-2 p-[var(--card-px)]">
            {recommendedAssessments.map((assessment) => (
              <AssessmentCard key={assessment.id} assessment={assessment} />
            ))}
          </div>
        </SectionCard>
      )}

      <SectionCard title="All Assessments" flush>
        <div className="space-y-2 p-[var(--card-px)]">
          {assessments.map((assessment) => (
            <AssessmentCard key={assessment.id} assessment={assessment} />
          ))}
        </div>
      </SectionCard>

      {recentAttempts.length > 0 && (
        <SectionCard title="Recent Results" flush>
          <div className="space-y-2 p-[var(--card-px)]">
            {recentAttempts.map((attempt) => {
              const isScored = attempt.status === "SCORED" && attempt.score !== null && attempt.scorePossible !== null
              const pct = isScored && attempt.scorePossible
                ? Math.round((attempt.score! / attempt.scorePossible) * 100)
                : null
              return (
                <EntityCard
                  key={attempt.attemptId}
                  tone={isScored ? "success" : "neutral"}
                  href={`/dashboard/practice/attempts/${attempt.attemptId}`}
                  title={attempt.title}
                  titleSize="sm"
                  kicker={attempt.eventName ?? undefined}
                  metrics={
                    <>
                      {isScored ? (
                        <span className="inline-flex items-center gap-1 text-[var(--success)] font-medium">
                          <IconTrophy className="size-3" />
                          {attempt.score}/{attempt.scorePossible}
                          {pct !== null && <span className="text-muted-foreground"> · {pct}%</span>}
                        </span>
                      ) : (
                        <span>Submitted · pending score</span>
                      )}
                      <span>{formatMonthDay(attempt.submittedAt)}</span>
                    </>
                  }
                />
              )
            })}
          </div>
        </SectionCard>
      )}
    </div>
  )
}
