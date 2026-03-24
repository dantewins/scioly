import type { User } from "@prisma/client"
import { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { withMemberAuth, ok, err } from "@/lib/api"
import { getMemberSeason } from "@/lib/db"

export const dynamic = "force-dynamic"

type AnswerInput = {
  questionId: string
  response: unknown
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const sa = [...a].sort()
  const sb = [...b].sort()
  return sa.every((v, i) => v === sb[i])
}

function matchingPairsEqual(
  a: { leftId: string; rightId: string }[],
  b: { leftId: string; rightId: string }[]
): boolean {
  if (a.length !== b.length) return false
  const sort = (arr: typeof a) => [...arr].sort((x, y) => x.leftId.localeCompare(y.leftId))
  const sa = sort(a)
  const sb = sort(b)
  return sa.every((v, i) => v.leftId === sb[i].leftId && v.rightId === sb[i].rightId)
}

// POST /api/member/tests/submit
// body: { attemptId: string, answers: { questionId: string, response: Json }[] }
export const POST = withMemberAuth(
  async (request: Request, _ctx: unknown, currentUser: User) => {
    const body = await request.json() as {
      attemptId?: string
      answers?: AnswerInput[]
    }

    if (!body.attemptId) return err("attemptId is required.", 400)
    if (!Array.isArray(body.answers)) return err("answers must be an array.", 400)

    const memberSeason = await getMemberSeason(currentUser.id, currentUser.clubId)
    if (!memberSeason) return err("No active season membership found.", 403)

    const attempt = await prisma.testAttempt.findUnique({
      where: { id: body.attemptId },
      include: {
        test: {
          include: {
            questions: true,
          },
        },
      },
    })

    if (!attempt) return err("Attempt not found.", 404)
    if (attempt.memberSeasonId !== memberSeason.id) return err("Forbidden.", 403)
    if (attempt.submittedAt !== null) return err("Already submitted.", 400)

    const questionMap = new Map(attempt.test.questions.map(q => [q.id, q]))

    let earnedPoints = 0
    const answerData: Prisma.TestAnswerCreateManyInput[] = []

    for (const ans of body.answers) {
      const question = questionMap.get(ans.questionId)
      if (!question) continue

      let isCorrect: boolean | null = null
      let pointsEarned: number | null = null

      if (question.type === "MCQ") {
        const response = String(ans.response ?? "")
        isCorrect = response === question.answerKey
        pointsEarned = isCorrect ? question.points : 0
      } else if (question.type === "SELECT_ALL") {
        let selected: string[] = []
        let correct: string[] = []
        try { selected = JSON.parse(String(ans.response ?? "[]")) as string[] } catch { /* empty */ }
        try { correct = JSON.parse(question.answerKey ?? "[]") as string[] } catch { /* empty */ }
        isCorrect = arraysEqual(selected, correct)
        pointsEarned = isCorrect ? question.points : 0
      } else if (question.type === "MATCHING") {
        let submitted: { leftId: string; rightId: string }[] = []
        let correct: { leftId: string; rightId: string }[] = []
        try {
          const raw = ans.response
          if (typeof raw === "string") submitted = JSON.parse(raw) as typeof submitted
          else submitted = raw as typeof submitted
        } catch { /* empty */ }
        try { correct = JSON.parse(question.answerKey ?? "[]") as typeof correct } catch { /* empty */ }
        isCorrect = matchingPairsEqual(submitted, correct)
        pointsEarned = isCorrect ? question.points : 0
      } else if (question.type === "TRUE_FALSE") {
        const response = String(ans.response ?? "").toLowerCase().trim()
        isCorrect = response === (question.answerKey ?? "").toLowerCase().trim()
        pointsEarned = isCorrect ? question.points : 0
      } else if (question.type === "FILL_IN_BLANK") {
        const response = String(ans.response ?? "").toLowerCase().trim()
        isCorrect = response === (question.answerKey ?? "").toLowerCase().trim()
        pointsEarned = isCorrect ? question.points : 0
      } else {
        // FREE_RESPONSE: not auto-graded
        isCorrect = null
        pointsEarned = null
      }

      if (pointsEarned !== null) earnedPoints += pointsEarned

      answerData.push({
        attemptId: attempt.id,
        questionId: ans.questionId,
        response: ans.response as Prisma.InputJsonValue,
        isCorrect,
        pointsEarned,
      })
    }

    await prisma.$transaction([
      prisma.testAnswer.createMany({ data: answerData }),
      prisma.testAttempt.update({
        where: { id: attempt.id },
        data: { submittedAt: new Date(), earnedPoints },
      }),
    ])

    return ok({
      success: true,
      attemptId: attempt.id,
      earnedPoints,
      totalPoints: attempt.totalPoints,
    })
  },
  "submit test"
)
