import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import {
  IconArrowRight,
  IconClock,
  IconFileText,
} from "@tabler/icons-react"
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList,
  BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { getCurrentUser } from "@/lib/auth"
import { canView } from "@/lib/permissions"
import { getActiveSeason, getMemberSeason } from "@/lib/db"
import { getMemberPracticeAssessmentDetail } from "@/lib/practice-assessments"
import { PageHeader } from "@/components/ui/page-header"
import { StatusBadge } from "@/components/ui/status-badge"
import { Button } from "@/components/ui/button"
import { formatMonthDay } from "@/lib/format"
import { StartAttemptButton } from "./start-attempt-button"


interface Props { params: Promise<{ assessmentId: string }> }

const FORMAT_LABEL: Record<string, string> = {
  TEST: "Test",
  STATIONS: "Stations",
  HYBRID: "Hybrid",
}

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
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/dashboard">Dashboard</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/dashboard/practice">Assessments</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{assessment.title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <PageHeader
        title={assessment.title}
        kicker={FORMAT_LABEL[assessment.format] ?? assessment.format}
        description={assessment.event?.name ?? undefined}
      />

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
          <span className="inline-flex items-center gap-1.5 text-[11px] font-mono tabular-nums text-muted-foreground">
            <IconClock className="size-3.5" />
            {assessment.timeLimitMinutes} min
          </span>
        )}
      </div>

      {assessment.instructions && (
        <div className="relative overflow-hidden rounded-[var(--radius)] border border-azure-200/60 bg-azure-50/40 px-[var(--card-px)] py-[var(--card-py)]">
          <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-azure-500" />
          <p className="pl-3 text-sm text-foreground/80 whitespace-pre-line">{assessment.instructions}</p>
        </div>
      )}

      {assessment.parts.length > 0 && (
        <div className="space-y-2">
          <h2 className="label-caps text-azure-700">
            {assessment.format === "STATIONS" ? "Stations" : "Sections"} · {assessment.parts.length}
          </h2>
          <div className="space-y-1.5">
            {assessment.parts.map((part, index) => (
              <div key={part.id} className="surface px-[var(--card-px)] py-[var(--card-py)] text-sm">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
                  <span className="font-serif text-base leading-tight tracking-tight">{part.title}</span>
                  {part.pageFrom !== null && part.pageTo !== null && (
                    <span className="text-[11px] font-mono tabular-nums text-muted-foreground">pp. {part.pageFrom}–{part.pageTo}</span>
                  )}
                  {part.timeLimitMinutes && (
                    <span className="text-[11px] font-mono tabular-nums text-muted-foreground">{part.timeLimitMinutes} min</span>
                  )}
                </div>
                {part.instructions && (
                  <p className="mt-1 text-xs text-muted-foreground">{part.instructions}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <StartAttemptButton assessmentId={assessmentId} currentAttemptId={assessment.currentAttemptId} />

      {assessment.attempts.length > 0 && (
        <div className="space-y-2">
          <h2 className="label-caps text-azure-700">Attempt History · {assessment.attempts.length}</h2>
          <div className="space-y-1.5">
            {assessment.attempts.map((attempt) => {
              const isScored = attempt.status === "SCORED" && attempt.score !== null && attempt.scorePossible !== null
              const pct = isScored && attempt.scorePossible ? Math.round((attempt.score! / attempt.scorePossible) * 100) : null
              return (
                <Link
                  key={attempt.id}
                  href={`/dashboard/practice/attempts/${attempt.id}`}
                  className="group relative flex items-center justify-between gap-3 overflow-hidden rounded-[var(--radius)] border border-border/80 bg-card px-[var(--card-px)] py-[var(--card-py)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-azure-soft"
                >
                  <span
                    aria-hidden
                    className={`absolute inset-y-2 left-0 w-[3px] rounded-r-sm ${isScored ? "bg-[var(--success)]" : attempt.status === "IN_PROGRESS" ? "bg-azure-500" : "bg-zinc-300 dark:bg-zinc-700"}`}
                  />
                  <div className="min-w-0 pl-3 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={attempt.status} withDot />
                      {isScored && (
                        <span className="text-[12px] font-mono tabular-nums font-medium text-[var(--success)]">
                          {attempt.score}/{attempt.scorePossible}
                          {pct !== null && <span className="text-muted-foreground"> · {pct}%</span>}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-[11px] font-mono tabular-nums text-muted-foreground">
                      Started {formatMonthDay(attempt.startedAt)}
                      {attempt.submittedAt && ` · Submitted ${formatMonthDay(attempt.submittedAt)}`}
                    </p>
                  </div>
                  <IconArrowRight className="size-4 text-muted-foreground/60 transition-all duration-200 group-hover:text-foreground group-hover:translate-x-0.5" aria-hidden />
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
