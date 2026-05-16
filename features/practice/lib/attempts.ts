// Practice attempt lifecycle: start, save, submit, fetch.

import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import {
  assessmentAssetArgs,
  assessmentEventSelect,
  assessmentPartArgs,
  memberAssessmentPromptArgs,
} from "./shapes"
import { calculateProgress, pickAssetUrl } from "./mappers"
import type { MemberPracticeAttemptDetail } from "./types"

export async function getMemberPracticeAttemptDetail(
  attemptId: string,
  clubId: string,
  memberSeasonId: string,
): Promise<MemberPracticeAttemptDetail | null> {
  const attempt = await prisma.assessmentAttempt.findFirst({
    where: {
      id: attemptId,
      memberSeasonId,
      assessment: { season: { clubId } },
    },
    include: {
      responses: {
        select: {
          promptId: true,
          responseText: true,
          isCorrect: true,
          pointsAwarded: true,
        },
      },
      assessment: {
        include: {
          event: assessmentEventSelect,
          assets: assessmentAssetArgs,
          parts: assessmentPartArgs,
          prompts: memberAssessmentPromptArgs,
        },
      },
    },
  })
  if (!attempt) return null

  const responseMap = new Map(attempt.responses.map((response) => [response.promptId, response]))
  const promptCount = attempt.assessment.prompts.length
  const answeredCount = attempt.responses.length

  return {
    id: attempt.id,
    status: attempt.status,
    startedAt: attempt.startedAt.toISOString(),
    submittedAt: attempt.submittedAt?.toISOString() ?? null,
    score: attempt.scoreEarned === null ? null : Number(attempt.scoreEarned),
    scorePossible: attempt.scorePossible === null ? null : Number(attempt.scorePossible),
    answeredCount,
    promptCount,
    progressPercent: calculateProgress(answeredCount, promptCount),
    canEdit: attempt.status === "IN_PROGRESS" && !attempt.submittedAt,
    assessment: {
      id: attempt.assessment.id,
      title: attempt.assessment.title,
      format: attempt.assessment.format,
      instructions: attempt.assessment.instructions ?? null,
      timeLimitMinutes: attempt.assessment.timeLimitMinutes ?? null,
      event: attempt.assessment.event,
      parts: attempt.assessment.parts.map((part) => ({
        id: part.id,
        title: part.title,
        type: part.type,
        instructions: part.instructions ?? null,
        sortOrder: part.sortOrder,
        pageFrom: part.pageFrom ?? null,
        pageTo: part.pageTo ?? null,
        timeLimitMinutes: part.timeLimitMinutes ?? null,
      })),
      prompts: attempt.assessment.prompts.map((prompt) => {
        const response = responseMap.get(prompt.id)
        const choiceOptions = Array.isArray(prompt.choiceOptions)
          ? (prompt.choiceOptions as unknown[]).filter((c): c is string => typeof c === "string")
          : null
        return {
          id: prompt.id,
          partId: prompt.partId ?? null,
          promptNumber: prompt.promptNumber,
          label: prompt.label ?? null,
          responseType: prompt.responseType,
          choiceOptions,
          difficulty: prompt.difficulty,
          subtopics: prompt.subtopics ?? [],
          pointsPossible: prompt.pointsPossible === null ? null : Number(prompt.pointsPossible),
          pageRef: prompt.pageRef ?? null,
          instructions: prompt.instructions ?? null,
          isRequired: prompt.isRequired,
          responseText: response?.responseText ?? null,
          isCorrect: response?.isCorrect ?? null,
          pointsAwarded:
            response?.pointsAwarded === null || response?.pointsAwarded === undefined
              ? null
              : Number(response.pointsAwarded),
        }
      }),
      sourcePdfUrl: pickAssetUrl(attempt.assessment, ["SOURCE_PDF", "QUESTION_PDF"]),
      answerKeyPdfUrl: null,
    },
  }
}

export async function startOrResumePracticeAssessmentAttempt(
  assessmentId: string,
  clubId: string,
  memberSeasonId: string,
  options?: { forceNew?: boolean },
): Promise<{ attemptId: string; resumed: boolean } | null> {
  const assessment = await prisma.assessment.findFirst({
    where: {
      id: assessmentId,
      isPublished: true,
      isArchived: false,
      prompts: { some: {} },
      season: { clubId },
    },
    select: { id: true },
  })
  if (!assessment) return null

  // Atomic check-and-create. Two parallel POSTs (e.g. double-click on
  // "Start") would both pass the find-first and both create — wrap the
  // check + abandon + create in a transaction so only one attempt is
  // ever IN_PROGRESS for this (assessment, member) pair.
  return prisma.$transaction(async (tx) => {
    if (!options?.forceNew) {
      const inProgressAttempt = await tx.assessmentAttempt.findFirst({
        where: {
          assessmentId: assessment.id,
          memberSeasonId,
          status: "IN_PROGRESS",
          submittedAt: null,
        },
        select: { id: true },
        orderBy: { startedAt: "desc" },
      })
      if (inProgressAttempt) {
        return { attemptId: inProgressAttempt.id, resumed: true }
      }
    } else {
      // ForceNew: abandon any existing IN_PROGRESS attempts. If two
      // parallel forceNew calls race, the second will see the first's
      // new attempt as already IN_PROGRESS and resume it instead of
      // creating a third.
      await tx.assessmentAttempt.updateMany({
        where: {
          assessmentId: assessment.id,
          memberSeasonId,
          status: "IN_PROGRESS",
          submittedAt: null,
        },
        data: { status: "ABANDONED" },
      })
    }

    const attempt = await tx.assessmentAttempt.create({
      data: {
        assessmentId: assessment.id,
        memberSeasonId,
        status: "IN_PROGRESS",
      },
      select: { id: true },
    })

    return { attemptId: attempt.id, resumed: false }
  })
}

