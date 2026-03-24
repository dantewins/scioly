import { redirect } from "next/navigation"
import Link from "next/link"
import { IconArrowLeft, IconCheck, IconX } from "@tabler/icons-react"

import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { getMemberSeason } from "@/lib/db"

type McqOption = { label: string; text: string }
type MatchingOptions = {
  leftItems: { id: string; text: string }[]
  rightItems: { id: string; text: string }[]
}

function parseJson<T>(val: unknown): T | null {
  if (val === null || val === undefined) return null
  if (typeof val === "string") {
    try { return JSON.parse(val) as T } catch { return null }
  }
  return val as T
}

function getOptionText(opts: McqOption[], label: string): string {
  return opts.find(o => o.label === label)?.text ?? label
}

function formatSelectAllResponse(response: unknown, opts: McqOption[]): string {
  const labels = parseJson<string[]>(response) ?? []
  return labels.map(l => `${l}. ${getOptionText(opts, l)}`).join(", ") || "—"
}

function formatSelectAllKey(key: string | null, opts: McqOption[]): string {
  const labels = parseJson<string[]>(key) ?? []
  return labels.map(l => `${l}. ${getOptionText(opts, l)}`).join(", ") || "—"
}

function formatMatchingResponse(response: unknown, opts: MatchingOptions): string {
  const pairs = (Array.isArray(response) ? response : []) as { leftId: string; rightId: string }[]
  if (pairs.length === 0) return "—"
  return pairs
    .map(p => {
      const leftText = opts.leftItems.find(l => l.id === p.leftId)?.text ?? p.leftId
      const rightText = opts.rightItems.find(r => r.id === p.rightId)?.text ?? p.rightId
      return `${p.leftId}. ${leftText} → ${p.rightId}. ${rightText}`
    })
    .join("; ")
}

