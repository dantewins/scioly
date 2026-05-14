"use client"

import Link from "next/link"
import { IconPlayerPlay, IconTrophy, IconArrowRight } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { SectionCard } from "@/components/ui/section-card"
import { AssessmentCard } from "@/features/practice/components/assessment-card"
import { cn } from "@/lib/utils"
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
      {/* Continue practice — progress-driven row: big circular ring on the right + Continue CTA */}
      {continueAttempts.length > 0 && (
        <SectionCard title="Continue Practice" flush>
          <div className="space-y-2 p-[var(--card-px)]">
            {continueAttempts.map((attempt) => {
              const pct = attempt.progressPercent
              return (
                <div
                  key={attempt.attemptId}
                  className="group relative flex items-center gap-4 rounded-[var(--radius)] border border-amber-200/60 bg-amber-50/30 px-4 py-3 transition-shadow"
                >
                  {/* Progress ring (SVG) */}
                  <div className="relative shrink-0">
                    <svg viewBox="0 0 36 36" className="size-12 -rotate-90" aria-hidden>
                      <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" className="text-amber-100" strokeWidth="3" />
                      <circle
                        cx="18" cy="18" r="15" fill="none" stroke="currentColor" className="text-amber-500"
                        strokeWidth="3" strokeLinecap="round"
                        strokeDasharray={`${(pct / 100) * 94.25} 94.25`}
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-[11px] font-mono font-semibold tabular-nums text-amber-700">
                      {pct}%
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{attempt.title}</p>
                    {attempt.eventName && (
                      <p className="text-[11px] font-mono uppercase tracking-[0.12em] text-muted-foreground mt-0.5">{attempt.eventName}</p>
                    )}
                    <p className="text-[11px] font-mono tabular-nums text-muted-foreground mt-1">
                      <span className="text-foreground/80">{attempt.answeredCount}</span>/{attempt.promptCount} answered
                    </p>
                  </div>

                  <Button size="sm" asChild className="bg-amber-500 hover:bg-amber-600 text-white">
                    <Link href={`/dashboard/practice/attempts/${attempt.attemptId}`}>
                      <IconPlayerPlay className="size-3.5 mr-1" />
                      Continue
                    </Link>
                  </Button>
                </div>
              )
            })}
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

      {/* Recent Results — "score card" with the percentage as the hero number on the right */}
      {recentAttempts.length > 0 && (
        <SectionCard title="Recent Results" flush>
          <div className="space-y-2 p-[var(--card-px)]">
            {recentAttempts.map((attempt) => {
              const isScored = attempt.status === "SCORED" && attempt.score !== null && attempt.scorePossible !== null
              const pct = isScored && attempt.scorePossible ? Math.round((attempt.score! / attempt.scorePossible) * 100) : null
              return (
                <Link
                  key={attempt.attemptId}
                  href={`/dashboard/practice/attempts/${attempt.attemptId}`}
                  className={cn(
                    "group relative flex items-center gap-4 rounded-[var(--radius)] border bg-card px-4 py-3 shadow-[0_1px_2px_0_color-mix(in_oklch,var(--azure-300),transparent_88%)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-azure-soft",
                    isScored ? "border-[color-mix(in_oklch,var(--success),transparent_70%)]" : "border-border/80",
                  )}
                >
                  <div className="flex-1 min-w-0">
                    {attempt.eventName && (
                      <p className="text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground">{attempt.eventName}</p>
                    )}
                    <p className="font-medium text-sm truncate">{attempt.title}</p>
                    <p className="mt-1 text-[11px] font-mono tabular-nums text-muted-foreground inline-flex items-center gap-1">
                      <IconTrophy className="size-3" aria-hidden />
                      {isScored ? (
                        <><span className="text-foreground/80">{attempt.score}</span>/{attempt.scorePossible}</>
                      ) : (
                        <>Submitted</>
                      )}
                      <span aria-hidden className="mx-1">·</span>
                      <span>{formatMonthDay(attempt.submittedAt)}</span>
                    </p>
                  </div>

                  {/* Hero percentage */}
                  {pct !== null ? (
                    <div className="flex flex-col items-end shrink-0">
                      <span className="font-serif text-3xl leading-none tabular-nums text-[var(--success)]">
                        {pct}<span className="text-base text-muted-foreground">%</span>
                      </span>
                    </div>
                  ) : (
                    <span className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Pending</span>
                  )}

                  <IconArrowRight className="size-4 text-muted-foreground/60 transition-all duration-200 group-hover:text-foreground group-hover:translate-x-0.5" aria-hidden />
                </Link>
              )
            })}
          </div>
        </SectionCard>
      )}
    </div>
  )
}
