// app/apply/[clubSlug]/page.tsx
import { notFound } from "next/navigation"
import { IconAtom } from "@tabler/icons-react"
import { ApplyForm } from "@/features/applications/components/apply-form"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

interface Props {
  params: Promise<{ clubSlug: string }>
}

export default async function ApplyPage({ params }: Props) {
  const { clubSlug } = await params

  const club = await prisma.club.findUnique({
    where: { slug: clubSlug },
    select: {
      id: true,
      name: true,
      schoolName: true,
    },
  })
  if (!club) notFound()

  const season = await prisma.season.findFirst({
    where: { clubId: club.id, isActive: true },
    select: {
      id: true,
      name: true,
      events: {
        select: { id: true, name: true, code: true, isTrialEvent: true, sortOrder: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  })

  return (
    <div className="min-h-screen bg-muted/20 py-[var(--page-py)] px-[var(--page-px)]">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="text-center space-y-1">
          <div className="flex justify-center">
            <IconAtom className="size-8 text-primary" strokeWidth={1.5} />
          </div>
          <h1 className="text-2xl font-semibold">{club.name}</h1>
          {club.schoolName && (
            <p className="text-sm text-muted-foreground">{club.schoolName}</p>
          )}
          {season && (
            <p className="text-sm text-muted-foreground">
              {season.name} Application
            </p>
          )}
        </div>

        {!season ? (
          <div className="rounded-[var(--radius)] border p-8 text-center text-sm text-muted-foreground">
            Applications are not currently open. Please check back later.
          </div>
        ) : season.events.length === 0 ? (
          <div className="rounded-[var(--radius)] border border-amber-200/60 bg-amber-50/40 p-6 text-center">
            <p className="text-sm font-medium text-amber-900">Almost ready</p>
            <p className="mt-1 text-sm text-amber-800/80">
              The club hasn&apos;t added events for this season yet. Check back in a day or two,
              or reach out to your club admin.
            </p>
          </div>
        ) : (
            <ApplyForm clubSlug={clubSlug} events={season.events} />
        )}
      </div>
    </div>
  )
}