export async function upsertMemberPracticeAttemptResponses(
  attemptId: string,
  clubId: string,
  memberSeasonId: string,
  responses: Array<{ promptId?: string; promptNumber?: number; responseText?: string | null }>,
) {
  const attempt = await prisma.assessmentAttempt.findFirst({
    where: {
      id: attemptId,
      memberSeasonId,
      assessment: { season: { clubId } },
    },
    include: {
      assessment: {
        select: {
          id: true,
          prompts: {
            select: { id: true, promptNumber: true },
            orderBy: { promptNumber: "asc" },
          },
        },
      },
    },
  })
  if (!attempt) return null
  if (attempt.submittedAt || attempt.status !== "IN_PROGRESS") {
    throw new Error("ATTEMPT_NOT_EDITABLE")
  }

  const promptById = new Map(attempt.assessment.prompts.map((prompt) => [prompt.id, prompt]))
  const promptByNumber = new Map(attempt.assessment.prompts.map((prompt) => [prompt.promptNumber, prompt]))

  await prisma.$transaction(async (db) => {
    for (const payload of responses) {
      const prompt =
        (payload.promptId ? promptById.get(payload.promptId) : null) ??
        (payload.promptNumber !== undefined ? promptByNumber.get(payload.promptNumber) : null)
      if (!prompt) continue

      const responseText = payload.responseText?.trim() || null

      await db.assessmentResponse.upsert({
        where: {
          attemptId_promptId: {
            attemptId,
            promptId: prompt.id,
          },
        },
        create: {
          attemptId,
          promptId: prompt.id,
          responseText,
        },
        update: {
          responseText,
        },
      })
    }
  })

  // Autosave clients only need an ack to flip `saveStatus = "saved"`. Skip
  // reloading the full attempt detail.
  return { savedAt: new Date() }
}

export async function submitPracticeAssessmentAttempt(
  attemptId: string,
  clubId: string,
  memberSeasonId: string,
  answers?: string[],
) {
  const attempt = await prisma.assessmentAttempt.findFirst({
    where: {
      id: attemptId,
      memberSeasonId,
      assessment: { season: { clubId } },
    },
    include: {
      assessment: {
        select: {
          id: true,
          prompts: {
            select: {
              id: true,
              promptNumber: true,
              responseType: true,
              answerKeyText: true,
              choiceOptions: true,
              correctChoiceIndex: true,
              pointsPossible: true,
            },
            orderBy: { promptNumber: "asc" },
          },
        },
      },
      responses: {
        select: {
          promptId: true,
          responseText: true,
        },
      },
    },
  })
  if (!attempt) return null
  if (attempt.submittedAt) throw new Error("ATTEMPT_ALREADY_SUBMITTED")

  const prompts = attempt.assessment.prompts
  const responseByPromptId = new Map(attempt.responses.map((response) => [response.promptId, response.responseText ?? ""]))
  const normalizedAnswers =
    answers ??
    prompts.map((prompt) => responseByPromptId.get(prompt.id) ?? "")

  let scoreEarned = new Prisma.Decimal(0)
  let scorePossible = new Prisma.Decimal(0)

  await prisma.$transaction(async (db) => {
    for (const prompt of prompts) {
      const rawAnswer = normalizedAnswers[prompt.promptNumber - 1] ?? ""
      const responseText = rawAnswer.trim() || null

      // Grading branches by responseType.
      // MCQ: responseText is the chosen option index (as string). Compare to correctChoiceIndex.
      // SHORT_TEXT/other: case-insensitive trim match against answerKeyText.
      let isCorrect: boolean | null = null
      let hasKey = false
      if (prompt.responseType === "MULTIPLE_CHOICE" && prompt.correctChoiceIndex !== null) {
        hasKey = true
        const chosen = Number.parseInt(rawAnswer.trim(), 10)
        isCorrect = Number.isFinite(chosen) && chosen === prompt.correctChoiceIndex
      } else if (prompt.answerKeyText) {
        hasKey = true
        const expected = prompt.answerKeyText.trim()
        isCorrect = rawAnswer.trim().toLowerCase() === expected.toLowerCase()
      }

      let pointsAwarded: Prisma.Decimal | null = null
      if (hasKey) {
        const promptPoints = prompt.pointsPossible ?? new Prisma.Decimal(1)
        scorePossible = scorePossible.plus(promptPoints)
        if (isCorrect) {
          scoreEarned = scoreEarned.plus(promptPoints)
          pointsAwarded = promptPoints
        } else {
          pointsAwarded = new Prisma.Decimal(0)
        }
      }

      await db.assessmentResponse.upsert({
        where: {
          attemptId_promptId: {
            attemptId: attempt.id,
            promptId: prompt.id,
          },
        },
        create: {
          attemptId: attempt.id,
          promptId: prompt.id,
          responseText,
          isCorrect,
          pointsAwarded,
        },
        update: {
          responseText,
          isCorrect,
          pointsAwarded,
        },
      })
    }

    const hasAnswerKey = prompts.some(
      (prompt) =>
        prompt.answerKeyText ||
        (prompt.responseType === "MULTIPLE_CHOICE" && prompt.correctChoiceIndex !== null),
    )
    await db.assessmentAttempt.update({
      where: { id: attempt.id },
      data: {
        status: hasAnswerKey ? "SCORED" : "SUBMITTED",
        submittedAt: new Date(),
        scoreEarned: hasAnswerKey ? scoreEarned : null,
        scorePossible: hasAnswerKey ? scorePossible : null,
      },
    })
  })

  return prisma.assessmentAttempt.findUnique({
    where: { id: attempt.id },
  })
}
