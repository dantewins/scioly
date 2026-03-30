import Link from "next/link"
import { IconBook2 } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { getCurrentUser } from "@/lib/auth"
import { getActiveSeason } from "@/lib/db"

export default async function DashboardPage() {
  const user = await getCurrentUser()
  if (!user) return null

  // We can fetch data here still if we want, but it's an empty state
  const activeSeason = await getActiveSeason(user.clubId)

  return (
    <div className="flex flex-col gap-6 px-4 py-8 lg:px-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Dashboard</h1>
      </div>

      {/* Under Construction Empty State */}
      <div className="flex min-h-[400px] flex-col items-center justify-center rounded-xl border border-border bg-card mt-4">
        <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
          <h2 className="mt-6 text-xl font-semibold text-foreground">Under Construction</h2>
          <p className="mb-8 mt-2 text-sm text-muted-foreground leading-relaxed">
            The club dashboard overview is currently being redesigned to provide better insights and controls for your season.
          </p>
          <Button asChild className="rounded-md px-6">
            <Link href="/docs">
              <IconBook2 className="mr-2 h-4 w-4" />
              Go to docs
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
