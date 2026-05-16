"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { IconSparkles, IconLoader2 } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { SectionCard } from "@/components/ui/section-card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { apiCall } from "@/lib/api-client"

interface Event {
  id: string
  name: string
  code: string | null
}

interface Props {
  events: Event[]
  subtopics: string[]
}

type QuestionType = "MCQ" | "FRQ"
type Difficulty = "EASY" | "MEDIUM" | "HARD"

const DIFFICULTIES: { value: Difficulty; label: string }[] = [
  { value: "EASY", label: "Easy" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HARD", label: "Hard" },
]

export function GenerateTestForm({ events, subtopics }: Props) {
  const router = useRouter()
  const [eventId, setEventId] = useState<string>("__any")
  const [count, setCount] = useState("20")
  const [timeLimit, setTimeLimit] = useState("")
  const [types, setTypes] = useState<Set<QuestionType>>(new Set(["MCQ", "FRQ"]))
  const [difficulties, setDifficulties] = useState<Set<Difficulty>>(new Set())
  const [selectedSubtopics, setSelectedSubtopics] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)

  function toggle<T>(set: Set<T>, value: T): Set<T> {
    const next = new Set(set)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    return next
  }

  async function handleGenerate() {
    const countNum = Number.parseInt(count, 10)
    if (!Number.isFinite(countNum) || countNum < 1) {
      toast.error("Pick a question count between 1 and 50.")
      return
    }
    const timeNum = timeLimit.trim() ? Number.parseInt(timeLimit, 10) : undefined
    if (timeNum !== undefined && (!Number.isFinite(timeNum) || timeNum < 1)) {
      toast.error("Time limit must be a positive number of minutes.")
      return
    }

    setLoading(true)
    try {
      const result = await apiCall<{ attemptId: string; sampledCount: number }>(
        "/api/member/practice/generate",
        {
          method: "POST",
          body: JSON.stringify({
            eventId: eventId === "__any" ? undefined : eventId,
            count: countNum,
            timeLimitMinutes: timeNum,
            types: types.size === 2 ? undefined : [...types],
            difficulties: [...difficulties],
            subtopics: [...selectedSubtopics],
          }),
        },
      )
      toast.success(`Generated ${result.sampledCount} questions.`)
      router.push(`/dashboard/practice/attempts/${result.attemptId}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't generate a test.")
      setLoading(false)
    }
  }

  return (
    <SectionCard>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Event</Label>
            <Select value={eventId} onValueChange={setEventId}>
              <SelectTrigger>
                <SelectValue placeholder="Any event" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__any">Any event</SelectItem>
                {events.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name} {e.code && <span className="text-xs text-muted-foreground">({e.code})</span>}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="count">Questions</Label>
              <Input
                id="count"
                type="number"
                min={1}
                max={50}
                value={count}
                onChange={(e) => setCount(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="time">Time limit (min)</Label>
              <Input
                id="time"
                type="number"
                min={1}
                max={240}
                value={timeLimit}
                onChange={(e) => setTimeLimit(e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Question type</Label>
          <div className="flex flex-wrap gap-1.5">
            {(["MCQ", "FRQ"] as QuestionType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTypes(toggle(types, t))}
                className={
                  types.has(t)
                    ? "rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground"
                    : "rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground hover:bg-muted/80"
                }
              >
                {t}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">Pick at least one. Both selected = mixed.</p>
        </div>

        <div className="space-y-1.5">
          <Label>Difficulty</Label>
          <div className="flex flex-wrap gap-1.5">
            {DIFFICULTIES.map((d) => (
              <button
                key={d.value}
                type="button"
                onClick={() => setDifficulties(toggle(difficulties, d.value))}
                className={
                  difficulties.has(d.value)
                    ? "rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground"
                    : "rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground hover:bg-muted/80"
                }
              >
                {d.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">Leave empty for any difficulty.</p>
        </div>

        {subtopics.length > 0 && (
          <div className="space-y-1.5">
            <Label>Subtopics</Label>
            <div className="flex flex-wrap gap-1.5">
              {subtopics.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setSelectedSubtopics(toggle(selectedSubtopics, tag))}
                  className={
                    selectedSubtopics.has(tag)
                      ? "rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground"
                      : "rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground hover:bg-muted/80"
                  }
                >
                  {tag}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">Empty = all subtopics.</p>
          </div>
        )}

        <div className="flex justify-end pt-1">
          <Button onClick={handleGenerate} disabled={loading || types.size === 0}>
            {loading ? (
              <>
                <IconLoader2 className="size-4 mr-1.5 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <IconSparkles className="size-4 mr-1.5" />
                Generate test
              </>
            )}
          </Button>
        </div>
      </div>
    </SectionCard>
  )
}
