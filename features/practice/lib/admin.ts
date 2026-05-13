// Admin-side practice queries + mutations. Members never call into this file.

import { prisma } from "@/lib/prisma"
import { buildPracticeAssessmentInclude } from "./shapes"
import {
  getPracticeAssessmentById,
  mapPracticeAssessment,
  resolveAssessment,
  syncAssessmentAssets,
  syncAssessmentParts,
} from "./mappers"
import type { PracticeAssessmentInput, PracticeAssessmentRecord } from "./types"

export async function listPracticeAssessmentsForAdmin(
  seasonId: string,
): Promise<PracticeAssessmentRecord[]> {
  const assessments = await prisma.assessment.findMany({
    where: { seasonId, isArchived: false },
    include: buildPracticeAssessmentInclude(),
    orderBy: { createdAt: "desc" },
  })

  return assessments.map((assessment) => mapPracticeAssessment(assessment))
}

export async function getPracticeAssessmentForAdmin(
  id: string,
  clubId: string,
): Promise<PracticeAssessmentRecord | null> {
  const assessment = await prisma.assessment.findFirst({
    where: { id, season: { clubId } },
    include: buildPracticeAssessmentInclude(),
  })
  if (!assessment) return null
  return mapPracticeAssessment(assessment)
}

export async function createPracticeAssessment(
  seasonId: string,
  input: PracticeAssessmentInput,
): Promise<PracticeAssessmentRecord> {
  const created = await prisma.$transaction(async (db) => {
    const assessment = await db.assessment.create({
      data: {
        seasonId,
        eventId: input.eventId ?? null,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        format: input.format,
        instructions: input.instructions?.trim() || null,
        timeLimitMinutes: input.timeLimitMinutes ?? null,
        isPublished: input.isPublished,
        isArchived: input.isArchived ?? false,
      },
      select: { id: true },
    })

    await syncAssessmentAssets(db, assessment.id, input)
    await syncAssessmentParts(db, assessment.id, input.parts ?? [])

    return assessment.id
  })

  const assessment = await getPracticeAssessmentById(created)
  if (!assessment) throw new Error("ASSESSMENT_CREATE_FAILED")
  return assessment
}

export async function updatePracticeAssessment(
  id: string,
  clubId: string,
  input: PracticeAssessmentInput,
): Promise<PracticeAssessmentRecord | null> {
  const assessment = await resolveAssessment(id, clubId)
  if (!assessment) return null

  await prisma.$transaction(async (db) => {
    await db.assessment.update({
      where: { id: assessment.id },
      data: {
        eventId: input.eventId ?? null,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        format: input.format,
        instructions: input.instructions?.trim() || null,
        timeLimitMinutes: input.timeLimitMinutes ?? null,
        isPublished: input.isPublished,
        isArchived: input.isArchived ?? false,
      },
    })

    await syncAssessmentAssets(db, assessment.id, input)
    await syncAssessmentParts(db, assessment.id, input.parts ?? [])
  })

  return getPracticeAssessmentById(assessment.id)
}

export async function deletePracticeAssessment(
  id: string,
  clubId: string,
): Promise<boolean> {
  const assessment = await resolveAssessment(id, clubId)
  if (!assessment) return false

  await prisma.assessment.delete({ where: { id: assessment.id } })
  return true
}

export async function getPracticeAssessmentAnswerKey(
  id: string,
  clubId: string,
) {
  const assessment = await resolveAssessment(id, clubId)
  if (!assessment) return null

  const prompts = await prisma.assessmentPrompt.findMany({
    where: { assessmentId: assessment.id },
    select: { answerKeyText: true },
    orderBy: { promptNumber: "asc" },
  })

  return {
    id: assessment.id,
    answers: prompts
      .map((prompt) => prompt.answerKeyText?.trim() ?? "")
      .filter((answer) => answer.length > 0),
  }
}

export async function upsertPracticeAssessmentAnswerKey(
  id: string,
  clubId: string,
  answers: string[],
) {
  const assessment = await resolveAssessment(id, clubId)
  if (!assessment) return null

  await prisma.$transaction(async (db) => {
    const normalizedAnswers = answers.map((answer) => answer.trim())

    for (const [index, answer] of normalizedAnswers.entries()) {
      await db.assessmentPrompt.upsert({
        where: {
          assessmentId_promptNumber: {
            assessmentId: assessment.id,
            promptNumber: index + 1,
          },
        },
        create: {
          assessmentId: assessment.id,
          promptNumber: index + 1,
          label: `Q${index + 1}`,
          responseType: "SHORT_TEXT",
          answerKeyText: answer,
        },
        update: {
          answerKeyText: answer,
        },
      })
    }

    await db.assessmentPrompt.updateMany({
      where: {
        assessmentId: assessment.id,
        promptNumber: { gt: normalizedAnswers.length },
      },
      data: {
        answerKeyText: null,
      },
    })
  })

  return getPracticeAssessmentAnswerKey(id, clubId)
}
