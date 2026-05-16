"use client"

import { useMemo } from "react"
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { SectionCard } from "@/components/ui/section-card"

interface ScoredAttempt {
  attemptId: string
  title: string
  status: "SUBMITTED" | "SCORED"
  score: number | null
  scorePossible: number | null
  submittedAt: string
}

interface Props {
  recentAttempts: ScoredAttempt[]
}

export function ScoreSparkline({ recentAttempts }: Props) {
  const data = useMemo(() => {
    return [...recentAttempts]
      .filter((a) => a.status === "SCORED" && a.score !== null && a.scorePossible)
      .reverse() // oldest first
      .slice(-10)
      .map((a) => {
        const pct = Math.round(((a.score ?? 0) / (a.scorePossible ?? 1)) * 100)
        return {
          attemptId: a.attemptId,
          title: a.title,
          pct,
          date: new Date(a.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        }
      })
  }, [recentAttempts])

  if (data.length < 2) return null

  const avg = Math.round(data.reduce((s, d) => s + d.pct, 0) / data.length)
  const latest = data[data.length - 1].pct
  const trend = latest - data[0].pct

  return (
    <SectionCard title="Score trend (last 10)">
      <div className="flex items-start gap-4">
        <div className="shrink-0 space-y-2">
          <div>
            <p className="label-caps text-muted-foreground">Latest</p>
            <p className="font-serif text-2xl tabular-nums leading-none text-foreground mt-1">{latest}%</p>
          </div>
          <div>
            <p className="label-caps text-muted-foreground">Average</p>
            <p className="font-mono tabular-nums text-sm text-foreground/80 mt-1">{avg}%</p>
          </div>
          <div>
            <p className="label-caps text-muted-foreground">Trend</p>
            <p
              className={
                trend > 0
                  ? "font-mono tabular-nums text-sm text-[var(--success)] mt-1"
                  : trend < 0
                    ? "font-mono tabular-nums text-sm text-[var(--danger)] mt-1"
                    : "font-mono tabular-nums text-sm text-muted-foreground mt-1"
              }
            >
              {trend > 0 ? "+" : ""}
              {trend}pp
            </p>
          </div>
        </div>
        <div className="flex-1 min-w-0 h-32">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
              <defs>
                <linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" hide />
              <YAxis domain={[0, 100]} hide />
              <Tooltip
                contentStyle={{ borderRadius: 8, fontSize: 12 }}
                formatter={(value: number) => [`${value}%`, "Score"]}
                labelFormatter={(_, items) => items?.[0]?.payload?.title ?? ""}
              />
              <Area
                type="monotone"
                dataKey="pct"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#scoreFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </SectionCard>
  )
}
