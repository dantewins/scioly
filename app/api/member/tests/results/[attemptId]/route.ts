import type { User } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { withMemberAuth, ok, err } from "@/lib/api"
import { getMemberSeason } from "@/lib/db"

export const dynamic = "force-dynamic"

// GET /api/member/tests/results/[attemptId]
export const GET = withMemberAuth(
  async (request: Request, context: { params: Promise<{ attemptId: string }> }, currentUser: User) => {
    const { attemptId } = await context.params

    const memberSeason = await getMemberSeason(currentUser.id, currentUser.clubId)
    if (!memberSeason) return err("No active season membership found.", 403)

    const attempt = await prisma.testAttempt.findUnique({
      where: { id: attemptId },
      include: {
        test: { select: { id: true, title: true, timeLimitMinutes: true } },
        answers: {
          include: {
            question: true,
          },
        },
      },
    })

    if (!attempt) return err("Attempt not found.", 404)
    if (attempt.memberSeasonId !== memberSeason.id) return err("Forbidden.", 403)
    if (!attempt.submittedAt) return err("Attempt not yet submitted.", 400)

    // Sort answers by question order
    const sortedAnswers = [...attempt.answers].sort(
      (a, b) => a.question.order - b.question.order
    )

    return ok({
      attemptId: attempt.id,
      testId: attempt.testId,
      testTitle: attempt.test.title,
      startedAt: attempt.startedAt.toISOString(),
      submittedAt: attempt.submittedAt.toISOString(),
      earnedPoints: attempt.earnedPoints,
      totalPoints: attempt.totalPoints,
      questions: sortedAnswers.map(a => ({
        questionId: a.questionId,
        order: a.question.order,
        content: a.question.content,
        type: a.question.type,
        points: a.question.points,
        imageUrl: a.question.imageUrl,
        stationNumber: a.question.stationNumber,
        stationContext: a.question.stationContext,
        options: a.question.options,
        answerKey: a.question.answerKey,
        response: a.response,
        isCorrect: a.isCorrect,
        pointsEarned: a.pointsEarned,
      })),
    })
  },
  "fetch test results"
)
