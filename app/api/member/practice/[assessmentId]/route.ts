import { z } from "zod"
import { withMemberAuth, ok, err } from "@/lib/api"
import { getMemberSeason } from "@/lib/db"
import { rateLimitErrorMessage, takeRateLimit } from "@/lib/rate-limit"
import {
  getMemberPracticeAssessmentDetail,
  getMemberPracticeAttemptDetail,
  startOrResumePracticeAssessmentAttempt,
} from "@/lib/practice-assessments"

export const dynamic = "force-dynamic"

function rateLimitError(action: string, retryAfterMs: number) {
  return err(rateLimitErrorMessage(action, retryAfterMs), 429)
}

const startSchema = z.object({
  forceNew: z.boolean().optional(),
})

export const GET = withMemberAuth(
  async (_req, ctx: { params: Promise<{ assessmentId: string }> }, user) => {
    const { assessmentId } = await ctx.params
    const ms = await getMemberSeason(user.id, user.clubId)
    if (!ms) return err("Not a member this season.", 403)

    const assessment = await getMemberPracticeAssessmentDetail(assessmentId, user.clubId, ms.id)
    if (!assessment) return err("Assessment not found.", 404)
    return ok(assessment)
  },
)

export const POST = withMemberAuth(
  async (req, ctx: { params: Promise<{ assessmentId: string }> }, user) => {
    const { assessmentId } = await ctx.params
    const ms = await getMemberSeason(user.id, user.clubId)
    if (!ms) return err("Not a member this season.", 403)

    const body = await req.json().catch(() => ({}))
    const parsed = startSchema.safeParse(body)
    if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input.", 400)

    const limiter = await takeRateLimit(`member:practice:start:${user.id}`, 30, 60_000)
    if (!limiter.allowed) return rateLimitError("start", limiter.retryAfterMs)

    const attemptMeta = await startOrResumePracticeAssessmentAttempt(
      assessmentId,
      user.clubId,
      ms.id,
      { forceNew: parsed.data.forceNew ?? false },
    )
    if (!attemptMeta) return err("Assessment not found.", 404)

    const attempt = await getMemberPracticeAttemptDetail(attemptMeta.attemptId, user.clubId, ms.id)
    return ok({
      id: attemptMeta.attemptId,
      resumed: attemptMeta.resumed,
      attempt,
    }, 201)
  },
)
