import { redirect } from "next/navigation"
import { IconUsers, IconUserCheck, IconClock, IconCalendarEvent } from "@tabler/icons-react"
import { getCurrentUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { MetricCard } from "@/components/ui/metric-card"
import { SectionCard } from "@/components/ui/section-card"
import { StatusBadge } from "@/components/ui/status-badge"
import { PageHeader } from "@/components/ui/page-header"
import { formatDateOnly } from "@/lib/format"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")

  const season = await prisma.season.findFirst({
    where: { clubId: user.clubId, isActive: true },
    select: { id: true, name: true },
    orderBy: { startsAt: "desc" },
  })

  const [memberCount, pendingCount, pendingHoursCount, upcomingEvents] = season
    ? await Promise.all([
        prisma.memberSeason.count({
          where: { seasonId: season.id, membershipStatus: "ACTIVE" },
        }),
        prisma.memberSeason.count({
          where: {
            seasonId: season.id,
            membershipStatus: "PENDING",
            user: { clubId: user.clubId, role: "APPLICANT" },
          },
        }),
        prisma.hourEntry.count({
          where: { memberSeason: { seasonId: season.id, user: { clubId: user.clubId } }, status: "PENDING" },
        }),
        prisma.clubEvent.findMany({
          where: {
            seasonId: season.id,
            startsAt: { gte: new Date() },
          },
          select: { id: true, name: true, type: true, startsAt: true, _count: { select: { attendance: true } } },
          orderBy: { startsAt: "asc" },
          take: 5,
        }),
      ])
    : [0, 0, 0, []]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dashboard"
        description={season ? `${season.name} · ${new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}` : "No active season"}
      />

      {/* Metrics row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Active Members" value={memberCount} icon={IconUsers} />
        <MetricCard label="Pending Applications" value={pendingCount} icon={IconUserCheck} />
        <MetricCard label="Hours Awaiting Review" value={pendingHoursCount} icon={IconClock} />
        <MetricCard label="Upcoming Events" value={upcomingEvents.length} icon={IconCalendarEvent} />
      </div>

      {/* Upcoming club events */}
      {upcomingEvents.length > 0 && (
        <SectionCard title="Upcoming Events" flush>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="h-9 px-3 text-left text-xs font-medium text-muted-foreground">Name</th>
                <th className="h-9 px-3 text-left text-xs font-medium text-muted-foreground">Type</th>
                <th className="h-9 px-3 text-left text-xs font-medium text-muted-foreground">Date</th>
                <th className="h-9 px-3 text-left text-xs font-medium text-muted-foreground">Attendance</th>
              </tr>
            </thead>
            <tbody>
              {upcomingEvents.map((e) => (
                <tr key={e.id} className="border-b border-border last:border-0" style={{ height: "var(--row-h)" }}>
                  <td className="px-3 align-middle font-medium text-foreground">{e.name}</td>
                  <td className="px-3 align-middle">
                    <StatusBadge status={e.type} />
                  </td>
                  <td className="px-3 align-middle text-muted-foreground tabular-nums">
                    {formatDateOnly(e.startsAt)}
                  </td>
                  <td className="px-3 align-middle text-muted-foreground tabular-nums">
                    {e._count.attendance}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionCard>
      )}

      {!season && (
        <SectionCard>
          <p className="text-sm text-muted-foreground text-center py-8">
            No active season. Go to{" "}
            <a href="/dashboard/settings" className="text-primary underline underline-offset-4">Settings</a>
            {" "}to create one.
          </p>
        </SectionCard>
      )}
    </div>
  )
}
