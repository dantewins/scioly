import Link from "next/link"
import {
  IconClock, IconWallet, IconForms, IconTrophy, IconCalendarEvent,
  IconPinFilled, IconSpeakerphone, IconBolt, IconBook, IconChevronRight,
} from "@tabler/icons-react"
import { MetricCard } from "@/components/ui/metric-card"
import { SectionCard } from "@/components/ui/section-card"
import { PageHeader } from "@/components/ui/page-header"
import { StatusBadge } from "@/components/ui/status-badge"
import {
  formatDateCompact, formatMonthYear, formatRelativeDate, formatMonthDay,
} from "@/lib/format"
import { cn } from "@/lib/utils"
import type { CurrentUser } from "@/lib/auth"
import type { MemberDashboardData } from "@/features/dashboard/lib/load-member-dashboard"

function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("w-full overflow-hidden rounded-full bg-muted", className ?? "h-2")}>
      <div
        className="h-full bg-azure-500 transition-all"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  )
}

const CLUB_EVENT_TYPE_LABEL: Record<string, string> = {
  MEETING: "Meeting",
  WORKSHOP: "Workshop",
  STUDY: "Study",
  SOCIAL: "Social",
  FUNDRAISER: "Fundraiser",
  OTHER: "Other",
}

function scoreColor(pct: number): string {
  if (pct >= 80) return "text-[var(--success)]"
  if (pct >= 60) return "text-[var(--warning)]"
  return "text-[var(--danger)]"
}

