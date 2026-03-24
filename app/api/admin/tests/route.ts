import type { User } from "@prisma/client"
import { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { withAdminAuth, withMemberAuth, ADMIN_ROLES, ok, err } from "@/lib/api"
import { getActiveSeason } from "@/lib/db"

export const dynamic = "force-dynamic"

// GET /api/admin/tests          → list all tests for active season (summary)
// GET /api/admin/tests?id=xxx   → full test with questions
// Members can GET (active tests only, answer keys stripped)
export const GET = withMemberAuth(
  async (request: Request, _ctx: unknown, currentUser: User) => {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    const isAdmin = ADMIN_ROLES.has(currentUser.role)

    // Single test with questions
    if (id) {
      const test = await prisma.test.findUnique({
        where: { id },
        include: {
          event: { select: { id: true, name: true, code: true } },
          questions: { orderBy: { order: "asc" } },
        },
      })
      if (!test) return err("Test not found.", 404)
      // Members can only access active tests
      if (!isAdmin && !test.isActive) return err("Test not found.", 404)

      const questions = test.questions.map(q => ({
        ...q,
        // Strip answer keys for non-admins
        answerKey: isAdmin ? q.answerKey : null,
      }))

      return ok({ ...test, questions })
    }

    // List all tests for active season
    const activeSeason = await getActiveSeason(currentUser.clubId)
    if (!activeSeason) return ok([])

    const tests = await prisma.test.findMany({
      where: {
        seasonId: activeSeason.id,
        // Members only see active tests
        ...(isAdmin ? {} : { isActive: true }),
      },
      include: {
        event: { select: { id: true, name: true, code: true } },
        _count: { select: { questions: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    return ok(
      tests.map(t => ({
        id: t.id,
        title: t.title,
        description: t.description,
        eventId: t.eventId,
        eventName: t.event?.name ?? null,
        eventCode: t.event?.code ?? null,
        questionCount: t._count.questions,
        isActive: t.isActive,
        timeLimitMinutes: t.timeLimitMinutes,
        createdAt: t.createdAt.toISOString(),
      }))
    )
  },
  "fetch tests"
)

type QuestionInput = {
  order: number
  content: string
  type: "MCQ" | "SELECT_ALL" | "MATCHING" | "FREE_RESPONSE"
  options?: unknown
  answerKey?: string | null
  points?: number
  imageUrl?: string | null
  stationNumber?: number | null
  stationContext?: string | null
}

// POST /api/admin/tests — CRUD actions (admin only)
export const POST = withAdminAuth(
  async (request: Request, _ctx: unknown, currentUser: User) => {
    const activeSeason = await getActiveSeason(currentUser.clubId)
    if (!activeSeason) return err("No active season.", 400)

    const body = await request.json() as {
      action: "create" | "edit" | "delete" | "save-questions" | "toggle-active"
      id?: string
      title?: string
      description?: string
      eventId?: string | null
      timeLimitMinutes?: number | null
      questions?: QuestionInput[]
    }

    const { action } = body

    if (action === "create") {
      const { title, description, eventId, timeLimitMinutes } = body
      if (!title?.trim()) return err("Title is required.", 400)

      const test = await prisma.test.create({
        data: {
          seasonId: activeSeason.id,
          title: title.trim(),
          description: description?.trim() || null,
          eventId: eventId || null,
          timeLimitMinutes: timeLimitMinutes ?? null,
        },
        select: { id: true, title: true },
      })

      return ok({ success: true, id: test.id, title: test.title })
    }

    if (action === "edit") {
      const { id, title, description, eventId, timeLimitMinutes } = body
      if (!id) return err("Missing id.", 400)
      if (!title?.trim()) return err("Title is required.", 400)

      await prisma.test.update({
        where: { id },
        data: {
          title: title.trim(),
          description: description?.trim() || null,
          eventId: eventId ?? null,
          timeLimitMinutes: timeLimitMinutes ?? null,
        },
      })

      return ok({ success: true })
    }

    if (action === "delete") {
      const { id } = body
      if (!id) return err("Missing id.", 400)

      await prisma.test.delete({ where: { id } })
      return ok({ success: true })
    }

    // Replace all questions for a test
    if (action === "save-questions") {
      const { id, questions } = body
      if (!id) return err("Missing id.", 400)
      if (!Array.isArray(questions)) return err("Questions must be an array.", 400)

      await prisma.$transaction([
        prisma.testQuestion.deleteMany({ where: { testId: id } }),
        prisma.testQuestion.createMany({
          data: questions.map((q, i) => ({
            testId: id,
            order: q.order ?? i + 1,
            content: q.content,
            type: q.type ?? "MCQ",
            options: q.options != null ? (q.options as Prisma.InputJsonValue) : Prisma.JsonNull,
            answerKey: q.answerKey ?? null,
            points: q.points ?? 1,
            imageUrl: q.imageUrl ?? null,
            stationNumber: q.stationNumber ?? null,
            stationContext: q.stationContext ?? null,
          })),
        }),
      ])

      return ok({ success: true })
    }

    if (action === "toggle-active") {
      const { id } = body
      if (!id) return err("Missing id.", 400)
      const test = await prisma.test.findUnique({ where: { id }, select: { isActive: true } })
      if (!test) return err("Test not found.", 404)
      await prisma.test.update({ where: { id }, data: { isActive: !test.isActive } })
      return ok({ success: true, isActive: !test.isActive })
    }

    return err("Invalid action.", 400)
  },
  "manage tests"
)
