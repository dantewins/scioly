import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withMemberAuth, ok, err } from "@/lib/api"
import { getActiveSeason, getMemberSeason } from "@/lib/db"

export const dynamic = "force-dynamic"

export const GET = withMemberAuth(async (_req, _ctx, user) => {
  const season = await getActiveSeason(user.clubId)
  if (!season) return err("No active season.", 400)

  const ms = await getMemberSeason(user.id, user.clubId)

  const tests = await prisma.practiceTest.findMany({
    where: { seasonId: season.id, isActive: true },
    include: {
      event: { select: { id: true, name: true } },
      answerKey: { select: { id: true } },
      ...(ms ? {
        attempts: {
          where: { memberSeasonId: ms.id },
          orderBy: { startedAt: "desc" },
          take: 5,
          select: { id: true, score: true, startedAt: true, submittedAt: true },
        },
      } : {}),
    },
    orderBy: { createdAt: "desc" },
  })
  return ok(tests)
})

const startSchema = z.object({
  action: z.literal("start"),
  testId: z.string(),
})

const submitSchema = z.object({
  action: z.literal("submit"),
  attemptId: z.string(),
  answers: z.array(z.string()),
})

const bodySchema = z.discriminatedUnion("action", [startSchema, submitSchema])

export const POST = withMemberAuth(async (req, _ctx, user) => {
  const body = await req.json()
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input.", 400)

  const season = await getActiveSeason(user.clubId)
  if (!season) return err("No active season.", 400)

  const ms = await getMemberSeason(user.id, user.clubId)
  if (!ms) return err("Not a member this season.", 403)

  if (parsed.data.action === "start") {
    const test = await prisma.practiceTest.findFirst({
      where: { id: parsed.data.testId, seasonId: season.id, isActive: true },
    })
    if (!test) return err("Test not found.", 404)

    const attempt = await prisma.practiceAttempt.create({
      data: { practiceTestId: test.id, memberSeasonId: ms.id, answers: [] },
    })
    return ok(attempt, 201)
  }

  // action === "submit"
  const attempt = await prisma.practiceAttempt.findFirst({
    where: { id: parsed.data.attemptId, memberSeasonId: ms.id },
    include: { practiceTest: { include: { answerKey: true } } },
  })
  if (!attempt) return err("Attempt not found.", 404)
  if (attempt.submittedAt) return err("Already submitted.", 400)

  // Score the attempt if answer key exists
  let score: number | null = null
  const key = attempt.practiceTest.answerKey
  if (key) {
    const keyAnswers = key.answers as string[]
    score = parsed.data.answers.reduce((sum, ans, i) => {
      return sum + (ans.trim().toLowerCase() === (keyAnswers[i] ?? "").trim().toLowerCase() ? 1 : 0)
    }, 0)
  }

  const updated = await prisma.practiceAttempt.update({
    where: { id: attempt.id },
    data: { answers: parsed.data.answers, submittedAt: new Date(), score },
  })
  return ok(updated)
})
