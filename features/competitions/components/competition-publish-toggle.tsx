"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { apiCall } from "@/lib/api-client"

interface CompetitionPublishToggleProps {
  competitionId: string
  initialIsPublished: boolean
  canManage: boolean
}

export function CompetitionPublishToggle({
  competitionId,
  initialIsPublished,
  canManage,
}: CompetitionPublishToggleProps) {
  const router = useRouter()
  const [isPublished, setIsPublished] = useState(initialIsPublished)
  const [loading, setLoading] = useState(false)
  const [, startTransition] = useTransition()

  if (!canManage) {
    return isPublished ? (
      <Badge variant="secondary">Published</Badge>
    ) : (
      <Badge variant="outline" className="text-muted-foreground">Draft</Badge>
    )
  }

  async function togglePublished() {
    const next = !isPublished
    setLoading(true)
    try {
      await apiCall(`/api/admin/competitions/${competitionId}`, {
        method: "PATCH",
        body: JSON.stringify({ isPublished: next }),
      })
      setIsPublished(next)
      toast.success(next ? "Competition published." : "Competition moved to draft.")
      startTransition(() => router.refresh())
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {isPublished ? (
        <Badge variant="secondary">Published</Badge>
      ) : (
        <Badge variant="outline" className="text-muted-foreground">Draft</Badge>
      )}
      <Button
        size="sm"
        variant={isPublished ? "outline" : "default"}
        onClick={togglePublished}
        disabled={loading}
      >
        {loading
          ? "Saving..."
          : isPublished
            ? "Unpublish"
            : "Publish"}
      </Button>
    </div>
  )
}
