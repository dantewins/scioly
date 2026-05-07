// app/dashboard/hours/page.tsx
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { canView, canEdit, canCreate } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { getActiveSeason, getMemberSeason } from "@/lib/db"
import { PageHeader } from "@/components/ui/page-header"
import { AdminHoursView } from "./admin-hours-view"
import { MemberHoursView } from "./member-hours-view"


export default async function HoursPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  if (!canView(user.permissions, "hours")) redirect("/dashboard")

  const season = await getActiveSeason(user.clubId)
  const isAdmin = canEdit(user.permissions, "hours")

  if (isAdmin) {
    const [pendingEntries, categories] = season ? await Promise.all([
      prisma.hourEntry.findMany({
        where: { memberSeason: { seasonId: season.id, user: { clubId: user.clubId } }, status: "PENDING" },
        include: {
          memberSeason: {
            select: {
              id: true,
              user: { select: { id: true, firstName: true, lastName: true } },
            },
          },
          category: { select: { id: true, name: true } },
        },
        orderBy: { submittedAt: "asc" },
      }),
      prisma.hourCategory.findMany({
        where: { seasonId: season.id },
        include: { _count: { select: { hourEntries: true } } },
        orderBy: { name: "asc" },
      }),
    ]) : [[], []]

    return (
      <div className="layout-page">
        <PageHeader title="Hours" description={`${pendingEntries.length} pending review`} />
        <AdminHoursView
          pendingEntries={pendingEntries.map(e => ({
            ...e,
            totalHours: Number(e.totalHours),
            submittedAt: e.submittedAt.toISOString(),
          }))}
          categories={categories.map(c => ({
            ...c,
            requiredHours: c.requiredHours != null ? Number(c.requiredHours) : null,
          }))}
          canManageCategories={canEdit(user.permissions, "hours")}
        />
      </div>
    )
  }

  // Member view: own entries + submit form
  const ms = season ? await getMemberSeason(user.id, user.clubId) : null
  const [myEntries, categories] = ms && season ? await Promise.all([
    prisma.hourEntry.findMany({
      where: { memberSeasonId: ms.id },
      include: { category: { select: { id: true, name: true } } },
      orderBy: { submittedAt: "desc" },
    }),
    prisma.hourCategory.findMany({
      where: { seasonId: season.id },
      orderBy: { name: "asc" },
    }),
  ]) : [[], []]

  const totalApproved = myEntries
    .filter((e) => e.status === "APPROVED")
    .reduce((s, e) => s + Number(e.totalHours), 0)

  return (
    <div className="layout-page">
      <PageHeader title="My Hours" description={`${totalApproved.toFixed(1)} approved hours this season`} />
      <MemberHoursView
        entries={myEntries.map(e => ({
          ...e,
          totalHours: Number(e.totalHours),
          submittedAt: e.submittedAt.toISOString(),
        }))}
        categories={categories}
        canSubmit={canCreate(user.permissions, "hours")}
      />
    </div>
  )
}
