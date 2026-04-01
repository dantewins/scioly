// app/dashboard/applications/page.tsx
import { redirect } from "next/navigation"
import { IconUserCheck } from "@tabler/icons-react"
import { getCurrentUser } from "@/lib/auth"
import { canView } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { getActiveSeason } from "@/lib/db"
import { PageHeader } from "@/components/page-header"
import { EmptyState } from "@/components/empty-state"
import { ApplicantsTable } from "@/components/tables/applicants-table"

export const dynamic = "force-dynamic"

export default async function ApplicationsPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  if (!canView(user.permissions, "members")) redirect("/dashboard")

  const season = await getActiveSeason(user.clubId)

  const applicants = season
    ? await prisma.memberSeason.findMany({
        where: {
          seasonId: season.id,
          membershipStatus: "PENDING",
          user: { clubId: user.clubId, role: "APPLICANT" },
        },
        include: {
          user: {
            select: {
              id: true, firstName: true, lastName: true,
              email: true, gradeLevel: true, phone: true,
            },
          },
          eventEnrollments: {
            include: { event: { select: { id: true, name: true, code: true } } },
          },
        },
        orderBy: { applicationSubmittedAt: "asc" },
      })
    : []

  const canManage = user.role === "WEBSITE_OWNER" || canView(user.permissions, "members")

  return (
    <div className="flex flex-col gap-6 px-4 py-4 lg:px-6 md:py-6">
      <PageHeader
        title="Applications"
        description={`${applicants.length} pending application${applicants.length !== 1 ? "s" : ""}`}
      />

      {applicants.length === 0 ? (
        <EmptyState
          icon={IconUserCheck}
          title="No pending applications"
          description="New applications will appear here when members apply."
        />
      ) : (
        <ApplicantsTable initialApplicants={applicants} canManage={canManage} />
      )}
    </div>
  )
}
