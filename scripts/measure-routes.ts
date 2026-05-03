// scripts/measure-routes.ts
// Boots through the route matrix, logs in per role, measures each (path, role),
// writes JSON output, prints a diff vs the previous run if one exists.
//
// Prereqs: `next dev` running on :3000, `npm run seed:large` already executed.

import "dotenv/config"
import fs from "node:fs"
import path from "node:path"
import { routeMatrix, ROLE_CREDENTIALS, type Role } from "./lib/route-config"
import { loginAndGetCookie } from "./lib/auth"
import { bootstrapIds, resolvePath } from "./lib/bootstrap-ids"
import { measureRoute } from "./lib/measure"
import { diffPerf, formatDiffTable, type PerfRun, type RouteResult } from "./lib/diff"

const BASE_URL = process.env.AUDIT_BASE_URL ?? "http://localhost:3000"
const OUTPUT_DIR = "docs/audit"

async function pingDevServer(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/api/auth/me`)
    return res.status > 0
  } catch {
    return false
  }
}

function nowFilename(): string {
  const now = new Date()
  const pad = (n: number) => n.toString().padStart(2, "0")
  return `perf-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}.json`
}

async function main() {
  console.log(`[audit] base URL: ${BASE_URL}`)

  if (!(await pingDevServer())) {
    console.error(`[audit] dev server not reachable at ${BASE_URL}. Start \`next dev\` first.`)
    process.exit(1)
  }

  console.log("[audit] resolving dynamic IDs...")
  const ids = await bootstrapIds()
  if (Object.values(ids).some((v) => v === null)) {
    console.error("[audit] one or more bootstrap IDs are null — DB likely empty. Run `npm run seed:large` first.")
    console.error(ids)
    process.exit(1)
  }

  console.log("[audit] logging in...")
  const cookies: Record<Role, string> = {} as Record<Role, string>
  for (const [role, creds] of Object.entries(ROLE_CREDENTIALS) as [Role, { email: string; password: string }][]) {
    cookies[role] = await loginAndGetCookie(BASE_URL, creds.email, creds.password)
    console.log(`  ✓ ${role}`)
  }

  const results: RouteResult[] = []
  for (const entry of routeMatrix) {
    const resolved = resolvePath(entry.path, ids)
    if (!resolved) {
      console.warn(`[audit] skipping ${entry.path} — could not resolve dynamic ID`)
      continue
    }
    for (const role of entry.roles) {
      process.stdout.write(`[audit] measuring ${role} ${resolved}... `)
      try {
        const r = await measureRoute({
          baseUrl: BASE_URL,
          path: resolved,
          role,
          cookie: cookies[role],
        })
        results.push(r)
        console.log(`${r.status} in ${r.totalMs}ms`)
      } catch (err) {
        console.log(`ERR ${(err as Error).message}`)
      }
    }
  }

  const run: PerfRun = {
    ranAt: new Date().toISOString(),
    seedSize: "large",
    results,
  }

  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  const outFile = path.join(OUTPUT_DIR, nowFilename())
  fs.writeFileSync(outFile, JSON.stringify(run, null, 2))
  console.log(`\n[audit] wrote ${outFile}`)

  const allPerfFiles = fs
    .readdirSync(OUTPUT_DIR)
    .filter((f) => f.startsWith("perf-") && f.endsWith(".json"))
    .sort()
  const prevFile = allPerfFiles.length > 1 ? allPerfFiles[allPerfFiles.length - 2] : null
  if (prevFile) {
    const prev = JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, prevFile), "utf-8")) as PerfRun
    const diff = diffPerf(prev, run)
    console.log(`\n[audit] diff vs ${prevFile}:`)
    console.log(formatDiffTable(diff))
  } else {
    console.log("[audit] no previous run to diff against.")
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
