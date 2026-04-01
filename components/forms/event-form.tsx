"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

interface EventFormProps {
  defaultValues?: {
    name: string
    code: string
    minParticipants: number
    maxParticipants: number
    isTrialEvent: boolean
  }
  onSubmit: (data: {
    name: string
    code: string
    minParticipants: number
    maxParticipants: number
    isTrialEvent: boolean
  }) => void
  loading: boolean
  onCancel: () => void
  submitLabel?: string
}

export function EventForm({
  defaultValues,
  onSubmit,
  loading,
  onCancel,
  submitLabel = "Create",
}: EventFormProps) {
  const [name, setName] = useState(defaultValues?.name ?? "")
  const [code, setCode] = useState(defaultValues?.code ?? "")
  const [minParticipants, setMinParticipants] = useState(defaultValues?.minParticipants ?? 2)
  const [maxParticipants, setMaxParticipants] = useState(defaultValues?.maxParticipants ?? 2)
  const [isTrialEvent, setIsTrialEvent] = useState(defaultValues?.isTrialEvent ?? false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit({ name, code, minParticipants, maxParticipants, isTrialEvent })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label>Event Name</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Anatomy & Physiology"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Code (optional)</Label>
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="ANP"
          maxLength={10}
        />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Min Participants</Label>
          <Input
            type="number"
            min={1}
            value={minParticipants}
            onChange={(e) => setMinParticipants(parseInt(e.target.value) || 1)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Max Participants</Label>
          <Input
            type="number"
            min={1}
            value={maxParticipants}
            onChange={(e) => setMaxParticipants(parseInt(e.target.value) || 1)}
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Switch id="trial" checked={isTrialEvent} onCheckedChange={setIsTrialEvent} />
        <Label htmlFor="trial">Trial event</Label>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={loading || !name.trim()}>{submitLabel}</Button>
      </DialogFooter>
    </form>
  )
}
