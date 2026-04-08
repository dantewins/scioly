// app/dashboard/applications/page.tsx
import { redirect } from "next/navigation"
import { IconUserCheck } from "@tabler/icons-react"
import { getCurrentUser } from "@/lib/auth"
import { canEdit, canView } from "@/lib/permissions"
import { getActiveSeason } from "@/lib/db"
import { listPendingApplicants } from "@/lib/applications"
import { PageHeader } from "@/components/ui/page-header"
import { EmptyState } from "@/components/empty-state"
import { ApplicantsTable } from "@/components/tables/applicants-table"


export default async function ApplicationsPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  if (!canView(user.permissions, "members")) redirect("/dashboard")

  const season = await getActiveSeason(user.clubId)

  const applicants = season ? await listPendingApplicants(user.clubId, season.id) : []

  const canManage = user.role === "WEBSITE_OWNER" || canEdit(user.permissions, "members")

  return (
    <div className="layout-page">
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
        <ApplicantsTable
          initialApplicants={applicants}
          canManage={canManage}
        />
      )}
    </div>
  )
}
