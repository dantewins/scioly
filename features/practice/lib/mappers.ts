// Pure mapping helpers that turn Prisma rows into the API/UI-facing shapes.
// These don't talk to the DB themselves — caller resolves rows first.

import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { buildPracticeAssessmentInclude } from "./shapes"
import type {
  PracticeAssessmentInput,
  PracticeAssessmentPartInput,
  PracticeAssessmentQueryResult,
  PracticeAssessmentRecord,
} from "./types"

export function pickAssetUrl(
  assessment: Pick<PracticeAssessmentQueryResult, "assets">,
  kinds: string[],
): string | null {
  for (const kind of kinds) {
    const asset = assessment.assets.find((item) => item.kind === kind)
    if (asset?.externalUrl) return asset.externalUrl
  }
  return null
}

export function calculateProgress(
  answeredCount: number,
  promptCount: number,
): number {
  if (promptCount <= 0) return 0
  return Math.min(100, Math.round((answeredCount / promptCount) * 100))
}

export function mapPracticeAssessment(
  assessment: PracticeAssessmentQueryResult,
  options?: { recommended?: boolean },
): PracticeAssessmentRecord {
  const hasAnswerKey =
    assessment.prompts.some((prompt) => Boolean(prompt.answerKeyText?.trim())) ||
    Boolean(pickAssetUrl(assessment, ["ANSWER_KEY_PDF"]))
  const promptCount = assessment.prompts.length
  const latestAttempt = assessment.attempts[0] ?? null
  const hasInProgressAttempt = assessment.attempts.some((attempt) => attempt.status === "IN_PROGRESS")

  return {
    id: assessment.id,
    title: assessment.title,
    description: assessment.description ?? null,
    format: assessment.format,
    instructions: assessment.instructions ?? null,
    timeLimitMinutes: assessment.timeLimitMinutes ?? null,
    eventId: assessment.eventId ?? null,
    event: assessment.event,
    isPublished: assessment.isPublished,
    isArchived: assessment.isArchived,
    sourcePdfUrl: pickAssetUrl(assessment, ["SOURCE_PDF", "QUESTION_PDF"]) ?? "",
    answerKeyPdfUrl: pickAssetUrl(assessment, ["ANSWER_KEY_PDF"]),
    answerKey: hasAnswerKey ? { id: assessment.id } : null,
    parts: assessment.parts.map((part) => ({
      id: part.id,
      title: part.title,
      type: part.type,
      instructions: part.instructions ?? null,
      sortOrder: part.sortOrder,
      pageFrom: part.pageFrom ?? null,
      pageTo: part.pageTo ?? null,
      timeLimitMinutes: part.timeLimitMinutes ?? null,
    })),
    attemptCount: assessment._count.attempts,
    attempts: assessment.attempts.map((attempt) => ({
      id: attempt.id,
      status: attempt.status,
      score: attempt.scoreEarned === null ? null : Number(attempt.scoreEarned),
      scorePossible: attempt.scorePossible === null ? null : Number(attempt.scorePossible),
      answeredCount: attempt._count.responses,
      promptCount,
      progressPercent: calculateProgress(attempt._count.responses, promptCount),
      startedAt: attempt.startedAt.toISOString(),
      submittedAt: attempt.submittedAt?.toISOString() ?? null,
    })),
    recommended: options?.recommended ?? false,
    hasInProgressAttempt,
    latestAttemptId: latestAttempt?.id ?? null,
    latestAttemptStatus: latestAttempt?.status ?? null,
    createdAt: assessment.createdAt.toISOString(),
    updatedAt: assessment.updatedAt.toISOString(),
  }
}

export async function resolveAssessment(
  id: string,
  clubId: string,
  db: Prisma.TransactionClient | typeof prisma = prisma,
) {
  return db.assessment.findFirst({
    where: { id, season: { clubId } },
    select: { id: true },
  })
}

export async function getPracticeAssessmentById(
  assessmentId: string,
  memberSeasonId?: string,
  db: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<PracticeAssessmentRecord | null> {
  const assessment = await db.assessment.findUnique({
    where: { id: assessmentId },
    include: buildPracticeAssessmentInclude(memberSeasonId),
  })

  return assessment ? mapPracticeAssessment(assessment) : null
}

export async function syncAssessmentAssets(
  db: Prisma.TransactionClient,
  assessmentId: string,
  input: Pick<PracticeAssessmentInput, "sourcePdfUrl" | "answerKeyPdfUrl">,
) {
  await db.assessmentAsset.deleteMany({
    where: {
      assessmentId,
      kind: { in: ["SOURCE_PDF", "QUESTION_PDF", "ANSWER_KEY_PDF"] },
    },
  })

  await db.assessmentAsset.create({
    data: {
      assessmentId,
      label: "Source Packet",
      kind: "SOURCE_PDF",
      externalUrl: input.sourcePdfUrl,
      sortOrder: 1,
    },
  })

  if (input.answerKeyPdfUrl) {
    await db.assessmentAsset.create({
      data: {
        assessmentId,
        label: "Answer Key",
        kind: "ANSWER_KEY_PDF",
        externalUrl: input.answerKeyPdfUrl,
        sortOrder: 2,
      },
    })
  }
}

export async function syncAssessmentParts(
  db: Prisma.TransactionClient,
  assessmentId: string,
  parts: PracticeAssessmentPartInput[],
) {
  await db.assessmentPart.deleteMany({ where: { assessmentId } })

  if (parts.length === 0) return

  await db.assessmentPart.createMany({
    data: parts.map((part, index) => ({
      assessmentId,
      title: part.title.trim(),
      type: part.type,
      instructions: part.instructions?.trim() || null,
      sortOrder: index + 1,
      pageFrom: part.pageFrom ?? null,
      pageTo: part.pageTo ?? null,
      timeLimitMinutes: part.timeLimitMinutes ?? null,
    })),
  })
}
