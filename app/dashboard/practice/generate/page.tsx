import { redirect } from "next/navigation"
import { IconSparkles } from "@tabler/icons-react"
import { getCurrentUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getActiveSeason } from "@/lib/db"
import { PageHeader } from "@/components/ui/page-header"
import { EmptyState } from "@/components/empty-state"
import { GenerateTestForm } from "@/features/practice/components/generate-test-form"

export const dynamic = "force-dynamic"

export default async function GeneratePracticePage() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")

  const season = await getActiveSeason(user.clubId)
  if (!season) {
    return (
      <div className="layout-page">
        <PageHeader title="Generate practice test" description="Build a custom test from the question pool." />
        <EmptyState icon={IconSparkles} title="No active season" />
      </div>
    )
  }

  // Catalog all events that have at least one published assessment with prompts.
  const events = await prisma.event.findMany({
    where: {
      seasonId: season.id,
      assessments: {
        some: {
          isPublished: true,
          isArchived: false,
          prompts: { some: {} },
        },
      },
    },
    select: { id: true, name: true, code: true },
    orderBy: { sortOrder: "asc" },
  })

  // Collect every distinct subtopic across the prompt pool for typeahead chips.
  const promptsForTags = await prisma.assessmentPrompt.findMany({
    where: {
      assessment: { seasonId: season.id, isPublished: true, isArchived: false },
    },
    select: { subtopics: true },
  })
  const subtopicSet = new Set<string>()
  for (const row of promptsForTags) for (const tag of row.subtopics) subtopicSet.add(tag)
  const subtopics = [...subtopicSet].sort((a, b) => a.localeCompare(b))

  return (
    <div className="layout-page">
      <PageHeader
        title="Generate practice test"
        kicker={season.name}
        description="Pick filters and we'll build a custom test from your club's question pool."
      />
      {events.length === 0 ? (
        <EmptyState
          icon={IconSparkles}
          title="No questions available"
          description="Your admin hasn't published any practice assessments with questions yet."
        />
      ) : (
        <GenerateTestForm events={events} subtopics={subtopics} />
      )}
    </div>
  )
}
