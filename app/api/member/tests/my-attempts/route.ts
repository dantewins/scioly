import type { User } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { withMemberAuth, ok, err } from "@/lib/api"
import { getMemberSeason } from "@/lib/db"

export const dynamic = "force-dynamic"

// GET /api/member/tests/my-attempts
// Returns summary of all test attempts for the current member in the active season
export const GET = withMemberAuth(
  async (_request: Request, _ctx: unknown, currentUser: User) => {
    const memberSeason = await getMemberSeason(currentUser.id, currentUser.clubId)
    if (!memberSeason) return ok([])

    const attempts = await prisma.testAttempt.findMany({
      where: { memberSeasonId: memberSeason.id },
      select: { testId: true, earnedPoints: true, totalPoints: true, startedAt: true, submittedAt: true },
      orderBy: { startedAt: "asc" },
    })

    // Group by testId
    const grouped = new Map<string, typeof attempts>()
    for (const a of attempts) {
      const existing = grouped.get(a.testId) ?? []
      existing.push(a)
      grouped.set(a.testId, existing)
    }

    const result = Array.from(grouped.entries()).map(([testId, list]) => {
      const submitted = list.filter(a => a.submittedAt !== null)
      const scores = submitted
        .filter(a => a.earnedPoints !== null)
        .map(a => a.earnedPoints!)

      return {
        testId,
        attemptCount: submitted.length,
        bestScore: scores.length > 0 ? Math.max(...scores) : null,
        totalPoints: list[0]?.totalPoints ?? 0,
        lastAttemptAt: list[list.length - 1]?.startedAt.toISOString() ?? null,
      }
    })

    return ok(result)
  },
  "fetch my attempts"
)
