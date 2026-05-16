import { z } from "zod"
import { AssessmentDifficulty, AssessmentResponseType, Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { withPermission, ok, err } from "@/lib/api"
import { formatZodError } from "@/lib/zod-errors"

export const dynamic = "force-dynamic"

const promptSchema = z.object({
  label: z.string().max(200).optional(),
  responseType: z.nativeEnum(AssessmentResponseType),
  pointsPossible: z.number().min(0).max(99999.99).nullable().optional(),
  answerKeyText: z.string().max(500).nullable().optional(),
  // For MCQ: ordered list of option labels and the index of the correct one.
  choiceOptions: z.array(z.string().min(1).max(200)).max(10).optional(),
  correctChoiceIndex: z.number().int().min(0).max(9).nullable().optional(),
  difficulty: z.nativeEnum(AssessmentDifficulty).nullable().optional(),
  subtopics: z.array(z.string().min(1).max(60)).max(20).optional(),
  instructions: z.string().max(2000).nullable().optional(),
})

const putSchema = z.object({
  prompts: z.array(promptSchema).min(1).max(500),
})

export const GET = withPermission(
  "view_practice",
  async (_req, ctx: { params: Promise<{ id: string }> }, user) => {
    const { id } = await ctx.params

    const assessment = await prisma.assessment.findFirst({
      where: { id, season: { clubId: user.clubId } },
      select: { id: true },
    })
    if (!assessment) return err("Test not found.", 404)

    const prompts = await prisma.assessmentPrompt.findMany({
      where: { assessmentId: assessment.id },
      orderBy: { promptNumber: "asc" },
      select: {
        id: true,
        promptNumber: true,
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

    return ok({
      id: assessment.id,
      prompts: prompts.map((p) => ({
        ...p,
        pointsPossible: p.pointsPossible !== null ? Number(p.pointsPossible) : null,
        choiceOptions: Array.isArray(p.choiceOptions)
          ? (p.choiceOptions as unknown[]).filter((c): c is string => typeof c === "string")
          : null,
      })),
    })
  },
)

// PUT — replace the full prompt set for this assessment.
// Renumbers prompts 1..N based on array order. Deletes any prompt
// beyond N. Cascade-deletes the related responses (rare; only when
// admin intentionally shrinks the test).
export const PUT = withPermission(
  "edit_practice",
  async (req, ctx: { params: Promise<{ id: string }> }, user) => {
    const { id } = await ctx.params

    const assessment = await prisma.assessment.findFirst({
      where: { id, season: { clubId: user.clubId } },
      select: { id: true },
    })
    if (!assessment) return err("Test not found.", 404)

    const body = await req.json().catch(() => null)
    const parsed = putSchema.safeParse(body)
    if (!parsed.success) {
      return err(formatZodError(parsed.error), 400)
    }

    await prisma.$transaction(async (tx) => {
      // Upsert each prompt by promptNumber.
      for (const [index, p] of parsed.data.prompts.entries()) {
        const promptNumber = index + 1
        const isMcq = p.responseType === AssessmentResponseType.MULTIPLE_CHOICE
        const choiceOptions: Prisma.InputJsonValue | typeof Prisma.JsonNull = isMcq && p.choiceOptions && p.choiceOptions.length > 0
          ? p.choiceOptions
          : Prisma.JsonNull
        const correctChoiceIndex = isMcq ? p.correctChoiceIndex ?? null : null

        await tx.assessmentPrompt.upsert({
          where: {
            assessmentId_promptNumber: {
              assessmentId: assessment.id,
              promptNumber,
            },
          },
          create: {
            assessmentId: assessment.id,
            promptNumber,
            label: p.label?.trim() || `Q${promptNumber}`,
            responseType: p.responseType,
            pointsPossible: p.pointsPossible !== undefined && p.pointsPossible !== null
              ? new Prisma.Decimal(p.pointsPossible)
              : null,
            answerKeyText: isMcq ? null : (p.answerKeyText?.trim() || null),
            choiceOptions,
            correctChoiceIndex,
            difficulty: p.difficulty ?? null,
            subtopics: p.subtopics ?? [],
            instructions: p.instructions?.trim() || null,
          },
          update: {
            label: p.label?.trim() || `Q${promptNumber}`,
            responseType: p.responseType,
            pointsPossible: p.pointsPossible !== undefined && p.pointsPossible !== null
              ? new Prisma.Decimal(p.pointsPossible)
              : null,
            answerKeyText: isMcq ? null : (p.answerKeyText?.trim() || null),
            choiceOptions,
            correctChoiceIndex,
            difficulty: p.difficulty ?? null,
            subtopics: p.subtopics ?? [],
            instructions: p.instructions?.trim() || null,
          },
        })
      }

      // Drop any prompt beyond the new count.
      await tx.assessmentPrompt.deleteMany({
        where: {
          assessmentId: assessment.id,
          promptNumber: { gt: parsed.data.prompts.length },
        },
      })
    })

    return ok({ ok: true, count: parsed.data.prompts.length })
  },
)
