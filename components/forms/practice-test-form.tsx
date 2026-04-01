"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"

interface FormState {
  title: string
  pdfUrl: string
  timeLimitMinutes: string
  eventId: string
  isActive: boolean
}

interface PracticeTestFormProps {
  events: { id: string; name: string }[]
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
  const [pdfUrl, setPdfUrl] = useState(defaultValues?.pdfUrl ?? "")
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(defaultValues?.timeLimitMinutes ?? "")
  const [eventId, setEventId] = useState(defaultValues?.eventId ?? "")
  const [isActive, setIsActive] = useState(defaultValues?.isActive ?? true)

  function handleSubmit(e: React.SubmitEvent) {
    e.preventDefault()
    onSubmit({ title, pdfUrl, timeLimitMinutes, eventId, isActive })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label>Title <span className="text-destructive">*</span></Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Anatomy & Physiology Invitational 2024"
        />
      </div>
      <div className="space-y-1.5">
        <Label>PDF URL <span className="text-destructive">*</span></Label>
        <Input
          type="url"
          value={pdfUrl}
          onChange={(e) => setPdfUrl(e.target.value)}
          placeholder="https://..."
        />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Time Limit (minutes)</Label>
          <Input
            type="number"
            min={1}
            max={300}
            value={timeLimitMinutes}
            onChange={(e) => setTimeLimitMinutes(e.target.value)}
            placeholder="30"
          />
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
      <div className="flex items-center gap-2">
        <input
          id="isActive"
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="size-4 rounded border-border"
        />
        <Label htmlFor="isActive" className="cursor-pointer">Active (visible to members)</Label>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={loading}>{submitLabel}</Button>
      </DialogFooter>
    </form>
  )
}
