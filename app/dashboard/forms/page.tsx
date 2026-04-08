// app/dashboard/forms/page.tsx
import { redirect } from "next/navigation"
import { IconFileCheck } from "@tabler/icons-react"
import { getCurrentUser } from "@/lib/auth"
import { canView, canCreate, canEdit } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { getActiveSeason, getMemberSeason } from "@/lib/db"
import { PageHeader } from "@/components/ui/page-header"
import { EmptyState } from "@/components/empty-state"
import { AdminFormsView } from "./admin-forms-view"
import { MemberFormsView } from "./member-forms-view"


export default async function FormsPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  if (!canView(user.permissions, "forms")) redirect("/dashboard")

  const season = await getActiveSeason(user.clubId)
  const isAdmin = canEdit(user.permissions, "forms")

  if (isAdmin) {
    const formTypes = season ? await prisma.formType.findMany({
      where: { seasonId: season.id },
      include: {
        _count: { select: { submissions: true } },
        submissions: {
          where: { status: "SUBMITTED" },
          select: { id: true },
        },
      },
      orderBy: { name: "asc" },
    }) : []

    return (
      <div className="layout-page">
        <PageHeader title="Forms" description={`${formTypes.length} form type${formTypes.length !== 1 ? "s" : ""} this season`} />
        <AdminFormsView
          formTypes={formTypes.map(ft => ({
            ...ft,
            dueAt: ft.dueAt?.toISOString() ?? null,
          }))}
          canCreate={canEdit(user.permissions, "forms") || canCreate(user.permissions, "forms")}
        />
      </div>
    )
  }

  // Member view
  const ms = season ? await getMemberSeason(user.id, user.clubId) : null
  const formTypes = ms && season ? await prisma.formType.findMany({
    where: { seasonId: season.id },
    include: {
      submissions: {
        where: { memberSeasonId: ms.id },
        select: { id: true, status: true, submittedAt: true, fileUrl: true },
        take: 1,
      },
    },
    orderBy: { name: "asc" },
  }) : []

  const completed = formTypes.filter((f) => f.submissions[0]?.status === "VERIFIED").length

  return (
    <div className="layout-page">
      <PageHeader title="Forms" description={`${completed} / ${formTypes.length} completed`} />
      {formTypes.length === 0 ? (
        <EmptyState icon={IconFileCheck} title="No forms required" description="No forms have been assigned for this season." />
      ) : (
        <MemberFormsView
          formTypes={formTypes.map(ft => ({
            ...ft,
            dueAt: ft.dueAt?.toISOString() ?? null,
            submissions: ft.submissions.map(s => ({
              ...s,
              submittedAt: s.submittedAt?.toISOString() ?? null,
            })),
          }))}
        />
      )}
    </div>
  )
}
