import Link from "next/link"
import { redirect } from "next/navigation"
import { IconSparkles } from "@tabler/icons-react"
import { getCurrentUser } from "@/lib/auth"
import { canView, canEdit, canCreate } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { getActiveSeason, getMemberSeason } from "@/lib/db"
import { PracticeManager } from "@/features/practice/components/practice-manager"
import { PracticeFeed } from "@/features/practice/components/practice-feed"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import {
  listPracticeAssessmentsForAdmin,
  getMemberPracticeFeed,
  type MemberPracticeFeed,
} from "@/lib/practice-assessments"


export default async function PracticePage() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  if (!canView(user.permissions, "practice")) redirect("/dashboard")

  const season = await getActiveSeason(user.clubId)
  const isAdmin = canEdit(user.permissions, "practice")

  if (isAdmin) {
    const [tests, events] = season ? await Promise.all([
      listPracticeAssessmentsForAdmin(season.id),
      prisma.event.findMany({
        where: { seasonId: season.id },
        orderBy: { sortOrder: "asc" },
        select: { id: true, name: true, code: true },
      }),
    ]) : [[], []]

    return (
      <div className="layout-page">
        <PageHeader
          title="Assessments"
          description={`${tests.length} assessment${tests.length !== 1 ? "s" : ""} this season`}
        />
        <PracticeManager
          initialTests={tests}
          events={events}
          canManage={canEdit(user.permissions, "practice")}
          canCreate={canEdit(user.permissions, "practice") || canCreate(user.permissions, "practice")}
        />
      </div>
    )
  }

  // Member view
  const ms = season ? await getMemberSeason(user.id, user.clubId) : null
  const emptyFeed: MemberPracticeFeed = { assessments: [], continueAttempts: [], recommendedAssessments: [], recentAttempts: [] }
  const feed = season ? await getMemberPracticeFeed(season.id, ms?.id ?? null) : emptyFeed

  return (
    <div className="layout-page">
      <PageHeader
        title="Assessments"
        description={`${feed.assessments.length} available assessment${feed.assessments.length !== 1 ? "s" : ""}`}
      >
        <Button asChild size="sm">
          <Link href="/dashboard/practice/generate">
            <IconSparkles className="size-4 mr-1.5" />
            Generate test
          </Link>
        </Button>
      </PageHeader>
      <PracticeFeed feed={feed} />
    </div>
  )
}
