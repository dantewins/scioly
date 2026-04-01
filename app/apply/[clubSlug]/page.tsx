// app/apply/[clubSlug]/page.tsx
import { notFound } from "next/navigation"
import { IconAtom } from "@tabler/icons-react"
import { ApplyForm } from "@/components/forms/apply-form"

export const dynamic = "force-dynamic"

interface Props {
  params: Promise<{ clubSlug: string }>
}

export default async function ApplyPage({ params }: Props) {
  const { clubSlug } = await params

  // Validate club exists server-side (for 404 on bad slugs)
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL}/api/public/club/${clubSlug}`,
    { cache: "no-store" },
  )
  if (!res.ok) notFound()

  const { club, season } = await res.json()

  return (
    <div className="min-h-screen bg-muted/20 py-10 px-4">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="text-center space-y-1">
          <div className="flex justify-center">
            <IconAtom className="size-8 text-primary" />
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
          <div className="rounded-lg border p-8 text-center text-muted-foreground text-sm">
            Applications are not currently open. Please check back later.
          </div>
        ) : (
          <ApplyForm
            clubSlug={clubSlug}
            events={season.events}
          />
        )}
      </div>
    </div>
  )
}
