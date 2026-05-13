"use client"

import { IconClock, IconLayout, IconFileText } from "@tabler/icons-react"
import { EntityCard, type EntityCardTone } from "@/components/ui/entity-card"
import { StatusBadge } from "@/components/ui/status-badge"
import type { MemberPracticeFeedRecord } from "@/lib/practice-assessments"

const FORMAT_LABEL: Record<string, string> = {
  TEST: "Test",
  STATIONS: "Stations",
  QUIZ: "Quiz",
  PROBLEM_SET: "Problem Set",
}

function toneFor(assessment: MemberPracticeFeedRecord): EntityCardTone {
  if (assessment.hasInProgressAttempt) return "warning"
  if (assessment.recommended) return "brand"
  return "neutral"
}

function statusFor(assessment: MemberPracticeFeedRecord): string {
  if (assessment.hasInProgressAttempt) return "In progress"
  if (assessment.recommended) return "Recommended"
  return "Available"
}

export function AssessmentCard({ assessment }: { assessment: MemberPracticeFeedRecord }) {
  const partLabel = assessment.format === "STATIONS" ? "station" : "part"
  const status = statusFor(assessment)
  return (
    <EntityCard
      href={`/dashboard/practice/${assessment.id}`}
      tone={toneFor(assessment)}
      kicker={
        <>
          {FORMAT_LABEL[assessment.format] ?? assessment.format}
          {assessment.event && <span className="text-border" aria-hidden>·</span>}
          {assessment.event && <span className="text-muted-foreground">{assessment.event.name}</span>}
        </>
      }
      status={<StatusBadge status={status} withDot />}
      title={assessment.title}
      metrics={
        <>
          {assessment.timeLimitMinutes && (
            <span className="inline-flex items-center gap-1">
              <IconClock className="size-3 shrink-0" aria-hidden />
              {assessment.timeLimitMinutes} min
            </span>
          )}
          {assessment.parts.length > 0 && (
            <span className="inline-flex items-center gap-1">
              <IconLayout className="size-3 shrink-0" aria-hidden />
              {assessment.parts.length} {partLabel}{assessment.parts.length !== 1 ? "s" : ""}
            </span>
          )}
          <span>
            <span className="text-foreground/80">{assessment.attemptCount}</span> attempt{assessment.attemptCount !== 1 ? "s" : ""}
          </span>
          {assessment.sourcePdfUrl && (
            <a
              href={assessment.sourcePdfUrl}
              target="_blank"
              rel="noreferrer noopener"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 underline-offset-4 hover:text-foreground hover:underline"
            >
              <IconFileText className="size-3 shrink-0" aria-hidden />
              Packet
            </a>
          )}
        </>
      }
    />
  )
}
