// scripts/lib/diff.test.ts
// Standalone test runner — no test framework. Run via `npx tsx scripts/lib/diff.test.ts`.
import assert from "node:assert/strict"
import { diffPerf, type PerfRun } from "./diff"

const baseResult = {
  status: 200,
  serverTimingMs: null,
  bytes: 0,
  runs: [],
}

// Test 1: prev null → all entries marked as new (prevMs = null)
{
  const curr: PerfRun = {
    ranAt: "2026-05-02T10:00:00Z",
    seedSize: "large",
    results: [
      { route: "/x", role: "WEBSITE_OWNER", totalMs: 100, ...baseResult, runs: [100] },
    ],
  }
  const result = diffPerf(null, curr)
  assert.equal(result.length, 1)
  assert.equal(result[0].prevMs, null)
  assert.equal(result[0].newMs, 100)
  assert.equal(result[0].deltaMs, null)
  console.log("✓ prev=null produces NEW entries")
}

// Test 2: matching route → computes delta and percent
{
  const prev: PerfRun = {
    ranAt: "2026-05-01T10:00:00Z",
    seedSize: "large",
    results: [
      { route: "/x", role: "WEBSITE_OWNER", totalMs: 100, ...baseResult, runs: [100] },
    ],
  }
  const curr: PerfRun = {
    ranAt: "2026-05-02T10:00:00Z",
    seedSize: "large",
    results: [
      { route: "/x", role: "WEBSITE_OWNER", totalMs: 150, ...baseResult, runs: [150] },
    ],
  }
  const result = diffPerf(prev, curr)
  assert.equal(result[0].deltaMs, 50)
  assert.equal(result[0].deltaPct, 50)
  console.log("✓ matching route computes 50ms / 50% delta")
}

// Test 3: roles differentiated — same path, different role = different entries
{
  const prev: PerfRun = {
    ranAt: "x", seedSize: "large",
    results: [
      { route: "/y", role: "WEBSITE_OWNER", totalMs: 200, ...baseResult, runs: [200] },
    ],
  }
  const curr: PerfRun = {
    ranAt: "y", seedSize: "large",
    results: [
      { route: "/y", role: "WEBSITE_OWNER", totalMs: 210, ...baseResult, runs: [210] },
      { route: "/y", role: "MEMBER", totalMs: 90, ...baseResult, runs: [90] },
    ],
  }
  const result = diffPerf(prev, curr)
  const owner = result.find((e) => e.role === "WEBSITE_OWNER")!
  const member = result.find((e) => e.role === "MEMBER")!
  assert.equal(owner.deltaMs, 10)
  assert.equal(member.prevMs, null)
  console.log("✓ roles are differentiated by composite key")
}

// Test 4: prev had route, curr does not — diff only reports curr entries
{
  const prev: PerfRun = {
    ranAt: "x", seedSize: "large",
    results: [
      { route: "/removed", role: "WEBSITE_OWNER", totalMs: 100, ...baseResult, runs: [100] },
    ],
  }
  const curr: PerfRun = {
    ranAt: "y", seedSize: "large",
    results: [],
  }
  const result = diffPerf(prev, curr)
  assert.equal(result.length, 0)
  console.log("✓ dropped routes are absent from diff (caller can compute removals separately)")
}

console.log("\nAll diff tests passed.")
