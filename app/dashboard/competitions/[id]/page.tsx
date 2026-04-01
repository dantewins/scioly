// app/dashboard/competitions/[id]/page.tsx
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { IconArrowLeft, IconCalendar, IconMapPin } from "@tabler/icons-react"
import { getCurrentUser } from "@/lib/auth"
import { canView, canEdit } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDateOnly } from "@/lib/format"

export const dynamic = "force-dynamic"

interface Props { params: Promise<{ id: string }> }

export default async function CompetitionDetailPage({ params }: Props) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  if (!canView(user.permissions, "competitions")) redirect("/dashboard")

  const competition = await prisma.competition.findFirst({
    where: { id, season: { clubId: user.clubId } },
    include: {
      teams: {
        include: {
          event: { select: { id: true, name: true, code: true } },
          assignments: {
            include: {
              memberSeason: {
                include: { user: { select: { id: true, firstName: true, lastName: true } } },
              },
            },
          },
        },
      },
      eventSchedules: {
        include: { event: { select: { id: true, name: true, code: true } } },
        orderBy: { timeSlot: "asc" },
      },
    },
  })
  if (!competition) notFound()

  const canManage = canEdit(user.permissions, "competitions")

  return (
    <div className="flex flex-col gap-6 px-4 py-4 lg:px-6 md:py-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/competitions"><IconArrowLeft className="size-4" /></Link>
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold truncate">{competition.name}</h1>
            <Badge variant="outline">{competition.type}</Badge>
            {competition.isPublished && <Badge variant="secondary">Published</Badge>}
          </div>
          <div className="flex items-center gap-4 mt-0.5 text-sm text-muted-foreground">
            {competition.location && (
              <span className="flex items-center gap-1"><IconMapPin className="size-3" />{competition.location}</span>
            )}
            <span className="flex items-center gap-1"><IconCalendar className="size-3" />{formatDateOnly(competition.startsAt)}</span>
          </div>
        </div>
      </div>

      <Tabs defaultValue="teams">
        <TabsList>
          <TabsTrigger value="teams">Teams ({competition.teams.length})</TabsTrigger>
          <TabsTrigger value="schedule">Schedule ({competition.eventSchedules.length})</TabsTrigger>
        </TabsList>

        {/* Teams Tab */}
        <TabsContent value="teams" className="mt-4 space-y-3">
          {competition.teams.length === 0 ? (
            <p className="text-sm text-muted-foreground">No teams for this competition yet.</p>
          ) : (
            competition.teams.map((team) => (
              <Card key={team.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    {team.label}
                    {team.event && (
                      <Badge variant="secondary" className="text-xs font-normal">
                        {team.event.name}
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-1">
                    {team.assignments.map((a) => (
                      <Badge key={a.id} variant="outline" className="text-xs font-normal">
                        {a.memberSeason.user.firstName} {a.memberSeason.user.lastName}
                        {a.role !== "MEMBER" && ` (${a.role})`}
                      </Badge>
                    ))}
                    {team.assignments.length === 0 && (
                      <span className="text-xs text-muted-foreground">No members assigned.</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
          {canManage && (
            <Link href={`/dashboard/teams?competition=${id}`}>
              <Button variant="outline" size="sm">Manage Teams</Button>
            </Link>
          )}
        </TabsContent>

        {/* Schedule Tab */}
        <TabsContent value="schedule" className="mt-4">
          {competition.eventSchedules.length === 0 ? (
            <p className="text-sm text-muted-foreground">No events scheduled yet.</p>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">Slot</th>
                    <th className="text-left px-4 py-2 font-medium">Event</th>
                    <th className="text-left px-4 py-2 font-medium">Label</th>
                  </tr>
                </thead>
                <tbody>
                  {competition.eventSchedules.map((s) => (
                    <tr key={s.id} className="border-t">
                      <td className="px-4 py-2 font-mono text-xs">{s.timeSlot}</td>
                      <td className="px-4 py-2">{s.event.name}</td>
                      <td className="px-4 py-2 text-muted-foreground">{s.slotLabel ?? "—"}</td>
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
