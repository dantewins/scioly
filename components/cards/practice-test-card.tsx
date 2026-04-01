"use client"

import {
  PencilSimpleIcon,
  TrashIcon,
  KeyIcon,
  FilePdfIcon,
  TimerIcon,
  UsersIcon,
} from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface SciEvent {
  id: string
  name: string
}

export interface PracticeTestCardData {
  id: string
  title: string
  pdfUrl: string
  timeLimitMinutes: number | null
  eventId: string | null
  isActive: boolean
  event: SciEvent | null
  answerKey: { id: string } | null
  _count: { attempts: number }
}

interface PracticeTestCardProps {
  test: PracticeTestCardData
  canManage: boolean
  onEdit: (test: PracticeTestCardData) => void
  onDelete: (id: string) => void
  onSetAnswerKey: (test: PracticeTestCardData) => void
}

export function PracticeTestCard({
  test,
  canManage,
  onEdit,
  onDelete,
  onSetAnswerKey,
}: PracticeTestCardProps) {
  return (
    <Card className="group">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-sm font-medium">{test.title}</CardTitle>
              <Badge variant={test.isActive ? "default" : "secondary"} className="text-xs">
                {test.isActive ? "Active" : "Inactive"}
              </Badge>
              {test.answerKey && (
                <Badge variant="outline" className="text-xs gap-1">
                  <KeyIcon size={10} />
                  Answer key set
                </Badge>
              )}
            </div>
          </div>
          {canManage && (
            <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs gap-1"
                onClick={() => onSetAnswerKey(test)}
              >
                <KeyIcon size={12} />
                {test.answerKey ? "Update key" : "Set key"}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() => onEdit(test)}
              >
                <PencilSimpleIcon size={13} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground hover:text-destructive"
                onClick={() => onDelete(test.id)}
              >
                <TrashIcon size={13} />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-1">
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {test.event && (
            <span className="font-medium text-foreground">{test.event.name}</span>
          )}
          {test.timeLimitMinutes && (
            <span className="flex items-center gap-1">
              <TimerIcon size={12} />
              {test.timeLimitMinutes} min
            </span>
          )}
          <span className="flex items-center gap-1">
            <UsersIcon size={12} />
            {test._count.attempts} attempt{test._count.attempts !== 1 ? "s" : ""}
          </span>
          <a
            href={test.pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-foreground transition-colors"
          >
            <FilePdfIcon size={12} />
            View PDF
          </a>
        </div>
      </CardContent>
    </Card>
  )
}
