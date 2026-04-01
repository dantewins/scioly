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
import { formatDateOnly } from "@/lib/format"

export const dynamic = "force-dynamic"

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
          },
        })
      : null,
  ])

  if (!targetUser) notFound()

  const totalApprovedHours = ms?.hourEntries
    .filter((h) => h.status === "APPROVED")
    .reduce((sum, h) => sum + Number(h.totalHours), 0) ?? 0

  return (
    <div className="flex flex-col gap-6 px-4 py-4 lg:px-6 md:py-6">
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
          {!ms?.eventEnrollments.length ? (
            <p className="text-sm text-muted-foreground">No event enrollments.</p>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">Event</th>
                    <th className="text-left px-4 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {ms.eventEnrollments.map((e) => (
                    <tr key={e.id} className="border-t">
                      <td className="px-4 py-2">{e.event.name}</td>
                      <td className="px-4 py-2">
                        <Badge variant="outline">{e.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* Hours Tab */}
        <TabsContent value="hours" className="mt-4">
          {!ms?.hourEntries.length ? (
            <p className="text-sm text-muted-foreground">No hour entries.</p>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">Title</th>
                    <th className="text-left px-4 py-2 font-medium">Hours</th>
                    <th className="text-left px-4 py-2 font-medium">Status</th>
                    <th className="text-left px-4 py-2 font-medium">Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {ms.hourEntries.map((h) => (
                    <tr key={h.id} className="border-t">
                      <td className="px-4 py-2">{h.title}</td>
                      <td className="px-4 py-2">{Number(h.totalHours).toFixed(1)}</td>
                      <td className="px-4 py-2"><Badge variant="outline">{h.status}</Badge></td>
                      <td className="px-4 py-2 text-muted-foreground">{formatDateOnly(h.submittedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* Dues Tab */}
        <TabsContent value="dues" className="mt-4">
          {!ms?.invoices.length ? (
            <p className="text-sm text-muted-foreground">No invoices.</p>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">Invoice</th>
                    <th className="text-left px-4 py-2 font-medium">Amount</th>
                    <th className="text-left px-4 py-2 font-medium">Paid</th>
                    <th className="text-left px-4 py-2 font-medium">Status</th>
                    <th className="text-left px-4 py-2 font-medium">Due</th>
                  </tr>
                </thead>
                <tbody>
                  {ms.invoices.map((inv) => (
                    <tr key={inv.id} className="border-t">
                      <td className="px-4 py-2">{inv.title}</td>
                      <td className="px-4 py-2">${(inv.amountCents / 100).toFixed(2)}</td>
                      <td className="px-4 py-2">${(inv.amountPaidCents / 100).toFixed(2)}</td>
                      <td className="px-4 py-2"><Badge variant="outline">{inv.status}</Badge></td>
                      <td className="px-4 py-2 text-muted-foreground">{formatDateOnly(inv.dueAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* Forms Tab */}
        <TabsContent value="forms" className="mt-4">
          {!ms?.formSubmissions.length ? (
            <p className="text-sm text-muted-foreground">No form submissions.</p>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">Form</th>
                    <th className="text-left px-4 py-2 font-medium">Category</th>
                    <th className="text-left px-4 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {ms.formSubmissions.map((fs) => (
                    <tr key={fs.id} className="border-t">
                      <td className="px-4 py-2">{fs.formType.name}</td>
                      <td className="px-4 py-2 text-muted-foreground">{fs.formType.category}</td>
                      <td className="px-4 py-2"><Badge variant="outline">{fs.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
