import { Prisma, type AssessmentFormat, type AssessmentPartType } from "@prisma/client"
import { prisma } from "@/lib/prisma"

const assessmentEventSelect = { select: { id: true, name: true, code: true } } as const

const assessmentAssetArgs = {
  select: {
    id: true,
    kind: true,
    label: true,
    externalUrl: true,
    sortOrder: true,
  },
  orderBy: { sortOrder: "asc" as const },
} as const

const assessmentPartArgs = {
  select: {
    id: true,
    title: true,
    type: true,
    instructions: true,
    sortOrder: true,
    pageFrom: true,
    pageTo: true,
    timeLimitMinutes: true,
  },
  orderBy: { sortOrder: "asc" as const },
} as const

const assessmentPromptArgs = {
  select: {
    id: true,
    promptNumber: true,
    answerKeyText: true,
  },
  orderBy: { promptNumber: "asc" as const },
} as const

const assessmentAttemptSelect = {
  id: true,
  status: true,
  scoreEarned: true,
  scorePossible: true,
  startedAt: true,
  submittedAt: true,
  _count: { select: { responses: true } },
} as const

const memberAssessmentPromptArgs = {
  select: {
    id: true,
    partId: true,
    promptNumber: true,
    label: true,
    responseType: true,
    pointsPossible: true,
    pageRef: true,
    instructions: true,
    isRequired: true,
  },
  orderBy: { promptNumber: "asc" as const },
} as const

type PracticeAssessmentQueryResult = Prisma.AssessmentGetPayload<{
  include: {
    event: typeof assessmentEventSelect
    assets: typeof assessmentAssetArgs
    parts: typeof assessmentPartArgs
    prompts: typeof assessmentPromptArgs
    _count: { select: { attempts: true } }
    attempts: {
      select: typeof assessmentAttemptSelect
      orderBy: { startedAt: "desc" }
    }
  }
}>

export interface PracticeAssessmentPartInput {
  title: string
  type: AssessmentPartType
  instructions?: string
  pageFrom?: number | null
  pageTo?: number | null
  timeLimitMinutes?: number | null
}

export interface PracticeAssessmentInput {
  title: string
  description?: string | null
  format: AssessmentFormat
  instructions?: string | null
  timeLimitMinutes?: number | null
  eventId?: string | null
  isPublished: boolean
  isArchived?: boolean
  sourcePdfUrl: string
  answerKeyPdfUrl?: string | null
  parts?: PracticeAssessmentPartInput[]
}

export interface PracticeAssessmentRecord {
  id: string
  title: string
  description: string | null
  format: AssessmentFormat
  instructions: string | null
  timeLimitMinutes: number | null
  eventId: string | null
  event: { id: string; name: string; code: string | null } | null
  isPublished: boolean
  isArchived: boolean
  sourcePdfUrl: string
  answerKeyPdfUrl: string | null
  answerKey: { id: string } | null
  parts: Array<{
    id: string
    title: string
    type: AssessmentPartType
    instructions: string | null
    sortOrder: number
    pageFrom: number | null
    pageTo: number | null
    timeLimitMinutes: number | null
  }>
  attemptCount: number
  attempts: Array<{
    id: string
    status: "IN_PROGRESS" | "SUBMITTED" | "SCORED" | "ABANDONED"
    score: number | null
    scorePossible: number | null
    answeredCount: number
    promptCount: number
    progressPercent: number
    startedAt: string
    submittedAt: string | null
  }>
  recommended: boolean
  hasInProgressAttempt: boolean
  latestAttemptId: string | null
  latestAttemptStatus: "IN_PROGRESS" | "SUBMITTED" | "SCORED" | "ABANDONED" | null
  createdAt: string
  updatedAt: string
}

export interface MemberPracticeFeedRecord extends PracticeAssessmentRecord {
  inProgressAttempts: number
  submittedAttempts: number
}

export interface MemberPracticeFeed {
  assessments: MemberPracticeFeedRecord[]
  continueAttempts: Array<{
    attemptId: string
    assessmentId: string
    title: string
    format: AssessmentFormat
    eventName: string | null
    startedAt: string
    answeredCount: number
    promptCount: number
    progressPercent: number
  }>
  recommendedAssessments: MemberPracticeFeedRecord[]
  recentAttempts: Array<{
    attemptId: string
    assessmentId: string
    title: string
    format: AssessmentFormat
    eventName: string | null
    status: "SUBMITTED" | "SCORED"
    score: number | null
    scorePossible: number | null
    submittedAt: string
  }>
}

