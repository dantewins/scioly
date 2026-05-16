import { z } from "zod"
import { AssessmentDifficulty, AssessmentResponseType, Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { withActiveMemberAuth, ok, err } from "@/lib/api"
import { getActiveSeason, getMemberSeason } from "@/lib/db"
import { rateLimitErrorMessage, takeRateLimit } from "@/lib/rate-limit"

export const dynamic = "force-dynamic"

const generateSchema = z.object({
  eventId: z.string().optional(),
  count: z.number().int().min(1).max(50),
  timeLimitMinutes: z.number().int().min(1).max(240).optional(),
  types: z.array(z.enum(["MCQ", "FRQ"])).optional(),
  difficulties: z.array(z.nativeEnum(AssessmentDifficulty)).optional(),
  subtopics: z.array(z.string().min(1).max(60)).optional(),
})

// POST — generate a one-off practice test from the question pool.
// Samples AssessmentPrompts across all published, non-archived
// assessments in the active season for the optional event, filtered
// by type/difficulty/subtopics. Clones the sampled prompts into a
// fresh Assessment with format=GENERATED so the existing attempt
// flow just works.
export const POST = withActiveMemberAuth(async (req, _ctx, user) => {
  const limiter = await takeRateLimit(`practice:generate:${user.id}`, 20, 60 * 60_000)
  if (!limiter.allowed) {
    return err(rateLimitErrorMessage("test generation", limiter.retryAfterMs), 429)
  }

  const body = await req.json()
  const parsed = generateSchema.safeParse(body)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    const fieldPath = issue?.path && issue.path.length > 0 ? issue.path.join(".") + ": " : ""
    return err(`${fieldPath}${issue?.message ?? "Invalid input."}`, 400)
  }

  const { eventId, count, timeLimitMinutes, types, difficulties, subtopics } = parsed.data

  const season = await getActiveSeason(user.clubId)
  if (!season) return err("No active season.", 400)

  const memberSeason = await getMemberSeason(user.id, user.clubId)
  if (!memberSeason) return err("Active membership required.", 403)

  // Translate type filter to responseType list. MCQ = MULTIPLE_CHOICE; FRQ
  // covers SHORT_TEXT (the only FRQ shape today). If both/neither, allow all.
  const responseTypes: AssessmentResponseType[] | undefined =
    types && types.length > 0 && types.length < 2
      ? types[0] === "MCQ"
        ? [AssessmentResponseType.MULTIPLE_CHOICE]
        : [AssessmentResponseType.SHORT_TEXT]
      : undefined

  // Find candidate prompts.
  const candidates = await prisma.assessmentPrompt.findMany({
    where: {
      assessment: {
        seasonId: season.id,
        isPublished: true,
        isArchived: false,
        ...(eventId ? { eventId } : {}),
      },
      ...(responseTypes ? { responseType: { in: responseTypes } } : {}),
      ...(difficulties && difficulties.length > 0 ? { difficulty: { in: difficulties } } : {}),
      ...(subtopics && subtopics.length > 0 ? { subtopics: { hasSome: subtopics } } : {}),
    },
    select: {
      id: true,
      label: true,
      responseType: true,
      pointsPossible: true,
      answerKeyText: true,
      choiceOptions: true,
      correctChoiceIndex: true,
      difficulty: true,
      subtopics: true,
      instructions: true,
    },
  })

  if (candidates.length === 0) {
    return err("No matching questions for those filters.", 404)
  }

  // Reservoir sample N prompts.
  const picked: typeof candidates = []
  const pool = [...candidates]
  while (picked.length < count && pool.length > 0) {
    const idx = Math.floor(Math.random() * pool.length)
    picked.push(pool.splice(idx, 1)[0])
  }

  const filtersJson: Prisma.InputJsonValue = {
    eventId: eventId ?? null,
    count,
    timeLimitMinutes: timeLimitMinutes ?? null,
    types: types ?? [],
    difficulties: difficulties ?? [],
    subtopics: subtopics ?? [],
  }

  // Build the synthesized Assessment + Attempt in one transaction.
  const attempt = await prisma.$transaction(async (tx) => {
    const generated = await tx.assessment.create({
      data: {
        seasonId: season.id,
        eventId: eventId ?? null,
        title: `Generated · ${picked.length} questions`,
        format: "GENERATED",
        timeLimitMinutes: timeLimitMinutes ?? null,
        isPublished: false,
        isArchived: false,
        prompts: {
          create: picked.map((p, i) => ({
            promptNumber: i + 1,
            label: p.label,
            responseType: p.responseType,
            pointsPossible: p.pointsPossible,
            answerKeyText: p.answerKeyText,
            choiceOptions: p.choiceOptions ?? Prisma.JsonNull,
            correctChoiceIndex: p.correctChoiceIndex,
            difficulty: p.difficulty,
            subtopics: p.subtopics,
            instructions: p.instructions,
          })),
        },
      },
      select: { id: true },
    })

    const created = await tx.assessmentAttempt.create({
      data: {
        assessmentId: generated.id,
        memberSeasonId: memberSeason.id,
        status: "IN_PROGRESS",
        generatedFromFilters: filtersJson,
      },
      select: { id: true },
    })

    return created
  })

  return ok({ attemptId: attempt.id, sampledCount: picked.length }, 201)
})
