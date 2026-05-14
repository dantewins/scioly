// app/dashboard/members/[id]/page.tsx
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { getCurrentUser } from "@/lib/auth"
import { canView } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { getActiveSeason } from "@/lib/db"
import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "@/components/ui/status-badge"
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList,
  BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SectionCard } from "@/components/ui/section-card"
import { MetricCard } from "@/components/ui/metric-card"
import { MemberEventsTable } from "@/features/members/components/member-events-table"
import { MemberHoursTable } from "@/features/members/components/member-hours-table"
import { MemberInvoicesTable } from "@/features/members/components/member-invoices-table"
import { MemberFormsTable } from "@/features/members/components/member-forms-table"
import { formatDateOnly } from "@/lib/format"


interface Props {
  params: Promise<{ id: string }>
}

export default async function MemberDetailPage({ params }: Props) {
  const { id: targetUserId } = await params
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  if (!canView(user.permissions, "members")) redirect("/dashboard")

  const season = await getActiveSeason(user.clubId)

  const [targetUser, ms] = await Promise.all([
    prisma.user.findFirst({
      where: { id: targetUserId, clubId: user.clubId },
      select: {
        id: true, firstName: true, lastName: true, email: true,
        phone: true, gradeLevel: true, graduationYear: true,
        role: true,
      },
    }),
    season
      ? prisma.memberSeason.findUnique({
          where: { userId_seasonId: { userId: targetUserId, seasonId: season.id } },
          include: {
            roles: { include: { clubRole: { select: { id: true, name: true } } } },
            eventEnrollments: {
              include: { event: { select: { id: true, name: true, code: true } } },
              orderBy: { event: { sortOrder: "asc" } },
            },
            hourEntries: {
              select: { id: true, title: true, totalHours: true, status: true, submittedAt: true },
              orderBy: { submittedAt: "desc" },
            },
            invoices: {
              select: {
                id: true, title: true, amountCents: true, amountPaidCents: true,
                status: true, dueAt: true, issuedAt: true,
              },
              orderBy: { issuedAt: "desc" },
            },
            formSubmissions: {
              include: {
                formType: { select: { id: true, name: true, category: true } },
              },
              orderBy: { formType: { name: "asc" } },
            },
            application: {
              select: {
                submittedAt: true,
                isReturning: true,
                canTravel: true,
                whyJoin: true,
                contributionIdeas: true,
                previousEvents: true,
                scienceClasses: true,
                mathClasses: true,
                questions: true,
                eventChoices: {
                  orderBy: { preferenceRank: "asc" },
                  select: {
                    event: {
                      select: { id: true, name: true, code: true },
                    },
                  },
                },
              },
            },
          },
        })
      : null,
  ])

  if (!targetUser) notFound()

  const totalApprovedHours = ms?.hourEntries
    .filter((h) => h.status === "APPROVED")
    .reduce((sum, h) => sum + Number(h.totalHours), 0) ?? 0

  const applicationDetails = ms
    ? {
        submittedAt: ms.application?.submittedAt ?? ms.applicationSubmittedAt ?? null,
        isReturning: ms.application?.isReturning ?? ms.isReturning,
        canTravel: ms.application?.canTravel ?? ms.canTravel,
        whyJoin: ms.application?.whyJoin ?? ms.whyJoin ?? null,
        contributionIdeas: ms.application?.contributionIdeas ?? ms.contributionIdeas ?? null,
        previousEvents: ms.application?.previousEvents ?? ms.previousEvents ?? null,
        scienceClasses: ms.application?.scienceClasses ?? ms.scienceClasses ?? null,
        mathClasses: ms.application?.mathClasses ?? ms.mathClasses ?? null,
        questions: ms.application?.questions ?? ms.questions ?? null,
        eventChoices:
          ms.application?.eventChoices.length
            ? ms.application.eventChoices
            : ms.eventEnrollments.map((enrollment) => ({ event: enrollment.event })),
      }
    : null

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
              <Link href="/dashboard/members">Members</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{targetUser.firstName} {targetUser.lastName}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header — azure-tinted banner */}
      <div className="relative overflow-hidden rounded-[var(--radius)] border border-border/80 bg-azure-gradient">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full bg-azure-200/40 blur-3xl"
        />
        <div className="relative flex flex-wrap items-end gap-3 px-[var(--card-px)] py-[var(--card-py)] sm:px-5 sm:py-5">
          <div className="min-w-0 flex-1">
            <h1 className="font-serif text-2xl sm:text-3xl leading-tight tracking-tight break-words">
              {targetUser.firstName} {targetUser.lastName}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground break-all">{targetUser.email}</p>
          </div>
          {ms && (
            <div className="shrink-0">
              <StatusBadge status={ms.membershipStatus} withDot />
            </div>
          )}
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="hours">Hours</TabsTrigger>
          <TabsTrigger value="dues">Dues</TabsTrigger>
          <TabsTrigger value="forms">Forms</TabsTrigger>
          <TabsTrigger value="application">Application</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetricCard label="Grade" value={targetUser.gradeLevel ?? "—"} tone="brand" />
            <MetricCard label="Shirt Size" value={ms?.shirtSize ?? "—"} tone="neutral" />
            <MetricCard label="Approved Hours" value={totalApprovedHours.toFixed(1)} tone="success" />
            <div className="surface surface-pad">
              <p className="label-caps text-muted-foreground">Roles</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {ms?.roles.length
                  ? ms.roles.map((r) => (
                      <Badge key={r.clubRole.id} variant="tonal" className="text-xs">
                        {r.clubRole.name}
                      </Badge>
                    ))
                  : <span className="text-sm text-muted-foreground">None</span>
                }
              </div>
            </div>
          </div>

          <SectionCard title="Contact Info">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="label-caps text-muted-foreground">Email</dt>
                <dd className="mt-1 font-mono text-[13px]">{targetUser.email}</dd>
              </div>
              <div>
                <dt className="label-caps text-muted-foreground">Phone</dt>
                <dd className="mt-1 font-mono text-[13px]">{targetUser.phone ?? "—"}</dd>
              </div>
              <div>
                <dt className="label-caps text-muted-foreground">Graduation Year</dt>
                <dd className="mt-1 font-mono text-[13px] tabular-nums">{targetUser.graduationYear ?? "—"}</dd>
              </div>
            </dl>
          </SectionCard>
        </TabsContent>

        <TabsContent value="events" className="mt-4">
          <MemberEventsTable enrollments={ms?.eventEnrollments ?? []} />
        </TabsContent>

        <TabsContent value="hours" className="mt-4">
          <MemberHoursTable entries={ms?.hourEntries ?? []} />
        </TabsContent>

        <TabsContent value="dues" className="mt-4">
          <MemberInvoicesTable invoices={ms?.invoices ?? []} />
        </TabsContent>

        <TabsContent value="forms" className="mt-4">
          <MemberFormsTable submissions={ms?.formSubmissions ?? []} />
        </TabsContent>

        <TabsContent value="application" className="space-y-4 mt-4">
          {!applicationDetails ? (
            <SectionCard>
              <p className="text-sm text-muted-foreground">
                No application details available for this member.
              </p>
            </SectionCard>
          ) : (
            <>
              <SectionCard title="Application Summary">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <p className="label-caps text-muted-foreground">Submitted</p>
                    <p className="mt-1 font-mono text-[13px] tabular-nums">
                      {applicationDetails.submittedAt
                        ? formatDateOnly(new Date(applicationDetails.submittedAt))
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="label-caps text-muted-foreground">Returning Member</p>
                    <p className="mt-1 text-sm font-medium">
                      {applicationDetails.isReturning ? "Yes" : "No"}
                    </p>
                  </div>
                  <div>
                    <p className="label-caps text-muted-foreground">Can Travel</p>
                    <p className="mt-1 text-sm font-medium">
                      {applicationDetails.canTravel ? "Yes" : "No"}
                    </p>
                  </div>
                </div>

                <div className="mt-4">
                  <p className="label-caps text-muted-foreground">Event Choices</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {applicationDetails.eventChoices.length ? (
                      applicationDetails.eventChoices.map((choice) => (
                        <Badge key={choice.event.id} variant="tonal" className="text-xs">
                          {choice.event.code ?? choice.event.name}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">None provided</span>
                    )}
                  </div>
                </div>
              </SectionCard>

              {[
                ["Why Join", applicationDetails.whyJoin],
                ["Contribution Ideas", applicationDetails.contributionIdeas],
                ["Previous Events", applicationDetails.previousEvents],
                ["Science Classes", applicationDetails.scienceClasses],
                ["Math Classes", applicationDetails.mathClasses],
                ["Questions", applicationDetails.questions],
              ].map(([label, value]) => (
                <SectionCard key={label} title={label as string}>
                  <p className="text-sm leading-6 text-foreground whitespace-pre-line">
                    {value || <span className="text-muted-foreground">No response provided.</span>}
                  </p>
                </SectionCard>
              ))}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