export interface MemberPracticeAssessmentDetail {
  id: string
  title: string
  description: string | null
  format: AssessmentFormat
  instructions: string | null
  timeLimitMinutes: number | null
  event: { id: string; name: string; code: string | null } | null
  assets: Array<{
    id: string
    kind: string
    label: string
    externalUrl: string | null
    sortOrder: number | null
  }>
  parts: Array<{
    id: string
    title: string
    type: AssessmentPartType
    instructions: string | null
    sortOrder: number
    pageFrom: number | null
    pageTo: number | null
    timeLimitMinutes: number | null
  }>
  prompts: Array<{
    id: string
    partId: string | null
    promptNumber: number
    label: string | null
    responseType: string
    pointsPossible: number | null
    pageRef: string | null
    instructions: string | null
    isRequired: boolean
  }>
  promptCount: number
  attempts: Array<{
    id: string
    status: "IN_PROGRESS" | "SUBMITTED" | "SCORED" | "ABANDONED"
    score: number | null
    scorePossible: number | null
    answeredCount: number
    progressPercent: number
    startedAt: string
    submittedAt: string | null
  }>
  currentAttemptId: string | null
  sourcePdfUrl: string | null
  answerKeyPdfUrl: string | null
}

export interface MemberPracticeAttemptDetail {
  id: string
  status: "IN_PROGRESS" | "SUBMITTED" | "SCORED" | "ABANDONED"
  startedAt: string
  submittedAt: string | null
  score: number | null
  scorePossible: number | null
  answeredCount: number
  promptCount: number
  progressPercent: number
  canEdit: boolean
  assessment: {
    id: string
    title: string
    format: AssessmentFormat
    instructions: string | null
    timeLimitMinutes: number | null
    event: { id: string; name: string; code: string | null } | null
    parts: Array<{
      id: string
      title: string
      type: AssessmentPartType
      instructions: string | null
      sortOrder: number
      pageFrom: number | null
      pageTo: number | null
      timeLimitMinutes: number | null
    }>
    prompts: Array<{
      id: string
      partId: string | null
      promptNumber: number
      label: string | null
      responseType: string
      pointsPossible: number | null
      pageRef: string | null
      instructions: string | null
      isRequired: boolean
      responseText: string | null
      isCorrect: boolean | null
      pointsAwarded: number | null
    }>
    sourcePdfUrl: string | null
    answerKeyPdfUrl: string | null
  }
}

function pickAssetUrl(
  assessment: Pick<PracticeAssessmentQueryResult, "assets">,
  kinds: string[],
): string | null {
  for (const kind of kinds) {
    const asset = assessment.assets.find((item) => item.kind === kind)
    if (asset?.externalUrl) return asset.externalUrl
  }
  return null
}

function calculateProgress(
  answeredCount: number,
  promptCount: number,
): number {
  if (promptCount <= 0) return 0
  return Math.min(100, Math.round((answeredCount / promptCount) * 100))
}

function mapPracticeAssessment(
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

async function resolveAssessment(
  id: string,
  clubId: string,
  db: Prisma.TransactionClient | typeof prisma = prisma,
) {
  return db.assessment.findFirst({
    where: { id, season: { clubId } },
    select: { id: true },
  })
}

function buildPracticeAssessmentInclude(memberSeasonId?: string | null) {
  return {
    event: assessmentEventSelect,
    assets: assessmentAssetArgs,
    parts: assessmentPartArgs,
    prompts: assessmentPromptArgs,
    _count: { select: { attempts: true } },
    attempts: {
      ...(memberSeasonId ? { where: { memberSeasonId } } : {}),
      select: assessmentAttemptSelect,
      orderBy: { startedAt: "desc" as const },
      take: 20,
    },
  }
}

async function getPracticeAssessmentById(
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

async function syncAssessmentAssets(
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

async function syncAssessmentParts(
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
        return {
          id: prompt.id,
          partId: prompt.partId ?? null,
          promptNumber: prompt.promptNumber,
          label: prompt.label ?? null,
          responseType: prompt.responseType,
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
      answerKeyPdfUrl: pickAssetUrl(attempt.assessment, ["ANSWER_KEY_PDF"]),
    },
  }
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

  if (!options?.forceNew) {
    const inProgressAttempt = await prisma.assessmentAttempt.findFirst({
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
  }

  const attempt = await prisma.assessmentAttempt.create({
    data: {
      assessmentId: assessment.id,
      memberSeasonId,
      status: "IN_PROGRESS",
    },
    select: { id: true },
  })

  return { attemptId: attempt.id, resumed: false }
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

  return getMemberPracticeAttemptDetail(attemptId, clubId, memberSeasonId)
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
              answerKeyText: true,
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
      const expected = prompt.answerKeyText?.trim() ?? null
      const isCorrect = expected
        ? rawAnswer.trim().toLowerCase() === expected.toLowerCase()
        : null

      let pointsAwarded: Prisma.Decimal | null = null
      if (expected) {
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

    await db.assessmentAttempt.update({
      where: { id: attempt.id },
      data: {
        status: "SUBMITTED",
        submittedAt: new Date(),
        scoreEarned: prompts.some((prompt) => prompt.answerKeyText) ? scoreEarned : null,
        scorePossible: prompts.some((prompt) => prompt.answerKeyText) ? scorePossible : null,
      },
    })
  })

  return prisma.assessmentAttempt.findUnique({
    where: { id: attempt.id },
  })
}
