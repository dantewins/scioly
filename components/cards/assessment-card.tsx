"use client"

import Link from "next/link"
import {
  IconArrowRight,
  IconClock,
  IconLayout,
  IconFileText,
  IconSparkles,
  IconPlayerPlay,
} from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import type { MemberPracticeFeedRecord } from "@/lib/practice-assessments"

// Assessment card — signature: an oversized 2-column grid with a numeric
// "stat" column on the right (time / progress / score), tag pills along
// the top edge, and a primary action chip that fills on hover.

const FORMAT_LABEL: Record<string, string> = {
  TEST: "Test",
  STATIONS: "Stations",
  QUIZ: "Quiz",
  PROBLEM_SET: "Problem Set",
}

export function AssessmentCard({ assessment }: { assessment: MemberPracticeFeedRecord }) {
  const partLabel = assessment.format === "STATIONS" ? "station" : "part"
  const inProgress = assessment.hasInProgressAttempt
  const recommended = assessment.recommended

  return (
    <Link
      href={`/dashboard/practice/${assessment.id}`}
      className="group relative block overflow-hidden rounded-[var(--radius)] border border-border/80 bg-card shadow-[0_1px_2px_0_color-mix(in_oklch,var(--azure-300),transparent_88%)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-azure-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      {/* Top tag bar */}
      <div className="flex items-center gap-1.5 border-b border-border/50 bg-azure-50/30 px-4 py-1.5 text-[10px] font-medium uppercase tracking-[0.14em]">
        {recommended && (
          <span className="inline-flex items-center gap-1 text-azure-700">
            <IconSparkles className="size-3" aria-hidden />
            Recommended
          </span>
        )}
        {recommended && <span aria-hidden className="text-border">·</span>}
        <span className="text-muted-foreground">{FORMAT_LABEL[assessment.format] ?? assessment.format}</span>
        {assessment.event && (
          <>
            <span aria-hidden className="text-border">·</span>
            <span className="text-muted-foreground truncate">{assessment.event.name}</span>
          </>
        )}
        {inProgress && (
          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-amber-700">
            <span className="size-1.5 rounded-full bg-amber-500" aria-hidden />
            In progress
          </span>
        )}
      </div>

      {/* Body */}
      <div className="grid grid-cols-[1fr_auto] items-start gap-4 px-4 py-4">
        <div className="min-w-0 space-y-2">
          <h3 className="font-serif text-2xl leading-[1.15] tracking-tight text-foreground">
            {assessment.title}
          </h3>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted-foreground">
            {assessment.parts.length > 0 && (
              <span className="inline-flex items-center gap-1">
                <IconLayout className="size-3.5" aria-hidden />
                {assessment.parts.length} {partLabel}{assessment.parts.length !== 1 ? "s" : ""}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <span className="text-foreground/80 font-medium tabular-nums">{assessment.attemptCount}</span>
              attempt{assessment.attemptCount !== 1 ? "s" : ""}
            </span>
            {assessment.sourcePdfUrl && (
              <span
                role="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  window.open(assessment.sourcePdfUrl, "_blank")
                }}
                className="inline-flex items-center gap-1 underline-offset-4 hover:text-foreground hover:underline cursor-pointer"
              >
                <IconFileText className="size-3.5" aria-hidden />
                Packet
              </span>
            )}
          </div>
        </div>

        {/* Time stat */}
        {assessment.timeLimitMinutes && (
          <div className="flex flex-col items-end justify-center text-right">
            <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              <IconClock className="size-3" aria-hidden />
              Time
            </span>
            <span className="font-serif text-2xl leading-none tabular-nums text-foreground">
              {assessment.timeLimitMinutes}
              <span className="text-sm text-muted-foreground"> min</span>
            </span>
          </div>
        )}
      </div>

      {/* CTA chip — fills on hover */}
      <div className="flex items-center justify-end border-t border-border/50 px-4 py-2">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors",
            inProgress
              ? "bg-amber-500 text-white"
              : "bg-azure-50 text-azure-700 group-hover:bg-azure-600 group-hover:text-white",
          )}
        >
          {inProgress ? (
            <>
              <IconPlayerPlay className="size-3.5" aria-hidden />
              Resume
            </>
          ) : (
            <>
              Start
              <IconArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </>
          )}
        </span>
      </div>
    </Link>
  )
}
