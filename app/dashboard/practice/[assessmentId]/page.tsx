import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import {
  IconArrowLeft,
  IconArrowRight,
  IconClock,
  IconFileText,
} from "@tabler/icons-react"
import { getCurrentUser } from "@/lib/auth"
import { canView } from "@/lib/permissions"
import { getActiveSeason, getMemberSeason } from "@/lib/db"
import { getMemberPracticeAssessmentDetail } from "@/lib/practice-assessments"
import { PageHeader } from "@/components/ui/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { formatMonthDay } from "@/lib/format"
import { StartAttemptButton } from "./start-attempt-button"


interface Props { params: Promise<{ assessmentId: string }> }

export default async function AssessmentDetailPage({ params }: Props) {
  const { assessmentId } = await params
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  if (!canView(user.permissions, "practice")) redirect("/dashboard")

  const season = await getActiveSeason(user.clubId)
  if (!season) redirect("/dashboard/practice")

  const ms = await getMemberSeason(user.id, user.clubId)
  if (!ms) redirect("/dashboard/practice")

  const assessment = await getMemberPracticeAssessmentDetail(assessmentId, user.clubId, ms.id)
  if (!assessment) notFound()

  return (
    <div className="layout-page">
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/practice">
            <IconArrowLeft className="size-4" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <PageHeader
            title={assessment.title}
            description={assessment.event?.name ?? undefined}
          >
            <Badge variant="outline">{assessment.format}</Badge>
          </PageHeader>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {assessment.sourcePdfUrl && (
          <Button variant="outline" size="sm" asChild>
            <a href={assessment.sourcePdfUrl} target="_blank" rel="noopener noreferrer">
              <IconFileText className="size-4 mr-1.5" />
              Open Packet
            </a>
          </Button>
        )}
        {assessment.timeLimitMinutes && (
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <IconClock className="size-4" />
            {assessment.timeLimitMinutes} min
          </span>
        )}
      </div>

      {assessment.instructions && (
        <Card className="bg-muted/30 px-[var(--card-px)] py-[var(--card-py)] border-border/60">
          <p className="text-sm text-muted-foreground whitespace-pre-line">{assessment.instructions}</p>
        </Card>
      )}

      {assessment.parts.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium">
            {assessment.format === "STATIONS" ? "Stations" : "Sections"} ({assessment.parts.length})
          </h2>
          <div className="space-y-2">
            {assessment.parts.map((part, index) => (
              <Card key={part.id} className="px-[var(--card-px)] py-[var(--card-py)] text-sm border-border/60 gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-muted-foreground font-mono">{index + 1}.</span>
                  <span className="font-medium">{part.title}</span>
                  {part.pageFrom !== null && part.pageTo !== null && (
                    <span className="text-xs text-muted-foreground">pp. {part.pageFrom}–{part.pageTo}</span>
                  )}
                  {part.timeLimitMinutes && (
                    <span className="text-xs text-muted-foreground">{part.timeLimitMinutes} min</span>
                  )}
                </div>
                {part.instructions && (
                  <p className="text-xs text-muted-foreground">{part.instructions}</p>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      <StartAttemptButton assessmentId={assessmentId} currentAttemptId={assessment.currentAttemptId} />

      {assessment.attempts.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium">Attempt History ({assessment.attempts.length})</h2>
          <div className="space-y-2">
            {assessment.attempts.map((attempt) => (
              <Link
                key={attempt.id}
                href={`/dashboard/practice/attempts/${attempt.id}`}
                className="block"
              >
                <Card className="flex flex-row items-center justify-between px-[var(--card-px)] py-[var(--card-py)] border-border/60 transition-colors hover:bg-muted/30 gap-0">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant={
                          attempt.status === "IN_PROGRESS" ? "default" :
                          attempt.status === "SCORED" ? "secondary" : "outline"
                        }
                        className="text-xs"
                      >
                        {attempt.status.replace("_", " ")}
                      </Badge>
                      {attempt.status === "SCORED" && attempt.score !== null && attempt.scorePossible !== null && (
                        <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                          {attempt.score}/{attempt.scorePossible}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Started {formatMonthDay(attempt.startedAt)}
                      {attempt.submittedAt && ` · Submitted ${formatMonthDay(attempt.submittedAt)}`}
                    </p>
                  </div>
                  <IconArrowRight className="size-4 text-muted-foreground shrink-0" />
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
