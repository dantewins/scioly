import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { canView, canEdit, canCreate } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { getActiveSeason, getMemberSeason } from "@/lib/db"
import { PracticeManager } from "./practice-manager"
import { PracticeTestList } from "./practice-test-list"

export const dynamic = "force-dynamic"

export default async function PracticePage() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  if (!canView(user.permissions, "practice")) redirect("/dashboard")

  const season = await getActiveSeason(user.clubId)
  const isAdmin = canEdit(user.permissions, "practice")

  if (isAdmin) {
    const [tests, events] = season ? await Promise.all([
      prisma.practiceTest.findMany({
        where: { seasonId: season.id },
        include: {
          event: { select: { id: true, name: true } },
          answerKey: { select: { id: true } },
          _count: { select: { attempts: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.event.findMany({
        where: { seasonId: season.id },
        orderBy: { sortOrder: "asc" },
        select: { id: true, name: true },
      }),
    ]) : [[], []]

    return (
      <div className="flex flex-col gap-6 px-4 py-4 lg:px-6 md:py-6">
        <div>
          <h1 className="text-xl font-semibold">Practice Tests</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{tests.length} test{tests.length !== 1 ? "s" : ""} this season</p>
        </div>
        <PracticeManager
          initialTests={tests.map(t => ({
            ...t,
            createdAt: t.createdAt.toISOString(),
            updatedAt: t.updatedAt.toISOString(),
          }))}
          events={events}
          canCreate={canCreate(user.permissions, "practice")}
        />
      </div>
    )
  }

  // Member view
  const ms = season ? await getMemberSeason(user.id, user.clubId) : null
  const tests = ms && season ? await prisma.practiceTest.findMany({
    where: { seasonId: season.id, isActive: true },
    include: {
      event: { select: { id: true, name: true } },
      answerKey: { select: { id: true } },
      attempts: {
        where: { memberSeasonId: ms.id },
        orderBy: { startedAt: "desc" },
        take: 3,
        select: { id: true, score: true, startedAt: true, submittedAt: true },
      },
    },
    orderBy: { createdAt: "desc" },
  }) : []

  return (
    <div className="flex flex-col gap-6 px-4 py-4 lg:px-6 md:py-6">
      <div>
        <h1 className="text-xl font-semibold">Practice Tests</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{tests.length} available test{tests.length !== 1 ? "s" : ""}</p>
      </div>
      <PracticeTestList
        tests={tests.map(t => ({
          ...t,
          createdAt: t.createdAt.toISOString(),
          updatedAt: t.updatedAt.toISOString(),
          attempts: t.attempts.map(a => ({
            ...a,
            startedAt: a.startedAt.toISOString(),
            submittedAt: a.submittedAt?.toISOString() ?? null,
          })),
        }))}
      />
    </div>
  )
}
