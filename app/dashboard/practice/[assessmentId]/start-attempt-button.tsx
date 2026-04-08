"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { IconPlayerPlay } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { apiCall } from "@/lib/api-client"

interface Props {
  assessmentId: string
  currentAttemptId: string | null
}

export function StartAttemptButton({ assessmentId, currentAttemptId }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleStart(forceNew = false) {
    setLoading(true)
    try {
      const data = await apiCall<{ id: string }>(`/api/member/practice/${assessmentId}`, {
        method: "POST",
        body: JSON.stringify(forceNew ? { forceNew: true } : {}),
      })
      router.push(`/dashboard/practice/attempts/${data.id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to start attempt.")
    } finally {
      setLoading(false)
    }
  }

  if (currentAttemptId) {
    return (
      <div className="flex items-center gap-2">
        <Button onClick={() => handleStart(false)} disabled={loading}>
          <IconPlayerPlay className="size-4 mr-1.5" />
          {loading ? "Resuming…" : "Resume Attempt"}
        </Button>
        <Button variant="outline" size="sm" onClick={() => handleStart(true)} disabled={loading}>
          Start New
        </Button>
      </div>
    )
  }

  return (
    <Button onClick={() => handleStart(false)} disabled={loading}>
      <IconPlayerPlay className="size-4 mr-1.5" />
      {loading ? "Starting…" : "Start Attempt"}
    </Button>
  )
}