function formatMatchingKey(key: string | null, opts: MatchingOptions): string {
  const pairs = parseJson<{ leftId: string; rightId: string }[]>(key) ?? []
  if (pairs.length === 0) return "—"
  return pairs
    .map(p => {
      const leftText = opts.leftItems.find(l => l.id === p.leftId)?.text ?? p.leftId
      const rightText = opts.rightItems.find(r => r.id === p.rightId)?.text ?? p.rightId
      return `${p.leftId}. ${leftText} → ${p.rightId}. ${rightText}`
    })
    .join("; ")
}

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ testId: string; attemptId: string }>
}) {
  const { testId, attemptId } = await params

  const currentUser = await getCurrentUser()
  if (!currentUser) redirect("/login")

  const memberSeason = await getMemberSeason(currentUser.id, currentUser.clubId)
  if (!memberSeason) redirect("/dashboard/practice")

  const attempt = await prisma.testAttempt.findUnique({
    where: { id: attemptId },
    include: {
      test: { select: { title: true } },
      answers: {
        include: { question: true },
        orderBy: { question: { order: "asc" } },
      },
    },
  })

  if (!attempt || attempt.memberSeasonId !== memberSeason.id || !attempt.submittedAt) {
    redirect("/dashboard/practice")
  }

  const autoGradedTotal = attempt.answers.reduce(
    (sum, a) => sum + (a.question.type !== "FREE_RESPONSE" ? a.question.points : 0),
    0
  )
  const freeResponseCount = attempt.answers.filter(
    a => a.question.type === "FREE_RESPONSE"
  ).length
  const percentage = autoGradedTotal > 0
    ? Math.round(((attempt.earnedPoints ?? 0) / autoGradedTotal) * 100)
    : null

  // Track rendered station headers
  const renderedStations = new Set<number>()

  return (
    <div className="flex flex-col gap-6 px-4 py-4 lg:px-6 md:py-6 max-w-3xl mx-auto pb-12">
      {/* Nav */}
      <Link
        href="/dashboard/practice"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors -ml-1"
      >
        <IconArrowLeft className="size-4" />
        Back to practice tests
      </Link>

      <div>
        <h1 className="text-xl font-semibold">{attempt.test.title}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Submitted {new Date(attempt.submittedAt).toLocaleString()}
        </p>
      </div>

      {/* Score card */}
      <div className="rounded-xl border bg-card p-6 text-center space-y-2">
        <p className="text-sm text-muted-foreground">Score</p>
        <p className="text-4xl font-bold">
          {attempt.earnedPoints ?? 0}
          <span className="text-2xl font-normal text-muted-foreground">
            /{autoGradedTotal}
          </span>
        </p>
        {percentage !== null && (
          <p className="text-lg font-medium text-muted-foreground">{percentage}%</p>
        )}
        {freeResponseCount > 0 && (
          <p className="text-xs text-muted-foreground border-t pt-2 mt-2">
            + {freeResponseCount} free-response question{freeResponseCount !== 1 ? "s" : ""} (self-review below, not included in score)
          </p>
        )}
      </div>

      {/* Question review */}
      <div className="space-y-4">
        {attempt.answers.map((answer, i) => {
          const q = answer.question
          const isFree = q.type === "FREE_RESPONSE"

          const isFirstInStation =
            q.stationNumber !== null && !renderedStations.has(q.stationNumber)
          if (q.stationNumber !== null) renderedStations.add(q.stationNumber)

          const mcqOpts = (q.type === "MCQ" || q.type === "SELECT_ALL")
            ? parseJson<McqOption[]>(q.options) ?? []
            : []
          const matchingOpts = q.type === "MATCHING"
            ? parseJson<MatchingOptions>(q.options) ?? { leftItems: [], rightItems: [] }
            : null

          // Format response display
          let responseDisplay: string = "—"
          if (q.type === "MCQ") {
            const label = String(answer.response ?? "")
            responseDisplay = label ? `${label}. ${getOptionText(mcqOpts, label)}` : "—"
          } else if (q.type === "SELECT_ALL") {
            responseDisplay = formatSelectAllResponse(answer.response, mcqOpts)
          } else if (q.type === "MATCHING" && matchingOpts) {
            responseDisplay = formatMatchingResponse(answer.response, matchingOpts)
          } else if (q.type === "FREE_RESPONSE") {
            responseDisplay = String(answer.response ?? "").trim() || "—"
          }

          // Format correct answer display
          let correctDisplay: string = "—"
          if (q.type === "MCQ") {
            correctDisplay = q.answerKey
              ? `${q.answerKey}. ${getOptionText(mcqOpts, q.answerKey)}`
              : "—"
          } else if (q.type === "SELECT_ALL") {
            correctDisplay = formatSelectAllKey(q.answerKey, mcqOpts)
          } else if (q.type === "MATCHING" && matchingOpts) {
            correctDisplay = formatMatchingKey(q.answerKey, matchingOpts)
          }

          const isCorrect = answer.isCorrect
          const borderColor = isFree
            ? "border-border"
            : isCorrect
            ? "border-green-300 dark:border-green-800"
            : "border-red-300 dark:border-red-800"

          return (
            <div key={answer.questionId}>
              {/* Station header */}
              {isFirstInStation && q.stationContext && (
                <div className="rounded-xl border border-dashed bg-muted/30 p-4 mb-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                    Station {q.stationNumber}
                  </p>
                  <p className="text-sm">{q.stationContext}</p>
                </div>
              )}

              <div className={`rounded-xl border bg-card p-5 space-y-3 ${borderColor}`}>
                {/* Question header row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">Q{i + 1}</span>
                    {!isFree && (
                      <div className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                        isCorrect
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      }`}>
                        {isCorrect
                          ? <><IconCheck className="size-3" /> Correct</>
                          : <><IconX className="size-3" /> Incorrect</>
                        }
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {isFree ? `${q.points} pt${q.points !== 1 ? "s" : ""} (self-graded)` : `${answer.pointsEarned ?? 0}/${q.points}`}
                  </span>
                </div>

                {/* Question text */}
                <p className="text-sm font-medium leading-relaxed">{q.content}</p>

                {/* Image */}
                {q.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={q.imageUrl}
                    alt={`Question ${i + 1} image`}
                    className="rounded-lg border max-w-full"
                  />
                )}

                {/* Response */}
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Your answer</p>
                  <p className={`text-sm rounded-md px-3 py-2 border ${
                    isFree
                      ? "bg-muted/30"
                      : isCorrect
                      ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
                      : "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800"
                  }`}>
                    {responseDisplay}
                  </p>
                </div>

                {/* Correct answer (show if wrong non-free) */}
                {!isFree && !isCorrect && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Correct answer</p>
                    <p className="text-sm rounded-md px-3 py-2 border bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800">
                      {correctDisplay}
                    </p>
                  </div>
                )}

                {/* Model answer for FREE_RESPONSE */}
                {isFree && q.answerKey && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Model answer</p>
                    <div className="rounded-md border border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800 px-3 py-2">
                      <p className="text-sm whitespace-pre-wrap">{q.answerKey}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Bottom nav */}
      <div className="flex justify-between gap-4 pt-2 border-t">
        <Link href="/dashboard/practice">
          <button className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <IconArrowLeft className="size-4" />
            Practice tests
          </button>
        </Link>
        <Link href={`/dashboard/practice/${testId}`}>
          <button className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
            Retake test
          </button>
        </Link>
      </div>
    </div>
  )
}