export function MemberDashboard({
  user,
  data,
}: {
  user: CurrentUser
  data: MemberDashboardData
}) {
  const { season, hours, finances, forms, practice, upcomingCompetitions, upcomingClubEvents, announcements } = data
  const hoursPct = hours.expected && hours.expected > 0
    ? Math.min(100, Math.round((hours.approved / hours.expected) * 100))
    : null

  return (
    <div className="layout-page">
      <PageHeader
        title={`Welcome back, ${user.firstName}`}
        kicker={season ? `${season.name} · ${formatMonthYear(new Date())}` : "No active season"}
        description={
          season
            ? "Your hours, competitions, and practice — all in one place."
            : "Your admin hasn't started a season yet. Check back soon."
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Approved Hours"
          value={hours.approved.toFixed(1)}
          sub={
            hours.expected !== null
              ? `of ${hours.expected.toFixed(0)} required`
              : hours.pending > 0
                ? `+${hours.pending.toFixed(1)} pending`
                : undefined
          }
          icon={IconClock}
          tone={hoursPct !== null && hoursPct >= 100 ? "success" : hoursPct !== null && hoursPct >= 50 ? "brand" : "warning"}
          href="/dashboard/hours"
        />
        <MetricCard
          label="Outstanding Dues"
          value={`$${finances.outstandingDollars.toFixed(2)}`}
          sub={finances.openInvoiceCount > 0 ? `${finances.openInvoiceCount} invoice${finances.openInvoiceCount === 1 ? "" : "s"}` : "All paid"}
          icon={IconWallet}
          tone={finances.outstandingDollars > 0 ? "warning" : "success"}
          href="/dashboard/finances"
        />
        <MetricCard
          label="Required Forms"
          value={`${forms.completedRequiredCount}/${forms.totalRequiredCount}`}
          sub={
            forms.pendingRequiredCount > 0
              ? `${forms.pendingRequiredCount} pending`
              : forms.totalRequiredCount > 0 ? "All submitted" : "No forms required"
          }
          icon={IconForms}
          tone={forms.pendingRequiredCount > 0 ? "warning" : "success"}
          href="/dashboard/forms"
        />
        <MetricCard
          label="Upcoming Competitions"
          value={upcomingCompetitions.length}
          sub={upcomingCompetitions[0]?.startsAt ? formatRelativeDate(upcomingCompetitions[0].startsAt) ?? undefined : "None scheduled"}
          icon={IconTrophy}
          tone={upcomingCompetitions.length > 0 ? "brand" : "neutral"}
          href="/dashboard/competitions"
        />
      </div>

      {hoursPct !== null && (
        <SectionCard title="Hour Progress">
          <div className="space-y-2">
            <div className="flex items-baseline justify-between gap-3">
              <p className="font-mono tabular-nums text-2xl tracking-tight">
                {hours.approved.toFixed(1)}
                <span className="text-base text-muted-foreground"> / {hours.expected?.toFixed(0)}</span>
              </p>
              <p className="text-sm text-muted-foreground">{hoursPct}%{hours.remaining !== null && hours.remaining > 0 ? ` · ${hours.remaining.toFixed(1)} hours to go` : ""}</p>
            </div>
            <ProgressBar value={hoursPct} />
            {hours.pending > 0 && (
              <p className="text-xs text-muted-foreground">
                {hours.pending.toFixed(1)} more {hours.pending === 1 ? "hour" : "hours"} awaiting admin review
              </p>
            )}
          </div>
        </SectionCard>
      )}

      {announcements.length > 0 && (
        <SectionCard title="Announcements" flush>
          <ul className="divide-y divide-border/60">
            {announcements.map((a) => (
              <li key={a.id} className="px-[var(--card-px)] py-3 flex items-start gap-3">
                <span className="text-muted-foreground mt-0.5">
                  {a.isPinned ? <IconPinFilled className="size-4 text-azure-600" /> : <IconSpeakerphone className="size-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-serif text-base leading-tight tracking-tight">{a.title}</p>
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap mt-1">{a.body}</p>
                  {a.publishedAt && (
                    <p className="text-[11px] font-mono tabular-nums text-muted-foreground mt-1">{formatDateCompact(a.publishedAt)}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {upcomingCompetitions.length > 0 && (
        <SectionCard
          title="Your Competitions"
          action={
            <Link href="/dashboard/competitions" className="text-xs font-mono uppercase tracking-wider text-azure-700 hover:underline inline-flex items-center gap-0.5">
              All competitions <IconChevronRight className="size-3.5" />
            </Link>
          }
          flush
        >
          <ul className="divide-y divide-border/60">
            {upcomingCompetitions.map((c) => (
              <li key={c.assignmentId}>
                <Link
                  href={`/dashboard/competitions/${c.competitionId}`}
                  className="block px-[var(--card-px)] py-3 hover:bg-azure-50/60 transition-colors"
                >
                  <div className="flex items-baseline justify-between gap-3 mb-1">
                    <p className="font-serif text-base leading-tight tracking-tight truncate">{c.competitionName}</p>
                    <p className="text-xs font-mono tabular-nums text-muted-foreground shrink-0">
                      {c.startsAt ? formatRelativeDate(c.startsAt) : "TBD"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{c.eventName}</span>
                    {c.rosterLabel && <span>· {c.rosterLabel}</span>}
                    {c.division && <span>· Div {c.division}</span>}
                    {c.room && <span>· {c.room}</span>}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {practice.inProgress.length > 0 && (
          <SectionCard title="Continue Practice" flush>
            <ul className="divide-y divide-border/60">
              {practice.inProgress.map((a) => (
                <li key={a.attemptId}>
                  <Link
                    href={`/dashboard/practice/attempts/${a.attemptId}`}
                    className="block px-[var(--card-px)] py-3 hover:bg-azure-50/60 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <div className="min-w-0">
                        <p className="font-serif text-sm leading-tight tracking-tight truncate">{a.title}</p>
                        {a.eventName && <p className="text-xs text-muted-foreground mt-0.5">{a.eventName}</p>}
                      </div>
                      <span className="text-xs font-mono tabular-nums text-muted-foreground shrink-0">
                        {a.answeredCount}/{a.promptCount}
                      </span>
                    </div>
                    <ProgressBar value={a.progressPercent} className="h-1" />
                  </Link>
                </li>
              ))}
            </ul>
          </SectionCard>
        )}

        {practice.recommended.length > 0 && (
          <SectionCard title="Recommended for You" flush>
            <ul className="divide-y divide-border/60">
              {practice.recommended.map((a) => (
                <li key={a.id}>
                  <Link
                    href={`/dashboard/practice/${a.id}`}
                    className="block px-[var(--card-px)] py-3 hover:bg-azure-50/60 transition-colors flex items-center gap-3"
                  >
                    <IconBolt className="size-4 text-azure-600 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-serif text-sm leading-tight tracking-tight truncate">{a.title}</p>
                      {a.eventName && <p className="text-xs text-muted-foreground mt-0.5">{a.eventName}</p>}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </SectionCard>
        )}

        {practice.recentScored.length > 0 && (
          <SectionCard title="Recent Results" flush>
            <ul className="divide-y divide-border/60">
              {practice.recentScored.map((r) => {
                const pct = r.scorePossible && r.score !== null ? Math.round((r.score / r.scorePossible) * 100) : null
                return (
                  <li key={r.attemptId}>
                    <Link
                      href={`/dashboard/practice/attempts/${r.attemptId}`}
                      className="block px-[var(--card-px)] py-3 hover:bg-azure-50/60 transition-colors flex items-center gap-3"
                    >
                      <IconBook className="size-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-serif text-sm leading-tight tracking-tight truncate">{r.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{formatMonthDay(r.submittedAt)}</p>
                      </div>
                      {pct !== null ? (
                        <span className={`font-mono tabular-nums text-sm font-medium shrink-0 ${scoreColor(pct)}`}>
                          {pct}%
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground shrink-0">Submitted</span>
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </SectionCard>
        )}

        {upcomingClubEvents.length > 0 && (
          <SectionCard
            title="Upcoming Club Events"
            action={
              <Link href="/dashboard/club-events" className="text-xs font-mono uppercase tracking-wider text-azure-700 hover:underline inline-flex items-center gap-0.5">
                All events <IconChevronRight className="size-3.5" />
              </Link>
            }
            flush
          >
            <ul className="divide-y divide-border/60">
              {upcomingClubEvents.map((e) => (
                <li key={e.id} className="px-[var(--card-px)] py-3 flex items-start gap-3">
                  <IconCalendarEvent className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3 mb-0.5">
                      <p className="font-serif text-sm leading-tight tracking-tight truncate">{e.name}</p>
                      <p className="text-xs font-mono tabular-nums text-muted-foreground shrink-0">
                        {formatRelativeDate(e.startsAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <StatusBadge status={CLUB_EVENT_TYPE_LABEL[e.type] ?? e.type} tone="brand" />
                      {e.location && <span className="truncate">· {e.location}</span>}
                      {e.hoursValue > 0 && <span>· {e.hoursValue}h</span>}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </SectionCard>
        )}
      </div>

      {!season && (
        <SectionCard>
          <p className="text-sm text-muted-foreground text-center py-8">
            No active season. Your admin will create one and you&apos;ll see your dashboard fill in.
          </p>
        </SectionCard>
      )}
    </div>
  )
}

