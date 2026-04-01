"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import {
  IconAtom, IconMicroscope, IconTerminal2, IconTrophy,
  IconUsers, IconDatabase, IconLock, IconBolt,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { BlurText } from "@/components/effects/blur-text"

export default function Page() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640)
    check()
    window.addEventListener("resize", check, { passive: true })
    return () => window.removeEventListener("resize", check)
  }, [])

  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground selection:bg-primary/20 relative overflow-x-hidden">

      {/* Subtle grid pattern */}
      <div
        className="fixed inset-0 z-0 pointer-events-none opacity-[0.025] dark:opacity-[0.04]"
        style={{
          backgroundImage: `linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)`,
          backgroundSize: "32px 32px",
        }}
      />

      {/* ── Navigation ─────────────────────────────────────────────────────── */}
      <header
        className={`sticky top-0 z-50 w-full transition-all duration-300`}
      >
        <div className="container flex h-14 max-w-screen-xl items-center px-4 md:px-8 mx-auto">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-foreground text-background">
              <IconAtom className="h-4 w-4" />
            </div>
            <span className="font-semibold text-sm tracking-tight text-foreground">Scioly</span>
          </Link>
          <div className="flex flex-1 items-center justify-end gap-4">
            <Link
              href="/login"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Log in
            </Link>
            <Button
              asChild
              size="sm"
              className="h-8 px-4 text-xs rounded-md bg-foreground text-background hover:bg-foreground/90 font-medium shadow-none"
            >
              <Link href="/register">Apply to Join</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* ── Main ───────────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col items-center px-4 sm:px-6 lg:px-8 relative z-10">

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <section className="relative w-full flex flex-col items-center text-center pt-28 pb-32 md:pt-40 md:pb-44 max-w-screen-xl mx-auto overflow-hidden">
          {/* Badge */}
          <Link
            href="/register"
            className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-xs font-mono tracking-wider uppercase transition-all hover:bg-primary/10 hover:border-primary/40 mb-8 ring-1 ring-primary/10"
          >
            <span className="flex h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-foreground">Season 2026 Ready</span>
          </Link>

          {/* Headline */}
          <div className="max-w-4xl mx-auto mb-7">
            <BlurText
              text="The modern standard for Science Olympiad."
              delay={70}
              animateBy="words"
              direction="top"
              disabled={isMobile}
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tighter leading-[1.05] text-foreground justify-center"
            />
          </div>

          {/* Subheadline */}
          <p className="max-w-lg text-base sm:text-lg leading-relaxed text-muted-foreground mb-10">
            A platform built for Science Olympiad teams — handling rosters, event schedules, hours, and tournament logistics in one place.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              asChild
              size="lg"
              className="h-11 px-7 text-sm rounded-lg bg-foreground text-background hover:bg-foreground/90 font-semibold shadow-lg shadow-black/10"
            >
              <Link href="/login">Get Started</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="h-11 px-7 text-sm rounded-lg border-border/60 bg-background/60 hover:bg-muted font-semibold shadow-none"
            >
              <Link href="/register">Apply to Join</Link>
            </Button>
          </div>
        </section>

        {/* ── Bento grid ───────────────────────────────────────────────────── */}
        <section className="w-full max-w-5xl mx-auto pb-32">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-left">

            {/* Telemetry — lg:col-span-4 */}
            <div className="lg:col-span-4 flex flex-col p-6 rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm hover:border-primary/50 transition-colors duration-300 group relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-[0.06] group-hover:opacity-[0.10] transition-opacity">
                <IconMicroscope className="w-36 h-36" />
              </div>
              <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-primary mb-5">
                <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                Telemetry
              </div>
              <div className="space-y-3 z-10">
                <h3 className="text-xl font-semibold tracking-tight text-foreground">Advanced Event Telemetry</h3>
                <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
                  Visualize tournament scores in real-time. Identify weak events before Regionals with aggregate performance data.
                </p>
                <div className="mt-4 space-y-3 pt-5 border-t border-border/30">
                  {[
                    ["Anatomy & Physiology", 85],
                    ["Wright Stuff", 70],
                    ["Disease Detectives", 55],
                  ].map(([event, score]) => (
                    <div key={event} className="flex items-center justify-between text-sm font-mono gap-4">
                      <span className="text-muted-foreground truncate">{event}</span>
                      <div className="flex items-center gap-3 w-2/5 shrink-0">
                        <div className="h-1 flex-1 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary/80 rounded-full transition-all duration-1000"
                            style={{ width: `${score}%` }}
                          />
                        </div>
                        <span className="text-foreground font-semibold w-8 text-right">{score}pt</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* System log — lg:col-span-2 */}
            <div className="lg:col-span-2 flex flex-col p-6 rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm hover:border-primary/50 transition-colors duration-300">
              <div className="flex items-center justify-between mb-5 pb-4 border-b border-border/30">
                <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">System.Log</span>
                <IconTerminal2 className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="space-y-3 font-mono text-[11px] text-muted-foreground leading-relaxed">
                <div className="flex gap-2">
                  <span className="text-primary shrink-0">›</span>
                  <span className="text-foreground">POST /v1/roster</span>
                </div>
                <div className="flex gap-2">
                  <span className="opacity-40">#</span>
                  <span className="opacity-60">Assigning events…</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-foreground">Alice M.</span>
                  <span className="opacity-40">→</span>
                  <span className="text-primary">Forestry</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-foreground">Bob J.</span>
                  <span className="opacity-40">→</span>
                  <span className="text-primary">Microbes</span>
                </div>
                <div className="mt-3 text-foreground border-l-2 border-primary/60 pl-2.5 py-0.5">
                  Status: 200 OK
                </div>
              </div>
            </div>

            {/* Historical record — lg:col-span-3 */}
            <div className="lg:col-span-3 flex flex-col p-6 rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm hover:border-primary/50 transition-colors duration-300">
              <div className="flex items-center justify-between mb-4">
                <IconTrophy className="w-5 h-5 text-foreground" />
                <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground border border-border/60 px-2 py-1 rounded-md">Medals</span>
              </div>
              <div className="space-y-1.5 mb-5">
                <h3 className="text-base font-semibold tracking-tight text-foreground">Historical Record</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">Permanent ledger of all medals earned across competitive seasons and tournaments.</p>
              </div>
              <div className="flex gap-2 font-mono text-xs mt-auto flex-wrap">
                <div className="bg-muted/60 px-2.5 py-1.5 rounded-md flex items-center gap-2 border border-border/40 hover:bg-muted transition-colors">
                  <span className="w-1.5 h-1.5 rounded-full bg-foreground" />
                  MIT Inv. (1st)
                </div>
                <div className="bg-muted/60 px-2.5 py-1.5 rounded-md flex items-center gap-2 border border-border/40 hover:bg-muted transition-colors">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Regionals (3rd)
                </div>
              </div>
            </div>

            {/* Club directory — lg:col-span-3 */}
            <div className="lg:col-span-3 flex flex-col p-6 rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm hover:border-primary/50 transition-colors duration-300 relative overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <IconUsers className="w-5 h-5 text-foreground" />
                <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground border border-border/60 px-2 py-1 rounded-md">Directory</span>
              </div>
              <div className="space-y-1.5 mb-5 relative z-10">
                <h3 className="text-base font-semibold tracking-tight text-foreground">Club Directory Access</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">Manage members, assign roles, and review pending applications instantly.</p>
              </div>
              <div className="mt-auto pt-4 border-t border-border/30 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg border border-border bg-muted flex items-center justify-center">
                    <span className="text-xs font-mono font-semibold">JD</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium leading-none">John Doe</p>
                    <p className="text-xs font-mono text-primary mt-1">Captain</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* ── Infrastructure ───────────────────────────────────────────────── */}
        <section className="w-full max-w-5xl mx-auto pb-36">
          <div className="mb-12">
            <p className="text-xs font-mono uppercase tracking-widest text-primary/70 mb-3">Infrastructure</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-4">
              Built for the long haul.
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl leading-relaxed">
              Replace fragmented spreadsheets with a unified database strictly architected for Science Olympiad logistics.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                icon: <IconDatabase className="w-5 h-5" />,
                title: "Unified Schema",
                desc: "Track members, roles, competition scores, and attendance in one relational schema. No more broken VLOOKUPs.",
              },
              {
                icon: <IconLock className="w-5 h-5" />,
                title: "Role-Based Access",
                desc: "Delegate tasks securely. Coaches see everything, captains manage rosters, members track their own metrics.",
              },
              {
                icon: <IconBolt className="w-5 h-5" />,
                title: "High-Speed Workflows",
                desc: "Optimized for speed. Bulk-assign students to events without waiting on slow, bloated interfaces.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="flex flex-col p-6 rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm hover:border-primary/50 transition-colors duration-300"
              >
                <div className="w-9 h-9 rounded-lg border border-border/60 bg-muted flex items-center justify-center text-foreground mb-4">
                  {item.icon}
                </div>
                <h3 className="text-base font-semibold tracking-tight text-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Final CTA ────────────────────────────────────────────────────── */}
        <section className="w-full max-w-5xl mx-auto pb-24">
          <div className="relative rounded-2xl border border-border/60 bg-card overflow-hidden px-8 py-16 text-center flex flex-col items-center">
            {/* Subtle background glow */}
            <div
              className="pointer-events-none absolute inset-0 opacity-30"
              style={{
                background: "radial-gradient(ellipse 60% 50% at 50% 100%, oklch(0.55 0.18 254 / 0.2) 0%, transparent 100%)",
              }}
            />
            <p className="text-xs font-mono uppercase tracking-widest text-primary/70 mb-4 relative z-10">Ready?</p>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tighter text-foreground mb-5 relative z-10">
              Run your club, not spreadsheets.
            </h2>
            <p className="text-muted-foreground text-base sm:text-lg mb-8 max-w-sm relative z-10 leading-relaxed">
              Get your Science Olympiad team onto a platform built exactly for this.
            </p>
            <Button
              asChild
              size="lg"
              className="relative z-10 h-11 px-8 text-sm rounded-lg bg-foreground text-background hover:bg-foreground/90 font-semibold shadow-lg shadow-black/10"
            >
              <Link href="/register">Apply to Join</Link>
            </Button>
          </div>
        </section>

      </main>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <footer className="py-8 px-6 border-t border-border/40 bg-background z-10 relative">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 max-w-screen-xl mx-auto text-xs font-mono uppercase tracking-widest text-muted-foreground">
          <div className="flex items-center gap-2">
            <IconAtom className="h-4 w-4" />
            <span>&copy; {new Date().getFullYear()} Scioly</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
