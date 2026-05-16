import { redirect } from "next/navigation"
import { IconCheck, IconClock, IconX } from "@tabler/icons-react"
import { getCurrentUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { SectionCard } from "@/components/ui/section-card"
import { StatusBadge } from "@/components/ui/status-badge"
import { PageHeader } from "@/components/ui/page-header"
import { EmptyState } from "@/components/empty-state"
import { formatDateOnly } from "@/lib/format"
import { WithdrawApplicationButton } from "@/features/applications/components/withdraw-application-button"

export const dynamic = "force-dynamic"

const STATUS_COPY: Record<string, { label: string; description: string; tone: "warning" | "success" | "danger" | "neutral" }> = {
  SUBMITTED: {
    label: "Under review",
    description: "Your application is in front of the admin team. We'll email you when there's a decision.",
    tone: "warning",
  },
  UNDER_REVIEW: {
    label: "Under review",
    description: "Your application is in front of the admin team. We'll email you when there's a decision.",
    tone: "warning",
  },
  APPROVED: {
    label: "Approved",
    description: "You're in! Check your inbox for the welcome email and set your password to get started.",
    tone: "success",
  },
  WAITLISTED: {
    label: "Waitlisted",
    description: "You're on the waitlist. If a spot opens up, we'll let you know.",
    tone: "neutral",
  },
  DENIED: {
    label: "Not accepted",
    description: "Unfortunately your application wasn't accepted this round.",
    tone: "danger",
  },
  WITHDRAWN: {
    label: "Withdrawn",
    description: "You withdrew this application. You're welcome to re-apply later.",
    tone: "neutral",
  },
  DRAFT: {
    label: "Draft",
    description: "Your application isn't submitted yet.",
    tone: "neutral",
  },
}

export default async function ApplicantPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  // Members + owners shouldn't land here — send them to the dashboard.
  if (user.role !== "APPLICANT") redirect("/dashboard")

  const application = await prisma.membershipApplication.findFirst({
    where: { userId: user.id, clubId: user.clubId },
    orderBy: { submittedAt: "desc" },
    select: {
      id: true,
      status: true,
      submittedAt: true,
      reviewedAt: true,
      decisionNotes: true,
      season: { select: { name: true, club: { select: { name: true } } } },
      eventChoices: {
        select: { event: { select: { name: true, code: true } } },
        orderBy: { preferenceRank: "asc" },
      },
    },
  })

  if (!application) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-2xl px-[var(--page-px)] py-[var(--page-py)]">
          <EmptyState
            icon={IconX}
            title="No application found"
            description="We couldn't find an application for your account."
            action={
              <form action="/api/auth/logout" method="POST">
                <Button type="submit" variant="outline">Sign out</Button>
              </form>
            }
          />
        </div>
      </div>
    )
  }

  const copy = STATUS_COPY[application.status] ?? STATUS_COPY.SUBMITTED
  const canWithdraw = application.status === "SUBMITTED" || application.status === "UNDER_REVIEW"
  const isPending = canWithdraw

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-[var(--page-px)] py-[var(--page-py)] space-y-4">
        <PageHeader
          title={`Hi ${user.firstName}`}
          kicker={application.season.club.name}
          description={`Your application to ${application.season.name}.`}
        >
          <form action="/api/auth/logout" method="POST">
            <Button type="submit" variant="ghost" size="sm">Sign out</Button>
          </form>
        </PageHeader>

        <SectionCard>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                {isPending ? <IconClock className="size-5 text-amber-600" /> :
                  application.status === "APPROVED" ? <IconCheck className="size-5 text-[var(--success)]" /> :
                  <IconX className="size-5 text-muted-foreground" />}
                <h2 className="font-serif text-xl leading-tight tracking-tight">{copy.label}</h2>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{copy.description}</p>
              {application.decisionNotes && (
                <p className="mt-3 rounded-md bg-muted/40 px-3 py-2 text-sm text-foreground/80">
                  {application.decisionNotes}
                </p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <StatusBadge status={application.status} tone={copy.tone} />
                {application.submittedAt && (
                  <span className="font-mono tabular-nums">
                    Submitted {formatDateOnly(new Date(application.submittedAt))}
                  </span>
                )}
                {application.reviewedAt && (
                  <span className="font-mono tabular-nums">
                    Reviewed {formatDateOnly(new Date(application.reviewedAt))}
                  </span>
                )}
              </div>
            </div>
          </div>
        </SectionCard>

        {application.eventChoices.length > 0 && (
          <SectionCard title="Your event preferences">
            <ul className="space-y-1.5">
              {application.eventChoices.map((c, i) => (
                <li key={c.event.code ?? c.event.name} className="flex items-center gap-2 text-sm">
                  <span className="text-xs font-mono tabular-nums text-muted-foreground w-6">
                    {i + 1}.
                  </span>
                  <span>{c.event.name}</span>
                  {c.event.code && (
                    <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                      {c.event.code}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </SectionCard>
        )}

        {canWithdraw && (
          <div className="flex justify-end">
            <WithdrawApplicationButton />
          </div>
        )}
      </div>
    </div>
  )
}
