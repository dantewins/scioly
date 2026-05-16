import { z } from "zod"
import { withActiveMemberAuth, ok, err } from "@/lib/api"
import { getMemberSeason } from "@/lib/db"
import { rateLimitErrorMessage, takeRateLimit } from "@/lib/rate-limit"
import { formatZodError } from "@/lib/zod-errors"
import {
  getMemberPracticeAttemptDetail,
  submitPracticeAssessmentAttempt,
  upsertMemberPracticeAttemptResponses,
} from "@/lib/practice-assessments"

export const dynamic = "force-dynamic"

function rateLimitError(action: string, retryAfterMs: number) {
  return err(rateLimitErrorMessage(action, retryAfterMs), 429)
}

const saveSchema = z.object({
  responses: z.array(
    z.object({
      promptId: z.string().optional(),
      promptNumber: z.number().int().min(1).optional(),
      responseText: z.string().nullable().optional(),
    }),
  ).max(1000),
})

const submitSchema = z.object({
  answers: z.array(z.string()).optional(),
})

export const GET = withActiveMemberAuth(
  async (_req, ctx: { params: Promise<{ attemptId: string }> }, user) => {
    const { attemptId } = await ctx.params
    const ms = await getMemberSeason(user.id, user.clubId)
    if (!ms) return err("Not a member this season.", 403)

    const attempt = await getMemberPracticeAttemptDetail(attemptId, user.clubId, ms.id)
    if (!attempt) return err("Attempt not found.", 404)
    return ok(attempt)
  },
)

export const PATCH = withActiveMemberAuth(
  async (req, ctx: { params: Promise<{ attemptId: string }> }, user) => {
    const { attemptId } = await ctx.params
    const ms = await getMemberSeason(user.id, user.clubId)
    if (!ms) return err("Not a member this season.", 403)

    const body = await req.json()
    const parsed = saveSchema.safeParse(body)
    if (!parsed.success) return err(formatZodError(parsed.error), 400)

    const limiter = await takeRateLimit(`member:practice:save:${user.id}:${attemptId}`, 120, 60_000)
    if (!limiter.allowed) return rateLimitError("autosave", limiter.retryAfterMs)

    try {
      const attempt = await upsertMemberPracticeAttemptResponses(
        attemptId,
        user.clubId,
        ms.id,
        parsed.data.responses,
      )
      if (!attempt) return err("Attempt not found.", 404)
      return ok(attempt)
    } catch (error) {
      if (error instanceof Error && error.message === "ATTEMPT_NOT_EDITABLE") {
        return err("This attempt can no longer be edited.", 400)
      }
      throw error
    }
  },
)

export const POST = withActiveMemberAuth(
  async (req, ctx: { params: Promise<{ attemptId: string }> }, user) => {
    const { attemptId } = await ctx.params
    const ms = await getMemberSeason(user.id, user.clubId)
    if (!ms) return err("Not a member this season.", 403)

    const body = await req.json().catch(() => ({}))
    const parsed = submitSchema.safeParse(body)
    if (!parsed.success) return err(formatZodError(parsed.error), 400)

    const limiter = await takeRateLimit(`member:practice:submit:${user.id}:${attemptId}`, 10, 300_000)
    if (!limiter.allowed) return rateLimitError("submit", limiter.retryAfterMs)

    try {
      const updated = await submitPracticeAssessmentAttempt(
        attemptId,
        user.clubId,
        ms.id,
        parsed.data.answers,
      )
      if (!updated) return err("Attempt not found.", 404)

      const attempt = await getMemberPracticeAttemptDetail(attemptId, user.clubId, ms.id)
      return ok(attempt)
    } catch (error) {
      if (error instanceof Error && error.message === "ATTEMPT_ALREADY_SUBMITTED") {
        return err("Already submitted.", 400)
      }
      if (error instanceof Error && error.message === "ATTEMPT_NOT_EDITABLE") {
        return err("This attempt can no longer be edited.", 400)
      }
      throw error
    }
  },
)
