// Member-side practice queries: list/feed/detail of assessments visible to a member.

import { prisma } from "@/lib/prisma"
import {
  assessmentAssetArgs,
  assessmentAttemptSelect,
  assessmentEventSelect,
  assessmentPartArgs,
  buildPracticeAssessmentInclude,
  memberAssessmentPromptArgs,
} from "./shapes"
import { calculateProgress, mapPracticeAssessment, pickAssetUrl } from "./mappers"
import type {
  MemberPracticeAssessmentDetail,
  MemberPracticeFeed,
  MemberPracticeFeedRecord,
  PracticeAssessmentRecord,
} from "./types"

export async function listPracticeAssessmentsForMember(
  seasonId: string,
  memberSeasonId: string | null,
): Promise<PracticeAssessmentRecord[]> {
  const [enrollmentRows, assessments] = await Promise.all([
    memberSeasonId
      ? prisma.eventEnrollment.findMany({
          where: {
            memberSeasonId,
            status: { in: ["INTERESTED", "TRYOUT_PENDING", "ACTIVE", "WAITLISTED"] },
          },
          select: { eventId: true },
        })
      : Promise.resolve([]),
    prisma.assessment.findMany({
      where: {
        seasonId,
        isPublished: true,
        isArchived: false,
        prompts: { some: {} },
      },
      include: buildPracticeAssessmentInclude(memberSeasonId),
      orderBy: { createdAt: "desc" },
    }),
  ])
  const enrolledEventIds = new Set(enrollmentRows.map((e) => e.eventId))

  return assessments
    .map((assessment) =>
      mapPracticeAssessment(assessment, {
        recommended: Boolean(assessment.eventId && enrolledEventIds.has(assessment.eventId)),
      }),
    )
    .sort((a, b) => {
      if (a.hasInProgressAttempt !== b.hasInProgressAttempt) {
        return a.hasInProgressAttempt ? -1 : 1
      }
      if (a.recommended !== b.recommended) {
        return a.recommended ? -1 : 1
      }
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    })
}

export async function getMemberPracticeFeed(
  seasonId: string,
  memberSeasonId: string | null,
): Promise<MemberPracticeFeed> {
  const assessments = await listPracticeAssessmentsForMember(seasonId, memberSeasonId)
  const feedAssessments: MemberPracticeFeedRecord[] = assessments.map((assessment) => ({
    ...assessment,
    inProgressAttempts: assessment.attempts.filter((attempt) => attempt.status === "IN_PROGRESS").length,
    submittedAttempts: assessment.attempts.filter((attempt) => attempt.status === "SUBMITTED" || attempt.status === "SCORED").length,
  }))

  const continueAttempts = feedAssessments
    .flatMap((assessment) =>
      assessment.attempts
        .filter((attempt) => attempt.status === "IN_PROGRESS")
        .map((attempt) => ({
          attemptId: attempt.id,
          assessmentId: assessment.id,
          title: assessment.title,
          format: assessment.format,
          eventName: assessment.event?.name ?? null,
          startedAt: attempt.startedAt,
          answeredCount: attempt.answeredCount,
          promptCount: attempt.promptCount,
          progressPercent: attempt.progressPercent,
        })),
    )
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())

  const recentAttempts = feedAssessments
    .flatMap((assessment) =>
      assessment.attempts
        .filter((attempt) => attempt.status === "SUBMITTED" || attempt.status === "SCORED")
        .filter((attempt) => attempt.submittedAt !== null)
        .map((attempt) => ({
          attemptId: attempt.id,
          assessmentId: assessment.id,
          title: assessment.title,
          format: assessment.format,
          eventName: assessment.event?.name ?? null,
          status: attempt.status as "SUBMITTED" | "SCORED",
          score: attempt.score,
          scorePossible: attempt.scorePossible,
          submittedAt: attempt.submittedAt as string,
        })),
    )
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
    .slice(0, 20)

  return {
    assessments: feedAssessments,
    continueAttempts,
    recommendedAssessments: feedAssessments.filter((assessment) => assessment.recommended),
    recentAttempts,
  }
}

export async function getMemberPracticeAssessmentDetail(
  assessmentId: string,
  clubId: string,
  memberSeasonId: string,
): Promise<MemberPracticeAssessmentDetail | null> {
  const assessment = await prisma.assessment.findFirst({
    where: {
      id: assessmentId,
      isPublished: true,
      isArchived: false,
      prompts: { some: {} },
      season: { clubId },
    },
    include: {
      event: assessmentEventSelect,
      assets: assessmentAssetArgs,
      parts: assessmentPartArgs,
      prompts: memberAssessmentPromptArgs,
      attempts: {
        where: { memberSeasonId },
        select: assessmentAttemptSelect,
        orderBy: { startedAt: "desc" },
      },
    },
  })
  if (!assessment) return null

  const promptCount = assessment.prompts.length
  const currentAttempt = assessment.attempts.find((attempt) => attempt.status === "IN_PROGRESS") ?? null

  return {
    id: assessment.id,
    title: assessment.title,
    description: assessment.description ?? null,
    format: assessment.format,
    instructions: assessment.instructions ?? null,
    timeLimitMinutes: assessment.timeLimitMinutes ?? null,
    event: assessment.event,
    assets: assessment.assets.map((asset) => ({
      id: asset.id,
      kind: asset.kind,
      label: asset.label,
      externalUrl: asset.externalUrl ?? null,
      sortOrder: asset.sortOrder ?? null,
    })),
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
    prompts: assessment.prompts.map((prompt) => ({
      id: prompt.id,
      partId: prompt.partId ?? null,
      promptNumber: prompt.promptNumber,
      label: prompt.label ?? null,
      responseType: prompt.responseType,
      pointsPossible: prompt.pointsPossible === null ? null : Number(prompt.pointsPossible),
      pageRef: prompt.pageRef ?? null,
      instructions: prompt.instructions ?? null,
      isRequired: prompt.isRequired,
    })),
    promptCount,
    attempts: assessment.attempts.map((attempt) => ({
      id: attempt.id,
      status: attempt.status,
      score: attempt.scoreEarned === null ? null : Number(attempt.scoreEarned),
      scorePossible: attempt.scorePossible === null ? null : Number(attempt.scorePossible),
      answeredCount: attempt._count.responses,
      progressPercent: calculateProgress(attempt._count.responses, promptCount),
      startedAt: attempt.startedAt.toISOString(),
      submittedAt: attempt.submittedAt?.toISOString() ?? null,
    })),
    currentAttemptId: currentAttempt?.id ?? null,
    sourcePdfUrl: pickAssetUrl(assessment, ["SOURCE_PDF", "QUESTION_PDF"]),
    answerKeyPdfUrl: pickAssetUrl(assessment, ["ANSWER_KEY_PDF"]),
  }
}
