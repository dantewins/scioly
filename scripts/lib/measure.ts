// scripts/lib/measure.ts
import type { RouteResult } from "./diff"

function median(nums: number[]): number {
  const sorted = [...nums].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 0) return Math.round((sorted[mid - 1] + sorted[mid]) / 2)
  return sorted[mid]
}

// Parses Server-Timing header like "db;dur=420, total;dur=612" → 612 (sum of all durs).
function parseServerTiming(header: string | null): number | null {
  if (!header) return null
  const matches = [...header.matchAll(/dur=([\d.]+)/g)]
  if (matches.length === 0) return null
  const total = matches.reduce((sum, m) => sum + parseFloat(m[1]), 0)
  return Math.round(total)
}

export async function measureRoute(opts: {
  baseUrl: string
  path: string
  role: string
  cookie: string
  warmupRequests?: number
  measureRequests?: number
}): Promise<RouteResult> {
  const warmup = opts.warmupRequests ?? 1
  const measure = opts.measureRequests ?? 2
  const url = `${opts.baseUrl}${opts.path}`

  const allRuns: number[] = []
  let lastStatus = 0
  let lastBytes = 0
  let lastServerTiming: number | null = null

  for (let i = 0; i < warmup + measure; i++) {
    const t0 = performance.now()
    const res = await fetch(url, { headers: { cookie: opts.cookie } })
    const body = await res.arrayBuffer()
    const t1 = performance.now()
    const totalMs = Math.round(t1 - t0)
    allRuns.push(totalMs)
    lastStatus = res.status
    lastBytes = body.byteLength
    lastServerTiming = parseServerTiming(res.headers.get("server-timing"))
  }

  const measured = allRuns.slice(warmup)
  return {
    route: opts.path,
    role: opts.role,
    status: lastStatus,
    totalMs: median(measured),
    serverTimingMs: lastServerTiming,
    bytes: lastBytes,
    runs: allRuns,
  }
}
