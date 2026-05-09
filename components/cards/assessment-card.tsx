"use client"

import Link from "next/link"
import {
  IconArrowRight,
  IconClock,
  IconFileText,
  IconLayout,
} from "@tabler/icons-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { MemberPracticeFeedRecord } from "@/lib/practice-assessments"

export function AssessmentCard({ assessment }: { assessment: MemberPracticeFeedRecord }) {
  return (
    <Card className="gap-2">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-sm font-medium">{assessment.title}</CardTitle>
              <Badge variant="outline" className="text-xs">{assessment.format}</Badge>
              {assessment.recommended && (
                <Badge variant="secondary" className="text-xs">Recommended</Badge>
              )}
              {assessment.hasInProgressAttempt && (
                <Badge className="text-xs">In Progress</Badge>
              )}
            </div>
            {assessment.event && (
              <p className="text-xs text-muted-foreground mt-0.5">{assessment.event.name}</p>
            )}
          </div>
          <Button size="sm" variant="outline" asChild className="shrink-0">
            <Link href={`/dashboard/practice/${assessment.id}`}>
              View
              <IconArrowRight className="size-3.5 ml-1" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {assessment.timeLimitMinutes && (
            <span className="flex items-center gap-1">
              <IconClock className="size-3" />
              {assessment.timeLimitMinutes} min
            </span>
          )}
          {assessment.parts.length > 0 && (
            <span className="flex items-center gap-1">
              <IconLayout className="size-3" />
              {assessment.parts.length} {assessment.format === "STATIONS" ? "station" : "part"}{assessment.parts.length !== 1 ? "s" : ""}
            </span>
          )}
          {assessment.attemptCount > 0 && (
            <span>{assessment.attemptCount} attempt{assessment.attemptCount !== 1 ? "s" : ""}</span>
          )}
          {assessment.sourcePdfUrl && (
            <a
              href={assessment.sourcePdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-foreground transition-colors"
            >
              <IconFileText className="size-3" />
              Open Packet
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
