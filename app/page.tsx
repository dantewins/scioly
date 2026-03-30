import Link from "next/link"
import { IconAtom, IconChevronRight, IconMicroscope, IconTrophy } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"

export default function Page() {
  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground selection:bg-primary/20">

      {/* Top Navigation Bar / Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 max-w-screen-2xl items-center px-4 md:px-8 mx-auto">
          <div className="flex items-center space-x-2">
            <IconAtom className="h-6 w-6 text-primary" />
            <span className="font-semibold text-lg tracking-tight text-foreground">Scioly</span>
          </div>
          <div className="flex flex-1 items-center justify-end space-x-4">
            <nav className="flex items-center space-x-4 text-sm font-medium">
              <Link href="/login" className="text-muted-foreground transition-colors hover:text-foreground">
                Log in
              </Link>
              <Button asChild size="sm" className="h-8 shadow-none transition-all hover:bg-primary/90 rounded-md">
                <Link href="/apply">Apply to Join</Link>
              </Button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center px-4 sm:px-6 lg:px-8 text-center pt-24 pb-16">
        <div className="flex flex-col items-center max-w-5xl mx-auto space-y-10">

          {/* Badge */}
          <Link href="/apply" className="inline-flex items-center rounded-full border border-border bg-secondary/50 px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary/80 hover:text-foreground">
            <span className="flex h-1.5 w-1.5 rounded-full bg-primary/80 mr-2"></span>
            Registration for the 2026 Season is now open <IconChevronRight className="ml-1 h-3 w-3" />
          </Link>

          {/* Hero Content */}
          <div className="space-y-6 max-w-3xl">
            <h1 className="text-5xl font-semibold tracking-tighter text-foreground sm:text-7xl md:text-8xl">
              Elevate your <br className="hidden sm:block" />
              Science Olympiad.
            </h1>
            <p className="mx-auto max-w-2xl text-[1.1rem] leading-normal text-muted-foreground sm:text-xl">
              The premier platform designed for members, coaches, and administrators to streamline club management, track performance, and achieve excellence.
            </p>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto pt-6">
            <Button asChild size="lg" className="h-12 px-8 text-sm shadow-none rounded-md transition-all hover:bg-primary/90">
              <Link href="/login">
                Get Started
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-12 px-8 text-sm rounded-md shadow-none bg-background border-border hover:bg-accent hover:text-accent-foreground transition-all">
              <Link href="/apply">Apply</Link>
            </Button>
          </div>

          {/* Feature highlights - Bento Grid style */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-24 w-full max-w-4xl mx-auto text-left">

            {/* Feature Card 1 */}
            <div className="flex flex-col space-y-4 p-8 rounded-xl border border-border bg-card hover:border-primary/50 transition-colors">
              <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-secondary text-foreground flex-shrink-0">
                <IconTrophy className="h-5 w-5" />
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-lg text-foreground tracking-tight">Earn Medals</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Track your progress throughout the entire season. Monitor your scores in every competition, analyze your performance relative to teammates, and ensure you're ready for state and national tournaments.
                </p>
              </div>
            </div>

            {/* Feature Card 2 */}
            <div className="flex flex-col space-y-4 p-8 rounded-xl border border-border bg-card hover:border-primary/50 transition-colors">
              <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-secondary text-foreground flex-shrink-0">
                <IconMicroscope className="h-5 w-5" />
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-lg text-foreground tracking-tight">Master Events</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Dive deep into everything from Anatomy to Wright Stuff. Access comprehensive resources, organize study materials by event, and collaborate seamlessly with your event partners.
                </p>
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto py-8 px-6 text-sm text-muted-foreground border-t border-border/40 bg-background">
        <div className="flex flex-col sm:flex-row justify-between items-center max-w-screen-2xl mx-auto">
          <div className="flex items-center space-x-2">
            <IconAtom className="h-4 w-4 text-muted-foreground" />
            <span>&copy; {new Date().getFullYear()} Scioly Management. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6 mt-4 sm:mt-0">
            <Link href="/terms" className="hover:text-foreground transition-colors">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              Privacy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
