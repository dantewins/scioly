// app/dashboard/members/[id]/page.tsx
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { IconArrowLeft } from "@tabler/icons-react"
import { getCurrentUser } from "@/lib/auth"
import { canView } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { getActiveSeason } from "@/lib/db"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card"
import { MemberEventsTable } from "@/components/tables/member-events-table"
import { MemberHoursTable } from "@/components/tables/member-hours-table"
import { MemberInvoicesTable } from "@/components/tables/member-invoices-table"
import { MemberFormsTable } from "@/components/tables/member-forms-table"
import { formatDateOnly } from "@/lib/format"


interface Props {
  params: Promise<{ id: string }>
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800",
  INACTIVE: "bg-yellow-100 text-yellow-800",
  ALUMNI: "bg-blue-100 text-blue-800",
  REMOVED: "bg-red-100 text-red-800",
  PENDING: "bg-gray-100 text-gray-800",
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
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/members"><IconArrowLeft className="size-4" /></Link>
        </Button>
        <div>
          <h1 className="text-xl font-semibold">
            {targetUser.firstName} {targetUser.lastName}
          </h1>
          <p className="text-sm text-muted-foreground">{targetUser.email}</p>
        </div>
        {ms && (
          <Badge className={STATUS_COLORS[ms.membershipStatus] ?? ""} variant="outline">
            {ms.membershipStatus}
          </Badge>
        )}
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

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Card>
              <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">Grade</CardTitle></CardHeader>
              <CardContent><p className="text-lg font-semibold">{targetUser.gradeLevel ?? "—"}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">Shirt Size</CardTitle></CardHeader>
              <CardContent><p className="text-lg font-semibold">{ms?.shirtSize ?? "—"}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">Approved Hours</CardTitle></CardHeader>
              <CardContent><p className="text-lg font-semibold">{totalApprovedHours.toFixed(1)}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">Roles</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1">
                  {ms?.roles.length
                    ? ms.roles.map((r) => <Badge key={r.clubRole.id} variant="secondary" className="text-xs">{r.clubRole.name}</Badge>)
                    : <span className="text-sm text-muted-foreground">None</span>
                  }
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-sm">Contact Info</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-muted-foreground">Email</span><p>{targetUser.email}</p></div>
              <div><span className="text-muted-foreground">Phone</span><p>{targetUser.phone ?? "—"}</p></div>
              <div><span className="text-muted-foreground">Graduation Year</span><p>{targetUser.graduationYear ?? "—"}</p></div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Events Tab */}
        <TabsContent value="events" className="mt-4">
          <MemberEventsTable enrollments={ms?.eventEnrollments ?? []} />
        </TabsContent>

        {/* Hours Tab */}
        <TabsContent value="hours" className="mt-4">
          <MemberHoursTable entries={ms?.hourEntries ?? []} />
        </TabsContent>

        {/* Dues Tab */}
        <TabsContent value="dues" className="mt-4">
          <MemberInvoicesTable invoices={ms?.invoices ?? []} />
        </TabsContent>

        {/* Forms Tab */}
        <TabsContent value="forms" className="mt-4">
          <MemberFormsTable submissions={ms?.formSubmissions ?? []} />
        </TabsContent>

        <TabsContent value="application" className="space-y-4 mt-4">
          {!applicationDetails ? (
            <Card>
              <CardContent className="pt-6 text-sm text-muted-foreground">
                No application details available for this member.
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Application Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Submitted</p>
                      <p className="text-sm font-medium">
                        {applicationDetails.submittedAt
                          ? formatDateOnly(new Date(applicationDetails.submittedAt))
                          : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Returning Member</p>
                      <p className="text-sm font-medium">
                        {applicationDetails.isReturning ? "Yes" : "No"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Can Travel</p>
                      <p className="text-sm font-medium">
                        {applicationDetails.canTravel ? "Yes" : "No"}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">Event Choices</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {applicationDetails.eventChoices.length ? (
                        applicationDetails.eventChoices.map((choice) => (
                          <Badge key={choice.event.id} variant="outline" className="text-xs">
                            {choice.event.code ?? choice.event.name}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">None provided</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {[
                ["Why Join", applicationDetails.whyJoin],
                ["Contribution Ideas", applicationDetails.contributionIdeas],
                ["Previous Events", applicationDetails.previousEvents],
                ["Science Classes", applicationDetails.scienceClasses],
                ["Math Classes", applicationDetails.mathClasses],
                ["Questions", applicationDetails.questions],
              ].map(([label, value]) => (
                <Card key={label}>
                  <CardHeader>
                    <CardTitle className="text-sm">{label}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm leading-6 text-foreground">
                    {value || <span className="text-muted-foreground">No response provided.</span>}
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
