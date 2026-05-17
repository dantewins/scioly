"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from "motion/react"
import {
  IconAtom, IconArrowRight, IconSun, IconMoon,
  IconCreditCard,
  IconDatabase, IconLock, IconBolt, IconClipboardList, IconCalendarEvent,
  IconSparklesFilled,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/AuthContext"

/* ─────────────────────────────────────────────────────────────
   FADE-IN WRAPPER
   Used to fade sections in on scroll-into-view.
───────────────────────────────────────────────────────────── */
function FadeIn({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{
        duration: reduce ? 0 : 0.65,
        delay: reduce ? 0 : delay,
        ease: [0.25, 0.1, 0.25, 1],
      }}
    >
      {children}
    </motion.div>
  )
}

/* ─────────────────────────────────────────────────────────────
   ANIMATED HERO BACKDROP
   Atomic orbital rings + drifting dot grid + radial glow.
   Ties to the IconAtom brand mark and adds movement to the hero.
───────────────────────────────────────────────────────────── */
function HeroBackdrop({ isDark }: { isDark: boolean }) {
  const reduce = useReducedMotion()

  // Concentric orbital rings — each carries an orbiting dot.
  const rings = [
    { size: 1100, dur: 42, dot: 6, delay: 0, opacity: 0.40 },
    { size: 820, dur: 32, dot: 5, delay: 0.6, opacity: 0.50 },
    { size: 560, dur: 24, dot: 4, delay: 1.2, opacity: 0.65 },
    { size: 320, dur: 18, dot: 3, delay: 1.8, opacity: 0.80 },
  ]

  const ringStroke = isDark ? "oklch(0.65 0.18 254 / 0.18)" : "oklch(0.55 0.18 254 / 0.16)"
  const dotColor = isDark ? "oklch(0.78 0.16 254)" : "oklch(0.55 0.18 254)"
  const dotGlow = isDark ? "oklch(0.78 0.16 254 / 0.7)" : "oklch(0.55 0.18 254 / 0.55)"

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* dotted grid */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(${isDark ? "rgba(237,237,245,0.08)" : "rgba(10,10,15,0.10)"} 1px, transparent 1px)`,
          backgroundSize: "28px 28px",
          maskImage: "radial-gradient(ellipse 60% 60% at 50% 35%, black 30%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse 60% 60% at 50% 35%, black 30%, transparent 75%)",
        }}
      />

      {/* radial blue glow */}
      <div
        className="absolute left-1/2 top-0 -translate-x-1/2"
        style={{
          width: 1100,
          height: 600,
          background: isDark
            ? "radial-gradient(ellipse 60% 60% at 50% 0%, rgba(75,141,248,0.22) 0%, transparent 70%)"
            : "radial-gradient(ellipse 60% 60% at 50% 0%, rgba(75,141,248,0.16) 0%, transparent 70%)",
        }}
      />

      {/* orbital rings */}
      <div className="absolute left-1/2 top-[44%] -translate-x-1/2 -translate-y-1/2">
        {rings.map((r, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: r.size,
              height: r.size,
              left: -r.size / 2,
              top: -r.size / 2,
              border: `1px dashed ${ringStroke}`,
              opacity: r.opacity,
            }}
            animate={reduce ? undefined : { rotate: i % 2 === 0 ? 360 : -360 }}
            transition={reduce ? undefined : {
              duration: r.dur,
              ease: "linear",
              repeat: Infinity,
              delay: r.delay,
            }}
          >
            <div
              className="absolute left-1/2 -translate-x-1/2 rounded-full"
              style={{
                top: -r.dot / 2,
                width: r.dot,
                height: r.dot,
                background: dotColor,
                boxShadow: `0 0 14px 2px ${dotGlow}`,
              }}
            />
            {i >= 2 && (
              <div
                className="absolute left-1/2 -translate-x-1/2 rounded-full"
                style={{
                  bottom: -r.dot / 2,
                  width: r.dot,
                  height: r.dot,
                  background: dotColor,
                  opacity: 0.5,
                  boxShadow: `0 0 10px 1px ${dotGlow}`,
                }}
              />
            )}
          </motion.div>
        ))}
      </div>

    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   STATUS BADGES (mock dashboard)
───────────────────────────────────────────────────────────── */
function Tag({ tone, children }: { tone: "g" | "a" | "r" | "b" | "n"; children: React.ReactNode }) {
  const tones: Record<string, string> = {
    g: "text-emerald-500 bg-emerald-500/10 border-emerald-500/25",
    a: "text-amber-500 bg-amber-500/10 border-amber-500/25",
    r: "text-rose-500 bg-rose-500/10 border-rose-500/25",
    b: "text-[var(--brand)] bg-[var(--brand)]/10 border-[var(--brand)]/25",
    n: "text-muted-foreground bg-muted/40 border-border",
  }
  return (
    <span
      className={`inline-flex items-center font-mono text-[9px] font-normal uppercase tracking-[0.04em] px-1.5 h-3.5 rounded-[3px] border ${tones[tone]} leading-none`}
    >
      {children}
    </span>
  )
}

function Av({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center justify-center w-4 h-4 rounded-[3px] bg-muted border border-border font-mono text-[8px] text-muted-foreground align-middle mr-1.5">
      {children}
    </span>
  )
}

/* ─────────────────────────────────────────────────────────────
   THE LANDING PAGE
───────────────────────────────────────────────────────────── */
export default function Page() {
  const [isDark, setIsDark] = useState(true)
  const { user } = useAuth()
  const reduce = useReducedMotion()

  // Pointer-tracked 3D tilt for the dashboard preview.
  // Motion values are normalized to [-0.5, 0.5] from the element center,
  // then mapped to rotation via spring-smoothed transforms.
  const tiltX = useMotionValue(0)
  const tiltY = useMotionValue(0)
  const previewRotateY = useSpring(useTransform(tiltX, [-0.5, 0.5], [-7, 7]), { stiffness: 160, damping: 22 })
  const previewRotateX = useSpring(useTransform(tiltY, [-0.5, 0.5], [6, -6]), { stiffness: 160, damping: 22 })

  function handlePreviewMove(e: React.MouseEvent<HTMLDivElement>) {
    if (reduce) return
    const rect = e.currentTarget.getBoundingClientRect()
    tiltX.set((e.clientX - rect.left) / rect.width - 0.5)
    tiltY.set((e.clientY - rect.top) / rect.height - 0.5)
  }
  function handlePreviewLeave() {
    tiltX.set(0)
    tiltY.set(0)
  }

  return (
    <div
      className={`${isDark ? "dark" : ""} relative min-h-svh w-full overflow-x-hidden bg-background text-foreground selection:bg-[var(--brand)]/25`}
      style={{
        // Local accent token so children can reference it conveniently
        ["--brand" as string]: isDark ? "oklch(0.72 0.16 254)" : "oklch(0.55 0.18 254)",
      } as React.CSSProperties}
    >
      {/* ── HEADER ─────────────────────────────────────── */}
      <header className="fixed top-0 inset-x-0 z-50 h-14 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-full items-center px-[var(--page-px)]">
          <Link href="/" className="flex items-center gap-2 text-foreground">
            <div className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-[var(--brand)] text-white">
              <IconAtom className="h-4 w-4" strokeWidth={2.25} />
            </div>
            <span className="text-sm font-semibold tracking-tight">Scioly</span>
          </Link>

          <nav className="ml-auto flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsDark((d) => !d)}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              aria-label="Toggle theme"
            >
              {isDark ? <IconSun className="h-4 w-4" /> : <IconMoon className="h-4 w-4" />}
            </Button>
            <Button asChild size="sm" className="group h-8 rounded-md bg-foreground text-background hover:bg-foreground/90 font-semibold text-[13px] px-3.5 shadow-none">
              <Link href={user ? "/dashboard" : "/register"}>
                {user ? "Open app" : "Apply to join"}
                <IconArrowRight
                  className="h-3.5 w-3.5 transition-transform duration-500 ease-in-out group-hover:rotate-[360deg]"
                  strokeWidth={2.5}
                />
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* ── HERO ───────────────────────────────────────── */}
      <section className="relative pt-14">
        <HeroBackdrop isDark={isDark} />

        <div className="relative mx-auto flex max-w-4xl flex-col items-center px-[var(--page-px)] pt-24 pb-14 text-center">
          {/* Stronger announcement component (replaces pill) */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05, ease: [0.25, 0.1, 0.25, 1] }}
            className="mb-9"
          >
            <Link
              href="#features"
              className="group inline-flex items-stretch overflow-hidden rounded-full border border-border bg-card/70 backdrop-blur-md transition-[border-color,box-shadow,background-color] duration-700 ease-out hover:border-[var(--brand)]/50 hover:shadow-[0_0_40px_-6px_var(--brand)]"
            >
              <span
                className="flex items-center gap-1 bg-[var(--brand)] px-2 py-0.5 font-mono text-[9.5px] font-medium uppercase tracking-[0.1em] text-white"
              >
                <IconSparklesFilled className="h-2.5 w-2.5 text-white" />
                New
              </span>
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 text-[11.5px] font-medium text-foreground">
                <span className="hidden sm:inline">Season</span>
                <span className="text-muted-foreground">2026-2027</span>
                <span>tracking is live</span>
                <IconArrowRight
                  className="h-3 w-3 text-muted-foreground transition-transform duration-500 ease-in-out group-hover:rotate-[360deg] group-hover:text-[var(--brand)]"
                  strokeWidth={2.25}
                />
              </span>
            </Link>
          </motion.div>

          {/* Headline */}
          <motion.h1
            className="font-serif text-[clamp(3rem,7.5vw,5.5rem)] font-normal leading-[1.05] tracking-[-0.025em] text-foreground"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
          >
            The{" "}
            <motion.span
              className="font-serif inline-block italic"
              style={{
                backgroundImage: isDark
                  ? "linear-gradient(110deg, #2d6bbf 0%, #4a90e2 25%, #8dc0f8 46%, #ffffff 50%, #8dc0f8 54%, #4a90e2 75%, #2d6bbf 100%)"
                  : "linear-gradient(110deg, #1d4ed8 0%, #3b82f6 25%, #93c5fd 46%, #dbeafe 50%, #93c5fd 54%, #3b82f6 75%, #1d4ed8 100%)",
                backgroundSize: "400px 100%",
                backgroundRepeat: "repeat",
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                color: "transparent",
                filter: isDark
                  ? "drop-shadow(0 0 28px rgba(74,144,226,0.55))"
                  : "drop-shadow(0 0 14px rgba(37,99,235,0.32))",
              }}
              animate={reduce ? undefined : { backgroundPosition: ["0px 50%", "-400px 50%"] }}
              transition={reduce ? undefined : { duration: 3, repeat: Infinity, ease: "linear" }}
            >
              diamond
            </motion.span>{" "}
            standard
            <br />
            for Scioly.
          </motion.h1>

          <motion.p
            className="mt-6 max-w-xl text-[clamp(0.975rem,1.6vw,1.125rem)] leading-[1.7] text-muted-foreground"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
          >
            One platform to replace every spreadsheet, group chat, and lost email.
            Applications, rosters, hours, dues, events, and competitions, unified.
          </motion.p>

          {/* CTA row */}
          <motion.div
            className="mt-9 flex flex-wrap justify-center gap-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.26, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <Button
              asChild
              size="lg"
              className="group h-11 rounded-md bg-foreground px-6 text-[14px] font-semibold text-background hover:bg-foreground/90 shadow-[0_2px_24px_-4px_rgba(0,0,0,0.4)]"
            >
              <Link href={user ? "/dashboard" : "/register"}>
                Get started free
                <IconArrowRight
                  className="h-4 w-4 transition-transform duration-500 ease-in-out group-hover:rotate-[360deg]"
                  strokeWidth={2.5}
                />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="h-11 rounded-md border-border bg-transparent px-5 text-[14px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Link href="#features">See how it works</Link>
            </Button>
          </motion.div>

          {/* Stat strip */}
          <motion.div
            className="mt-14 flex items-stretch overflow-hidden rounded-md border border-border bg-card/40 backdrop-blur-sm flex-wrap"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.34, ease: [0.25, 0.1, 0.25, 1] }}
          >
            {[
              ["15+", "Science events"],
              ["RBAC", "Role permissions"],
              ["Full", "Season tracking"],
              ["Free", "Always"],
            ].map(([val, lbl], i) => (
              <div
                key={lbl}
                className={`flex flex-col items-center gap-0.5 px-6 py-2.5 ${i < 3 ? "border-r border-border" : ""} max-[540px]:basis-1/2 max-[540px]:[&:not(:last-child)]:border-b max-[540px]:[&:nth-child(2n)]:border-r-0`}
              >
                <span className="font-mono text-[15px] font-medium tracking-tight text-foreground">{val}</span>
                <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground/80">{lbl}</span>
              </div>
            ))}
          </motion.div>
        </div>

        {/* DASHBOARD PREVIEW */}
        <div className="relative px-[var(--page-px)]">
          <div
            className="pointer-events-none absolute inset-x-[5%] inset-y-0"
            style={{
              background: "radial-gradient(ellipse 80% 50% at 50% 20%, rgba(75,141,248,0.12) 0%, transparent 70%)",
              filter: "blur(50px)",
            }}
          />
          <motion.div
            className="group relative mx-auto max-w-[1120px] overflow-hidden rounded-2xl border border-border/70 bg-card"
            style={{
              rotateX: previewRotateX,
              rotateY: previewRotateY,
              transformPerspective: 2000,
              boxShadow: isDark
                ? "0 40px 120px -30px rgba(0,0,0,0.55)"
                : "0 40px 120px -30px rgba(0,0,0,0.22)",
            }}
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.1, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            onMouseMove={handlePreviewMove}
            onMouseLeave={handlePreviewLeave}
          >
            <div
              className="absolute inset-x-0 top-0 z-50 h-px pointer-events-none"
              style={{ background: "linear-gradient(90deg, transparent 10%, rgba(255,255,255,0.18) 50%, transparent 90%)" }}
            />
            <div className="relative aspect-[1920/958]">
              <Image
                src={isDark ? "/showcase-dark.png" : "/showcase-light.png"}
                alt="Scioly dashboard preview"
                fill
                className="object-cover object-top"
                priority
                unoptimized
                sizes="(max-width: 768px) 100vw, (max-width: 1280px) 90vw, 1120px"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── FEATURE SECTIONS ──────────────────────────── */}
      <div id="features" className="relative mx-auto max-w-[1180px] px-[var(--page-px)]">
        <FadeIn>
          <SectionDivider label="Platform features" topGap />
        </FadeIn>

        {/* Telemetry */}
        <FadeIn>
          <FeatureRow
            eyebrow="Telemetry"
            title={<>Track every event,<em className="font-serif italic text-muted-foreground"> live.</em></>}
            desc="Aggregate performance data across tournaments. Identify weak events before Regionals with real-time score visualization across your whole roster."
            bullets={[
              "Per-event percentile rankings across tournaments",
              "Tournament-over-tournament trend lines",
              "Coach and captain annotation support",
            ]}
            card={<TelemetryCard />}
          />
        </FadeIn>

        {/* Roster */}
        <FadeIn>
          <FeatureRow
            flip
            eyebrow="Roster"
            title={<>Full control over <em className="font-serif italic text-muted-foreground">your roster.</em></>}
            desc="Manage members, assign roles, and review pending applications in seconds. Bulk-assign students to events without spreadsheet gymnastics."
            bullets={[
              "Role-based permissions for coaches, captains, and members",
              "One-click bulk event assignment with conflict detection",
              "Application review with approve, deny, and waitlist flows",
            ]}
            card={<RosterCard />}
          />
        </FadeIn>

        {/* History */}
        <FadeIn>
          <FeatureRow
            eyebrow="History"
            title={<>Every medal, <em className="font-serif italic text-muted-foreground">every season.</em></>}
            desc="A permanent record of every result across all competitive seasons. Never lose track of your team's achievements, from invitationals to State."
            bullets={[
              "Full tournament result history by season",
              "Per-event placement records and personal bests",
              "Exportable for college applications and club reports",
            ]}
            card={<HistoryCard />}
          />
        </FadeIn>

        <FadeIn>
          <SectionDivider label="Everything included" />
        </FadeIn>

        {/* 6-tile grid */}
        <FadeIn delay={0.05}>
          <div className="mb-[4.5rem] grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-border bg-border [&>div]:bg-card sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: IconDatabase, title: "Unified Schema", desc: "Members, roles, scores, and attendance in one relational schema. No more broken VLOOKUPs." },
              { icon: IconLock, title: "Role-Based Access", desc: "Coaches see everything. Captains manage rosters. Members track their own metrics." },
              { icon: IconBolt, title: "High-Speed Workflows", desc: "Bulk-assign students to events in seconds. No waiting on slow, bloated interfaces." },
              { icon: IconClipboardList, title: "Assessments", desc: "Upload, organize, and track completion of practice materials by event and member." },
              { icon: IconCalendarEvent, title: "Event Assignments", desc: "Assign members to events with conflict detection and automatic alternates." },
              { icon: IconCreditCard, title: "Dues and Invoices", desc: "Track member payments, send invoices, and manage club finances without a spreadsheet." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="group p-6 transition-colors hover:bg-muted/40">
                <div className="mb-3.5 flex h-7 w-7 items-center justify-center rounded-md border border-border bg-muted/40 text-muted-foreground transition-colors group-hover:border-[var(--brand)]/40 group-hover:text-[var(--brand)]">
                  <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                </div>
                <p className="mb-1.5 text-[13.5px] font-semibold text-foreground">{title}</p>
                <p className="text-[12.5px] leading-[1.62] text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </FadeIn>

        {/* CTA */}
        <FadeIn delay={0.05}>
          <div
            className="relative mb-[4.5rem] flex flex-col items-center overflow-hidden rounded-xl border border-border px-[var(--page-px)] py-[5.5rem] text-center"
          >
            <div
              className="pointer-events-none absolute inset-0"
              style={{ background: "radial-gradient(ellipse 55% 70% at 50% 100%, rgba(75,141,248,0.14) 0%, transparent 70%)" }}
            />
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.35]"
              style={{
                backgroundImage: `linear-gradient(to right, ${isDark ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.025)"} 1px, transparent 1px), linear-gradient(to bottom, ${isDark ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.025)"} 1px, transparent 1px)`,
                backgroundSize: "44px 44px",
                maskImage: "radial-gradient(ellipse 60% 80% at 50% 100%, black, transparent 70%)",
                WebkitMaskImage: "radial-gradient(ellipse 60% 80% at 50% 100%, black, transparent 70%)",
              }}
            />
            <span className="relative z-10 mb-5 font-mono text-[12px] uppercase tracking-[0.18em] text-[var(--brand)]">
              Ready?
            </span>
            <h2 className="relative z-10 mb-5 font-serif text-[clamp(2rem,4vw,3rem)] font-normal leading-[1.12] tracking-[-0.025em] text-foreground">
              Run your club,<br />not spreadsheets.
            </h2>
            <p className="relative z-10 mb-9 max-w-sm text-[15px] leading-[1.7] text-muted-foreground">
              Get your Science Olympiad team onto a platform built exactly for this.
            </p>
            <Button asChild size="lg" className="relative z-10 group h-11 rounded-md bg-foreground px-7 text-[14px] font-semibold text-background hover:bg-foreground/90">
              <Link href={user ? "/dashboard" : "/register"}>
                Start now, it&apos;s free
                <IconArrowRight
                  className="h-4 w-4 transition-transform duration-500 ease-in-out group-hover:rotate-[360deg]"
                  strokeWidth={2.5}
                />
              </Link>
            </Button>
          </div>
        </FadeIn>
      </div>

      {/* ── FOOTER ─────────────────────────────────────── */}
      <footer className="border-t border-border px-[var(--page-px)] py-7">
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-4 font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
          <div className="flex items-center gap-2">
            <IconAtom className="h-3.5 w-3.5" strokeWidth={2} />
            <span>&copy; {new Date().getFullYear()} Scioly</span>
          </div>
          <div className="flex gap-6">
            <Link href="/terms" className="transition-colors hover:text-foreground">Terms</Link>
            <Link href="/privacy" className="transition-colors hover:text-foreground">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   SECTION DIVIDER
───────────────────────────────────────────────────────────── */
function SectionDivider({ label, topGap = false }: { label: string; topGap?: boolean }) {
  return (
    <div className={`grid grid-cols-[1fr_auto_1fr] items-center gap-6 ${topGap ? "pt-16" : "pt-0"} pb-14`}>
      <span className="h-px bg-border" />
      <span className="whitespace-nowrap font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </span>
      <span className="h-px bg-border" />
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   FEATURE ROW
───────────────────────────────────────────────────────────── */
function FeatureRow({
  flip = false,
  eyebrow,
  title,
  desc,
  bullets,
  card,
}: {
  flip?: boolean
  eyebrow: string
  title: React.ReactNode
  desc: string
  bullets: string[]
  card: React.ReactNode
}) {
  return (
    <div className={`grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-20 pb-20`}>
      <div className={flip ? "lg:order-2" : ""}>
        <div className="mb-4 font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--brand)]">{eyebrow}</div>
        <h2 className="mb-4 font-serif text-[clamp(1.7rem,2.8vw,2.3rem)] font-normal leading-[1.15] tracking-[-0.02em] text-foreground">
          {title}
        </h2>
        <p className="max-w-md text-[15px] leading-[1.75] text-muted-foreground">{desc}</p>
        <ul className="mt-5 flex flex-col gap-2.5">
          {bullets.map((b) => (
            <li key={b} className="flex items-start gap-2.5 text-[13.5px] leading-[1.55] text-muted-foreground">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[var(--brand)]" />
              {b}
            </li>
          ))}
        </ul>
      </div>
      <div className={flip ? "lg:order-1" : ""}>
        {card}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   FEATURE CARDS
───────────────────────────────────────────────────────────── */
function FeatCardShell({ label, right, children }: { label: string; right: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-[10px] border border-border bg-card shadow-[0_24px_80px_rgba(0,0,0,0.18)]">
      <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5">
        <span className="font-mono text-[9.5px] uppercase tracking-[0.08em] text-muted-foreground">{label}</span>
        {right}
      </div>
      {children}
    </div>
  )
}

function EventBars({ rows }: { rows: [string, number][] }) {
  return (
    <>
      {rows.map(([name, score], i) => (
        <div
          key={name}
          className={`px-3.5 py-2 ${i < rows.length - 1 ? "border-b border-border" : ""}`}
        >
          <div className="mb-1.5 flex justify-between">
            <span className="text-[11px] font-medium text-foreground">{name}</span>
            <span className="font-mono text-[11px] font-medium text-[var(--brand)]">{score}</span>
          </div>
          <div className="h-[3px] overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-[var(--brand)]" style={{ width: `${score}%` }} />
          </div>
        </div>
      ))}
    </>
  )
}

function TelemetryCard() {
  return (
    <FeatCardShell label="Event Performance: Regionals 2026" right={<Tag tone="b">Live</Tag>}>
      <EventBars rows={[
        ["Anatomy & Physiology", 88],
        ["Forestry", 92],
        ["Wright Stuff", 71],
        ["Disease Detectives", 58],
        ["Microbe Mission", 79],
      ]} />
    </FeatCardShell>
  )
}

function RosterCard() {
  const rows: [string, string, string, "b" | "n" | "g"][] = [
    ["AM", "Alice M.", "Forestry", "b"],
    ["BJ", "Bob J.", "Microbe Mission", "n"],
    ["CS", "Carol S.", "Anatomy", "n"],
    ["DL", "David L.", "Wright Stuff", "n"],
    ["EP", "Eva P.", "Chem Lab", "g"],
  ]
  const labels: Record<string, string> = { b: "Captain", n: "Member", g: "Active" }
  return (
    <FeatCardShell label="Roster / Jefferson SciOly" right={<Tag tone="g">28 active</Tag>}>
      <table className="w-full border-collapse">
        <thead className="bg-muted/30">
          <tr>
            {["Member", "Event", "Role"].map((h) => (
              <th key={h} className="h-6 px-2.5 text-left font-mono text-[9px] font-normal uppercase tracking-[0.06em] text-muted-foreground">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(([initials, name, event, role], i) => (
            <tr key={name} className={i < rows.length - 1 ? "border-b border-border" : ""}>
              <td className="h-7 px-2.5 text-[11px] text-foreground">
                <Av>{initials}</Av>
                {name}
              </td>
              <td className="h-7 px-2.5 text-[11px] text-muted-foreground">{event}</td>
              <td className="h-7 px-2.5 text-[11px]">
                <Tag tone={role}>{role === "n" ? "Member" : labels[role]}</Tag>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </FeatCardShell>
  )
}

function HistoryCard() {
  const rows: [string, string, string, boolean][] = [
    ["MIT Invitational", "1st", "Oct 2025", true],
    ["Cornell Scioly", "2nd", "Nov 2025", false],
    ["Regionals", "3rd", "Feb 2026", false],
    ["State Championship", "5th", "Mar 2026", false],
  ]
  return (
    <FeatCardShell label="Season Results" right={<Tag tone="n">2025–2026</Tag>}>
      {rows.map(([name, place, date, hi], i) => (
        <div
          key={name}
          className={`grid grid-cols-[1fr_56px_72px] items-center px-3.5 ${i < rows.length - 1 ? "border-b border-border" : ""}`}
          style={{ height: 36 }}
        >
          <span className="text-[12px] font-medium text-foreground">{name}</span>
          <span className={`text-center font-mono text-[12px] font-semibold ${hi ? "text-[var(--brand)]" : "text-foreground"}`}>{place}</span>
          <span className="text-right font-mono text-[10px] text-muted-foreground">{date}</span>
        </div>
      ))}
    </FeatCardShell>
  )
}

