import Link from "next/link"
import { notFound } from "next/navigation"
import {
  IconArrowLeft,
  IconUser,
} from "@tabler/icons-react"

import { getCurrentUser } from "@/lib/auth"
import { getActiveSeason } from "@/lib/db"
import { prisma } from "@/lib/prisma"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { HoursTab } from "./hours-tab"
import { DuesTab } from "./dues-tab"
import { FormsTab } from "./forms-tab"
import { OverviewTab } from "./overview-tab"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function MemberDetailPage({ params }: PageProps) {
  const { id: userId } = await params

  const currentUser = await getCurrentUser()
  if (!currentUser) return null

  const activeSeason = await getActiveSeason(currentUser.clubId)
  if (!activeSeason) notFound()

  const memberSeason = await prisma.memberSeason.findFirst({
    where: { userId, seasonId: activeSeason.id },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          gradeLevel: true,
          phone: true,
          role: true,
        },
      },
      hourEntries: {
        include: {
          category: { select: { id: true, name: true } },
          approvedBy: { select: { firstName: true, lastName: true } },
        },
        orderBy: { submittedAt: "desc" },
      },
      invoices: {
        include: {
          payments: {
            include: {
              recordedBy: { select: { firstName: true, lastName: true } },
            },
            orderBy: { paidAt: "desc" },
          },
        },
        orderBy: { issuedAt: "desc" },
      },
      formSubmissions: {
        include: {
          formType: true,
          verifiedBy: { select: { firstName: true, lastName: true } },
        },
      },
      eventEnrollments: {
        include: { event: { select: { id: true, name: true } } },
        orderBy: { preferenceRank: "asc" },
      },
      teamAssignments: {
        include: {
          team: {
            select: {
              id: true,
              label: true,
              status: true,
              event: { select: { id: true, name: true } },
              competition: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  })

  if (!memberSeason) notFound()

  const [hourCategories, formTypes] = await Promise.all([
    prisma.hourCategory.findMany({
      where: { seasonId: activeSeason.id },
      orderBy: { name: "asc" },
    }),
    prisma.formType.findMany({
      where: { seasonId: activeSeason.id },
      orderBy: { createdAt: "asc" },
    }),
  ])

  const name = `${memberSeason.user.firstName} ${memberSeason.user.lastName}`.trim()

  // Summary stats
  const approvedHours = memberSeason.hourEntries
    .filter((e) => e.status === "APPROVED")
    .reduce((sum, e) => sum + Number(e.totalHours), 0)
  const requiredHours = memberSeason.expectedHours ? Number(memberSeason.expectedHours) : null

  const totalDue = memberSeason.invoices.reduce((sum, inv) => sum + inv.amountCents, 0)
  const totalPaid = memberSeason.invoices.reduce((sum, inv) => sum + inv.amountPaidCents, 0)

  const totalForms = formTypes.length
  const verifiedForms = memberSeason.formSubmissions.filter((s) => s.status === "VERIFIED").length

  return (
    <div className="flex flex-col gap-6 px-8 py-4 lg:px-12 md:py-6">
      {/* Back nav */}
      <div>
        <Link
          href="/dashboard/members"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <IconArrowLeft className="size-4" />
          Members
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <IconUser className="size-6 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">{name}</h1>
            <p className="text-sm text-muted-foreground">{memberSeason.user.email}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge status={memberSeason.membershipStatus} />
        </div>
      </div>

      {/* Summary badges */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border bg-card px-4 py-3 text-center">
          <p className="text-xs text-muted-foreground">Hours</p>
          <p className="text-lg font-bold tabular-nums">
            {approvedHours.toFixed(1)}
            {requiredHours != null && (
              <span className="text-sm font-normal text-muted-foreground"> / {requiredHours}</span>
            )}
          </p>
        </div>
        <div className="rounded-xl border bg-card px-4 py-3 text-center">
          <p className="text-xs text-muted-foreground">Dues</p>
          <p className="text-lg font-bold tabular-nums">
            ${(totalPaid / 100).toFixed(2)}
            {totalDue > 0 && (
              <span className="text-sm font-normal text-muted-foreground"> / ${(totalDue / 100).toFixed(2)}</span>
            )}
          </p>
        </div>
        <div className="rounded-xl border bg-card px-4 py-3 text-center">
          <p className="text-xs text-muted-foreground">Forms</p>
          <p className="text-lg font-bold tabular-nums">
            {verifiedForms}
            {totalForms > 0 && (
              <span className="text-sm font-normal text-muted-foreground"> / {totalForms}</span>
            )}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="hours">Hours</TabsTrigger>
          <TabsTrigger value="dues">Dues</TabsTrigger>
          <TabsTrigger value="forms">Forms</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <OverviewTab
            memberSeasonId={memberSeason.id}
            userId={userId}
            member={{
              name,
              email: memberSeason.user.email,
              phone: memberSeason.user.phone ?? null,
              gradeLevel: memberSeason.user.gradeLevel ?? null,
              shirtSize: memberSeason.shirtSize ?? null,
              canTravel: memberSeason.canTravel,
              isReturning: memberSeason.isReturning,
              membershipStatus: memberSeason.membershipStatus,
              joinedAt: memberSeason.joinedAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
              statusChangedAt: memberSeason.statusChangedAt
                ? memberSeason.statusChangedAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                : null,
              statusReason: memberSeason.statusReason ?? null,
            }}
            eventEnrollments={memberSeason.eventEnrollments.map(e => ({
              id: e.id,
              eventName: e.event.name,
              status: e.status,
              preferenceRank: e.preferenceRank ?? null,
              partnerPreference: e.partnerPreference,
              partnerNames: e.partnerNames ?? "",
            }))}
            teamAssignments={memberSeason.teamAssignments.map(t => ({
              id: t.id,
              teamLabel: t.team.label,
              eventName: t.team.event.name,
              role: t.role,
              competitionName: t.team.competition?.name ?? null,
              seatNumber: t.seatNumber ?? null,
            }))}
          />
        </TabsContent>

        <TabsContent value="hours" className="mt-4">
          <HoursTab
            memberSeasonId={memberSeason.id}
            hourEntries={memberSeason.hourEntries.map(e => ({
              ...e,
              totalHours: Number(e.totalHours),
              startsAt: e.startsAt?.toISOString() ?? null,
              endsAt: e.endsAt?.toISOString() ?? null,
              submittedAt: e.submittedAt.toISOString(),
              approvedAt: e.approvedAt?.toISOString() ?? null,
              createdAt: e.createdAt.toISOString(),
              updatedAt: e.updatedAt.toISOString(),
            }))}
            hourCategories={hourCategories.map(c => ({ id: c.id, name: c.name }))}
            expectedHours={requiredHours}
          />
        </TabsContent>

        <TabsContent value="dues" className="mt-4">
          <DuesTab
            memberSeasonId={memberSeason.id}
            invoices={memberSeason.invoices.map(inv => ({
              ...inv,
              issuedAt: inv.issuedAt.toISOString(),
              paidAt: inv.paidAt?.toISOString() ?? null,
              dueAt: inv.dueAt?.toISOString() ?? null,
              createdAt: inv.createdAt.toISOString(),
              updatedAt: inv.updatedAt.toISOString(),
              payments: inv.payments.map(p => ({
                ...p,
                paidAt: p.paidAt.toISOString(),
                createdAt: p.createdAt.toISOString(),
              })),
            }))}
          />
        </TabsContent>

        <TabsContent value="forms" className="mt-4">
          <FormsTab
            memberSeasonId={memberSeason.id}
            formTypes={formTypes.map(ft => ({
              ...ft,
              dueAt: ft.dueAt?.toISOString() ?? null,
              createdAt: ft.createdAt.toISOString(),
              updatedAt: ft.updatedAt.toISOString(),
            }))}
            submissions={memberSeason.formSubmissions.map(s => ({
              ...s,
              submittedAt: s.submittedAt?.toISOString() ?? null,
              verifiedAt: s.verifiedAt?.toISOString() ?? null,
              createdAt: s.createdAt.toISOString(),
              updatedAt: s.updatedAt.toISOString(),
              formType: {
                ...s.formType,
                dueAt: s.formType.dueAt?.toISOString() ?? null,
                createdAt: s.formType.createdAt.toISOString(),
                updatedAt: s.formType.updatedAt.toISOString(),
              },
            }))}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  if (status === "ACTIVE") {
    return (
      <Badge className="bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400">
        Active
      </Badge>
    )
  }
  if (status === "INACTIVE") return <Badge variant="secondary">Inactive</Badge>
  if (status === "ALUMNI") return <Badge variant="outline">Alumni</Badge>
  return <Badge variant="secondary">{status}</Badge>
}
