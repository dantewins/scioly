import Link from "next/link"
import { IconAtom } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"

export default function Page() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-8 bg-background p-6 text-center">
      <div className="flex flex-col items-center gap-4">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <IconAtom className="size-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Science Olympiad
          </h1>
          <p className="max-w-sm text-muted-foreground">
            Club management platform for members, coaches, and administrators.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button asChild size="lg">
          <Link href="/login">Sign in</Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/apply">Apply to join</Link>
        </Button>
      </div>
    </div>
  )
}
