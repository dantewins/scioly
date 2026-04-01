import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withPermission, ok, err } from "@/lib/api"

export const dynamic = "force-dynamic"

export const GET = withPermission(
  "view_practice",
  async (_req, ctx: { params: Promise<{ id: string }> }, user) => {
    const { id: testId } = await ctx.params
    const test = await prisma.practiceTest.findFirst({
      where: { id: testId, season: { clubId: user.clubId } },
      include: { answerKey: true },
    })
    if (!test) return err("Test not found.", 404)
    return ok(test.answerKey)
  },
)

const putSchema = z.object({
  answers: z.array(z.string()).min(1).max(500),
})

export const PUT = withPermission(
  "edit_practice",
  async (req, ctx: { params: Promise<{ id: string }> }, user) => {
    const { id: testId } = await ctx.params
    const body = await req.json()
    const parsed = putSchema.safeParse(body)
    if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input.", 400)

    const test = await prisma.practiceTest.findFirst({
      where: { id: testId, season: { clubId: user.clubId } },
    })
    if (!test) return err("Test not found.", 404)

    const key = await prisma.answerKey.upsert({
      where: { practiceTestId: testId },
      create: { practiceTestId: testId, answers: parsed.data.answers },
      update: { answers: parsed.data.answers },
    })
    return ok(key)
  },
)
