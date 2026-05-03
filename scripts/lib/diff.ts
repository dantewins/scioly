// scripts/lib/diff.ts
// Pure functions for comparing perf runs. No I/O — easy to test.

export type RouteResult = {
  route: string
  role: string
  status: number
  totalMs: number
  serverTimingMs: number | null
  bytes: number
  runs: number[]
}

export type PerfRun = {
  ranAt: string
  seedSize: "small" | "large"
  results: RouteResult[]
}

export type DiffEntry = {
  route: string
  role: string
  prevMs: number | null
  newMs: number
  deltaMs: number | null
  deltaPct: number | null
}

function key(r: { route: string; role: string }): string {
  return `${r.role}|${r.route}`
}

export function diffPerf(prev: PerfRun | null, curr: PerfRun): DiffEntry[] {
  const prevByKey = new Map<string, RouteResult>()
  if (prev) {
    for (const r of prev.results) prevByKey.set(key(r), r)
  }
  return curr.results.map((c) => {
    const p = prevByKey.get(key(c))
    if (!p) {
      return { route: c.route, role: c.role, prevMs: null, newMs: c.totalMs, deltaMs: null, deltaPct: null }
    }
    const deltaMs = c.totalMs - p.totalMs
    const deltaPct = p.totalMs > 0 ? (deltaMs / p.totalMs) * 100 : null
    return { route: c.route, role: c.role, prevMs: p.totalMs, newMs: c.totalMs, deltaMs, deltaPct }
  })
}

export function formatDiffTable(entries: DiffEntry[]): string {
  const sorted = [...entries].sort((a, b) => {
    if (a.deltaMs === null && b.deltaMs === null) return 0
    if (a.deltaMs === null) return 1
    if (b.deltaMs === null) return -1
    return Math.abs(b.deltaMs) - Math.abs(a.deltaMs)
  })
  const header = "route\trole\tnew\tdelta"
  const rows = sorted.map((e) => {
    const delta = e.deltaMs === null ? "NEW" : `${e.deltaMs > 0 ? "+" : ""}${e.deltaMs}ms`
    const pct = e.deltaPct === null ? "" : ` (${e.deltaPct > 0 ? "+" : ""}${e.deltaPct.toFixed(0)}%)`
    return `${e.route}\t${e.role}\t${e.newMs}ms\t${delta}${pct}`
  })
  return [header, ...rows].join("\n")
}
