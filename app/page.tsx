"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { motion, useReducedMotion } from "motion/react"
import {
  IconAtom, IconArrowRight, IconChartLine, IconUsers, IconHistory,
  IconDatabase, IconLock, IconBolt, IconClipboardList, IconCalendarEvent, IconClock,
  IconSun, IconMoon,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"

function FadeIn({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{
        duration: reduce ? 0 : 0.5,
        delay: reduce ? 0 : delay,
        ease: [0.25, 0.1, 0.25, 1],
      }}
    >
      {children}
    </motion.div>
  )
}

// SVG tracing border — stroke is drawn OUTSIDE the component bounds (overflow:visible)
// so it never overlaps with or gets covered by the card content
function TracingBorder({
  children,
  className = "",
  contentClassName = "",
  duration = 5,
  radius = 16,
}: {
  children: React.ReactNode
  className?: string
  contentClassName?: string
  duration?: number
  radius?: number
}) {
  const reduce = useReducedMotion()
  return (
    <div className={`relative ${className}`} style={{ borderRadius: `${radius}px` }}>
      {/* SVG draws its rect with x="-1" so the stroke bleeds 1px outside the div
          and 1px inside — but since overflow:visible is on the SVG (not the div),
          only the outer portion renders; the inner portion is behind the content z-layer */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        style={{ overflow: "visible" }}
        aria-hidden="true"
      >
        {/* Static dim ring */}
        <rect
          x="-1" y="-1"
          width="calc(100% + 2px)"
          height="calc(100% + 2px)"
          rx={radius + 1}
          fill="none"
          stroke="oklch(0.65 0.18 254 / 0.28)"
          strokeWidth="2"
        />
        {/* Animated bright sweep */}
        <motion.rect
          x="-1" y="-1"
          width="calc(100% + 2px)"
          height="calc(100% + 2px)"
          rx={radius + 1}
          fill="none"
          stroke="oklch(0.65 0.18 254)"
          strokeWidth="2"
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray="0.12 0.88"
          initial={{ strokeDashoffset: 0 }}
          animate={reduce ? undefined : { strokeDashoffset: -1 }}
          transition={
            reduce ? undefined : { duration, ease: "linear", repeat: Infinity }
          }
        />
      </svg>
      {/* Content is always above the SVG, never obscures the border */}
      <div className={`relative z-10 ${contentClassName}`} style={{ borderRadius: `${radius}px` }}>
        {children}
      </div>
    </div>
  )
}

const panelStyle = {
  boxShadow: "inset 0 0 0 1px oklch(0.65 0.18 254 / 0.1)",
} as React.CSSProperties

export default function Page() {
  const [isDark, setIsDark] = useState(false)

  return (
    <div
      className={`${isDark ? "dark" : ""} text-foreground min-h-svh flex flex-col overflow-x-hidden selection:bg-primary/20 relative`}
      style={isDark
        ? { backgroundColor: "oklch(0.10 0 0)" }
        : { backgroundColor: "white" }
      }
    >

      {/* ── Header ── */}
      <header className="sticky top-0 z-50 w-full border-b border-border/50 backdrop-blur-md bg-background/80">
        <div className="max-w-screen-xl mx-auto flex h-14 md:h-16 items-center px-4 md:px-10">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-md bg-foreground text-background flex items-center justify-center shrink-0">
              <IconAtom className="h-5 w-5" strokeWidth={2} />
            </div>
            <span className="font-semibold text-sm md:text-base tracking-tight">Scioly</span>
          </Link>
          <div className="flex flex-1 items-center justify-end gap-3 md:gap-5">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsDark((d) => !d)}
              className="h-8 w-8 md:h-9 md:w-9 text-muted-foreground hover:text-foreground"
              aria-label="Toggle theme"
            >
              {isDark ? <IconSun className="h-5 w-5" /> : <IconMoon className="!h-5 !w-5" />}
            </Button>
            <Button
              asChild
              size="sm"
              className="h-8 md:h-9 px-4 text-xs md:text-sm rounded-md bg-foreground text-background hover:bg-foreground/90 font-medium shadow-none"
            >
              <Link href="/register">Apply to Join</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col items-center relative z-10">

        {/* ── Hero ── */}
        <section className="relative w-full flex flex-col items-center text-center overflow-hidden pb-0">

          {/* Dot grid — scientific notebook feel */}
          <div
            className="absolute inset-0 pointer-events-none z-0"
            style={{
              backgroundImage: "radial-gradient(circle, oklch(0.55 0.18 254 / 0.07) 1.5px, transparent 1.5px)",
              backgroundSize: "28px 28px",
            }}
          />
          {/* Fade grid out toward the bottom and center */}
          <div
            className="absolute inset-0 pointer-events-none z-0"
            style={{
              background: "radial-gradient(ellipse 80% 65% at 50% 20%, var(--background) 25%, transparent 75%)",
            }}
          />
          <div
            className="absolute bottom-0 inset-x-0 h-1/2 pointer-events-none z-0"
            style={{ background: "linear-gradient(to bottom, transparent, var(--background))" }}
          />

          {/* Text block */}
          <div className="relative z-10 flex flex-col items-center pt-24 md:pt-32 pb-14 px-4 w-full max-w-4xl mx-auto">

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
              className="mb-8"
            >
              <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-[11px] font-mono tracking-[0.2em] text-primary uppercase">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                Season 2026 Ready
              </div>
            </motion.div>

            <motion.h1
              className="text-6xl md:text-7xl lg:text-[6rem] tracking-tighter leading-[1.1] text-foreground mb-6 text-center"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.07, ease: [0.25, 0.1, 0.25, 1] }}
            >
              The{" "}
              <motion.span
                className="font-semibold inline-block"
                style={{
                  backgroundImage: isDark
                    ? "linear-gradient(110deg, #2d6bbf 0%, #3a78cc 12%, #4a90e2 25%, #6aabf0 38%, #8dc0f8 46%, #bfdbfe 50%, #8dc0f8 54%, #6aabf0 62%, #4a90e2 75%, #3a78cc 88%, #2d6bbf 100%)"
                    : "linear-gradient(110deg, #1d4ed8 0%, #2563eb 12%, #3b82f6 25%, #60a5fa 38%, #93c5fd 46%, #bfdbfe 50%, #93c5fd 54%, #60a5fa 62%, #3b82f6 75%, #2563eb 88%, #1d4ed8 100%)",
                  backgroundSize: "400px 100%",
                  backgroundRepeat: "repeat",
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  color: "transparent",
                  filter: isDark
                    ? "drop-shadow(0 0 16px rgba(74, 144, 226, 0.5)) drop-shadow(0 2px 8px rgba(30, 88, 168, 0.35))"
                    : "drop-shadow(0 0 10px rgba(37, 99, 235, 0.35)) drop-shadow(0 2px 5px rgba(30, 58, 138, 0.25))",
                }}
                animate={{ backgroundPosition: ["0px 50%", "-400px 50%"] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
              >
                diamond
              </motion.span>{" "}
              standard for Scioly.
            </motion.h1>

            <motion.p
              className={`text-base md:text-2xl ${isDark ? 'text-white/70' : 'text-muted-foreground'} mb-10 max-w-md sm:max-w-lg md:max-w-2xl text-center leading-relaxed tracking-tight`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.16, ease: [0.25, 0.1, 0.25, 1] }}
            >
              One platform to replace every spreadsheet, group chat, and lost email built exclusively for Science Olympiad.
            </motion.p>

            <motion.div
              className="flex flex-col sm:flex-row gap-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.23, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <Button
                asChild
                size="lg"
                className="h-11 px-6 text-sm rounded-lg bg-foreground text-background hover:bg-foreground/90 font-semibold shadow-lg shadow-black/15 animate-pulse group"
              >
                <Link href="/login">
                  Get started
                  <IconArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-11 px-6 text-sm rounded-lg border-border/60 bg-transparent hover:bg-muted font-medium shadow-none text-muted-foreground hover:text-foreground"
              >
                <Link href="#features">
                  See how it works
                </Link>
              </Button>
            </motion.div>
          </div>

          {/* Product image — perspective tilted, rises on load */}
          <div className="relative z-10 w-full px-4 sm:px-8 lg:px-16 pb-0">
            {/* Blue atmospheric glow behind the image */}
            <div
              className="absolute inset-x-[5%] inset-y-[10%] pointer-events-none"
              style={{
                background: "radial-gradient(ellipse 80% 60% at 50% 60%, oklch(0.65 0.18 254 / 0.14) 0%, transparent 80%)",
                filter: "blur(40px)",
              }}
            />

            <motion.div
              className="mx-auto max-w-6xl relative rounded-t-2xl overflow-hidden border-t border-border/20"
              style={{
                transformPerspective: 1600,
                transformOrigin: "center bottom",
                boxShadow: "0 40px 120px -30px oklch(0 0 0 / 0.22), 0 0 0 1px oklch(0.65 0.18 254 / 0.07)",
              }}
              initial={{ rotateX: 22, opacity: 0, y: 32 }}
              animate={{ rotateX: 14, opacity: 1, y: 0 }}
              transition={{ duration: 1.1, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Subtle shine along top edge */}
              <div
                className="absolute top-0 inset-x-0 h-px z-10 pointer-events-none"
                style={{ background: "linear-gradient(to right, transparent 5%, oklch(1 0 0 / 0.2) 40%, oklch(1 0 0 / 0.2) 60%, transparent 95%)" }}
              />

              <div className="relative aspect-[1920/958]">
                <Image
                  src="/showcase.png"
                  alt="Scioly dashboard — roster, events, and score tracking"
                  fill
                  className="object-cover object-top"
                  priority
                  unoptimized
                  sizes="(max-width: 768px) 100vw, (max-width: 1280px) 90vw, 1152px"
                />
              </div>

              {/* Bottom fade blends into page */}
              <div
                className="absolute bottom-0 inset-x-0 h-2/5 pointer-events-none z-10"
                style={{ background: "linear-gradient(to bottom, transparent 0%, var(--background) 100%)" }}
              />
            </motion.div>
          </div>
        </section>

        {/* ── Value intro ── */}
        <section id="features" className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20">
          <FadeIn>
            <div className="max-w-2xl mb-12">
              <p className="text-xs font-mono uppercase tracking-widest text-primary/70 mb-3">Why Scioly?</p>
              <h2 className="text-4xl sm:text-5xl font-normal tracking-tight text-foreground mb-5 leading-[1.1]">
                Built for Science Olympiad. Nothing less.
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed">
                Most clubs manage their entire season across a patchwork of Google Sheets, group chats, and lost
                emails. Scioly consolidates every workflow—rosters, events, scores, and histories—into one unified
                platform built exactly for this.
              </p>
            </div>
          </FadeIn>
          <FadeIn delay={0.1}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 border-t border-border/40 pt-10">
              {[
                { icon: <IconChartLine className="w-5 h-5" />, label: "Live Score Tracking" },
                { icon: <IconUsers className="w-5 h-5" />, label: "Roster Management" },
                { icon: <IconHistory className="w-5 h-5" />, label: "Season History" },
              ].map(({ icon, label }) => (
                <div key={label} className="flex items-center gap-3 text-sm font-medium text-foreground">
                  <span className="text-primary shrink-0">{icon}</span>
                  {label}
                </div>
              ))}
            </div>
          </FadeIn>
        </section>

        {/* ── Feature A: Event Telemetry ── */}
        <section className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-border/40">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <FadeIn>
              <div>
                <p className="text-xs font-mono uppercase tracking-widest text-primary/70 mb-3">Telemetry</p>
                <h2 className="text-3xl sm:text-4xl font-normal tracking-tight mb-4 leading-[1.1]">
                  Track every event, live.
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  Aggregate performance data across tournaments and identify weak events before Regionals.
                  Real-time score visualization for every member of your roster.
                </p>
                <ul className="space-y-3">
                  {[
                    "Per-event percentile rankings across tournaments",
                    "Tournament-over-tournament trend lines",
                    "Coach and captain annotation support",
                  ].map((pt) => (
                    <li key={pt} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                      <span className="mt-2 w-1 h-1 rounded-full bg-primary shrink-0" />
                      {pt}
                    </li>
                  ))}
                </ul>
              </div>
            </FadeIn>
            <FadeIn delay={0.1}>
              <TracingBorder className="rounded-2xl" contentClassName="bg-card/80" duration={6}>
                <div className="rounded-2xl" style={panelStyle}>
                  <div className="px-5 py-4 border-b border-border/40">
                    <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Event Performance</p>
                  </div>
                  <div className="p-5 space-y-4">
                    {[
                      ["Anatomy & Physiology", 88],
                      ["Forestry", 92],
                      ["Wright Stuff", 71],
                      ["Disease Detectives", 58],
                      ["Microbe Mission", 79],
                    ].map(([name, val]) => (
                      <div key={name} className="flex items-center gap-3">
                        <span className="font-mono text-[11px] text-muted-foreground w-40 shrink-0 truncate">{name}</span>
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary/80 rounded-full" style={{ width: `${val}%` }} />
                        </div>
                        <span className="font-mono font-semibold text-[11px] tabular-nums w-6 text-right">{val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </TracingBorder>
            </FadeIn>
          </div>
        </section>

        {/* ── Feature B: Roster Management ── */}
        <section className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-border/40">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <FadeIn className="order-last lg:order-first">
              <TracingBorder className="rounded-2xl" contentClassName="bg-card/80" duration={7}>
                <div className="rounded-2xl" style={panelStyle}>
                  <div className="px-5 py-4 border-b border-border/40">
                    <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Roster — Jefferson SciOly</p>
                  </div>
                  <div className="divide-y divide-border/30">
                    {[
                      { initials: "AM", name: "Alice M.", role: "Captain", event: "Forestry" },
                      { initials: "BJ", name: "Bob J.", role: "Member", event: "Microbe Mission" },
                      { initials: "CS", name: "Carol S.", role: "Member", event: "Anatomy" },
                      { initials: "DL", name: "David L.", role: "Alt", event: "Wright Stuff" },
                    ].map(({ initials, name, role, event }) => (
                      <div key={name} className="flex items-center gap-3 px-5 py-3.5">
                        <div className="w-8 h-8 rounded-lg bg-muted border border-border/60 flex items-center justify-center text-xs font-mono font-semibold shrink-0">
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{name}</p>
                          <p className="text-[11px] font-mono text-muted-foreground">{event}</p>
                        </div>
                        <span className={`text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded border shrink-0 ${role === "Captain" ? "border-primary/30 text-primary bg-primary/5" : "border-border/50 text-muted-foreground"}`}>
                          {role}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </TracingBorder>
            </FadeIn>
            <FadeIn delay={0.1}>
              <div>
                <p className="text-xs font-mono uppercase tracking-widest text-primary/70 mb-3">Roster</p>
                <h2 className="text-3xl sm:text-4xl font-normal tracking-tight mb-4 leading-[1.1]">
                  Full control over your roster.
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  Manage members, assign roles, and review pending applications in seconds.
                  Bulk-assign students to events without spreadsheet gymnastics.
                </p>
                <ul className="space-y-3">
                  {[
                    "Role-based permissions for coaches, captains, and members",
                    "One-click bulk event assignment with conflict detection",
                    "Application review with approve, deny, and waitlist flows",
                  ].map((pt) => (
                    <li key={pt} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                      <span className="mt-2 w-1 h-1 rounded-full bg-primary shrink-0" />
                      {pt}
                    </li>
                  ))}
                </ul>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* ── Feature C: Tournament History ── */}
        <section className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-border/40">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <FadeIn>
              <div>
                <p className="text-xs font-mono uppercase tracking-widest text-primary/70 mb-3">History</p>
                <h2 className="text-3xl sm:text-4xl font-normal tracking-tight mb-4 leading-[1.1]">
                  Every medal, every season.
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  A permanent ledger of every result across all competitive seasons. Never lose track of
                  your team's achievements again — from invitationals to State.
                </p>
                <ul className="space-y-3">
                  {[
                    "Full tournament result history by season",
                    "Per-event placement records and personal bests",
                    "Exportable for college applications and club reports",
                  ].map((pt) => (
                    <li key={pt} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                      <span className="mt-2 w-1 h-1 rounded-full bg-primary shrink-0" />
                      {pt}
                    </li>
                  ))}
                </ul>
              </div>
            </FadeIn>
            <FadeIn delay={0.1}>
              <TracingBorder className="rounded-2xl" contentClassName="bg-card/80" duration={5}>
                <div className="rounded-2xl" style={panelStyle}>
                  <div className="px-5 py-4 border-b border-border/40">
                    <div className="grid grid-cols-3 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                      <span>Tournament</span>
                      <span className="text-center">Place</span>
                      <span className="text-right">Date</span>
                    </div>
                  </div>
                  <div className="divide-y divide-border/30">
                    {[
                      { name: "MIT Invitational", place: "1st", date: "Oct 2025" },
                      { name: "Cornell Scioly", place: "2nd", date: "Nov 2025" },
                      { name: "Regionals", place: "3rd", date: "Feb 2026" },
                      { name: "State Championship", place: "5th", date: "Mar 2026" },
                    ].map(({ name, place, date }) => (
                      <div key={name} className="grid grid-cols-3 items-center px-5 py-3.5 text-sm">
                        <span className="font-medium truncate pr-2">{name}</span>
                        <span className={`text-center text-[11px] font-mono font-semibold ${place === "1st" ? "text-primary" : "text-foreground"}`}>
                          {place}
                        </span>
                        <span className="text-right text-[11px] font-mono text-muted-foreground">{date}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </TracingBorder>
            </FadeIn>
          </div>
        </section>

        {/* ── Dense feature grid ── */}
        <section className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-border/40">
          <FadeIn>
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-normal tracking-tight text-foreground">
                So much more to love.
              </h2>
            </div>
          </FadeIn>
          <FadeIn delay={0.1}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { icon: <IconDatabase className="w-4 h-4" />, title: "Unified Schema", desc: "Track members, roles, scores, and attendance in one relational schema. No more broken VLOOKUPs." },
                { icon: <IconLock className="w-4 h-4" />, title: "Role-Based Access", desc: "Coaches see everything, captains manage rosters, members track their own metrics." },
                { icon: <IconBolt className="w-4 h-4" />, title: "High-Speed Workflows", desc: "Bulk-assign students to events without waiting on slow, bloated interfaces." },
                { icon: <IconClipboardList className="w-4 h-4" />, title: "Practice Tests", desc: "Upload, organize, and track completion of practice materials by event and member." },
                { icon: <IconCalendarEvent className="w-4 h-4" />, title: "Event Assignments", desc: "Assign members to events with conflict detection and automatic alternates." },
                { icon: <IconClock className="w-4 h-4" />, title: "Hours Tracking", desc: "Log and approve practice hours with category breakdowns for coach review." },
              ].map(({ icon, title, desc }) => (
                <div key={title} className="bg-card border border-border/60 rounded-xl p-5 hover:border-primary/40 transition-colors duration-300 flex flex-col gap-3">
                  <div className="w-8 h-8 rounded-lg bg-muted border border-border/60 flex items-center justify-center text-foreground shrink-0">
                    {icon}
                  </div>
                  <div>
                    <p className="font-semibold text-sm mb-1.5">{title}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </FadeIn>
        </section>

        {/* ── Final CTA ── */}
        <section className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 pb-28">
          <FadeIn>
            <div
              className="relative rounded-2xl border border-border/60 bg-card overflow-hidden px-8 py-20 text-center flex flex-col items-center"
              style={{ boxShadow: "0 0 80px 20px oklch(0.65 0.18 254 / 0.06)" }}
            >
              <div
                className="pointer-events-none absolute inset-0"
                style={{ background: "radial-gradient(ellipse 70% 60% at 50% 100%, oklch(0.65 0.18 254 / 0.12) 0%, transparent 100%)" }}
              />
              <p className="text-xs font-mono uppercase tracking-widest text-primary/70 mb-5 relative z-10">Ready?</p>
              <h2 className="text-4xl md:text-5xl font-normal tracking-tight text-foreground mb-5 relative z-10 leading-[1.1]">
                Run your club,<br />not spreadsheets.
              </h2>
              <p className="text-muted-foreground text-base sm:text-lg mb-8 max-w-sm relative z-10 leading-relaxed">
                Get your Science Olympiad team onto a platform built exactly for this.
              </p>
              <Button
                asChild
                size="lg"
                className="relative z-10 h-11 px-8 text-sm rounded-lg bg-foreground text-background hover:bg-foreground/90 font-semibold shadow-lg shadow-black/20 group"
              >
                <Link href="/register">
                  Start now
                  <IconArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Button>
            </div>
          </FadeIn>
        </section>

      </main>

      {/* ── Footer ── */}
      <footer className="py-8 px-6 border-t border-border/40 bg-background relative z-10">
        <div className="max-w-screen-xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-mono uppercase tracking-widest text-muted-foreground">
          <div className="flex items-center gap-2">
            <IconAtom className="h-4 w-4" strokeWidth={2} />
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
