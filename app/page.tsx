import Link from "next/link"
import { IconAtom, IconMicroscope, IconTerminal2, IconTrophy, IconUsers, IconDatabase, IconLock, IconBolt } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"

export default function Page() {
  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground selection:bg-primary/20 relative">

      {/* Intricate Grid Background */}
      <div
        className="absolute inset-0 z-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
          maskImage: 'radial-gradient(ellipse 60% 60% at 50% 0%, black 20%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 60% 60% at 50% 0%, black 20%, transparent 100%)',
        }}
      />

      {/* Top Navigation Bar / Header */}
      <header className="top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 max-w-screen-2xl items-center px-4 md:px-8 mx-auto">
          <div className="flex items-center space-x-2">
            <IconAtom className="h-6 w-6" />
            <span className="font-semibold text-lg tracking-tight text-foreground">Scioly</span>
          </div>
          <div className="flex flex-1 items-center justify-end space-x-4">
            <nav className="flex items-center space-x-4 text-sm font-medium">
              <Link href="/login" className="text-muted-foreground transition-colors hover:text-foreground">
                Log in
              </Link>
              <Button asChild size="sm" className="h-8 shadow-none border border-border bg-card hover:bg-accent rounded-md text-foreground">
                <Link href="/apply">Apply to Join</Link>
              </Button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center px-4 sm:px-6 lg:px-8 text-center pt-24 pb-24 relative z-10">
        <div className="flex flex-col items-center max-w-5xl mx-auto space-y-10 w-full">

          {/* Badge */}
          <Link href="/apply" className="inline-flex items-center px-4 py-1.5 rounded-full border border-border/60 bg-muted/40 text-xs font-mono tracking-wider uppercase text-muted-foreground transition-all hover:bg-muted hover:border-border">
            <span className="flex h-1.5 w-1.5 rounded-full bg-primary mr-3"></span>
            Season 2026 Ready
          </Link>

          {/* Hero Content */}
          <div className="space-y-6 max-w-4xl mx-auto flex flex-col items-center">
            <h1 className="text-6xl md:text-7xl lg:text-[5.5rem] font-semibold tracking-tighter text-foreground leading-[1.0] font-sans">
              The modern standard for <span className="text-primary">Science</span> Olympiad.
            </h1>
            <p className="mx-auto max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl font-normal mt-3">
              A highly-structured platform engineered to process rosters, event schedules, and tournament statistics with absolute precision.
            </p>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto pt-3">
            <Button asChild size="lg" className="h-10 md:h-12 px-8 text-sm shadow-none rounded-lg border border-foreground bg-foreground text-background hover:bg-foreground/90 transition-none font-semibold">
              <Link href="/login">Initialize Setup</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-10 md:h-12 px-8 text-sm rounded-lg shadow-none bg-background border border-border hover:bg-muted transition-none text-foreground font-semibold">
              <Link href="/apply">Apply Access</Link>
            </Button>
          </div>

          {/* Active Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 pt-24 w-full max-w-5xl mx-auto text-left">

            {/* Bento Row 1: Large Performance Tracker (Spans 4 cols) */}
            <div className="md:col-span-4 flex flex-col p-6 border border-border bg-card group hover:border-primary/50 transition-colors relative overflow-hidden rounded-lg">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <IconMicroscope className="w-32 h-32" />
              </div>
              <div className="flex items-center space-x-2 text-xs font-mono uppercase tracking-widest text-primary mb-6">
                <span className="w-2 h-2 bg-primary"></span>
                <span>Telemetry</span>
              </div>
              <div className="space-y-4 z-10">
                <h3 className="text-2xl font-medium tracking-tight text-foreground">Advanced Event Telemetry</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Aggregate and visualize mock tournament scores in real-time. Uncover weak points in event categories before Regionals.
                </p>

                {/* Mock Chart / Data Structure */}
                <div className="mt-6 space-y-3 pt-6 border-t border-border/40">
                  {['Anatomy & Physiology', 'Wright Stuff', 'Disease Detectives'].map((event, i) => (
                    <div key={event} className="flex items-center justify-between text-sm font-mono">
                      <span className="text-muted-foreground">{event}</span>
                      <div className="flex items-center space-x-3 w-1/2">
                        <div className="h-1.5 flex-1 bg-muted overflow-hidden relative">
                          <div className="absolute top-0 left-0 bottom-0 bg-foreground transition-all duration-1000 ease-out" style={{ width: `${85 - i * 15}%` }}></div>
                        </div>
                        <span className="text-foreground font-semibold">{85 - i * 15}pt</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bento Row 1: Small Log (Spans 2 cols) */}
            <div className="md:col-span-2 flex flex-col p-6 border border-border bg-card hover:border-primary/50 rounded-lg">
              <div className="flex items-center justify-between mb-6 border-b border-border/40 pb-4">
                <span className="text-xs font-mono uppercase text-muted-foreground">System.Log</span>
                <IconTerminal2 className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="space-y-4 font-mono text-[11px] text-muted-foreground leading-relaxed break-all">
                <div className="flex space-x-2">
                  <span className="text-primary">{'>'}</span>
                  <span className="text-foreground">POST /v1/roster</span>
                </div>
                <div className="flex space-x-2">
                  <span className="opacity-50"># Assigning events...</span>
                </div>
                <div className="flex space-x-2">
                  <span className="text-foreground">Alice M.</span>
                  <span>{'->'}</span>
                  <span className="text-primary">Forestry</span>
                </div>
                <div className="flex space-x-2">
                  <span className="text-foreground">Bob J.</span>
                  <span>{'->'}</span>
                  <span className="text-primary">Microbes</span>
                </div>
                <div className="flex space-x-2 mt-4 text-foreground border-l-2 border-primary pl-2">
                  Status: 200 OK
                </div>
              </div>
            </div>

            {/* Bento Row 2: Achievements (Spans 3 cols) */}
            <div className="md:col-span-3 flex flex-col p-6 border border-border bg-card hover:border-primary/50 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <IconTrophy className="w-5 h-5 text-foreground" />
                <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground border border-border px-2 py-1">Medals</span>
              </div>
              <div className="space-y-2 mb-6">
                <h3 className="text-lg font-medium tracking-tight text-foreground">Historical Record</h3>
                <p className="text-sm text-muted-foreground">Permanent ledger of all medals earned across all competitive seasons and tournaments.</p>
              </div>
              <div className="flex gap-2 font-mono text-xs mt-auto flex-wrap">
                <div className="bg-muted px-2 py-1 flex items-center gap-2 border border-border/50 hover:bg-background transition-colors"><span className="w-1.5 h-1.5 rounded-full bg-foreground"></span> MIT Inv. (1st)</div>
                <div className="bg-muted px-2 py-1 flex items-center gap-2 border border-border/50 hover:bg-background transition-colors"><span className="w-1.5 h-1.5 rounded-full bg-primary"></span> Regionals (3rd)</div>
              </div>
            </div>

            {/* Bento Row 2: Members (Spans 3 cols) */}
            <div className="md:col-span-3 flex flex-col p-6 border border-border bg-card relative overflow-hidden hover:border-primary/50 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <IconUsers className="w-5 h-5 text-foreground" />
                <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground border border-border px-2 py-1">Directory</span>
              </div>
              <div className="space-y-2 mb-6 z-10 relative">
                <h3 className="text-lg font-medium tracking-tight text-foreground">Club Directory Access</h3>
                <p className="text-sm text-muted-foreground">Manage thousands of student members, assign roles, and review pending club applications instantly.</p>
              </div>
              <div className="mt-auto border-t border-border/40 pt-4 z-10 relative bg-card">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-none border border-border bg-muted flex items-center justify-center">
                    <span className="text-xs font-mono font-medium">JD</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium leading-none">John Doe</span>
                    <span className="text-xs font-mono text-muted-foreground mt-1 text-primary">Captain</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          <div className="w-full my-12 border-t border-border/40" />

          {/* New Section: Infrastructure Specs */}
          <div className="w-full max-w-5xl mx-auto text-left pt-8">
            <div className="mb-12">
              <span className="text-xs font-mono uppercase tracking-widest text-primary mb-2 block">Infrastructure</span>
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">Built for the long haul.</h2>
              <p className="text-muted-foreground mt-4 max-w-2xl text-lg">
                Stop managing your club with fragmented spreadsheets. Move to a persistent, unified database strictly architected for Science Olympiad logistics.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="flex flex-col space-y-3">
                <div className="w-10 h-10 border border-border bg-card flex items-center justify-center text-foreground mb-2">
                  <IconDatabase className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-medium tracking-tight text-foreground">Unified Schema</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Track members, roles, competition scores, and attendance in one relational schema. No more broken VLOOKUPs.
                </p>
              </div>
              <div className="flex flex-col space-y-3">
                <div className="w-10 h-10 border border-border bg-card flex items-center justify-center text-foreground mb-2">
                  <IconLock className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-medium tracking-tight text-foreground">Role-Based Access</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Delegate tasks securely. Coaches see everything, captains manage rosters, and members track their own personal study metrics.
                </p>
              </div>
              <div className="flex flex-col space-y-3">
                <div className="w-10 h-10 border border-border bg-card flex items-center justify-center text-foreground mb-2">
                  <IconBolt className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-medium tracking-tight text-foreground">High-Speed Workflows</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Optimized for speed. Quickly bulk-assign students to their events without waiting on slow, bloated interfaces.
                </p>
              </div>
            </div>
          </div>

          {/* New Section: Final CTA */}
          <div className="w-full pt-32 pb-16">
            <div className="bg-card border border-border p-12 text-center flex flex-col items-center">
              <h2 className="text-3xl md:text-5xl font-semibold tracking-tighter text-foreground mb-6">
                Ready to deploy?
              </h2>
              <p className="text-muted-foreground text-lg mb-6 max-w-md">
                Get your club running on the premier Science Olympiad management platform today.
              </p>
              <Button asChild size="lg" className="h-12 px-8 text-sm shadow-none rounded-lg border border-foreground bg-foreground text-background hover:bg-foreground/90 transition-all font-semibold uppercase tracking-wide">
                <Link href="/apply">Initialize Application</Link>
              </Button>
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto py-8 px-6 text-xs font-mono uppercase tracking-widest text-muted-foreground border-t border-border/40 bg-background z-10 relative">
        <div className="flex flex-col sm:flex-row justify-between items-center max-w-screen-2xl mx-auto">
          <div className="flex items-center space-x-2">
            <IconAtom className="h-4 w-4 text-muted-foreground" />
            <span>&copy; {new Date().getFullYear()} Scioly System</span>
          </div>
          <div className="flex items-center gap-8 mt-4 sm:mt-0">
            <Link href="/terms" className="hover:text-foreground transition-colors">
              [ Terms ]
            </Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              [ Privacy ]
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
