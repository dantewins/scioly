import type { Prisma, AssessmentFormat, AssessmentPartType } from "@prisma/client"
import type {
  assessmentEventSelect,
  assessmentAssetArgs,
  assessmentPartArgs,
  assessmentPromptArgs,
  assessmentAttemptSelect,
} from "./shapes"

// Resolved Prisma row shape for an Assessment + its joins.
export type PracticeAssessmentQueryResult = Prisma.AssessmentGetPayload<{
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
      choiceOptions: string[] | null
      difficulty: "EASY" | "MEDIUM" | "HARD" | null
      subtopics: string[]
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
