import { redirect } from "next/navigation"
import { IconUsers, IconUserCheck, IconClock, IconCalendarEvent, IconPinFilled, IconSpeakerphone } from "@tabler/icons-react"
import { getCurrentUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { MetricCard } from "@/components/ui/metric-card"
import { SectionCard } from "@/components/ui/section-card"
import { StatusBadge } from "@/components/ui/status-badge"
import { PageHeader } from "@/components/ui/page-header"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { formatDateCompact, formatMonthYear } from "@/lib/format"
import { canView, canEdit } from "@/lib/permissions"
import { AnnouncementComposer } from "@/features/announcements/components/announcement-composer"
import { loadMemberDashboard } from "@/features/dashboard/lib/load-member-dashboard"
import { MemberDashboard } from "@/features/dashboard/components/member-dashboard"


export default async function DashboardPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")

  // Members (anyone without admin-area visibility) get the personalized
  // dashboard. Owners and any role with admin-area visibility see the existing
  // admin overview.
  const isAdminViewer =
    user.role === "WEBSITE_OWNER" ||
    canView(user.permissions, "members") ||
    canView(user.permissions, "finances") ||
    canView(user.permissions, "roles")

  if (!isAdminViewer) {
    const data = await loadMemberDashboard(user)
    return <MemberDashboard user={user} data={data} />
  }

  const season = await prisma.season.findFirst({
    where: { clubId: user.clubId, isActive: true },
    select: { id: true, name: true },
    orderBy: { startsAt: "desc" },
  })

  const now = new Date()
  const [memberCount, pendingCount, pendingHoursCount, upcomingEvents, announcements] = season
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
        prisma.announcement.findMany({
          where: {
            seasonId: season.id,
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
            publishedAt: { not: null, lte: now },
          },
          select: { id: true, title: true, body: true, isPinned: true, publishedAt: true },
          orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }],
          take: 5,
        }),
      ])
    : [0, 0, 0, [], []]

  const canPostAnnouncements = canEdit(user.permissions, "club_settings")

  return (
    <div className="layout-page">
      <PageHeader
        title={`Welcome back, ${user.firstName}`}
        kicker={season ? `${season.name} · ${formatMonthYear(new Date())}` : "No active season"}
        description={season ? "Here's what's moving across the club today." : "Create a season in Settings to begin."}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Active Members"
          value={memberCount}
          icon={IconUsers}
          tone="brand"
          href="/dashboard/members"
        />
        <MetricCard
          label="Pending Applications"
          value={pendingCount}
          icon={IconUserCheck}
          tone={pendingCount > 0 ? "warning" : "neutral"}
          href="/dashboard/applications"
        />
        <MetricCard
          label="Hours Awaiting Review"
          value={pendingHoursCount}
          icon={IconClock}
          tone={pendingHoursCount > 0 ? "warning" : "neutral"}
          href="/dashboard/hours"
        />
        <MetricCard
          label="Upcoming Events"
          value={upcomingEvents.length}
          icon={IconCalendarEvent}
          tone="neutral"
          href="/dashboard/club-events"
        />
      </div>

      {(announcements.length > 0 || canPostAnnouncements) && (
        <SectionCard
          title="Announcements"
          action={canPostAnnouncements ? <AnnouncementComposer /> : undefined}
          flush
        >
          {announcements.length === 0 ? (
            <p className="text-sm text-muted-foreground py-3 px-[var(--card-px)]">
              No announcements yet. Post the first one for the season.
            </p>
          ) : (
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
          )}
        </SectionCard>
      )}

      {upcomingEvents.length > 0 && (
        <SectionCard title="Upcoming Events" flush>
          {/* Mobile card list */}
          <ul className="divide-y divide-border/60 md:hidden">
            {upcomingEvents.map((e) => (
              <li key={e.id} className="px-[var(--card-px)] py-3 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 truncate font-serif text-base leading-tight tracking-tight">{e.name}</p>
                  <StatusBadge status={e.type} tone="brand" />
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-mono tabular-nums text-muted-foreground">
                  <span>{formatDateCompact(e.startsAt)}</span>
                  <span>{e._count.attendance} attending</span>
                </div>
              </li>
            ))}
          </ul>
          {/* Desktop table */}
          <Table className="hidden md:table">
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Attendance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {upcomingEvents.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-serif text-base leading-tight tracking-tight">{e.name}</TableCell>
                  <TableCell>
                    <StatusBadge status={e.type} tone="brand" />
                  </TableCell>
                  <TableCell className="font-mono tabular-nums text-muted-foreground">
                    {formatDateCompact(e.startsAt)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                    {e._count.attendance}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </SectionCard>
      )}

      {!season && (
        <SectionCard>
          <p className="text-sm text-muted-foreground text-center py-8">
            No active season. Go to{" "}
            <a href="/dashboard/settings" className="text-azure-700 underline underline-offset-4">Settings</a>
            {" "}to create one.
          </p>
        </SectionCard>
      )}
    </div>
  )
}
