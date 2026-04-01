// app/dashboard/members/page.tsx
import { redirect } from "next/navigation"
import { IconUsers } from "@tabler/icons-react"
import { getCurrentUser } from "@/lib/auth"
import { canView } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { getActiveSeason } from "@/lib/db"
import { PageHeader } from "@/components/page-header"
import { EmptyState } from "@/components/empty-state"
import { MembersTable } from "@/components/tables/members-table"

export const dynamic = "force-dynamic"

export default async function MembersPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  if (!canView(user.permissions, "members")) redirect("/dashboard")

  const season = await getActiveSeason(user.clubId)

  const members = season
    ? await prisma.memberSeason.findMany({
        where: {
          seasonId: season.id,
          membershipStatus: { notIn: ["PENDING"] },
          user: { clubId: user.clubId },
        },
        include: {
          user: {
            select: {
              id: true, firstName: true, lastName: true,
              email: true, gradeLevel: true, role: true,
            },
          },
          roles: { include: { clubRole: { select: { id: true, name: true } } } },
        },
        orderBy: [{ user: { lastName: "asc" } }, { user: { firstName: "asc" } }],
      })
    : []

  return (
    <div className="flex flex-col gap-6 px-4 py-4 lg:px-6 md:py-6">
      <PageHeader
        title="Members"
        description={`${members.length} member${members.length !== 1 ? "s" : ""} this season`}
      />

      {members.length === 0 ? (
        <EmptyState
          icon={IconUsers}
          title="No members yet"
          description="Approved applicants will appear here."
        />
      ) : (
        <MembersTable members={members} />
      )}
    </div>
  )
}
