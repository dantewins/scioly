import { z } from "zod"
import { withPermission, ok, err } from "@/lib/api"
import { formatZodError } from "@/lib/zod-errors"
import {
  getPracticeAssessmentAnswerKey,
  upsertPracticeAssessmentAnswerKey,
} from "@/lib/practice-assessments"

export const dynamic = "force-dynamic"

export const GET = withPermission(
  "view_practice",
  async (_req, ctx: { params: Promise<{ id: string }> }, user) => {
    const { id } = await ctx.params
    const answerKey = await getPracticeAssessmentAnswerKey(id, user.clubId)
    if (!answerKey) return err("Test not found.", 404)
    return ok(answerKey)
  },
)

const putSchema = z.object({
  answers: z.array(z.string()).min(1).max(500),
})

export const PUT = withPermission(
  "edit_practice",
  async (req, ctx: { params: Promise<{ id: string }> }, user) => {
    const { id } = await ctx.params
    const body = await req.json()
    const parsed = putSchema.safeParse(body)
    if (!parsed.success) return err(formatZodError(parsed.error), 400)

    const key = await upsertPracticeAssessmentAnswerKey(id, user.clubId, parsed.data.answers)
    if (!key) return err("Test not found.", 404)
    return ok(key)
  },
)
