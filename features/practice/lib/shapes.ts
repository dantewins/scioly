// Prisma query argument shapes shared across the practice feature.
// Keeping these in one place lets every lib module compose the same
// projection without each one redeclaring `select`/`include` blocks.

export const assessmentEventSelect = {
  select: { id: true, name: true, code: true },
} as const

export const assessmentAssetArgs = {
  select: {
    id: true,
    kind: true,
    label: true,
    externalUrl: true,
    sortOrder: true,
  },
  orderBy: { sortOrder: "asc" as const },
} as const

export const assessmentPartArgs = {
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

export const assessmentPromptArgs = {
  select: {
    id: true,
    promptNumber: true,
    answerKeyText: true,
  },
  orderBy: { promptNumber: "asc" as const },
} as const

export const assessmentAttemptSelect = {
  id: true,
  status: true,
  scoreEarned: true,
  scorePossible: true,
  startedAt: true,
  submittedAt: true,
  _count: { select: { responses: true } },
} as const

export const memberAssessmentPromptArgs = {
  select: {
    id: true,
    partId: true,
    promptNumber: true,
    label: true,
    responseType: true,
    choiceOptions: true,
    difficulty: true,
    subtopics: true,
    pointsPossible: true,
    pageRef: true,
    instructions: true,
    isRequired: true,
  },
  orderBy: { promptNumber: "asc" as const },
} as const

export function buildPracticeAssessmentInclude(memberSeasonId?: string | null) {
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
