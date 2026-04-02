"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import {
  IconAtom, IconMicroscope, IconTerminal2, IconTrophy,
  IconUsers, IconDatabase, IconLock, IconBolt, IconArrowRight,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"

function useTypewriter(text: string, speed = 22, startDelay = 900) {
  const [displayed, setDisplayed] = useState("")
  const [done, setDone] = useState(false)

  useEffect(() => {
    let i = 0
    const timeout = setTimeout(() => {
      const interval = setInterval(() => {
        i++
        setDisplayed(text.slice(0, i))
        if (i >= text.length) {
          setDone(true)
          clearInterval(interval)
        }
      }, speed)
      return () => clearInterval(interval)
    }, startDelay)
    return () => clearTimeout(timeout)
  }, [text, speed, startDelay])

  return { displayed, done }
}

export default function Page() {
  const { displayed: subtitle, done: subtitleDone } = useTypewriter(
    "Replace fragmented spreadsheets. One platform for your entire Science Olympiad operation.",
  )

  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground selection:bg-primary/20 relative overflow-x-hidden">

      {/* Subtle grid */}
      <div
        className="fixed inset-0 z-0 pointer-events-none opacity-[0.025] dark:opacity-[0.04]"
        style={{
          backgroundImage: `linear-gradient(to right, currentColor 1px, transparent 1px),linear-gradient(to bottom, currentColor 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }}
      />

      {/* Hero glow */}
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[700px] z-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 70% 45% at 50% 0%, oklch(0.55 0.18 254 / 0.10) 0%, transparent 70%)",
        }}
      />

      {/* ── Navigation ── */}
      <header className="sticky top-0 z-50 w-full border-b border-border/50 backdrop-blur-md bg-background/75">
        <div className="container flex h-14 max-w-screen-xl items-center px-4 md:px-8 mx-auto">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-foreground text-background">
              <IconAtom className="h-4 w-4" />
            </div>
            <span className="font-semibold text-sm tracking-tight">Scioly</span>
          </Link>
          <div className="flex flex-1 items-center justify-end gap-5">
            <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Log in
            </Link>
            <Button asChild size="sm" className="h-8 px-4 text-xs rounded-md bg-foreground text-background hover:bg-foreground/90 font-medium shadow-none">
              <Link href="/register">Apply to Join</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col items-center px-4 sm:px-6 lg:px-8 relative z-10">

        {/* ── Hero ── */}
        <section className="relative w-full flex flex-col items-center text-center pt-24 pb-0 md:pt-36 max-w-screen-xl mx-auto">

          {/* Badge */}
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-primary/25 bg-primary/5 text-[11px] font-mono tracking-widest uppercase hover:bg-primary/10 transition-colors mb-9"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            Season 2026 Ready
          </Link>

          {/* Gradient serif headline */}
          <h1
            className="max-w-4xl mx-auto mb-7 text-5xl sm:text-6xl md:text-[5rem] lg:text-[6rem] leading-[1.0] tracking-tight"
            style={{
              fontFamily: "var(--font-display, var(--font-geist-sans))",
              backgroundImage: "linear-gradient(175deg, var(--foreground) 30%, oklch(0.55 0.18 254 / 0.70) 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
              fontWeight: 400,
            }}
          >
            The modern standard for Science Olympiad.
          </h1>

          {/* Typewriter subtitle */}
          <p className="max-w-md text-sm sm:text-base font-mono text-muted-foreground mb-10 min-h-[2.5rem] leading-relaxed">
            {subtitle}
            {!subtitleDone && (
              <span className="inline-block w-[2px] h-[1.1em] bg-primary ml-0.5 animate-pulse align-middle rounded-full" />
            )}
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 mb-16">
            <Button asChild size="lg" className="h-11 px-7 text-sm rounded-lg bg-foreground text-background hover:bg-foreground/90 font-semibold shadow-lg shadow-black/10 group">
              <Link href="/login">
                Get Started
                <IconArrowRight className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-11 px-7 text-sm rounded-lg border-border/60 bg-background/60 hover:bg-muted font-semibold shadow-none">
              <Link href="/register">Apply to Join</Link>
            </Button>
          </div>

          {/* Product mockup — no bottom border, bleeds into next section */}
          <div className="w-full max-w-4xl mx-auto rounded-t-2xl border border-b-0 border-border/60 bg-card overflow-hidden shadow-2xl shadow-black/[0.07] ring-1 ring-black/[0.04]">
            {/* Browser chrome */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50 bg-muted/30">
              <div className="flex gap-1.5 shrink-0">
                <div className="w-2.5 h-2.5 rounded-full bg-border/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-border/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-border/80" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="h-5 w-56 rounded bg-background border border-border/50 text-[10px] font-mono text-muted-foreground flex items-center px-2.5 gap-1.5">
                  <span className="text-primary/60">●</span>
                  app.scioly.io/dashboard
                </div>
              </div>
            </div>

            {/* App UI */}
            <div className="flex min-h-[300px] md:min-h-[340px] divide-x divide-border/40 text-left">
              {/* Sidebar */}
              <div className="w-44 shrink-0 p-4 bg-muted/20 hidden sm:block">
                <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mb-3">Navigation</p>
                {["Dashboard", "Roster", "Events", "Tournaments", "Medals"].map((item, i) => (
                  <div
                    key={item}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs mb-0.5 ${i === 0 ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground"}`}
                  >
                    {item}
                  </div>
                ))}
              </div>

              {/* Main content */}
              <div className="flex-1 p-4 md:p-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="text-sm font-semibold">Jefferson Science Olympiad</h3>
                    <p className="text-[11px] text-muted-foreground font-mono mt-0.5">B Division · Season 2025–26</p>
                  </div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-primary border border-primary/30 bg-primary/5 px-2 py-0.5 rounded">
                    Active
                  </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-3 mb-5">
                  {[["15", "Members"], ["23", "Events"], ["8", "Medals"]].map(([val, label]) => (
                    <div key={label} className="p-3 rounded-lg border border-border/50 bg-background/60">
                      <p className="text-lg font-bold font-mono">{val}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>

                {/* Event bars */}
                <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mb-3">Event Performance</p>
                <div className="space-y-2.5">
                  {[
                    ["Anatomy & Phys.", 88],
                    ["Forestry", 92],
                    ["Wright Stuff", 71],
                    ["Disease Detectives", 58],
                  ].map(([name, val]) => (
                    <div key={name} className="flex items-center gap-3">
                      <span className="text-muted-foreground font-mono w-36 shrink-0 truncate text-[11px]">{name}</span>
                      <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary/70 rounded-full" style={{ width: `${val}%` }} />
                      </div>
                      <span className="font-mono font-semibold text-[11px] w-6 text-right tabular-nums">{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Bento grid ── */}
        <section className="w-full max-w-5xl mx-auto pt-24 pb-32">
          <div className="mb-14 text-center">
            <p className="text-xs font-mono uppercase tracking-widest text-primary/70 mb-3">Platform</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">Everything your team needs.</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-left">

            {/* Telemetry */}
            <div className="lg:col-span-4 flex flex-col p-6 rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm hover:border-primary/40 transition-colors duration-300 group relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-[0.05] group-hover:opacity-[0.09] transition-opacity duration-500">
                <IconMicroscope className="w-36 h-36" />
              </div>
              <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-primary mb-5">
                <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                Telemetry
              </div>
              <div className="space-y-3 z-10">
                <h3 className="text-xl font-semibold tracking-tight">Advanced Event Telemetry</h3>
                <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
                  Visualize tournament scores in real-time. Identify weak events before Regionals with aggregate performance data.
                </p>
                <div className="mt-4 space-y-3 pt-5 border-t border-border/30">
                  {[["Anatomy & Physiology", 85], ["Wright Stuff", 70], ["Disease Detectives", 55]].map(([event, score]) => (
                    <div key={event} className="flex items-center justify-between text-sm font-mono gap-4">
                      <span className="text-muted-foreground truncate">{event}</span>
                      <div className="flex items-center gap-3 w-2/5 shrink-0">
                        <div className="h-1 flex-1 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary/80 rounded-full" style={{ width: `${score}%` }} />
                        </div>
                        <span className="text-foreground font-semibold w-8 text-right tabular-nums">{score}pt</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* System log */}
            <div className="lg:col-span-2 flex flex-col p-6 rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm hover:border-primary/40 transition-colors duration-300">
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

            {/* Historical record */}
            <div className="lg:col-span-3 flex flex-col p-6 rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm hover:border-primary/40 transition-colors duration-300">
              <div className="flex items-center justify-between mb-4">
                <IconTrophy className="w-5 h-5 text-foreground" />
                <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground border border-border/60 px-2 py-1 rounded-md">Medals</span>
              </div>
              <div className="space-y-1.5 mb-5">
                <h3 className="text-base font-semibold tracking-tight">Historical Record</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">Permanent ledger of all medals earned across competitive seasons and tournaments.</p>
              </div>
              <div className="flex gap-2 font-mono text-xs mt-auto flex-wrap">
                <div className="bg-muted/60 px-2.5 py-1.5 rounded-md flex items-center gap-2 border border-border/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-foreground" />
                  MIT Inv. (1st)
                </div>
                <div className="bg-muted/60 px-2.5 py-1.5 rounded-md flex items-center gap-2 border border-border/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Regionals (3rd)
                </div>
              </div>
            </div>

            {/* Club directory */}
            <div className="lg:col-span-3 flex flex-col p-6 rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm hover:border-primary/40 transition-colors duration-300 relative overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <IconUsers className="w-5 h-5 text-foreground" />
                <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground border border-border/60 px-2 py-1 rounded-md">Directory</span>
              </div>
              <div className="space-y-1.5 mb-5 relative z-10">
                <h3 className="text-base font-semibold tracking-tight">Club Directory Access</h3>
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

        {/* ── Infrastructure ── */}
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
              <div key={item.title} className="flex flex-col p-6 rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm hover:border-primary/40 transition-colors duration-300">
                <div className="w-9 h-9 rounded-lg border border-border/60 bg-muted flex items-center justify-center text-foreground mb-4">
                  {item.icon}
                </div>
                <h3 className="text-base font-semibold tracking-tight mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Final CTA ── */}
        <section className="w-full max-w-5xl mx-auto pb-24">
          <div className="relative rounded-2xl border border-border/60 bg-card overflow-hidden px-8 py-20 text-center flex flex-col items-center">
            <div
              className="pointer-events-none absolute inset-0 opacity-40"
              style={{
                background: "radial-gradient(ellipse 60% 50% at 50% 100%, oklch(0.55 0.18 254 / 0.15) 0%, transparent 100%)",
              }}
            />
            <p className="text-xs font-mono uppercase tracking-widest text-primary/70 mb-5 relative z-10">Ready?</p>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-5 relative z-10 leading-[1.1]">
              Run your club,<br />not spreadsheets.
            </h2>
            <p className="text-muted-foreground text-base sm:text-lg mb-9 max-w-sm relative z-10 leading-relaxed">
              Get your Science Olympiad team onto a platform built exactly for this.
            </p>
            <Button asChild size="lg" className="relative z-10 h-11 px-8 text-sm rounded-lg bg-foreground text-background hover:bg-foreground/90 font-semibold shadow-lg shadow-black/10 group">
              <Link href="/register">
                Apply to Join
                <IconArrowRight className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Button>
          </div>
        </section>

      </main>

      {/* ── Footer ── */}
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
