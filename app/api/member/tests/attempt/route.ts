import type { User } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { withMemberAuth, ok, err } from "@/lib/api"
import { getMemberSeason } from "@/lib/db"

export const dynamic = "force-dynamic"

// POST /api/member/tests/attempt
// body: { action: "start", testId: string }
// Creates a new TestAttempt (unlimited retakes)
export const POST = withMemberAuth(
  async (request: Request, _ctx: unknown, currentUser: User) => {
    const body = await request.json() as { action?: string; testId?: string }

    if (body.action !== "start") return err("Invalid action.", 400)
    if (!body.testId) return err("testId is required.", 400)

    const memberSeason = await getMemberSeason(currentUser.id, currentUser.clubId)
    if (!memberSeason) return err("No active season membership found.", 403)

    const test = await prisma.test.findUnique({
      where: { id: body.testId },
      include: { questions: { select: { points: true } } },
    })
    if (!test) return err("Test not found.", 404)
    if (!test.isActive) return err("Test is not available.", 403)

    const totalPoints = test.questions.reduce((sum, q) => sum + q.points, 0)

    const attempt = await prisma.testAttempt.create({
      data: {
        testId: body.testId,
        memberSeasonId: memberSeason.id,
        totalPoints,
      },
      select: { id: true, startedAt: true },
    })

    return ok({
      success: true,
      attemptId: attempt.id,
      startedAt: attempt.startedAt.toISOString(),
      timeLimitMinutes: test.timeLimitMinutes,
    })
  },
  "start test attempt"
)
