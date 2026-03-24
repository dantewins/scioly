import type { User } from "@prisma/client"
import { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { withAdminAuth, ok, err } from "@/lib/api"
import { getActiveSeason } from "@/lib/db"

export const dynamic = "force-dynamic"

// GET /api/admin/tests          → list all tests for active season (summary)
// GET /api/admin/tests?id=xxx   → full test with questions
export const GET = withAdminAuth(
  async (request: Request, _ctx: unknown, currentUser: User) => {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

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
      return ok(test)
    }

    // List all tests for active season
    const activeSeason = await getActiveSeason(currentUser.clubId)
    if (!activeSeason) return ok([])

    const tests = await prisma.test.findMany({
      where: { seasonId: activeSeason.id },
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
        createdAt: t.createdAt.toISOString(),
      }))
    )
  },
  "fetch tests"
)

type QuestionInput = {
  order: number
  content: string
  type: "MCQ" | "FREE_RESPONSE"
  options?: { label: string; text: string }[]
  answerKey?: string | null
  points?: number
}

// POST /api/admin/tests — CRUD actions
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
      questions?: QuestionInput[]
    }

    const { action } = body

    if (action === "create") {
      const { title, description, eventId } = body
      if (!title?.trim()) return err("Title is required.", 400)

      const test = await prisma.test.create({
        data: {
          seasonId: activeSeason.id,
          title: title.trim(),
          description: description?.trim() || null,
          eventId: eventId || null,
        },
        select: { id: true, title: true },
      })

      return ok({ success: true, id: test.id, title: test.title })
    }

    if (action === "edit") {
      const { id, title, description, eventId } = body
      if (!id) return err("Missing id.", 400)
      if (!title?.trim()) return err("Title is required.", 400)

      await prisma.test.update({
        where: { id },
        data: {
          title: title.trim(),
          description: description?.trim() || null,
          eventId: eventId ?? null,
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

    // Replace all questions for a test (used after both manual entry and upload review)
    if (action === "save-questions") {
      const { id, questions } = body
      if (!id) return err("Missing id.", 400)
      if (!Array.isArray(questions)) return err("Questions must be an array.", 400)

      // Delete existing questions then recreate in the right order
      await prisma.$transaction([
        prisma.testQuestion.deleteMany({ where: { testId: id } }),
        prisma.testQuestion.createMany({
          data: questions.map((q, i) => ({
            testId: id,
            order: q.order ?? i + 1,
            content: q.content,
            type: q.type ?? "MCQ",
            // Prisma requires Prisma.JsonNull for nullable Json fields
            options: q.options != null ? (q.options as Prisma.InputJsonValue) : Prisma.JsonNull,
            answerKey: q.answerKey ?? null,
            points: q.points ?? 1,
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
