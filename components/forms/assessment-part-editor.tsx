"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type AssessmentPartType = "SECTION" | "STATION"

export interface AssessmentPartEditorValue {
  title: string
  type: AssessmentPartType
  instructions: string
  pageFrom: string
  pageTo: string
  timeLimitMinutes: string
}

interface AssessmentPartEditorProps {
  index: number
  part: AssessmentPartEditorValue
  onChange: (nextPart: AssessmentPartEditorValue) => void
  onRemove: () => void
}

export function AssessmentPartEditor({
  index,
  part,
  onChange,
  onRemove,
}: AssessmentPartEditorProps) {
  return (
    <div className="rounded-[var(--radius)] border border-border/70 px-[var(--card-px)] py-[var(--card-py)]">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Title</Label>
          <Input
            value={part.title}
            onChange={(e) => onChange({ ...part, title: e.target.value })}
            placeholder={part.type === "STATION" ? `Station ${index + 1}` : `Section ${index + 1}`}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Type</Label>
          <Select value={part.type} onValueChange={(value) => onChange({ ...part, type: value as AssessmentPartType })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="SECTION">Section</SelectItem>
              <SelectItem value="STATION">Station</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label>Page From</Label>
          <Input
            type="number"
            min={1}
            value={part.pageFrom}
            onChange={(e) => onChange({ ...part, pageFrom: e.target.value })}
            placeholder="1"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Page To</Label>
          <Input
            type="number"
            min={1}
            value={part.pageTo}
            onChange={(e) => onChange({ ...part, pageTo: e.target.value })}
            placeholder="10"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Time Limit</Label>
          <Input
            type="number"
            min={1}
            value={part.timeLimitMinutes}
            onChange={(e) => onChange({ ...part, timeLimitMinutes: e.target.value })}
            placeholder="8"
          />
        </div>
      </div>
      <div className="mt-3 space-y-1.5">
        <Label>Instructions</Label>
        <Textarea
          rows={2}
          value={part.instructions}
          onChange={(e) => onChange({ ...part, instructions: e.target.value })}
          placeholder="Add station-specific directions, allowed materials, or scoring notes."
        />
      </div>
      <div className="mt-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="px-0 text-muted-foreground hover:text-destructive"
          onClick={onRemove}
        >
          Remove
        </Button>
      </div>
    </div>
  )
}
