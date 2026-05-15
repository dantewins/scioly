"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ResponsiveDialogFooter } from "@/components/ui/responsive-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { AssessmentPartEditor, type AssessmentPartEditorValue } from "./assessment-part-editor"

type AssessmentFormat = "TEST" | "STATIONS" | "HYBRID"

interface FormState {
  title: string
  description: string
  format: AssessmentFormat
  instructions: string
  sourcePdfUrl: string
  answerKeyPdfUrl: string
  timeLimitMinutes: string
  eventId: string
  isPublished: boolean
  parts: AssessmentPartEditorValue[]
}

interface PracticeTestFormProps {
  events: { id: string; name: string; code?: string | null }[]
  defaultValues?: Partial<FormState>
  onSubmit: (data: FormState) => void
  loading: boolean
  onCancel: () => void
  submitLabel?: string
}

export function PracticeTestForm({
  events,
  defaultValues,
  onSubmit,
  loading,
  onCancel,
  submitLabel = "Create",
}: PracticeTestFormProps) {
  const [title, setTitle] = useState(defaultValues?.title ?? "")
  const [description, setDescription] = useState(defaultValues?.description ?? "")
  const [format, setFormat] = useState<AssessmentFormat>(defaultValues?.format ?? "TEST")
  const [instructions, setInstructions] = useState(defaultValues?.instructions ?? "")
  const [sourcePdfUrl, setSourcePdfUrl] = useState(defaultValues?.sourcePdfUrl ?? "")
  const [answerKeyPdfUrl, setAnswerKeyPdfUrl] = useState(defaultValues?.answerKeyPdfUrl ?? "")
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(defaultValues?.timeLimitMinutes ?? "")
  const [eventId, setEventId] = useState(defaultValues?.eventId ?? "")
  const [isPublished, setIsPublished] = useState(defaultValues?.isPublished ?? true)
  const [parts, setParts] = useState(defaultValues?.parts ?? [])

  function updatePart(index: number, nextPart: AssessmentPartEditorValue) {
    setParts((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? nextPart : item)),
    )
  }

  function handleSubmit(e: React.SubmitEvent) {
    e.preventDefault()
    onSubmit({
      title,
      description,
      format,
      instructions,
      sourcePdfUrl,
      answerKeyPdfUrl,
      timeLimitMinutes,
      eventId,
      isPublished,
      parts,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label>Title <span className="text-destructive">*</span></Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Anatomy & Physiology Regionals Packet"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Description</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Add a short note about when to use this assessment or what it covers."
        />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Format</Label>
          <Select value={format} onValueChange={(value) => setFormat(value as AssessmentFormat)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="TEST">Test</SelectItem>
              <SelectItem value="STATIONS">Stations</SelectItem>
              <SelectItem value="HYBRID">Hybrid</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Science Event</Label>
          <Select
            value={eventId || "__none"}
            onValueChange={(v) => setEventId(v === "__none" ? "" : v)}
          >
            <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none">None</SelectItem>
              {events.map((e) => (
                <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Packet / PDF URL <span className="text-destructive">*</span></Label>
        <Input
          type="url"
          value={sourcePdfUrl}
          onChange={(e) => setSourcePdfUrl(e.target.value)}
          placeholder="https://drive.google.com/file/d/..."
        />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Answer Key PDF URL</Label>
          <Input
            type="url"
            value={answerKeyPdfUrl}
            onChange={(e) => setAnswerKeyPdfUrl(e.target.value)}
            placeholder="https://drive.google.com/file/d/..."
          />
        </div>
        <div className="space-y-1.5">
          <Label>Time Limit (minutes)</Label>
          <Input
            type="number"
            min={1}
            max={300}
            value={timeLimitMinutes}
            onChange={(e) => setTimeLimitMinutes(e.target.value)}
            placeholder="45"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Instructions</Label>
        <Textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          rows={4}
          placeholder="List timing rules, allowed materials, or station directions for members."
        />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label>{format === "STATIONS" ? "Stations" : "Sections"}</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setParts((current) => [
                ...current,
                {
                  title: "",
                  type: format === "STATIONS" ? "STATION" : "SECTION",
                  instructions: "",
                  pageFrom: "",
                  pageTo: "",
                  timeLimitMinutes: "",
                },
              ])
            }
          >
            Add {format === "STATIONS" ? "Station" : "Section"}
          </Button>
        </div>
        {parts.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Add sections or stations if you want to break the packet into structured parts.
          </p>
        ) : (
          <div className="space-y-3">
            {parts.map((part, index) => (
              <AssessmentPartEditor
                key={`${part.title}-${index}`}
                index={index}
                part={part}
                onChange={(nextPart) => updatePart(index, nextPart)}
                onRemove={() => setParts((current) => current.filter((_, itemIndex) => itemIndex !== index))}
              />
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <input
          id="isPublished"
          type="checkbox"
          checked={isPublished}
          onChange={(e) => setIsPublished(e.target.checked)}
          className="size-4 rounded border-border"
        />
        <Label htmlFor="isPublished" className="cursor-pointer">Published (visible to members)</Label>
      </div>
      <ResponsiveDialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={loading}>{submitLabel}</Button>
      </ResponsiveDialogFooter>
    </form>
  )
}
