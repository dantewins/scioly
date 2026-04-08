import { z } from "zod"
import { AssessmentFormat, AssessmentPartType } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { withPermission, ok, err } from "@/lib/api"
import {
  deletePracticeAssessment,
  updatePracticeAssessment,
} from "@/lib/practice-assessments"

export const dynamic = "force-dynamic"

async function resolveAssessment(id: string, clubId: string) {
  return prisma.assessment.findFirst({
    where: { id, season: { clubId } },
    select: { id: true },
  })
}

const patchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).nullable().optional(),
  format: z.nativeEnum(AssessmentFormat).optional(),
  instructions: z.string().max(4000).nullable().optional(),
  sourcePdfUrl: z.string().url().optional(),
  answerKeyPdfUrl: z.string().url().nullable().optional(),
  timeLimitMinutes: z.number().int().min(1).max(300).nullable().optional(),
  eventId: z.string().nullable().optional(),
  isPublished: z.boolean().optional(),
  isArchived: z.boolean().optional(),
  parts: z.array(z.object({
    title: z.string().min(1).max(120),
    type: z.nativeEnum(AssessmentPartType),
    instructions: z.string().max(2000).nullable().optional(),
    pageFrom: z.number().int().min(1).nullable().optional(),
    pageTo: z.number().int().min(1).nullable().optional(),
    timeLimitMinutes: z.number().int().min(1).max(300).nullable().optional(),
  })).max(50).optional(),
})

export const PATCH = withPermission(
  "edit_practice",
  async (req, ctx: { params: Promise<{ id: string }> }, user) => {
    const { id } = await ctx.params
    const body = await req.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input.", 400)

    const test = await resolveAssessment(id, user.clubId)
    if (!test) return err("Test not found.", 404)

    const current = await prisma.assessment.findFirst({
      where: { id, season: { clubId: user.clubId } },
      include: {
        assets: {
          select: { kind: true, externalUrl: true },
        },
        parts: {
          select: {
            title: true,
            type: true,
            instructions: true,
            pageFrom: true,
            pageTo: true,
            timeLimitMinutes: true,
          },
          orderBy: { sortOrder: "asc" },
        },
      },
    })
    if (!current) return err("Test not found.", 404)

    const updated = await updatePracticeAssessment(id, user.clubId, {
      title: parsed.data.title ?? current.title,
      description: parsed.data.description === undefined ? current.description : parsed.data.description,
      format: parsed.data.format ?? current.format,
      instructions: parsed.data.instructions === undefined ? current.instructions : parsed.data.instructions,
      sourcePdfUrl:
        parsed.data.sourcePdfUrl ??
        current.assets.find((asset) => asset.kind === "SOURCE_PDF" || asset.kind === "QUESTION_PDF")?.externalUrl ??
        "",
      answerKeyPdfUrl:
        parsed.data.answerKeyPdfUrl === undefined
          ? current.assets.find((asset) => asset.kind === "ANSWER_KEY_PDF")?.externalUrl ?? null
          : parsed.data.answerKeyPdfUrl,
      timeLimitMinutes: parsed.data.timeLimitMinutes === undefined ? current.timeLimitMinutes : parsed.data.timeLimitMinutes,
      eventId: parsed.data.eventId === undefined ? current.eventId : parsed.data.eventId,
      isPublished: parsed.data.isPublished ?? current.isPublished,
      isArchived: parsed.data.isArchived ?? current.isArchived,
      parts: (parsed.data.parts ?? current.parts.map((part) => ({
        title: part.title,
        type: part.type,
        instructions: part.instructions ?? undefined,
        pageFrom: part.pageFrom,
        pageTo: part.pageTo,
        timeLimitMinutes: part.timeLimitMinutes,
      }))).map((part) => ({
        ...part,
        instructions: part.instructions ?? undefined,
      })),
    })
    return ok(updated)
  },
)

export const DELETE = withPermission(
  "delete_practice",
  async (_req, ctx: { params: Promise<{ id: string }> }, user) => {
    const { id } = await ctx.params
    const test = await resolveAssessment(id, user.clubId)
    if (!test) return err("Test not found.", 404)

    await deletePracticeAssessment(id, user.clubId)
    return ok({ ok: true })
  },
)
