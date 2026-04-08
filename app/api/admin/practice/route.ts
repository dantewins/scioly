import { z } from "zod"
import { AssessmentFormat, AssessmentPartType } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { withAnyPermission, withPermission, ok, err } from "@/lib/api"
import { getActiveSeason } from "@/lib/db"
import {
  createPracticeAssessment,
  listPracticeAssessmentsForAdmin,
} from "@/lib/practice-assessments"

export const dynamic = "force-dynamic"

export const GET = withPermission("view_practice", async (_req, _ctx, user) => {
  const season = await getActiveSeason(user.clubId)
  if (!season) return err("No active season.", 400)

  const tests = await listPracticeAssessmentsForAdmin(season.id)
  return ok(tests)
})

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).nullable().optional(),
  format: z.nativeEnum(AssessmentFormat).default(AssessmentFormat.TEST),
  instructions: z.string().max(4000).nullable().optional(),
  sourcePdfUrl: z.string().url(),
  answerKeyPdfUrl: z.string().url().nullable().optional(),
  timeLimitMinutes: z.number().int().min(1).max(300).optional(),
  eventId: z.string().optional(),
  isPublished: z.boolean().default(true),
  parts: z.array(z.object({
    title: z.string().min(1).max(120),
    type: z.nativeEnum(AssessmentPartType),
    instructions: z.string().max(2000).nullable().optional(),
    pageFrom: z.number().int().min(1).nullable().optional(),
    pageTo: z.number().int().min(1).nullable().optional(),
    timeLimitMinutes: z.number().int().min(1).max(300).nullable().optional(),
  })).max(50).optional(),
})

export const POST = withAnyPermission(["create_practice", "edit_practice"], async (req, _ctx, user) => {
  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input.", 400)

  const season = await getActiveSeason(user.clubId)
  if (!season) return err("No active season.", 400)

  // Verify event belongs to this season if provided
  if (parsed.data.eventId) {
    const event = await prisma.event.findFirst({
      where: { id: parsed.data.eventId, seasonId: season.id },
    })
    if (!event) return err("Event not found.", 404)
  }

  const test = await createPracticeAssessment(season.id, {
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    format: parsed.data.format,
    instructions: parsed.data.instructions ?? null,
    sourcePdfUrl: parsed.data.sourcePdfUrl,
    answerKeyPdfUrl: parsed.data.answerKeyPdfUrl ?? null,
    timeLimitMinutes: parsed.data.timeLimitMinutes ?? null,
    eventId: parsed.data.eventId ?? null,
    isPublished: parsed.data.isPublished,
    parts: (parsed.data.parts ?? []).map((part) => ({
      ...part,
      instructions: part.instructions ?? undefined,
    })),
  })
  return ok(test, 201)
})
